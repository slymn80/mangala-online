/**
 * Profil ve İstatistik Sayfası
 */

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface GameHistoryItem {
  id: number;
  player1_name: string;
  player2_name: string;
  game_mode: string;
  winner: string | null;
  final_score_p1: number;
  final_score_p2: number;
  created_at: string;
}

interface BlockedUser {
  id: number;
  username: string;
  display_name: string;
}

interface ProfileProps {
  onClose: () => void;
}

const Profile: React.FC<ProfileProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { user, token, logout } = useAuthStore();
  const [gameHistory, setGameHistory] = useState<GameHistoryItem[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [blockedLoading, setBlockedLoading] = useState(true);

  useEffect(() => {
    fetchGameHistory();
    fetchBlockedUsers();
  }, []);

  const fetchGameHistory = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/profile/games?limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setGameHistory(data.games);
      }
    } catch (error) {
      console.error('[PROFILE] Error fetching game history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBlockedUsers = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/profile/blocked`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBlockedUsers(data.blockedUsers);
      }
    } catch (error) {
      console.error('[PROFILE] Error fetching blocked users:', error);
    } finally {
      setBlockedLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert('Doğrulama email\'i gönderildi! Lütfen email kutunuzu kontrol ediniz.');
      } else {
        const data = await response.json();
        alert(data.error || 'Email gönderilemedi');
      }
    } catch (error) {
      console.error('[PROFILE] Error resending verification:', error);
      alert('Bir hata oluştu');
    }
  };

  const handleUnblockUser = async (userId: number, username: string) => {
    if (!token) return;

    if (!window.confirm(`${username} kullanıcısının engelini kaldırmak istediğinizden emin misiniz?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/profile/block/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        alert(`${username} kullanıcısının engeli kaldırıldı`);
        // Listeyi yenile
        fetchBlockedUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Engel kaldırma başarısız oldu');
      }
    } catch (error) {
      console.error('[PROFILE] Error unblocking user:', error);
      alert('Bir hata oluştu');
    }
  };

  if (!user) return null;

  const winRate = user.total_games > 0
    ? ((user.total_wins / user.total_games) * 100).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            👤 Profil
          </h1>
          <button
            onClick={onClose}
            className="btn btn-secondary px-4 py-2"
          >
            ← Geri Dön
          </button>
        </div>

        {/* Kullanıcı Bilgileri */}
        <div className="card p-6">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-4xl text-white font-bold">
              {user.display_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold dark:text-white text-gray-900">{user.display_name}</h2>
              <p className="text-gray-500 dark:text-gray-400">@{user.username}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {user.email}
                {user.email_verified ? (
                  <span className="ml-2 text-green-600">✓ Doğrulanmış</span>
                ) : (
                  <span className="ml-2 text-orange-600">⚠ Doğrulanmamış</span>
                )}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Üyelik: {new Date(user.created_at).toLocaleDateString('tr-TR')}
              </p>
            </div>
            <button
              onClick={() => {
                if (window.confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
                  logout();
                  window.location.reload();
                }
              }}
              className="btn btn-danger px-4 py-2"
            >
              🚪 Çıkış Yap
            </button>
          </div>

          {/* Email Doğrulama Uyarısı */}
          {!user.email_verified && (
            <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    📧 Email adresiniz henüz doğrulanmamış. Lütfen email kutunuzu kontrol edin.
                  </p>
                </div>
                <button
                  onClick={resendVerificationEmail}
                  className="btn btn-secondary text-sm px-3 py-1"
                >
                  Tekrar Gönder
                </button>
              </div>
            </div>
          )}
        </div>

        {/* İstatistikler */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold text-blue-500">{user.total_games}</p>
            <p className="text-sm text-gray-500 mt-1">Toplam Oyun</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold text-green-500">{user.total_wins}</p>
            <p className="text-sm text-gray-500 mt-1">Galibiyet</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold text-red-500">{user.total_losses}</p>
            <p className="text-sm text-gray-500 mt-1">Mağlubiyet</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-3xl font-bold text-yellow-500">{winRate}%</p>
            <p className="text-sm text-gray-500 mt-1">Kazanma Oranı</p>
          </div>
        </div>

        {/* Engellenmiş Kullanıcılar */}
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-4 dark:text-white text-gray-900">
            🚫 Engellenmiş Kullanıcılar
          </h2>

          {blockedLoading ? (
            <p className="text-center text-gray-500 py-8">Yükleniyor...</p>
          ) : blockedUsers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Engellenmiş kullanıcı bulunmuyor</p>
          ) : (
            <div className="space-y-2">
              {blockedUsers.map((blockedUser) => (
                <div
                  key={blockedUser.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div>
                    <p className="font-medium dark:text-white text-gray-900">
                      {blockedUser.display_name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      @{blockedUser.username}
                    </p>
                  </div>
                  <button
                    onClick={() => handleUnblockUser(blockedUser.id, blockedUser.username)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors"
                  >
                    Engeli Kaldır
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Oyun Geçmişi */}
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-4 dark:text-white text-gray-900">
            📜 Oyun Geçmişi
          </h2>

          {loading ? (
            <p className="text-center text-gray-500 py-8">Yükleniyor...</p>
          ) : gameHistory.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Henüz oyun geçmişiniz bulunmuyor</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-gray-700 border-gray-200">
                    <th className="px-4 py-2 text-left text-sm text-gray-500">Tarih</th>
                    <th className="px-4 py-2 text-left text-sm text-gray-500">Oyuncular</th>
                    <th className="px-4 py-2 text-center text-sm text-gray-500">Skor</th>
                    <th className="px-4 py-2 text-center text-sm text-gray-500">Sonuç</th>
                  </tr>
                </thead>
                <tbody>
                  {gameHistory.map((game) => {
                    const isWinner = game.winner === 'player1';
                    const isDraw = game.winner === 'draw';

                    return (
                      <tr key={game.id} className="border-b dark:border-gray-800 border-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 text-sm">
                          {new Date(game.created_at).toLocaleDateString('tr-TR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex flex-col">
                            <span className={isWinner ? 'font-bold text-green-600' : ''}>
                              {game.player1_name}
                            </span>
                            <span className="text-gray-500">vs</span>
                            <span className={!isWinner && !isDraw ? 'font-bold text-green-600' : ''}>
                              {game.player2_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold">
                          {game.final_score_p1} - {game.final_score_p2}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isDraw ? (
                            <span className="text-gray-500">🤝 Berabere</span>
                          ) : isWinner ? (
                            <span className="text-green-600 font-bold">✅ Kazandın</span>
                          ) : (
                            <span className="text-red-600">❌ Kaybettin</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
