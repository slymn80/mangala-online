/**
 * Admin Dashboard
 */

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface User {
  id: number;
  username: string;
  display_name: string;
  is_admin: number;
  created_at: string;
  total_games: number;
  total_wins: number;
}

interface Stats {
  totalUsers: number;
  totalGames: number;
  totalAdmins: number;
}

interface AdminDashboardProps {
  onClose: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { token } = useAuthStore();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'users'>('stats');

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  const fetchStats = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('[ADMIN] Error fetching stats:', error);
    }
  };

  const fetchUsers = async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('[ADMIN] Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdmin = async (userId: number) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}/toggle-admin`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchUsers(); // Listeyi güncelle
        fetchStats(); // İstatistikleri güncelle
        alert('Admin durumu değiştirildi');
      } else {
        const data = await response.json();
        alert(data.error || 'Hata oluştu');
      }
    } catch (error) {
      console.error('[ADMIN] Error toggling admin:', error);
      alert('Bir hata oluştu');
    }
  };

  const deleteUser = async (userId: number, username: string) => {
    if (!token) return;
    if (!window.confirm(`${username} kullanıcısını silmek istediğinizden emin misiniz?`)) return;

    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchUsers(); // Listeyi güncelle
        fetchStats(); // İstatistikleri güncelle
        alert('Kullanıcı silindi');
      } else {
        const data = await response.json();
        alert(data.error || 'Hata oluştu');
      }
    } catch (error) {
      console.error('[ADMIN] Error deleting user:', error);
      alert('Bir hata oluştu');
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            🔧 Admin Dashboard
          </h1>
          <button onClick={onClose} className="btn btn-secondary px-4 py-2">
            ← Geri Dön
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-300 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-4 py-2 font-semibold ${
              activeTab === 'stats'
                ? 'border-b-2 border-purple-500 text-purple-500'
                : 'text-gray-500'
            }`}
          >
            📊 İstatistikler
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 font-semibold ${
              activeTab === 'users'
                ? 'border-b-2 border-purple-500 text-purple-500'
                : 'text-gray-500'
            }`}
          >
            👥 Kullanıcılar
          </button>
        </div>

        {/* Stats Tab */}
        {activeTab === 'stats' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-6 text-center">
              <p className="text-4xl font-bold text-blue-500">{stats.totalUsers}</p>
              <p className="text-sm text-gray-500 mt-2">Toplam Kullanıcı</p>
            </div>
            <div className="card p-6 text-center">
              <p className="text-4xl font-bold text-green-500">{stats.totalGames}</p>
              <p className="text-sm text-gray-500 mt-2">Toplam Oyun</p>
            </div>
            <div className="card p-6 text-center">
              <p className="text-4xl font-bold text-purple-500">{stats.totalAdmins}</p>
              <p className="text-sm text-gray-500 mt-2">Admin Sayısı</p>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="card p-6">
            <h2 className="text-xl font-bold mb-4 dark:text-white text-gray-900">
              Kullanıcı Yönetimi
            </h2>

            {loading ? (
              <p className="text-center text-gray-500 py-8">Yükleniyor...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b dark:border-gray-700 border-gray-200">
                      <th className="px-4 py-2 text-left text-sm text-gray-500">ID</th>
                      <th className="px-4 py-2 text-left text-sm text-gray-500">Kullanıcı</th>
                      <th className="px-4 py-2 text-center text-sm text-gray-500">Oyunlar</th>
                      <th className="px-4 py-2 text-center text-sm text-gray-500">Kazanma</th>
                      <th className="px-4 py-2 text-center text-sm text-gray-500">Admin</th>
                      <th className="px-4 py-2 text-center text-sm text-gray-500">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b dark:border-gray-800 border-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 text-sm">{user.id}</td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-semibold">{user.display_name}</p>
                            <p className="text-xs text-gray-500">@{user.username}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">{user.total_games}</td>
                        <td className="px-4 py-3 text-center font-bold text-green-600">
                          {user.total_wins}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {user.is_admin ? (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                              Admin
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                              Kullanıcı
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => toggleAdmin(user.id)}
                              className="btn btn-secondary px-3 py-1 text-xs"
                            >
                              {user.is_admin ? '⬇️ Admin Kaldır' : '⬆️ Admin Yap'}
                            </button>
                            <button
                              onClick={() => deleteUser(user.id, user.username)}
                              className="btn btn-danger px-3 py-1 text-xs"
                            >
                              🗑️ Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
