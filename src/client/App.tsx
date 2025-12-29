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
  const startNewGame = useGameStore((state) => state.startNewGame);
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const fetchUser = useAuthStore((state) => state.fetchUser);
  const logout = useAuthStore((state) => state.logout);
  const [showMenu, setShowMenu] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [showProfile, setShowProfile] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showOnlineRooms, setShowOnlineRooms] = useState(() => {
    // Sayfa yenilendiğinde salonda kalabilmek için localStorage'dan oku
    const saved = localStorage.getItem('showOnlineRooms');
    return saved === 'true';
  });
  const [onlineRoomId, setOnlineRoomId] = useState<string | null>(() => {
    // Sayfa yenilendiğinde oda bilgisini localStorage'dan yükle
    const saved = localStorage.getItem('onlineRoomId');
    return saved || null;
  });
  const [isOnlineHost, setIsOnlineHost] = useState(() => {
    const saved = localStorage.getItem('isOnlineHost');
    return saved === 'true';
  });
  const [onlineSocket, setOnlineSocket] = useState<any>(null);
  const [newGameRequested, setNewGameRequested] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [opponentName, setOpponentName] = useState<string>('');

  // Debug: Log state changes
  useEffect(() => {
    console.log('[DEBUG] waitingForOpponent changed:', waitingForOpponent);
  }, [waitingForOpponent]);

  useEffect(() => {
    console.log('[DEBUG] newGameRequested changed:', newGameRequested);
  }, [newGameRequested]);

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

  // Browser back button için popstate listener
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      // Ana view'lardan ana menüye dönüş
      if (showOnlineRooms && event.state?.page !== 'online-rooms') {
        setShowOnlineRooms(false);
        localStorage.removeItem('showOnlineRooms');
      } else if (showDashboard) {
        setShowDashboard(false);
      } else if (showProfile) {
        setShowProfile(false);
      } else if (showAdmin) {
        setShowAdmin(false);
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Initial history state - ana menü için
    if (!window.history.state && !showOnlineRooms && !showDashboard && !showProfile && !showAdmin) {
      window.history.replaceState({ page: 'menu' }, '', window.location.pathname);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [showOnlineRooms, showDashboard, showProfile, showAdmin]);

  // showOnlineRooms durumunu localStorage'a kaydet ve browser history yönet
  useEffect(() => {
    localStorage.setItem('showOnlineRooms', showOnlineRooms.toString());

    // Online rooms'a girdiğinde history'ye ekle
    if (showOnlineRooms && window.history.state?.page !== 'online-rooms') {
      window.history.pushState({ page: 'online-rooms' }, '', window.location.pathname);
    }
  }, [showOnlineRooms]);

  // Online room bilgilerini localStorage'a kaydet
  useEffect(() => {
    if (onlineRoomId) {
      localStorage.setItem('onlineRoomId', onlineRoomId);
    } else {
      localStorage.removeItem('onlineRoomId');
    }
  }, [onlineRoomId]);

  useEffect(() => {
    localStorage.setItem('isOnlineHost', isOnlineHost.toString());
  }, [isOnlineHost]);

  // Rakip forfeit yaptığında bildirim dinle

  // Sayfa yenilendiğinde online oyuna geri dön
  useEffect(() => {
    if (game?.mode === 'online' && onlineRoomId && !onlineSocket && user) {
      console.log('[APP] Page reloaded with online game, reconnecting to room:', onlineRoomId);

      // Socket'i yeniden oluştur
      import('socket.io-client').then(({ io }) => {
        const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
        const newSocket = io(socketUrl, {
          path: '/socket.io',
          transports: ['websocket', 'polling']
        });

        newSocket.on('connect', () => {
          console.log('[APP] Reconnected:', newSocket.id);
          // Kullanıcıyı tekrar kaydet
          newSocket.emit('user:connected', {
            userId: user.id.toString(),
            username: user.username
          });

          // Odaya tekrar katıl (oda zaten var, sadece reconnect)
          newSocket.emit('room:reconnect', {
            roomId: onlineRoomId,
            userId: user.id.toString(),
            username: user.username
          });
        });

        // Odaya yeniden bağlanma başarılı
        newSocket.on('room:reconnected', (data: { room: any; gameState: any; isHost: boolean; waitingForOpponent: boolean }) => {
          console.log('[APP] Room reconnected:', data);
          setIsOnlineHost(data.isHost);

          // Eğer oyun devam ediyorsa ve karşı oyuncu varsa, oyunu devam ettir
          if (data.gameState && !data.waitingForOpponent) {
            console.log('[APP] Resuming game after reconnect');
            // Oyun zaten var, sadece socket'i set et
          }

          setShowMenu(false);
        });

        setOnlineSocket(newSocket);
      });
    }
  }, [game, onlineRoomId, onlineSocket, user]);

  // Online oyun yeni oyun talepleri için socket listener'ları
  useEffect(() => {
    if (!onlineSocket || game?.mode !== 'online') return;

    console.log('[APP] Setting up new game request listeners');

    // Rakip yeni oyun talep etti
    const handleNewGameRequested = (data: { requestedBy: string; requestedByUserId: string }) => {
      console.log('[APP] New game requested by:', data.requestedBy);
      setNewGameRequested(true);
      setOpponentName(data.requestedBy);
    };

    // Yeni oyun kabul edildi
    const handleNewGameAccepted = (data: { roomId: string; firstPlayer: string; player1Name: string; player2Name: string }) => {
      console.log('[APP] New game accepted, starting...', data);
      setWaitingForOpponent(false);
      setNewGameRequested(false);

      // Yeni oyunu başlat (backend'den gelen bilgilerle)
      const gameStore = useGameStore.getState();
      gameStore.startNewGame({
        mode: 'online',
        player1Name: data.player1Name,
        player2Name: data.player2Name,
        firstPlayer: data.firstPlayer as 'player1' | 'player2'
      });
    };

    // Yeni oyun reddedildi
    const handleNewGameDeclined = () => {
      console.log('[APP] New game declined');
      setWaitingForOpponent(false);
      alert('Rakibiniz yeni oyun talebini reddetti.');
    };

    onlineSocket.on('game:newGameRequested', handleNewGameRequested);
    onlineSocket.on('game:newGameAccepted', handleNewGameAccepted);
    onlineSocket.on('game:newGameDeclined', handleNewGameDeclined);

    return () => {
      console.log('[APP] Cleaning up new game request listeners');
      onlineSocket.off('game:newGameRequested', handleNewGameRequested);
      onlineSocket.off('game:newGameAccepted', handleNewGameAccepted);
      onlineSocket.off('game:newGameDeclined', handleNewGameDeclined);
    };
  }, [onlineSocket, game?.mode]);

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

  const handleAbandonGame = async () => {
    // Oyun bitmeden terk edilirse API'ye bildir
    if (game && game.status !== 'finished' && user && token) {
      try {
        const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const apiURL = baseURL.includes('/api') ? baseURL : `${baseURL}/api`;

        console.log('[APP] Abandoning game, URL:', `${apiURL}/games/abandon`);

        const response = await fetch(`${apiURL}/games/abandon`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            gameMode: game.mode,
            currentSetIndex: game.currentSetIndex
          })
        });

        if (response.ok) {
          console.log('[APP] Game abandonment recorded successfully');
        } else {
          console.error('[APP] Failed to record abandonment:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('[APP] Failed to record game abandonment:', error);
      }
    }
  };

  const handleQuitToMenu = async () => {
    if (window.confirm('Anasayfaya dönmek istediğinizden emin misiniz? Oyun kaydedilmeyecek.')) {
      // Terk edilen oyunu kaydet
      await handleAbandonGame();

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

  const handleBackToLobby = async () => {
    if (window.confirm('Odadan çıkıp salona dönmek istediğinizden emin misiniz?')) {
      // Terk edilen oyunu kaydet
      await handleAbandonGame();

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

  const handleRequestNewGame = () => {
    if (game?.mode === 'online' && onlineSocket && onlineRoomId && user) {
      console.log('[APP] Requesting new game...');
      setWaitingForOpponent(true);
      onlineSocket.emit('game:requestNewGame', {
        roomId: onlineRoomId,
        userId: user.id.toString(),
        username: user.username
      });
    }
  };

  const handleAcceptNewGame = () => {
    if (onlineSocket && onlineRoomId) {
      console.log('[APP] Accepting new game request...');
      onlineSocket.emit('game:acceptNewGame', { roomId: onlineRoomId });
      setNewGameRequested(false);
    }
  };

  const handleDeclineNewGame = () => {
    if (onlineSocket && onlineRoomId) {
      console.log('[APP] Declining new game request...');
      onlineSocket.emit('game:declineNewGame', { roomId: onlineRoomId });
      setNewGameRequested(false);
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
                      // ÖNEMLI: Dashboard'a giderken oyunu TEMİZLEME (online oyundaysa oda açık kalmalı)
                      // Sadece görünümü değiştir
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
                        // ÖNEMLI: Admin'e giderken oyunu TEMİZLEME (online oyundaysa oda açık kalmalı)
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
                    onClick={async () => {
                      if (window.confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
                        await handleAbandonGame();
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

                <>
                  {/* Normal Oyun Butonları */}
                  {/* Yeni Oyun butonu - Sadece klasik ve bot modlarında */}
                  {game?.mode !== 'online' && (
                    <button
                      onClick={handleRefresh}
                      className="btn btn-success px-2 sm:px-3 md:px-4 py-1 text-[10px] sm:text-xs md:text-sm"
                    >
                      <span className="hidden sm:inline">🔄 {t('menu.newGame')}</span>
                      <span className="sm:hidden">🔄</span>
                    </button>
                  )}
                  {/* Online modda Yeni Oyun Talebi butonu */}
                  {game?.mode === 'online' && game?.status === 'active' && (
                    <button
                      onClick={handleRequestNewGame}
                      disabled={waitingForOpponent || newGameRequested}
                      className="btn btn-success px-2 sm:px-3 md:px-4 py-1 text-[10px] sm:text-xs md:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {waitingForOpponent ? (
                        <>
                          <span className="hidden sm:inline">⏳ Rakip Bekleniyor...</span>
                          <span className="sm:hidden">⏳</span>
                        </>
                      ) : (
                        <>
                          <span className="hidden sm:inline">🔄 Yeni Oyun Talebi</span>
                          <span className="sm:hidden">🔄</span>
                        </>
                      )}
                    </button>
                  )}
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
                    onClick={async () => {
                      if (window.confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
                        await handleAbandonGame();
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
                </>
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
                setShowMenu(false); // Oyun başladığında menüyü kapat ve tahtaya geç

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
              <>
                {/* Yeni Oyun Talebi Bildirimi */}
                {newGameRequested && game?.mode === 'online' && (
                  <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
                    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl shadow-2xl p-6 animate-bounce-slow">
                      <div className="text-center">
                        <p className="text-2xl mb-2">🎮</p>
                        <p className="text-white font-bold text-lg mb-4">
                          <strong>{opponentName}</strong> yeni oyun oynamak istiyor!
                        </p>
                        <div className="flex gap-3">
                          <button
                            onClick={handleAcceptNewGame}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105"
                          >
                            ✅ Kabul Et
                          </button>
                          <button
                            onClick={handleDeclineNewGame}
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-all transform hover:scale-105"
                          >
                            ❌ Reddet
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <Board
                onlineRoomId={onlineRoomId}
                onlineSocket={onlineSocket}
                isOnlineHost={isOnlineHost}
                onBecameHost={() => {
                  console.log('[APP] Kullanıcı artık host oldu');
                  setIsOnlineHost(true);
                }}
                onBecameGuest={() => {
                  console.log('[APP] Kullanıcı artık guest oldu');
                  setIsOnlineHost(false);
                }}
                onBackToLobby={() => {
                  console.log('[APP] Salona dönülüyor');
                  setOnlineRoomId(null);
                  setShowOnlineRooms(true);
                }}
              />
            </>
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
