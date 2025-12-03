/**
 * Ana Uygulama Bileşeni
 */

import React, { useState, useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { useAuthStore } from './store/authStore';
import Menu from './components/Menu';
import Board from './components/Board';
import GameOverModal from './components/GameOverModal';
import MessageToast from './components/MessageToast';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import VerifyEmail from './components/Auth/VerifyEmail';
import Profile from './components/Profile';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/Admin/Dashboard';
import OnlineRooms from './components/OnlineRooms';
import { useTranslation } from 'react-i18next';

const App: React.FC = () => {
  const { t } = useTranslation();
  const game = useGameStore((state) => state.game);
  const theme = useGameStore((state) => state.theme);
  const clearGame = useGameStore((state) => state.clearGame);
  const user = useAuthStore((state) => state.user);
  const fetchUser = useAuthStore((state) => state.fetchUser);
  const logout = useAuthStore((state) => state.logout);
  const [showMenu, setShowMenu] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [showProfile, setShowProfile] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showOnlineRooms, setShowOnlineRooms] = useState(false);
  const [onlineRoomId, setOnlineRoomId] = useState<string | null>(null);
  const [isOnlineHost, setIsOnlineHost] = useState(false);
  const [onlineSocket, setOnlineSocket] = useState<any>(null);

  useEffect(() => {
    // Tema uygula
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    // Oyun varsa menüyü kapat
    if (game && showMenu) {
      setShowMenu(false);
    }
  }, [game]);

  useEffect(() => {
    // Kullanıcı bilgilerini yükle
    fetchUser();
  }, []);

  // Bot sırası kontrolü artık gameStore içinde yapılıyor

  const handleStartGame = () => {
    setShowMenu(false);
    setIsPaused(false);
  };

  const handlePause = () => {
    if (!isPaused && window.confirm('Oyunu duraklatmak istediğinizden emin misiniz?')) {
      setIsPaused(true);
    } else if (isPaused) {
      setIsPaused(false);
    }
  };

  const handleQuitToMenu = () => {
    if (window.confirm('Anasayfaya dönmek istediğinizden emin misiniz? Oyun kaydedilmeyecek.')) {
      // Online oyundan çıkıyorsa socket'i bilgilendir
      if (game?.mode === 'online' && onlineSocket && onlineRoomId) {
        onlineSocket.emit('room:leave', { roomId: onlineRoomId });
        onlineSocket.disconnect();
      }
      clearGame(); // Oyunu temizle - localStorage'dan da silinir
      setOnlineRoomId(null);
      setOnlineSocket(null);
      setShowMenu(true);
      setIsPaused(false);
    }
  };

  const handleBackToLobby = () => {
    if (window.confirm('Odadan çıkıp salona dönmek istediğinizden emin misiniz?')) {
      // Socket'e odadan ayrıldığını bildir
      if (onlineSocket && onlineRoomId) {
        onlineSocket.emit('room:leave', { roomId: onlineRoomId });
      }
      clearGame(); // Oyunu temizle
      setOnlineRoomId(null);
      setShowOnlineRooms(true); // Salona geri dön
      setIsPaused(false);
    }
  };

  const handleRefresh = () => {
    if (!game) return;

    // Oyun bittiyse direkt yenile, onay sorma
    if (game.status === 'finished') {
      const gameStore = useGameStore.getState();
      gameStore.startNewGame({
        mode: game.mode,
        player1Name: game.player1Name,
        player2Name: game.player2Name,
        botDifficulty: game.botDifficulty
      });
      setIsPaused(false);
      return;
    }

    // Oyun devam ediyorsa onay iste
    if (window.confirm(t('menu.confirmRestart'))) {
      const gameStore = useGameStore.getState();
      gameStore.startNewGame({
        mode: game.mode,
        player1Name: game.player1Name,
        player2Name: game.player2Name,
        botDifficulty: game.botDifficulty
      });
      setIsPaused(false);
    }
  };

  // Email verification check
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('token') && window.location.pathname === '/verify-email') {
    return <VerifyEmail onSuccess={() => {
      window.history.replaceState({}, '', '/');
      window.location.reload();
    }} />;
  }

  // Kullanıcı giriş yapmamışsa Login/Register göster
  if (!user) {
    if (authView === 'login') {
      return <Login onSwitchToRegister={() => setAuthView('register')} onSuccess={() => {}} />;
    } else {
      return <Register onSwitchToLogin={() => setAuthView('login')} onSuccess={() => {}} />;
    }
  }

  return (
    <div className="min-h-screen transition-colors duration-300" style={{
      background: theme === 'dark'
        ? 'linear-gradient(to bottom right, #0f172a, #1e293b, #0f172a)'
        : 'linear-gradient(to bottom right, #f9fafb, #e5e7eb, #f9fafb)',
      color: theme === 'dark' ? '#f1f5f9' : '#111827'
    }}>
      {/* Header */}
      {!showMenu && game && (
        <header className={`sticky top-0 z-50 backdrop-blur-sm border-b px-2 sm:px-4 md:px-6 py-2 transition-colors ${
          theme === 'dark'
            ? 'bg-gray-900 bg-opacity-90 border-gray-700'
            : 'bg-white bg-opacity-90 border-gray-300'
        }`}>
          <div className="max-w-7xl mx-auto">
            {/* Üst Satır: Logo ve Okul Adı (her zaman tek satır) */}
            <div className="flex items-center justify-between mb-2 md:mb-0">
              <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
                <img
                  src="/assets/images/okul_logo.jpg"
                  alt="Okul Logo"
                  className="h-7 w-7 sm:h-9 sm:w-9 md:h-12 md:w-12 object-contain rounded-lg shadow-md flex-shrink-0"
                />
                <div className="flex flex-col min-w-0">
                  <h2 className="text-[8px] sm:text-[9px] font-semibold text-blue-600 dark:text-blue-400 hidden md:block truncate">
                    Özel Talgar 1 Nolu Yatılı Lisesi
                  </h2>
                  <h1 className="text-[11px] sm:text-xs md:text-base font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                    MANGALA
                  </h1>
                  <p className="text-[7px] sm:text-[8px] md:text-xs text-red-500 font-medium">by Süleyman Tongut</p>
                </div>
              </div>
              <div className="text-[9px] sm:text-[10px] md:text-xs text-gray-400 whitespace-nowrap">
                {t('score.set')} {game.currentSetIndex + 1}/5
              </div>
            </div>

            {/* Alt Satır: Kullanıcı Menüsü + Kontrol Butonları */}
            <div className="flex items-center justify-center md:justify-end gap-1 sm:gap-2 md:gap-3 md:absolute md:top-2 md:right-2 md:px-4">
              {/* Kullanıcı Menüsü */}
              <div className="relative group">
                <button className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors text-[10px] sm:text-xs md:text-sm">
                  <span className="text-white font-medium">
                    👤 {user?.display_name || user?.username}
                  </span>
                </button>
                {/* Dropdown */}
                <div className="absolute left-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[100] border border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      clearGame();
                      setShowDashboard(true);
                      setShowProfile(false);
                      setShowAdmin(false);
                      setShowMenu(true);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
                  >
                    📊 Dashboard
                  </button>
                  {user?.is_admin === 1 && (
                    <button
                      onClick={() => {
                        clearGame();
                        setShowAdmin(true);
                        setShowProfile(false);
                        setShowDashboard(false);
                        setShowMenu(true);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-purple-600"
                    >
                      🔧 Admin Panel
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (window.confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
                        logout();
                        clearGame();
                        window.location.reload();
                      }
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg"
                  >
                    🚪 Çıkış Yap
                  </button>
                </div>
              </div>
              <button
                onClick={handleRefresh}
                className="btn btn-success px-2 sm:px-3 md:px-4 py-1 text-[10px] sm:text-xs md:text-sm"
              >
                <span className="hidden sm:inline">🔄 {t('menu.newGame')}</span>
                <span className="sm:hidden">🔄</span>
              </button>
              <button
                onClick={handlePause}
                className="btn btn-secondary px-2 sm:px-3 md:px-4 py-1 text-[10px] sm:text-xs md:text-sm"
              >
                <span className="hidden sm:inline">{isPaused ? '▶️ ' + t('menu.continue') : '⏸️ ' + t('menu.pause')}</span>
                <span className="sm:hidden">{isPaused ? '▶️' : '⏸️'}</span>
              </button>
              {/* Online oyunda "Salona Dön" butonu göster */}
              {game?.mode === 'online' && (
                <button
                  onClick={handleBackToLobby}
                  className="btn btn-secondary px-2 sm:px-3 md:px-4 py-1 text-[10px] sm:text-xs md:text-sm"
                >
                  <span className="hidden sm:inline">🚪 Salona Dön</span>
                  <span className="sm:hidden">🚪</span>
                </button>
              )}
              <button
                onClick={handleQuitToMenu}
                className="btn btn-secondary px-2 sm:px-3 md:px-4 py-1 text-[10px] sm:text-xs md:text-sm"
              >
                <span className="hidden sm:inline">🏠 Anasayfa</span>
                <span className="sm:hidden">🏠</span>
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
                    logout();
                    clearGame();
                    window.location.reload();
                  }
                }}
                className="btn btn-danger px-2 sm:px-3 md:px-4 py-1 text-[10px] sm:text-xs md:text-sm"
              >
                <span className="hidden sm:inline">🚪 Çıkış</span>
                <span className="sm:hidden">🚪</span>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Ana İçerik */}
      <main className="container mx-auto">
        {showMenu || !game ? (
          showAdmin ? (
            <AdminDashboard onClose={() => setShowAdmin(false)} />
          ) : showDashboard ? (
            <Dashboard onClose={() => setShowDashboard(false)} />
          ) : showProfile ? (
            <Profile onClose={() => setShowProfile(false)} />
          ) : showOnlineRooms ? (
            <OnlineRooms
              onClose={() => setShowOnlineRooms(false)}
              onGameStart={(roomId, isHost, socket, player1Username, player2Username, firstPlayer, savedGameState) => {
                setOnlineRoomId(roomId);
                setIsOnlineHost(isHost);
                setOnlineSocket(socket);
                setShowOnlineRooms(false);

                const gameStore = useGameStore.getState();

                if (savedGameState) {
                  // Kaydedilmiş oyunu yükle
                  console.log('[APP] Loading saved game state');
                  gameStore.loadGame(savedGameState);
                } else {
                  // Yeni oyun başlat
                  console.log('[APP] Starting new online game');
                  gameStore.startNewGame({
                    mode: 'online',
                    player1Name: player1Username,
                    player2Name: player2Username,
                    firstPlayer: firstPlayer,
                  });
                }
              }}
            />
          ) : (
            <Menu
              onStartGame={handleStartGame}
              onShowDashboard={() => setShowDashboard(true)}
              onShowAdmin={() => setShowAdmin(true)}
              onShowOnlineRooms={() => setShowOnlineRooms(true)}
            />
          )
        ) : (
          <>
            {isPaused ? (
              <div className="min-h-[80vh] flex items-center justify-center">
                <div className="card text-center space-y-6 max-w-md">
                  <h2 className="text-4xl font-bold">⏸️</h2>
                  <h3 className="text-2xl font-semibold">{t('menu.pause')}</h3>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handlePause}
                      className="btn btn-primary w-full"
                    >
                      {t('menu.continue')}
                    </button>
                    <button
                      onClick={handleQuitToMenu}
                      className="btn btn-secondary w-full"
                    >
                      {t('menu.quit')}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Board
                onlineRoomId={onlineRoomId}
                onlineSocket={onlineSocket}
                isOnlineHost={isOnlineHost}
              />
            )}
          </>
        )}
      </main>

      {/* Oyun Sonu Modalı */}
      {game && game.status === 'finished' && (
        <GameOverModal
          onlineSocket={onlineSocket}
          onlineRoomId={onlineRoomId || undefined}
        />
      )}

      {/* Mesaj Toast */}
      <MessageToast />

      {/* Footer */}
      <footer className="text-center py-6 text-sm text-gray-500">
        <p>Mangala - Türk Zeka ve Strateji Oyunu © 2025</p>
        <p className="mt-1">by Süleyman Tongut</p>
      </footer>
    </div>
  );
};

export default App;
