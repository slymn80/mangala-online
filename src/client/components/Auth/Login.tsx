/**
 * Login Page Component
 */

import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';

interface LoginProps {
  onSwitchToRegister: () => void;
  onSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onSwitchToRegister, onSuccess }) => {
  const { t } = useTranslation();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const success = await login(username, password);
    if (success) {
      onSuccess();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{
      background: 'linear-gradient(to bottom right, #f9fafb, #e5e7eb, #f9fafb)'
    }}>
      <div className="card max-w-md w-full p-8 space-y-6">
        {/* Logo ve Başlık */}
        <div className="text-center">
          <img
            src="/assets/images/okul_logo.jpg"
            alt="Logo"
            className="h-20 w-20 mx-auto rounded-full shadow-md mb-4"
          />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-2">
            MANGALA
          </h1>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">
            Giriş Yap
          </h2>
        </div>

        {/* Hata Mesajı */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Kullanıcı Adı
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        {/* Kayıt Ol Linki */}
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Hesabınız yok mu?{' '}
            <button
              onClick={onSwitchToRegister}
              className="text-blue-500 hover:text-blue-600 font-semibold"
            >
              Kayıt Ol
            </button>
          </p>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p>Özel Talgar 1 Nolu Yatılı Lisesi</p>
          <p className="mt-1">by Süleyman Tongut</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
