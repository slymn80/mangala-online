/**
 * WebSocket Service for Online Multiplayer
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import type { GameState } from '../../types/game.types.js';

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

      // Odayı oluşturana bildir
      socket.emit('room:created', { roomId, room });

      // Tüm kullanıcılara oda listesini güncelle
      io.emit('rooms:list', Array.from(rooms.values()).filter(r => r.status === 'waiting'));
    });

    // Odaya katıl
    socket.on('room:join', (data: { roomId: string; userId: string; username: string }) => {
      const room = rooms.get(data.roomId);

      if (!room) {
        socket.emit('room:error', { message: 'Oda bulunamadı' });
        return;
      }

      if (room.status !== 'waiting') {
        socket.emit('room:error', { message: 'Oda dolu veya oyun başlamış' });
        return;
      }

      if (room.guest) {
        socket.emit('room:error', { message: 'Oda dolu' });
        return;
      }

      // Aynı kullanıcı kendi odasına katılamaz
      if (room.host.userId === data.userId) {
        socket.emit('room:error', { message: 'Kendi oluşturduğunuz odaya katılamazsınız' });
        return;
      }

      // Eğer eski oyun durumu varsa, ÖNCE kullanıcıya sor
      if (room.gameState) {
        console.log(`[SOCKET] Room has saved game state, asking user if they want to join`);

        // Kullanıcıya sor (henüz join etme)
        socket.emit('game:ask-resume', {
          roomId: data.roomId,
          player1: room.host.username,
          player2: room.guest ? room.guest.username : 'Waiting...',
          savedGameState: room.gameState
        });

        // Join işlemi game:resume event'inde yapılacak
        return;
      }

      // Eski oyun yoksa, normal join
      room.guest = {
        id: data.userId,
        username: data.username,
        socketId: socket.id
      };
      room.status = 'playing';

      socket.join(data.roomId);

      console.log(`[SOCKET] ${data.username} joined room: ${data.roomId}`);

      // Her iki oyuncuya bildir
      io.to(data.roomId).emit('room:joined', { room });

      // Oda listesini güncelle (artık waiting değil)
      io.emit('rooms:list', Array.from(rooms.values()).filter(r => r.status === 'waiting'));

      // Yeni oyun başlat
      const firstPlayer = Math.random() < 0.5 ? 'player1' : 'player2';
      io.to(data.roomId).emit('game:start', {
        roomId: data.roomId,
        player1: room.host.username,
        player2: room.guest.username,
        firstPlayer: firstPlayer
      });
    });

    // Hamle yap
    socket.on('game:move', (data: { roomId: string; gameState: GameState }) => {
      console.log(`[SOCKET] Move received in room: ${data.roomId}`);
      const room = rooms.get(data.roomId);
      if (!room) {
        console.log(`[SOCKET] Room not found: ${data.roomId}`);
        return;
      }

      // Oyun durumunu güncelle
      room.gameState = data.gameState;

      // Diğer oyuncuya hamleyi bildir
      socket.to(data.roomId).emit('game:update', { gameState: data.gameState });

      console.log(`[SOCKET] Move sent to opponent in room: ${data.roomId}`);
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

      // 10 saniye sonra odayı sil
      setTimeout(() => {
        rooms.delete(data.roomId);
        console.log(`[SOCKET] Room deleted: ${data.roomId}`);
      }, 10000);
    });

    // Odadan ayrıl
    socket.on('room:leave', (data: { roomId: string }) => {
      handleRoomLeave(socket, data.roomId);
    });

    // Bağlantı koptu
    socket.on('disconnect', () => {
      console.log('[SOCKET] Disconnected:', socket.id);

      // Kullanıcının olduğu odaları bul ve temizle
      rooms.forEach((room, roomId) => {
        if (room.host.socketId === socket.id || room.guest?.socketId === socket.id) {
          handleRoomLeave(socket, roomId);
        }
      });

      connectedUsers.delete(socket.id);
    });

    // Oda listesi iste
    socket.on('rooms:refresh', () => {
      socket.emit('rooms:list', Array.from(rooms.values()).filter(r => r.status === 'waiting'));
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

      // Kayıtlı oyun durumunu gönder
      io.to(data.roomId).emit('game:resumed', {
        roomId: data.roomId,
        gameState: room.gameState,
        player1: room.host.username,
        player2: room.guest.username
      });
    });
  });

  console.log('[SOCKET] ✅ WebSocket server initialized');
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

export { Room, ConnectedUser };
