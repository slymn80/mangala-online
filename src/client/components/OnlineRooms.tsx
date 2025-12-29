/**
 * Online Multiplayer - Oda Listesi ve Yönetimi
 */

import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { useGameStore } from '../store/gameStore';

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
  status: 'waiting' | 'playing' | 'finished';
  createdAt: Date;
}

interface OnlineRoomsProps {
  onClose: () => void;
  onGameStart: (roomId: string, isHost: boolean, socket: Socket, player1Username: string, player2Username: string, firstPlayer: 'player1' | 'player2', savedGameState?: any) => void;
}

const OnlineRooms: React.FC<OnlineRoomsProps> = ({ onClose, onGameStart }) => {
  const { user } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // Socket bağlantısı kur
    // Development: Vite proxy üzerinden
    // Production veya network: VITE_SOCKET_URL kullan (örn: http://192.168.1.100:3001)
    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
    console.log('[SOCKET] Connecting to:', socketUrl);

    const newSocket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('[SOCKET] Connected:', newSocket.id);
      newSocket.emit('user:connected', {
        userId: user.id.toString(),
        username: user.username  // Display name yerine username kullan
      });
    });

    // Oda listesi
    newSocket.on('rooms:list', (roomList: Room[]) => {
      console.log('[SOCKET] Rooms list:', roomList);
      setRooms(roomList);
    });

    // Event handler'ları tanımla
    const handleRoomCreated = ({ roomId, room }: { roomId: string; room: Room }) => {
      console.log('[SOCKET] Room created:', roomId);
      setCurrentRoom(room);
    };

    const handleRoomJoined = ({ room }: { room: Room }) => {
      console.log('[SOCKET] Room joined:', room);
      setCurrentRoom(room);
    };

    const handleAskResume = ({ roomId, player1, player2, savedGameState }: any) => {
      console.log('[SOCKET] Room has saved game, asking user if they want to join');

      const choice = window.confirm(
        'Bu odada daha önce oynanan bir oyun var.\n\n' +
        'Oyun kaldığı yerden devam edecek.\n\n' +
        '✅ TAMAM = Odaya katıl ve oyuna devam et\n' +
        '❌ İPTAL = Salonda kal (odaya katılma)\n\n' +
        'Odaya katılmak istiyor musunuz?'
      );

      if (choice) {
        // Oyunu kaldığı yerden devam ettir - userId ve username gönder
        newSocket.emit('game:resume', {
          roomId,
          userId: user.id.toString(),
          username: user.username
        });
      } else {
        // Odaya katılma, salonda kal
        console.log('[SOCKET] User declined to join room with saved game');
        // Hiçbir şey yapma - kullanıcı salonda kalacak
      }
    };

    const handleGameResumed = ({ roomId, gameState, player1, player2 }: any) => {
      console.log('[SOCKET] Game resumed:', player1, 'vs', player2, 'in room', roomId);
      const isHost = player1 === user.username;
      // firstPlayer'ı gameState'den al
      const currentSet = gameState.sets[gameState.currentSetIndex];
      const firstPlayer = currentSet.currentPlayer || 'player1';
      onGameStart(roomId, isHost, newSocket, player1, player2, firstPlayer, gameState);
    };

    const handleGameStart = ({ roomId, player1, player2, firstPlayer }: { roomId: string; player1: string; player2: string; firstPlayer: 'player1' | 'player2' }) => {
      console.log('[SOCKET] Game starting:', player1, 'vs', player2, 'in room', roomId, 'first player:', firstPlayer);
      const isHost = player1 === user.username;
      onGameStart(roomId, isHost, newSocket, player1, player2, firstPlayer, undefined);
    };

    const handleRoomError = ({ message }: { message: string }) => {
      setError(message);
      setTimeout(() => setError(null), 3000);
    };

    // Event listener'ları ekle
    newSocket.on('room:created', handleRoomCreated);
    newSocket.on('room:joined', handleRoomJoined);
    newSocket.on('game:ask-resume', handleAskResume);
    newSocket.on('game:resumed', handleGameResumed);
    newSocket.on('game:start', handleGameStart);
    newSocket.on('room:error', handleRoomError);

    setSocket(newSocket);

    // Cleanup: Component unmount olduğunda listener'ları temizle
    return () => {
      // Socket'i disconnect ETME (oyun için gerekli)
      // Ama bu component'e ait listener'ları KALDIR
      console.log('[SOCKET] OnlineRooms cleaning up listeners');
      newSocket.off('connect');
      newSocket.off('rooms:list');
      newSocket.off('room:created', handleRoomCreated);
      newSocket.off('room:joined', handleRoomJoined);
      newSocket.off('game:ask-resume', handleAskResume);
      newSocket.off('game:resumed', handleGameResumed);
      newSocket.off('game:start', handleGameStart);
      newSocket.off('room:error', handleRoomError);
      console.log('[SOCKET] OnlineRooms listeners cleaned up');
    };
  }, [user, onGameStart]);

  const createRoom = () => {
    if (!socket || !user) return;

    socket.emit('room:create', {
      userId: user.id.toString(),
      username: user.username  // Display name yerine username kullan
    });
  };

  const joinRoom = (roomId: string) => {
    if (!socket || !user) return;

    socket.emit('room:join', {
      roomId,
      userId: user.id.toString(),
      username: user.username  // Display name yerine username kullan
    });
  };

  const leaveRoom = () => {
    if (!socket || !currentRoom) return;

    socket.emit('room:leave', { roomId: currentRoom.id });
    setCurrentRoom(null);
  };

  const refreshRooms = () => {
    if (!socket) return;
    socket.emit('rooms:refresh');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="card p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Giriş Gerekli</h2>
          <p>Online oynamak için giriş yapmanız gerekiyor.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            🌐 Online Multiplayer
          </h1>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            ← Geri Dön
          </button>
        </div>

        {/* Hata Mesajı */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200">
            {error}
          </div>
        )}

        {/* Mevcut Oda */}
        {currentRoom ? (
          <div className="bg-gradient-to-br from-green-900/30 to-blue-900/30 rounded-2xl p-6 border border-green-700/50 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">{currentRoom.name}</h2>
              <button
                onClick={leaveRoom}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
              >
                Odadan Ayrıl
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-2">Ev Sahibi</p>
                <p className="text-lg font-bold text-green-400">{currentRoom.host.username}</p>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-2">Misafir</p>
                <p className="text-lg font-bold text-blue-400">
                  {currentRoom.guest?.username || 'Bekleniyor...'}
                </p>
              </div>
            </div>

            {!currentRoom.guest && (
              <div className="mt-4 text-center text-yellow-400 animate-pulse">
                ⏳ Rakip bekleniyor...
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Oda Oluştur Butonu */}
            <div className="mb-6 flex gap-4">
              <button
                onClick={createRoom}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg font-bold transition-all shadow-lg"
              >
                + Yeni Oda Oluştur
              </button>
              <button
                onClick={refreshRooms}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                🔄 Yenile
              </button>
            </div>

            {/* Oda Listesi */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">
                Aktif Odalar ({rooms.length})
              </h3>

              {rooms.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-2xl mb-2">🎮</p>
                  <p>Henüz aktif oda yok</p>
                  <p className="text-sm mt-2">İlk odayı siz oluşturun!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex-1">
                        <h4 className="font-bold text-white text-lg">{room.name}</h4>
                        <p className="text-sm text-gray-400">
                          Ev Sahibi: {room.host.username}
                        </p>
                      </div>
                      <button
                        onClick={() => joinRoom(room.id)}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                      >
                        Katıl →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Bağlantı Durumu */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            {socket?.connected ? (
              <span className="text-green-400">● Bağlı</span>
            ) : (
              <span className="text-red-400">● Bağlantı Kesildi</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnlineRooms;
