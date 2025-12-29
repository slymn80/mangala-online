/**
 * Admin Dashboard
 * Geliştirilmiş admin paneli - İstatistikler, oyunlar ve kullanıcı yönetimi
 */

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface User {
  id: number;
  username: string;
  display_name: string;
  email: string;
  email_verified: number;
  is_admin: number;
  created_at: string;
  last_login: string | null;
  total_games: number;
  total_wins: number;
  total_losses: number;
  total_draws: number;
  total_abandoned: number;
}

interface Game {
  id: number;
  player1_name: string;
  player2_name: string;
  game_mode: string;
  winner: string;
  final_score_p1: number;
  final_score_p2: number;
  total_sets: number;
  duration_seconds: number;
  created_at: string;
}

interface Stats {
  users: {
    total: number;
    verified: number;
    unverified: number;
  };
  games: {
    total: number;
    last24h: number;
    last7d: number;
    byMode: Array<{ game_mode: string; count: number }>;
    abandoned: number;
    draws: number;
  };
  performance: {
    avgDurationSeconds: number;
    winStats: Array<{ winner: string; count: number }>;
  };
}

interface AdminDashboardProps {
  onClose: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const { token } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [recentGames, setRecentGames] = useState<Game[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'games' | 'users'>('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);

    try {
      // İstatistikler
      const statsRes = await fetch(`${API_URL}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }

      // Kullanıcılar
      const usersRes = await fetch(`${API_URL}/admin/users?limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users);
      }

      // Son oyunlar
      const gamesRes = await fetch(`${API_URL}/admin/recent-games?limit=15`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (gamesRes.ok) {
        const data = await gamesRes.json();
        setRecentGames(data.games);
      }
    } catch (error) {
      console.error('[ADMIN] Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('tr-TR');
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getGameModeLabel = (mode: string) => {
    const labels: Record<string, string> = {
      pve: 'Bot ile',
      pvp: 'İki Oyuncu',
      online: 'Çevrimiçi'
    };
    return labels[mode] || mode;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 p-8">
        <div className="text-center">
          <div className="text-xl dark:text-white">Yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              🔧 Admin Paneli
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Mangala oyun istatistikleri ve sistem yönetimi
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all shadow-lg"
          >
            ← Geri Dön
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-amber-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-amber-100 dark:hover:bg-gray-700'
            }`}
          >
            📊 Genel Bakış
          </button>
          <button
            onClick={() => setActiveTab('games')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'games'
                ? 'bg-amber-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-amber-100 dark:hover:bg-gray-700'
            }`}
          >
            🎮 Oyunlar
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'users'
                ? 'bg-amber-600 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-amber-100 dark:hover:bg-gray-700'
            }`}
          >
            👥 Kullanıcılar
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-6">
            {/* İstatistik Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Toplam Kullanıcı</div>
                <div className="text-3xl font-bold text-amber-600">{stats.users.total}</div>
                <div className="text-xs text-gray-500 mt-2">
                  Doğrulanmış: {stats.users.verified}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Toplam Oyun</div>
                <div className="text-3xl font-bold text-blue-600">{stats.games.total}</div>
                <div className="text-xs text-gray-500 mt-2">
                  Son 24 saat: {stats.games.last24h}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Ort. Süre</div>
                <div className="text-3xl font-bold text-green-600">
                  {formatDuration(stats.performance.avgDurationSeconds)}
                </div>
                <div className="text-xs text-gray-500 mt-2">Dakika/Oyun</div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Terk Edilen</div>
                <div className="text-3xl font-bold text-red-600">{stats.games.abandoned}</div>
                <div className="text-xs text-gray-500 mt-2">Toplam</div>
              </div>
            </div>

            {/* Oyun Modları */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                Oyun Modları Dağılımı
              </h3>
              <div className="space-y-3">
                {stats.games.byMode.map((mode) => (
                  <div key={mode.game_mode} className="flex items-center justify-between">
                    <span className="text-gray-700 dark:text-gray-300">
                      {getGameModeLabel(mode.game_mode)}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-200 dark:bg-amber-900 h-2 rounded-full"
                           style={{ width: `${(mode.count / stats.games.total) * 200}px` }} />
                      <span className="font-semibold text-gray-900 dark:text-white w-12 text-right">
                        {mode.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Games Tab */}
        {activeTab === 'games' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Son Oyunlar
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Oyuncular</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Mod</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Kazanan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Skor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tarih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {recentGames.map((game) => (
                    <tr key={game.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">#{game.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {game.player1_name} vs {game.player2_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {getGameModeLabel(game.game_mode)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded ${
                          game.winner === 'player1' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          game.winner === 'player2' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {game.winner === 'draw' ? 'Berabere' : game.winner === 'player1' ? game.player1_name : game.player2_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {game.final_score_p1} - {game.final_score_p2}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {formatDate(game.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Kullanıcılar
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Kullanıcı</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">İstatistikler</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Durum</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Kayıt Tarihi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.username}
                              {user.is_admin === 1 && (
                                <span className="ml-2 px-2 py-1 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 rounded">
                                  Admin
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{user.display_name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        <div>Oyun: {user.total_games}</div>
                        <div className="text-xs">
                          G:{user.total_wins} / M:{user.total_losses} / B:{user.total_draws}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded ${
                          user.email_verified === 1
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}>
                          {user.email_verified === 1 ? 'Doğrulanmış' : 'Beklemede'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                        {formatDate(user.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
