/**
 * Chat Bileşeni - Online Multiplayer
 */

import React, { useState, useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';

interface ChatMessage {
  username: string;
  message: string;
  timestamp: string;
}

interface ChatProps {
  socket: Socket | null;
  roomId: string | null;
  username: string;
  opponentUsername?: string;
  opponentUserId?: number;
}

const Chat: React.FC<ChatProps> = ({ socket, roomId, username, opponentUsername, opponentUserId }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isChatEnabled, setIsChatEnabled] = useState(() => {
    const saved = localStorage.getItem('chatEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [isBlocking, setIsBlocking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // localStorage'a chat durumunu kaydet
  useEffect(() => {
    localStorage.setItem('chatEnabled', JSON.stringify(isChatEnabled));
  }, [isChatEnabled]);

  useEffect(() => {
    if (!socket || !roomId) return;

    const handleChatMessage = (data: ChatMessage) => {
      setMessages((prev) => [...prev, data]);
    };

    socket.on('chat:message', handleChatMessage);

    return () => {
      socket.off('chat:message', handleChatMessage);
    };
  }, [socket, roomId]);

  // Auto-scroll en yeni mesaja
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || !roomId || !inputMessage.trim()) return;

    socket.emit('chat:message', {
      roomId,
      username,
      message: inputMessage.trim()
    });

    setInputMessage('');
  };

  const handleBlockUser = async () => {
    if (!opponentUserId || !opponentUsername) {
      alert('Rakip kullanıcı bilgisi bulunamadı');
      return;
    }

    if (!window.confirm(`${opponentUsername} kullanıcısını engellemek istediğinizden emin misiniz?\n\nEngellenen kullanıcılarla tekrar eşleşmeyeceksiniz.`)) {
      return;
    }

    setIsBlocking(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/profile/block/${opponentUserId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert(`${opponentUsername} engellendi`);
      } else {
        const data = await response.json();
        alert(data.error || 'Engelleme başarısız oldu');
      }
    } catch (error) {
      console.error('[CHAT] Block user error:', error);
      alert('Bir hata oluştu');
    } finally {
      setIsBlocking(false);
    }
  };

  if (!socket || !roomId) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${isExpanded ? 'w-80' : 'w-12'}`}>
      {isExpanded ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-300 dark:border-gray-700 flex flex-col h-96">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-300 dark:border-gray-700 bg-blue-600 rounded-t-lg">
            <h3 className="font-bold text-white text-sm">💬 Chat</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsChatEnabled(!isChatEnabled)}
                className="text-white hover:text-gray-200 text-lg leading-none transition-opacity"
                title={isChatEnabled ? 'Mesajlaşmayı Kapat' : 'Mesajlaşmayı Aç'}
              >
                {isChatEnabled ? '💬' : '🔕'}
              </button>
              {opponentUserId && (
                <button
                  onClick={handleBlockUser}
                  disabled={isBlocking}
                  className="text-white hover:text-red-300 text-lg leading-none transition-opacity disabled:opacity-50"
                  title={`${opponentUsername || 'Rakip'} kullanıcısını engelle`}
                >
                  🚫
                </button>
              )}
              <button
                onClick={() => setIsExpanded(false)}
                className="text-white hover:text-gray-200 text-xl leading-none"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50 dark:bg-gray-900">
            {!isChatEnabled ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-center text-gray-500 dark:text-gray-400 text-sm font-medium">
                  🔇 Chat kapalı
                </p>
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-gray-400 text-sm mt-4">Henüz mesaj yok</p>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.username === username ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 ${
                      msg.username === username
                        ? 'bg-blue-500 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <p className="text-xs font-semibold mb-1 opacity-75">
                      {msg.username === username ? 'Sen' : msg.username}
                    </p>
                    <p className="text-sm break-words">{msg.message}</p>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="p-3 border-t border-gray-300 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={isChatEnabled ? "Mesaj yaz..." : "Chat kapalı"}
                disabled={!isChatEnabled}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                maxLength={200}
              />
              <button
                type="submit"
                disabled={!isChatEnabled || !inputMessage.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                📤
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center text-xl transition-transform hover:scale-110"
          title="Chat'i Aç"
        >
          💬
        </button>
      )}
    </div>
  );
};

export default Chat;
