/**
 * WebSocket Service for Online Multiplayer
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import type { GameState } from '../../types/game.types.js';
import { db } from '../database/db.js';

interface Room {
  id: string;
  name: string;
  host: {
    id: string;
    username: string;
    socketId: string;
  };
  guest: {
    id: string;
    username: string;
    socketId: string;
  } | null;
  gameState: GameState | null;
  createdAt: Date;
  status: 'waiting' | 'playing' | 'finished';
  newGameRequest?: {
    requestedBy: string; // userId
    requestedAt: Date;
  };
  tournamentMatchId?: string;
  tournamentMatchData?: any;
  // Oyun başlangıç bilgileri (observer'lar için)
  gameStartInfo?: {
    player1: string;
    player2: string;
    firstPlayer: 'player1' | 'player2';
  };
}

interface ConnectedUser {
  socketId: string;
  userId: string;
  username: string;
}

// Aktif odalar ve kullanıcılar
const rooms = new Map<string, Room>();
const connectedUsers = new Map<string, ConnectedUser>();
let roomCounter = 100; // Oda numarası 100'den başlar

// Disconnect grace period - sayfa yenileme vs için kullanıcıya 5 saniye süre ver
const disconnectTimers = new Map<string, NodeJS.Timeout>();
const DISCONNECT_GRACE_PERIOD = 5000; // 5 saniye

// 30 dakika hareketsizlik kontrolü
const roomInactivityTimers = new Map<string, NodeJS.Timeout>();
const ROOM_INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 dakika

let io: SocketIOServer;

export function initializeSocketServer(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log('[SOCKET] New connection:', socket.id);

    // Kullanıcı bağlandı
    socket.on('user:connected', (userData: { userId: string; username: string }) => {
      connectedUsers.set(socket.id, {
        socketId: socket.id,
        userId: userData.userId,
        username: userData.username
      });
      console.log(`[SOCKET] User connected: ${userData.username} (${socket.id})`);

      // Aktif odaları gönder
      socket.emit('rooms:list', Array.from(rooms.values()).filter(r => r.status === 'waiting'));
    });

    // Oda oluştur
    socket.on('room:create', (data: { userId: string; username: string }) => {
      // Kullanıcının zaten bir odası var mı kontrol et
      const existingRoom = Array.from(rooms.values()).find(
        room => (room.host.id === data.userId) || (room.guest?.id === data.userId)
      );

      if (existingRoom) {
        socket.emit('room:error', {
          message: 'Zaten bir odadasınız. Yeni oda oluşturmak için mevcut odadan çıkmalısınız.'
        });
        console.log(`[SOCKET] ${data.username} tried to create room but already in room: ${existingRoom.id}`);
        return;
      }

      const roomId = `room_${roomCounter}`;
      const roomName = `Oda ${roomCounter}`;
      roomCounter++;

      const room: Room = {
        id: roomId,
        name: roomName,
        host: {
          id: data.userId,
          username: data.username,
          socketId: socket.id
        },
        guest: null,
        gameState: null,
        createdAt: new Date(),
        status: 'waiting'
      };

      rooms.set(roomId, room);
      socket.join(roomId);

      console.log(`[SOCKET] Room created: ${roomId} by ${data.username}`);

      // 30 dakika hareketsizlik timer'ını başlat
      startRoomInactivityTimer(roomId);

      // Odayı oluşturana bildir
      socket.emit('room:created', { roomId, room });

      // Tüm kullanıcılara oda listesini güncelle
      io.emit('rooms:list', Array.from(rooms.values()).filter(r => r.status === 'waiting'));
    });

    // Odaya katıl
    socket.on('room:join', async (data: { roomId: string; userId: string; username: string; isTournamentMatch?: boolean; tournamentMatchId?: string; role?: string; readOnly?: boolean }) => {
      let room = rooms.get(data.roomId);

      // Turnuva maçları için: Oda yoksa otomatik oluştur
      if (!room && data.isTournamentMatch && data.tournamentMatchId) {
        console.log(`[SOCKET] Creating tournament room: ${data.roomId} for match ${data.tournamentMatchId}`);

        // Veritabanından match bilgisini çek (oyuncular ve hakem)
        const match = db.prepare(`
          SELECT tm.*,
                 u1.username as player1_username,
                 u2.username as player2_username,
                 u3.username as referee_username
          FROM tournament_matches tm
          LEFT JOIN users u1 ON tm.player1_id = u1.id
          LEFT JOIN users u2 ON tm.player2_id = u2.id
          LEFT JOIN users u3 ON tm.referee_id = u3.id
          WHERE tm.id = ?
        `).get(data.tournamentMatchId) as { player1_id: number; player2_id: number; referee_id: number; player1_username: string; player2_username: string; referee_username: string } | undefined;

        if (!match) {
          socket.emit('room:error', { message: 'Turnuva maçı bulunamadı' });
          return;
        }

        // Kullanıcının bu maçta olup olmadığını kontrol et (oyuncu, hakem veya izleyici)
        const userId = parseInt(data.userId);
        const isObserver = data.role === 'referee' || data.role === 'spectator';

        if (!isObserver) {
          // Oyuncu olarak giriyorsa, bu maçın oyuncusu mu kontrol et
          if (match.player1_id !== userId && match.player2_id !== userId) {
            socket.emit('room:error', { message: 'Bu maçın oyuncusu değilsiniz' });
            return;
          }
        } else if (data.role === 'referee') {
          // Hakem olarak giriyorsa, bu maçın hakemi mi kontrol et
          if (match.referee_id !== userId) {
            socket.emit('room:error', { message: 'Bu maçın hakemi değilsiniz' });
            return;
          }
        }
        // İzleyici için kontrol yok, herkes izleyebilir

        const roomName = `Tournament Match #${data.tournamentMatchId}`;

        room = {
          id: data.roomId,
          name: roomName,
          host: {
            id: data.userId,
            username: data.username,
            socketId: socket.id
          },
          guest: null,
          gameState: null,
          createdAt: new Date(),
          status: 'waiting',
          tournamentMatchId: data.tournamentMatchId,
          tournamentMatchData: match // Match bilgisini sakla
        };

        rooms.set(data.roomId, room);
        socket.join(data.roomId);

        console.log(`[SOCKET] Tournament room created: ${data.roomId} by ${data.username} (player${match.player1_id === userId ? '1' : '2'})`);

        // 30 dakika hareketsizlik timer'ını başlat
        startRoomInactivityTimer(data.roomId);

        // Odayı oluşturana bildir
        socket.emit('room:created', { roomId: data.roomId, room });

        return; // Oda oluşturuldu, guest bekleniyor
      }

      if (!room) {
        socket.emit('room:error', { message: 'Oda bulunamadı' });
        console.log(`[SOCKET] Reconnect failed: Room not found: ${data.roomId}`);
        return;
      }

      // Önce role belirleme - bu kontroller için gerekli
      const isObserver = data.role === 'referee' || data.role === 'spectator';

      // SADECE OYUNCULAR İÇİN: Oda durumu kontrolleri
      if (!isObserver) {
        if (room.status !== 'waiting') {
          socket.emit('room:error', { message: 'Oda dolu veya oyun başlamış' });
          return;
        }

        if (room.guest) {
          socket.emit('room:error', { message: 'Oda dolu' });
          return;
        }
      }

      // Turnuva maçlarında özel kontrol
      if (room.tournamentMatchData) {
        const match = room.tournamentMatchData;
        const userId = parseInt(data.userId);

        // Role bazlı kontrol
        if (!isObserver) {
          // Oyuncu ise, bu maçın oyuncusu mu kontrol et
          if (match.player1_id !== userId && match.player2_id !== userId) {
            socket.emit('room:error', { message: 'Bu maçın oyuncusu değilsiniz' });
            return;
          }

          // Aynı kullanıcı zaten odada mı?
          if (room.host.id === data.userId) {
            socket.emit('room:error', { message: 'Bu odayı zaten siz oluşturdunuz' });
            return;
          }

          console.log(`[SOCKET] Tournament match: ${data.username} joining as player${match.player1_id === userId ? '1' : '2'}`);
        } else if (data.role === 'referee') {
          // Hakem ise, bu maçın hakemi mi kontrol et
          if (match.referee_id !== userId) {
            socket.emit('room:error', { message: 'Bu maçın hakemi değilsiniz' });
            return;
          }
          console.log(`[SOCKET] Tournament match: ${data.username} joining as referee`);
        } else {
          // İzleyici - herkes izleyebilir
          console.log(`[SOCKET] Tournament match: ${data.username} joining as spectator`);
        }
      } else {
        // Normal online oyun: Aynı kullanıcı kendi odasına katılamaz
        if (room.host.id === data.userId) {
          socket.emit('room:error', { message: 'Kendi oluşturduğunuz odaya katılamazsınız' });
          return;
        }
      }

      // SADECE OYUNCULAR İÇİN: Kullanıcının zaten başka bir odası var mı kontrol et
      if (!isObserver) {
        const existingRoom = Array.from(rooms.values()).find(
          r => r.id !== data.roomId && ((r.host.id === data.userId) || (r.guest?.id === data.userId))
        );

        if (existingRoom) {
          socket.emit('room:error', {
            message: 'Zaten başka bir odadasınız. Yeni odaya katılmak için mevcut odadan çıkmalısınız.'
          });
          console.log(`[SOCKET] ${data.username} tried to join room but already in room: ${existingRoom.id}`);
          return;
        }
      }

      if (!isObserver) {
        // Normal oyuncu - guest olarak ekle
        room.guest = {
          id: data.userId,
          username: data.username,
          socketId: socket.id
        };
        room.status = 'playing';
      } else {
        // Hakem veya izleyici - guest olarak ekleme, sadece observer olarak işaretle
        console.log(`[SOCKET] ${data.username} joined as ${data.role}`);
      }

      socket.join(data.roomId);

      console.log(`[SOCKET] ${data.username} joined room: ${data.roomId} as ${data.role || 'player'}`);

      // Her iki oyuncuya bildir
      io.to(data.roomId).emit('room:joined', { room });

      // Eğer oyuncu ise oda listesini güncelle
      if (!isObserver && room.status === 'playing') {
        io.emit('rooms:list', Array.from(rooms.values()).filter(r => r.status === 'waiting'));
      }

      // Hakem/izleyici ise oyun başlatma, sadece mevcut durumu gönder
      if (isObserver) {
        if (room.gameState) {
          // Mevcut oyun varsa izleyiciye gönder
          socket.emit('game:resumed', {
            roomId: data.roomId,
            gameState: room.gameState,
            player1: room.gameState.player1Name,
            player2: room.gameState.player2Name,
            isHost: false  // Observer için
          });
          console.log(`[SOCKET] Observer ${data.username} (${data.role}) watching existing game with state`);
        } else if (room.gameStartInfo) {
          // Oyun başlamış ama henüz gameState yok - gameStartInfo'dan bilgileri al
          console.log(`[SOCKET] Sending game:start to observer ${data.username} (${data.role}) with saved game start info`);
          socket.emit('game:start', {
            roomId: data.roomId,
            player1: room.gameStartInfo.player1,
            player2: room.gameStartInfo.player2,
            firstPlayer: room.gameStartInfo.firstPlayer,
            isHost: false  // Observer için
          });
        } else if (room.status === 'playing' && room.guest) {
          // Fallback: gameStartInfo yok ama oyun başlamış
          if (room.tournamentMatchData) {
            const match = room.tournamentMatchData;
            const firstPlayer = 'player1'; // Varsayılan

            console.log(`[SOCKET] Sending game:start to observer ${data.username} (${data.role}) for ongoing tournament match (fallback)`);
            socket.emit('game:start', {
              roomId: data.roomId,
              player1: match.player1_username,
              player2: match.player2_username,
              firstPlayer: firstPlayer,
              isHost: false  // Observer için
            });
          } else {
            // Normal oyun
            console.log(`[SOCKET] Sending game:start to observer ${data.username} (${data.role}) for ongoing game (fallback)`);
            socket.emit('game:start', {
              roomId: data.roomId,
              player1: room.host.username,
              player2: room.guest.username,
              firstPlayer: 'player1',
              isHost: false  // Observer için
            });
          }
        } else {
          // Henüz oyun başlamamış, beklemeli
          console.log(`[SOCKET] Observer ${data.username} (${data.role}) waiting for game to start`);
        }
        return; // Hakem/izleyici için burada bitir
      }

      // Normal oyuncu için oyun başlatma mantığı
      // Eğer eski oyun durumu varsa, kaldığı yerden devam ettir
      if (room.gameState) {
        console.log(`[SOCKET] Room has saved game state, resuming game`);

        // TIMER RESUME: Yeni oyuncu katıldığında timer'ı devam ettir
        // DİKKAT: room.gameState'i DOĞRUDAN değiştir (deep clone YAPMA - player isimleri bozuluyor!)
        if (room.gameState.currentSetIndex !== undefined) {
          const currentSet = room.gameState.sets[room.gameState.currentSetIndex];
          if (currentSet && currentSet.status === 'active' && currentSet.pausedAt) {
            // Duraklatma süresini hesapla ve toplam pause süresine ekle
            const pauseDuration = Date.now() - currentSet.pausedAt;
            currentSet.totalPausedDuration = (currentSet.totalPausedDuration || 0) + pauseDuration;
            currentSet.pausedAt = undefined; // Pause'u kaldır
            console.log(`[SOCKET] Timer resumed, pause duration: ${pauseDuration}ms, total paused: ${currentSet.totalPausedDuration}ms`);
          }
        }

        console.log(`[SOCKET] Preserving original player roles:`, {
          player1Name: room.gameState.player1Name,
          player2Name: room.gameState.player2Name,
          currentHost: room.host.username,
          currentGuest: room.guest.username
        });

        // GameState referansını kullan (değişiklikler zaten yukarıda yapıldı)
        let updatedGameState = room.gameState;

        // Güncellenmiş state'i room'a kaydet
        room.gameState = updatedGameState;

        console.log(`[SOCKET] Sending gameState:`, {
          currentSetIndex: updatedGameState.currentSetIndex,
          currentPlayer: updatedGameState.sets[updatedGameState.currentSetIndex]?.currentPlayer,
          setStatus: updatedGameState.sets[updatedGameState.currentSetIndex]?.status,
          player1Name: updatedGameState.player1Name,
          player2Name: updatedGameState.player2Name
        });

        // Her oyuncuya ayrı ayrı kendi rol bilgisiyle gönder
        // ÖNEMLI: player1/player2 isimlerini gameState'ten al, room.host/guest'ten ALMA!
        // Çünkü oyuncular swap olmuş olabilir
        // Host'a gönder
        io.to(room.host.socketId).emit('game:resumed', {
          roomId: data.roomId,
          gameState: updatedGameState,
          player1: updatedGameState.player1Name,  // gameState'ten al
          player2: updatedGameState.player2Name,  // gameState'ten al
          isHost: true  // Host için
        });

        // Guest'e gönder
        io.to(room.guest!.socketId).emit('game:resumed', {
          roomId: data.roomId,
          gameState: updatedGameState,
          player1: updatedGameState.player1Name,  // gameState'ten al
          player2: updatedGameState.player2Name,  // gameState'ten al
          isHost: false  // Guest için
        });
      } else {
        // Eski oyun yoksa, yeni oyun başlat
        console.log(`[SOCKET] No saved game, starting new game`);

        const firstPlayer = Math.random() < 0.5 ? 'player1' : 'player2';

        // Turnuva maçı için özel mantık
        if (room.tournamentMatchData) {
          console.log(`[SOCKET] Starting tournament match with correct player roles`);
          const match = room.tournamentMatchData;

          // room.guest null kontrolü
          if (!room.guest) {
            console.error(`[SOCKET] ERROR: room.guest is null when starting tournament match!`);
            return;
          }

          // player1 ve player2'yi veritabanından belirlenen sıraya göre ayarla
          const player1Username = match.player1_username;
          const player2Username = match.player2_username;

          // Oyun başlangıç bilgilerini kaydet (observer'lar için)
          room.gameStartInfo = {
            player1: player1Username,
            player2: player2Username,
            firstPlayer: firstPlayer
          };

          console.log(`[SOCKET] Tournament match data:`, {
            player1_id: match.player1_id,
            player2_id: match.player2_id,
            player1_username: player1Username,
            player2_username: player2Username,
            host_id: room.host.id,
            host_username: room.host.username,
            guest_id: room.guest.id,
            guest_username: room.guest.username,
            firstPlayer: firstPlayer
          });

          // Her oyuncuya doğru rol bilgisiyle gönder
          // player1'e gönder (kim olursa olsun)
          const player1SocketId = room.host.id === match.player1_id.toString()
            ? room.host.socketId
            : room.guest.socketId;

          // player2'ye gönder (kim olursa olsun)
          const player2SocketId = room.host.id === match.player2_id.toString()
            ? room.host.socketId
            : room.guest.socketId;

          console.log(`[SOCKET] Tournament match socket mapping:`, {
            player1_socketId: player1SocketId,
            player2_socketId: player2SocketId,
            host_socketId: room.host.socketId,
            guest_socketId: room.guest.socketId
          });

          // player1'e gönder
          console.log(`[SOCKET] Emitting game:start to player1 (${player1Username})`);
          io.to(player1SocketId).emit('game:start', {
            roomId: data.roomId,
            player1: player1Username,
            player2: player2Username,
            firstPlayer: firstPlayer,
            isHost: room.host.id === match.player1_id.toString()  // player1 host mu?
          });

          // player2'ye gönder
          console.log(`[SOCKET] Emitting game:start to player2 (${player2Username})`);
          io.to(player2SocketId).emit('game:start', {
            roomId: data.roomId,
            player1: player1Username,
            player2: player2Username,
            firstPlayer: firstPlayer,
            isHost: room.host.id === match.player2_id.toString()  // player2 host mu?
          });

          console.log(`[SOCKET] Tournament match started successfully`);

          // Hakem ve izleyicilere de game:start event'i gönder
          // Odadaki diğer tüm kullanıcılara (oyuncular hariç) gönder
          const roomSockets = await io.in(data.roomId).fetchSockets();
          for (const roomSocket of roomSockets) {
            // Player1 ve player2 değilse, observer olarak oyunu başlat
            if (roomSocket.id !== player1SocketId && roomSocket.id !== player2SocketId) {
              console.log(`[SOCKET] Sending game:start to observer: ${roomSocket.id}`);
              io.to(roomSocket.id).emit('game:start', {
                roomId: data.roomId,
                player1: player1Username,
                player2: player2Username,
                firstPlayer: firstPlayer,
                isHost: false  // Observer'lar için host değil
              });
            }
          }
        } else {
          // Normal online oyun mantığı
          // Oyun başlangıç bilgilerini kaydet (observer'lar için)
          room.gameStartInfo = {
            player1: room.host.username,
            player2: room.guest.username,
            firstPlayer: firstPlayer
          };

          // Her oyuncuya ayrı ayrı kendi rol bilgisiyle gönder
          // Host'a gönder
          io.to(room.host.socketId).emit('game:start', {
            roomId: data.roomId,
            player1: room.host.username,
            player2: room.guest.username,
            firstPlayer: firstPlayer,
            isHost: true  // Host için
          });

          // Guest'e gönder
          io.to(room.guest.socketId).emit('game:start', {
            roomId: data.roomId,
            player1: room.host.username,
            player2: room.guest.username,
            firstPlayer: firstPlayer,
            isHost: false  // Guest için
          });
        }
      }
    });

    // Hamle yap
    socket.on('game:move', async (data: { roomId: string; gameState: GameState }) => {
      console.log(`[SOCKET] Move received in room: ${data.roomId}`);
      const room = rooms.get(data.roomId);
      if (!room) {
        console.log(`[SOCKET] Room not found: ${data.roomId}`);
        return;
      }

      // Oyun durumunu güncelle
      room.gameState = data.gameState;

      // Hareketsizlik timer'ını sıfırla
      resetRoomInactivityTimer(data.roomId);

      // Debug: Odadaki tüm socket'leri listele
      const roomSockets = await io.in(data.roomId).fetchSockets();
      console.log(`[SOCKET] Room ${data.roomId} has ${roomSockets.length} total sockets`);
      console.log(`[SOCKET] Sender socket: ${socket.id}`);
      console.log(`[SOCKET] Broadcasting game:update to ${roomSockets.length - 1} other users...`);

      // Odadaki TÜM kullanıcılara (hakem, izleyici dahil) hamleyi bildir (gönderen hariç)
      socket.to(data.roomId).emit('game:update', { gameState: data.gameState });

      console.log(`[SOCKET] game:update event sent successfully`);
    });

    // Oyun bitti
    socket.on('game:end', (data: { roomId: string; winner: string; finalState: GameState }) => {
      const room = rooms.get(data.roomId);
      if (!room) return;

      room.status = 'finished';
      room.gameState = data.finalState;

      // Her iki oyuncuya bildir
      io.to(data.roomId).emit('game:ended', {
        winner: data.winner,
        finalState: data.finalState
      });

      console.log(`[SOCKET] Game ended in room: ${data.roomId}, winner: ${data.winner}`);

      // NOT: Odayı SİLME - oyuncular yeni oyun talep edebilir
      // Oyuncular kendileri odadan ayrılırsa handleRoomLeave otomatik çalışacak
    });

    // Odadan ayrıl
    socket.on('room:leave', (data: { roomId: string }) => {
      // Timer varsa iptal et - kullanıcı bilinçli olarak ayrılıyor
      const room = rooms.get(data.roomId);
      if (room) {
        const userId = room.host.socketId === socket.id ? room.host.id : room.guest?.id;
        if (userId) {
          const existingTimer = disconnectTimers.get(userId);
          if (existingTimer) {
            clearTimeout(existingTimer);
            disconnectTimers.delete(userId);
            console.log(`[SOCKET] Cancelled disconnect timer for user ${userId} (manual leave)`);
          }
        }
      }

      handleRoomLeave(socket, data.roomId);
    });

    // Oyuncu forfeit yaptı (turnuva maçından ayrıldı)
    socket.on('player:forfeit', (data: { roomId: string; userId: string; username: string }) => {
      const room = rooms.get(data.roomId);
      if (!room) return;

      console.log(`[SOCKET] Player ${data.username} forfeited in room ${data.roomId}`);

      // Rakibe bildir
      socket.to(data.roomId).emit('opponent:forfeited', {
        username: data.username,
        message: `${data.username} maçtan ayrıldı ve hükmen yenildi. Siz kazandınız!`
      });
    });

    // Bağlantı koptu
    socket.on('disconnect', () => {
      console.log('[SOCKET] Disconnected:', socket.id);

      // Kullanıcının olduğu odayı bul
      let userRoomId: string | null = null;
      let userId: string | null = null;

      rooms.forEach((room, roomId) => {
        if (room.host.socketId === socket.id) {
          userRoomId = roomId;
          userId = room.host.id;
        } else if (room.guest?.socketId === socket.id) {
          userRoomId = roomId;
          userId = room.guest.id;
        }
      });

      // Eğer kullanıcı bir odada ise, 5 saniye grace period ver
      // Sayfa yenileme olabilir, hemen odayı kapatma
      if (userRoomId && userId) {
        console.log(`[SOCKET] User ${userId} disconnected from room ${userRoomId}, starting grace period...`);

        // Önceki timer varsa iptal et
        const existingTimer = disconnectTimers.get(userId);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        // 5 saniye sonra oda işlemlerini yap
        const timer = setTimeout(() => {
          console.log(`[SOCKET] Grace period ended for user ${userId}, processing room leave...`);
          handleRoomLeave(socket, userRoomId!);
          disconnectTimers.delete(userId!);
        }, DISCONNECT_GRACE_PERIOD);

        disconnectTimers.set(userId, timer);
      }

      connectedUsers.delete(socket.id);
    });

    // Oda listesi iste
    socket.on('rooms:refresh', () => {
      socket.emit('rooms:list', Array.from(rooms.values()).filter(r => r.status === 'waiting'));
    });

    // Sayfa yenilendiğinde odaya yeniden bağlan
    socket.on('room:reconnect', (data: { roomId: string; userId: string; username: string }) => {
      const room = rooms.get(data.roomId);

      if (!room) {
        console.log(`[SOCKET] Reconnect failed: Room not found: ${data.roomId}`);
        socket.emit('room:error', { message: 'Oda bulunamadı' });
        return;
      }

      console.log(`[SOCKET] ${data.username} reconnecting to room: ${data.roomId}`);

      // ÖNEMLI: Disconnect timer'ı iptal et - kullanıcı geri döndü!
      const existingTimer = disconnectTimers.get(data.userId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        disconnectTimers.delete(data.userId);
        console.log(`[SOCKET] Cancelled disconnect timer for user ${data.userId}`);
      }

      // Kullanıcı host mu guest mi?
      const isHost = room.host.id === data.userId;
      const isGuest = room.guest?.id === data.userId;

      if (!isHost && !isGuest) {
        console.log(`[SOCKET] Reconnect failed: User not in room`);
        socket.emit('room:error', { message: 'Bu odada değilsiniz' });
        return;
      }

      // Socket ID'yi güncelle
      if (isHost) {
        room.host.socketId = socket.id;
        console.log(`[SOCKET] Updated host socket ID in room ${data.roomId}`);
      } else if (isGuest && room.guest) {
        room.guest.socketId = socket.id;
        console.log(`[SOCKET] Updated guest socket ID in room ${data.roomId}`);
      }

      // Socket'i odaya katıl
      socket.join(data.roomId);

      // Kullanıcıya oda bilgisini gönder
      socket.emit('room:reconnected', {
        room,
        gameState: room.gameState,
        isHost,
        waitingForOpponent: !room.guest
      });

      // Eğer odada oyun varsa ve karşı oyuncu varsa, her ikisine de güncelleme gönder
      if (room.gameState && room.guest) {
        io.to(data.roomId).emit('room:joined', { room });
      }

      console.log(`[SOCKET] ${data.username} successfully reconnected to room ${data.roomId}`);
    });

    // Chat mesajı gönder
    socket.on('chat:message', (data: { roomId: string; username: string; message: string }) => {
      const room = rooms.get(data.roomId);
      if (!room) return;

      console.log(`[SOCKET] Chat message in room ${data.roomId}: ${data.username}: ${data.message}`);

      // Odadaki herkese (gönderen dahil) mesajı ilet
      io.to(data.roomId).emit('chat:message', {
        username: data.username,
        message: data.message,
        timestamp: new Date().toISOString()
      });
    });

    // Oyunu devam ettir (kullanıcı odaya katılmayı kabul etti)
    socket.on('game:resume', (data: { roomId: string; userId: string; username: string }) => {
      const room = rooms.get(data.roomId);
      if (!room || !room.gameState) return;

      console.log(`[SOCKET] ${data.username} accepted to join room ${data.roomId} and resume game`);

      // Şimdi gerçek join işlemini yap
      room.guest = {
        id: data.userId,
        username: data.username,
        socketId: socket.id
      };
      room.status = 'playing';

      socket.join(data.roomId);

      // Her iki oyuncuya oda join bilgisini gönder
      io.to(data.roomId).emit('room:joined', { room });

      // Oda listesini güncelle (artık waiting değil)
      io.emit('rooms:list', Array.from(rooms.values()).filter(r => r.status === 'waiting'));

      // ÖNEMLI: Player isimlerinin değişip değişmediğini kontrol et
      const oldPlayer1Name = room.gameState.player1Name;
      const oldPlayer2Name = room.gameState.player2Name;
      const newPlayer1Name = room.host.username;
      const newPlayer2Name = room.guest.username;

      // Player'lar yer değiştirdi mi?
      const playersSwapped = (oldPlayer1Name === newPlayer2Name && oldPlayer2Name === newPlayer1Name);

      console.log(`[SOCKET] Player check (game:resume):`, {
        oldPlayer1: oldPlayer1Name,
        oldPlayer2: oldPlayer2Name,
        newPlayer1: newPlayer1Name,
        newPlayer2: newPlayer2Name,
        playersSwapped
      });

      let updatedGameState = {
        ...room.gameState,
        player1Name: newPlayer1Name,
        player2Name: newPlayer2Name
      };

      // Eğer player'lar yer değiştirdiyse, currentPlayer'ı ve move history'yi de swap et
      if (playersSwapped) {
        console.log(`[SOCKET] Players swapped (game:resume), swapping currentPlayer and move history`);
        updatedGameState = {
          ...updatedGameState,
          sets: updatedGameState.sets.map(set => ({
            ...set,
            currentPlayer: set.currentPlayer === 'player1' ? 'player2' as const : 'player1' as const,
            moves: set.moves.map(move => ({
              ...move,
              player: move.player === 'player1' ? 'player2' as const : 'player1' as const
            })),
            winner: set.winner ? (set.winner === 'player1' ? 'player2' as const : set.winner === 'player2' ? 'player1' as const : set.winner) : undefined
          })),
          winner: updatedGameState.winner ? (updatedGameState.winner === 'player1' ? 'player2' : updatedGameState.winner === 'player2' ? 'player1' : updatedGameState.winner) : undefined
        };
      }

      // Güncellenmiş state'i room'a kaydet
      room.gameState = updatedGameState;

      // Kayıtlı oyun durumunu her oyuncuya kendi rol bilgisiyle gönder
      // Host'a gönder
      io.to(room.host.socketId).emit('game:resumed', {
        roomId: data.roomId,
        gameState: updatedGameState,
        player1: room.host.username,
        player2: room.guest.username,
        isHost: true  // Host için
      });

      // Guest'e gönder
      io.to(room.guest.socketId).emit('game:resumed', {
        roomId: data.roomId,
        gameState: updatedGameState,
        player1: room.host.username,
        player2: room.guest.username,
        isHost: false  // Guest için
      });
    });

    // Yeni oyun talebi
    socket.on('game:requestNewGame', (data: { roomId: string; userId: string; username: string }) => {
      const room = rooms.get(data.roomId);
      if (!room || !room.guest) return;

      console.log(`[SOCKET] ${data.username} requested new game in room ${data.roomId}`);

      // Talebi kaydet
      room.newGameRequest = {
        requestedBy: data.userId,
        requestedAt: new Date()
      };

      // Diğer oyuncuya bildir
      socket.to(data.roomId).emit('game:newGameRequested', {
        requestedBy: data.username,
        requestedByUserId: data.userId
      });
    });

    // Yeni oyun talebini kabul et
    socket.on('game:acceptNewGame', (data: { roomId: string }) => {
      const room = rooms.get(data.roomId);
      if (!room || !room.newGameRequest) return;

      console.log(`[SOCKET] New game request accepted in room ${data.roomId}`);

      // Talebi temizle
      room.newGameRequest = undefined;
      room.status = 'playing';

      // Eski oyun state'ini temizle ve yeni oyun başlat
      room.gameState = undefined;

      // İlk oyuncuyu rastgele belirle
      const firstPlayer = Math.random() < 0.5 ? 'player1' : 'player2';

      console.log(`[SOCKET] Starting new game in room ${data.roomId}, first player: ${firstPlayer}`);

      // Her iki oyuncuya yeni oyun başlat sinyali gönder (firstPlayer bilgisi ile)
      io.to(data.roomId).emit('game:newGameAccepted', {
        roomId: data.roomId,
        firstPlayer: firstPlayer,
        player1Name: room.host.username,
        player2Name: room.guest?.username
      });
    });

    // Yeni oyun talebini reddet
    socket.on('game:declineNewGame', (data: { roomId: string }) => {
      const room = rooms.get(data.roomId);
      if (!room || !room.newGameRequest) return;

      console.log(`[SOCKET] New game request declined in room ${data.roomId}`);

      const requestedByUserId = room.newGameRequest.requestedBy;

      // Talebi temizle
      room.newGameRequest = undefined;

      // Talebi gönderen kişiye red cevabını bildir
      const requesterSocketId = room.host.id === requestedByUserId
        ? room.host.socketId
        : room.guest?.socketId;

      if (requesterSocketId) {
        io.to(requesterSocketId).emit('game:newGameDeclined');
      }
    });

  });

  console.log('[SOCKET] ✅ WebSocket server initialized');
}

// 30 dakika hareketsizlik timer'ını başlat
function startRoomInactivityTimer(roomId: string) {
  // Önceki timer varsa temizle
  const existingTimer = roomInactivityTimers.get(roomId);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Yeni timer başlat
  const timer = setTimeout(() => {
    console.log(`[SOCKET] Room ${roomId} has been inactive for 30 minutes, closing room...`);
    const room = rooms.get(roomId);
    if (room) {
      // Odadaki herkese bildir
      io.to(roomId).emit('room:closed-inactivity', {
        message: '30 dakikadan fazla hareketsizlik nedeniyle oda kapatıldı'
      });

      // Odayı kapat
      rooms.delete(roomId);
      io.emit('rooms:list', Array.from(rooms.values()).filter(r => r.status === 'waiting'));
    }
    roomInactivityTimers.delete(roomId);
  }, ROOM_INACTIVITY_TIMEOUT);

  roomInactivityTimers.set(roomId, timer);
  console.log(`[SOCKET] Started 30-minute inactivity timer for room ${roomId}`);
}

// Hareketsizlik timer'ını sıfırla (hamle yapıldığında)
function resetRoomInactivityTimer(roomId: string) {
  startRoomInactivityTimer(roomId);
  console.log(`[SOCKET] Reset inactivity timer for room ${roomId}`);
}

// Odadan ayrılma işlemi
function handleRoomLeave(socket: Socket, roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  const isHost = room.host.socketId === socket.id;
  const isGuest = room.guest?.socketId === socket.id;

  if (!isHost && !isGuest) return;

  // Eğer host ayrılıyor ve guest yoksa, odayı sil (oda boş kalıyor)
  if (isHost && !room.guest) {
    rooms.delete(roomId);
    console.log(`[SOCKET] Room deleted: ${roomId} (host left, room empty)`);
    io.emit('rooms:list', Array.from(rooms.values()).filter(r => r.status === 'waiting'));
    return;
  }

  // Eğer guest ayrılıyorsa, guest'i null yap ve oda waiting'e çevirip açık bırak
  if (isGuest && room.guest) {
    room.guest = null;
    room.status = 'waiting';
    // NOT: room.gameState'i SAKLA - yeni oyuncu geldiğinde kaldığı yerden devam edebilsin

    // TIMER PAUSE: Oyuncu ayrıldığında timer'ı duraklat
    if (room.gameState && room.gameState.currentSetIndex !== undefined) {
      const currentSet = room.gameState.sets[room.gameState.currentSetIndex];
      if (currentSet && currentSet.status === 'active' && !currentSet.pausedAt) {
        currentSet.pausedAt = Date.now();
        console.log(`[SOCKET] Timer paused at ${currentSet.pausedAt} (guest left)`);
      }
    }

    // Host'a bildir - oyun alanında kalabilir
    socket.to(roomId).emit('room:opponent-left', {
      message: 'Rakibiniz ayrıldı. Yeni rakip bekleniyor...',
      waitingForPlayer: true
    });

    console.log(`[SOCKET] Guest left room: ${roomId}, room reopened for new players (gameState preserved)`);

    // Oda listesini güncelle (tekrar waiting'e döndü)
    io.emit('rooms:list', Array.from(rooms.values()).filter(r => r.status === 'waiting'));
    return;
  }

  // Eğer host ayrılıyorsa ve guest varsa, guest'i host yap
  if (isHost && room.guest) {
    // Guest'i yeni host yap
    const oldGuest = room.guest;
    room.host = oldGuest;
    room.guest = null;
    room.status = 'waiting';
    // NOT: room.gameState'i SAKLA - yeni oyuncu geldiğinde kaldığı yerden devam edebilsin

    // TIMER PAUSE: Oyuncu ayrıldığında timer'ı duraklat
    if (room.gameState && room.gameState.currentSetIndex !== undefined) {
      const currentSet = room.gameState.sets[room.gameState.currentSetIndex];
      if (currentSet && currentSet.status === 'active' && !currentSet.pausedAt) {
        currentSet.pausedAt = Date.now();
        console.log(`[SOCKET] Timer paused at ${currentSet.pausedAt} (host left)`);
      }
    }

    // Yeni host'a bildir
    socket.to(roomId).emit('room:opponent-left', {
      message: 'Rakibiniz ayrıldı. Siz artık oda sahibisiniz. Yeni rakip bekleniyor...',
      waitingForPlayer: true,
      becameHost: true
    });

    console.log(`[SOCKET] Host left room: ${roomId}, guest became new host (gameState preserved)`);

    // Oda listesini güncelle (tekrar waiting'e döndü)
    io.emit('rooms:list', Array.from(rooms.values()).filter(r => r.status === 'waiting'));
    return;
  }
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}

// Turnuva maçı için oda durumunu kontrol et
export function getTournamentRoomStatus(roomId: string) {
  const room = rooms.get(roomId);

  if (!room) {
    return { exists: false };
  }

  return {
    exists: true,
    status: room.status,
    waitingForGuest: room.status === 'waiting' && !room.guest,
    hostUsername: room.host.username,
    guestUsername: room.guest?.username || null,
    createdAt: room.createdAt
  };
}

export type { Room, ConnectedUser };
