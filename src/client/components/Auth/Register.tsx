/**
 * Register Page Component
 */

import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';

interface RegisterProps {
  onSwitchToLogin: () => void;
  onSuccess: () => void;
}

const Register: React.FC<RegisterProps> = ({ onSwitchToLogin, onSuccess }) => {
  const { t } = useTranslation();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError('');

    // Boş alan kontrolü
    if (!username.trim()) {
      setLocalError('Kullanıcı adı boş bırakılamaz');
      return;
    }

    if (!email.trim()) {
      setLocalError('Email boş bırakılamaz');
      return;
    }

    if (!displayName.trim()) {
      setLocalError('Ad-Soyad boş bırakılamaz');
      return;
    }

    if (!password.trim()) {
      setLocalError('Şifre boş bırakılamaz');
      return;
    }

    // Validasyonlar
    if (username.trim().length < 3) {
      setLocalError('Kullanıcı adı en az 3 karakter olmalı');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError('Geçerli bir email adresi giriniz');
      return;
    }

    if (displayName.trim().length === 0) {
      setLocalError('Ad-Soyad alanı zorunludur');
      return;
    }

    if (password.length < 6) {
      setLocalError('Şifre en az 6 karakter olmalı');
      return;
    }

    if (password !== passwordConfirm) {
      setLocalError('Şifreler eşleşmiyor');
      return;
    }

    const success = await register(username.trim(), email.trim(), password, displayName.trim());
    if (success) {
      onSuccess();
    }
  };

  const currentError = localError || error;

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
            Kayıt Ol
          </h2>
        </div>

        {/* Hata Mesajı */}
        {currentError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {currentError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Kullanıcı Adı *
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
              disabled={isLoading}
              autoFocus
              minLength={3}
              placeholder="En az 3 karakter"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
              disabled={isLoading}
              placeholder="ornek@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ad-Soyad *
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
              disabled={isLoading}
              placeholder="Adınız ve soyadınız"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Şifre *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
              disabled={isLoading}
              minLength={6}
              placeholder="En az 6 karakter"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Şifre Tekrar *
            </label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              required
              disabled={isLoading}
              placeholder="Şifrenizi tekrar girin"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
          </button>
        </form>

        {/* Giriş Yap Linki */}
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Zaten hesabınız var mı?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-blue-500 hover:text-blue-600 font-semibold"
            >
              Giriş Yap
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

export default Register;
