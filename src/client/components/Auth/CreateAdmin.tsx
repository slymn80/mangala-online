/**
 * Admin Kullanıcısı Oluşturma Komponenti
 */

import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface CreateAdminProps {
  onSwitchToLogin: () => void;
  onSuccess: () => void;
}

const CreateAdmin: React.FC<CreateAdminProps> = ({ onSwitchToLogin, onSuccess }) => {
  const setUser = useAuthStore((state) => state.setUser);
  const setToken = useAuthStore((state) => state.setToken);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password || !displayName || !adminSecret) {
      setError('Tüm alanları doldurunuz');
      return;
    }

    if (username.length < 3) {
      setError('Kullanıcı adı en az 3 karakter olmalı');
      return;
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalı');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/create-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, displayName, adminSecret })
      });

      const data = await response.json();

      if (response.ok) {
        setToken(data.token);
        setUser(data.user);
        onSuccess();
      } else {
        setError(data.error || 'Admin oluşturma başarısız');
      }
    } catch (error) {
      console.error('[CreateAdmin] Error:', error);
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(to bottom right, #0f172a, #1e293b, #0f172a)'
    }}>
      <div className="card w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-2">
            🔧 Admin Oluştur
          </h1>
          <p className="text-sm text-gray-400">
            Güvenlik şifresi ile yeni admin kullanıcısı oluşturun
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Kullanıcı Adı
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input w-full"
              placeholder="kullaniciadi"
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Görünen Ad
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input w-full"
              placeholder="Ad Soyad"
              disabled={loading}
              autoComplete="name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input w-full"
              placeholder="••••••••"
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              🔑 Admin Güvenlik Şifresi
            </label>
            <input
              type="password"
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              className="input w-full"
              placeholder="Özel güvenlik şifresi"
              disabled={loading}
              autoComplete="off"
            />
            <p className="text-xs text-gray-500 mt-1">
              Bu şifre .env dosyasında tanımlı olan ADMIN_SECRET_KEY'dir
            </p>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'Oluşturuluyor...' : '🔧 Admin Oluştur'}
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={onSwitchToLogin}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            ← Normal Giriş Yap
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateAdmin;
