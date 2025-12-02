/**
 * Geliştirilmiş Kullanıcı Dashboard - Profil ve İstatistikler
 */

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';

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

interface DetailedStats {
  general: {
    total_games: number;
    total_wins: number;
    total_losses: number;
    total_draws: number;
  };
  modeStats: Array<{
    game_mode: string;
    games_played: number;
    wins: number;
    draws: number;
  }>;
  weeklyActivity: Array<{
    date: string;
    games_count: number;
  }>;
  topOpponents: Array<{
    opponent_name: string;
    games_played: number;
    wins: number;
  }>;
  avgScore: number;
  currentStreak: number;
  recentResults: string[];
}

interface DashboardProps {
  onClose: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onClose }) => {
  const { user, token, logout } = useAuthStore();
  const [gameHistory, setGameHistory] = useState<GameHistoryItem[]>([]);
  const [detailedStats, setDetailedStats] = useState<DetailedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(user?.display_name || '');
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'stats'>('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);

    try {
      const [historyRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/profile/games?limit=10`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_URL}/profile/stats/detailed`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (historyRes.ok) {
        const data = await historyRes.json();
        setGameHistory(data.games);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setDetailedStats(data);
      }
    } catch (error) {
      console.error('[DASHBOARD] Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    if (!token || !newDisplayName.trim()) return;

    try {
      const response = await fetch(`${API_URL}/profile/update`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ display_name: newDisplayName.trim() })
      });

      if (response.ok) {
        const data = await response.json();
        // Update local user state
        window.location.reload();
      } else {
        const data = await response.json();
        alert(data.error || 'Profil güncellenemedi');
      }
    } catch (error) {
      console.error('[DASHBOARD] Update profile error:', error);
      alert('Bir hata oluştu');
    }
  };

  const resendVerificationEmail = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        alert('Doğrulama emaili gönderildi! Lütfen email kutunuzu kontrol ediniz.');
      } else {
        const data = await response.json();
        alert(data.error || 'Email gönderilemedi');
      }
    } catch (error) {
      console.error('[DASHBOARD] Error resending verification:', error);
      alert('Bir hata oluştu');
    }
  };

  if (!user) return null;

  const winRate = user.total_games > 0
    ? ((user.total_wins / user.total_games) * 100).toFixed(1)
    : '0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Geri Dön
          </button>
        </div>

        {/* Profil Kartı */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 shadow-2xl border border-gray-700">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-4xl text-white font-bold shadow-lg">
                {user.display_name.charAt(0).toUpperCase()}
              </div>
              {detailedStats && detailedStats.currentStreak > 2 && (
                <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                  {detailedStats.currentStreak} Win Streak!
                </div>
              )}
            </div>

            {/* Kullanıcı Bilgileri */}
            <div className="flex-1 text-center md:text-left">
              {isEditingProfile ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 outline-none"
                    placeholder="Görünen Ad"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        updateProfile();
                        setIsEditingProfile(false);
                      }}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                    >
                      Kaydet
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingProfile(false);
                        setNewDisplayName(user.display_name);
                      }}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-white">{user.display_name}</h2>
                  <p className="text-gray-400">@{user.username}</p>
                </>
              )}
              <p className="text-sm text-gray-400 mt-1">
                {user.email}
                {user.email_verified ? (
                  <span className="ml-2 text-green-400">✓ Doğrulanmış</span>
                ) : (
                  <span className="ml-2 text-orange-400">⚠ Doğrulanmamış</span>
                )}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Üyelik: {new Date(user.created_at).toLocaleDateString('tr-TR')}
              </p>
            </div>

            {/* Aksiyon Butonları */}
            <div className="flex flex-col gap-2">
              {!isEditingProfile && (
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Profili Düzenle
                </button>
              )}
              <button
                onClick={() => {
                  if (window.confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
                    logout();
                    window.location.reload();
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Çıkış Yap
              </button>
            </div>
          </div>

          {/* Email Doğrulama Uyarısı */}
          {!user.email_verified && (
            <div className="mt-4 p-4 bg-orange-900/30 border border-orange-700 rounded-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm text-orange-200">
                  Email adresiniz henüz doğrulanmamış. Lütfen email kutunuzu kontrol edin.
                </p>
                <button
                  onClick={resendVerificationEmail}
                  className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm"
                >
                  Tekrar Gönder
                </button>
              </div>
            </div>
          )}
        </div>

        {/* İstatistik Kartları */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard
            icon="🎮"
            label="Toplam Oyun"
            value={user.total_games}
            color="blue"
          />
          <StatCard
            icon="🏆"
            label="Galibiyet"
            value={user.total_wins}
            color="green"
          />
          <StatCard
            icon="💔"
            label="Mağlubiyet"
            value={user.total_losses}
            color="red"
          />
          <StatCard
            icon="🚪"
            label="Terk Edilen"
            value={user.total_abandoned || 0}
            color="orange"
          />
          <StatCard
            icon="📊"
            label="Kazanma Oranı"
            value={`${winRate}%`}
            color="yellow"
          />
        </div>

        {/* Tab Navigasyonu */}
        <div className="flex gap-2 border-b border-gray-700">
          <TabButton
            label="Genel Bakış"
            active={activeTab === 'overview'}
            onClick={() => setActiveTab('overview')}
          />
          <TabButton
            label="Oyun Geçmişi"
            active={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
          />
          <TabButton
            label="Detaylı İstatistikler"
            active={activeTab === 'stats'}
            onClick={() => setActiveTab('stats')}
          />
        </div>

        {/* Tab İçerikleri */}
        {loading ? (
          <div className="text-center text-gray-400 py-8">Yükleniyor...</div>
        ) : (
          <>
            {activeTab === 'overview' && detailedStats && (
              <OverviewTab
                detailedStats={detailedStats}
                recentGames={gameHistory.slice(0, 5)}
              />
            )}
            {activeTab === 'history' && (
              <HistoryTab games={gameHistory} />
            )}
            {activeTab === 'stats' && detailedStats && (
              <StatsTab detailedStats={detailedStats} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Yardımcı Componentler
const StatCard: React.FC<{
  icon: string;
  label: string;
  value: string | number;
  color: 'blue' | 'green' | 'red' | 'yellow' | 'orange';
}> = ({ icon, label, value, color }) => {
  const colorClasses = {
    blue: 'from-blue-600 to-blue-800',
    green: 'from-green-600 to-green-800',
    red: 'from-red-600 to-red-800',
    yellow: 'from-yellow-600 to-yellow-800',
    orange: 'from-orange-600 to-orange-800'
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-xl p-4 text-center shadow-lg`}>
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-sm text-gray-200 mt-1">{label}</p>
    </div>
  );
};

const TabButton: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 font-medium transition-colors ${
      active
        ? 'text-blue-400 border-b-2 border-blue-400'
        : 'text-gray-400 hover:text-gray-300'
    }`}
  >
    {label}
  </button>
);

const OverviewTab: React.FC<{
  detailedStats: DetailedStats;
  recentGames: GameHistoryItem[];
}> = ({ detailedStats, recentGames }) => (
  <div className="grid md:grid-cols-2 gap-6">
    {/* Son Form */}
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4">Son 10 Maç Formu</h3>
      <div className="flex gap-2 justify-center flex-wrap">
        {detailedStats.recentResults.map((result, index) => (
          <div
            key={index}
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
              result === 'W'
                ? 'bg-green-600'
                : result === 'L'
                ? 'bg-red-600'
                : 'bg-gray-600'
            }`}
          >
            {result}
          </div>
        ))}
      </div>
      {detailedStats.currentStreak > 0 && (
        <p className="text-center mt-4 text-green-400 font-bold">
          🔥 {detailedStats.currentStreak} maçlık galibiyet serisi!
        </p>
      )}
    </div>

    {/* En Çok Oynanan Rakipler */}
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4">En Çok Oynanan Rakipler</h3>
      <div className="space-y-3">
        {detailedStats.topOpponents.map((opponent, index) => (
          <div key={index} className="flex justify-between items-center bg-gray-700 rounded-lg p-3">
            <div>
              <p className="text-white font-medium">{opponent.opponent_name}</p>
              <p className="text-sm text-gray-400">{opponent.games_played} oyun</p>
            </div>
            <div className="text-right">
              <p className="text-green-400 font-bold">{opponent.wins}W</p>
              <p className="text-sm text-gray-400">
                {((opponent.wins / opponent.games_played) * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Son Oyunlar */}
    <div className="md:col-span-2 bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4">Son Oyunlar</h3>
      <div className="space-y-2">
        {recentGames.map((game) => {
          const isWinner = game.winner === 'player1';
          const isDraw = game.winner === 'draw';

          return (
            <div key={game.id} className="flex justify-between items-center bg-gray-700 rounded-lg p-3">
              <div className="flex-1">
                <p className="text-white font-medium">
                  {game.player1_name} vs {game.player2_name}
                </p>
                <p className="text-sm text-gray-400">
                  {new Date(game.created_at).toLocaleDateString('tr-TR')}
                </p>
              </div>
              <div className="text-center mx-4">
                <p className="text-white font-bold">
                  {game.final_score_p1} - {game.final_score_p2}
                </p>
              </div>
              <div>
                {isDraw ? (
                  <span className="text-gray-400">Berabere</span>
                ) : isWinner ? (
                  <span className="text-green-400 font-bold">Kazandın</span>
                ) : (
                  <span className="text-red-400">Kaybettin</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

const HistoryTab: React.FC<{ games: GameHistoryItem[] }> = ({ games }) => (
  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
    <h3 className="text-xl font-bold text-white mb-4">Tüm Oyun Geçmişi</h3>
    {games.length === 0 ? (
      <p className="text-center text-gray-400 py-8">Henüz oyun geçmişiniz bulunmuyor</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="px-4 py-2 text-left text-sm text-gray-400">Tarih</th>
              <th className="px-4 py-2 text-left text-sm text-gray-400">Oyuncular</th>
              <th className="px-4 py-2 text-center text-sm text-gray-400">Skor</th>
              <th className="px-4 py-2 text-center text-sm text-gray-400">Sonuç</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game) => {
              const isWinner = game.winner === 'player1';
              const isDraw = game.winner === 'draw';

              return (
                <tr key={game.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                  <td className="px-4 py-3 text-sm text-gray-300">
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
                      <span className={`text-gray-300 ${isWinner ? 'font-bold text-green-400' : ''}`}>
                        {game.player1_name}
                      </span>
                      <span className="text-gray-500">vs</span>
                      <span className={`text-gray-300 ${!isWinner && !isDraw ? 'font-bold text-green-400' : ''}`}>
                        {game.player2_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-white">
                    {game.final_score_p1} - {game.final_score_p2}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isDraw ? (
                      <span className="text-gray-400">Berabere</span>
                    ) : isWinner ? (
                      <span className="text-green-400 font-bold">Kazandın</span>
                    ) : (
                      <span className="text-red-400">Kaybettin</span>
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
);

const StatsTab: React.FC<{ detailedStats: DetailedStats }> = ({ detailedStats }) => (
  <div className="grid md:grid-cols-2 gap-6">
    {/* Oyun Moduna Göre İstatistikler */}
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4">Mod Bazlı İstatistikler</h3>
      <div className="space-y-3">
        {detailedStats.modeStats.map((mode, index) => (
          <div key={index} className="bg-gray-700 rounded-lg p-4">
            <p className="text-white font-bold mb-2">{mode.game_mode}</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-400">{mode.games_played}</p>
                <p className="text-xs text-gray-400">Oyun</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{mode.wins}</p>
                <p className="text-xs text-gray-400">Galibiyet</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-400">{mode.draws}</p>
                <p className="text-xs text-gray-400">Beraberlik</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Haftalık Aktivite */}
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4">Son 7 Gün Aktivitesi</h3>
      <div className="space-y-2">
        {detailedStats.weeklyActivity.map((day, index) => (
          <div key={index} className="flex items-center gap-3">
            <p className="text-sm text-gray-400 w-24">
              {new Date(day.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
            </p>
            <div className="flex-1 bg-gray-700 rounded-full h-6 relative overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full"
                style={{ width: `${Math.min(day.games_count * 20, 100)}%` }}
              />
              <p className="absolute inset-0 flex items-center justify-center text-xs text-white font-bold">
                {day.games_count} oyun
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Diğer İstatistikler */}
    <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
        <p className="text-3xl font-bold text-purple-400">{detailedStats.avgScore}</p>
        <p className="text-sm text-gray-400 mt-1">Ortalama Skor</p>
      </div>
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
        <p className="text-3xl font-bold text-orange-400">{detailedStats.currentStreak}</p>
        <p className="text-sm text-gray-400 mt-1">Güncel Seri</p>
      </div>
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-center">
        <p className="text-3xl font-bold text-cyan-400">{detailedStats.general.total_draws}</p>
        <p className="text-sm text-gray-400 mt-1">Toplam Beraberlik</p>
      </div>
    </div>
  </div>
);

export default Dashboard;
