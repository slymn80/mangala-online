/**
 * Email Verification Page
 */

import React, { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface VerifyEmailProps {
  onSuccess: () => void;
}

const VerifyEmail: React.FC<VerifyEmailProps> = ({ onSuccess }) => {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
      verifyEmail(token);
    } else {
      setStatus('error');
      setMessage('Doğrulama token\'ı bulunamadı');
    }
  }, []);

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/verify-email/${token}`);
      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || 'Email adresiniz başarıyla doğrulandı!');

        // 2 saniye sonra yönlendir
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        setStatus('error');
        setMessage(data.error || 'Doğrulama başarısız oldu');
      }
    } catch (error) {
      setStatus('error');
      setMessage('Sunucuya bağlanırken bir hata oluştu');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{
      background: 'linear-gradient(to bottom right, #f9fafb, #e5e7eb, #f9fafb)'
    }}>
      <div className="card max-w-md w-full p-8 text-center space-y-6">
        {/* Logo */}
        <div>
          <img
            src="/assets/images/okul_logo.jpg"
            alt="Logo"
            className="h-20 w-20 mx-auto rounded-full shadow-md mb-4"
          />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            MANGALA
          </h1>
        </div>

        {/* Status */}
        {status === 'verifying' && (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Email adresiniz doğrulanıyor...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="text-6xl">✅</div>
            <h2 className="text-2xl font-bold text-green-600">Başarılı!</h2>
            <p className="text-gray-600 dark:text-gray-300">{message}</p>
            <p className="text-sm text-gray-500">Yönlendiriliyorsunuz...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="text-6xl">❌</div>
            <h2 className="text-2xl font-bold text-red-600">Hata</h2>
            <p className="text-gray-600 dark:text-gray-300">{message}</p>
            <button
              onClick={onSuccess}
              className="btn btn-primary"
            >
              Ana Sayfaya Dön
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p>Özel Talgar 1 Nolu Yatılı Lisesi</p>
          <p className="mt-1">by Süleyman Tongut</p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
