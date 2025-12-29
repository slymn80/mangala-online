/**
 * Mangala Oyun Tahtası Bileşeni
 * 12 küçük kuyu + 2 büyük hazne
 */

import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import Pit from './Pit';
import Treasure from './Treasure';
import MoveHistory from './MoveHistory';
import Chat from './Chat';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import type { Socket } from 'socket.io-client';

interface BoardProps {
  onlineRoomId?: string | null;
  onlineSocket?: Socket | null;
  isOnlineHost?: boolean;
}

const Board: React.FC<BoardProps> = ({ onlineRoomId, onlineSocket, isOnlineHost }) => {
  const { t, i18n } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const game = useGameStore((state) => state.game);
  const boardStyle = useGameStore((state) => state.boardStyle);
  const isAnimating = useGameStore((state) => state.isAnimating);
  const theme = useGameStore((state) => state.theme);
  const setTheme = useGameStore((state) => state.setTheme);
  const soundEnabled = useGameStore((state) => state.soundEnabled);
  const toggleSound = useGameStore((state) => state.toggleSound);
  const volume = useGameStore((state) => state.volume);
  const setVolume = useGameStore((state) => state.setVolume);
  const lastMove = useGameStore((state) => state.lastMove);
  const lastBotMoveRef = useRef<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [opponentStats, setOpponentStats] = useState<{ id: number; total_wins: number; total_losses: number; total_games: number } | null>(null);

  // Online oyunda rakip oyuncunun istatistiklerini çek
  useEffect(() => {
    if (game?.mode !== 'online' || !user) {
      return;
    }

    // Rakip kullanıcının username'ini bul
    const opponentUsername = game.player1Name === user.username ? game.player2Name : game.player1Name;

    if (!opponentUsername) {
      return;
    }

    // Rakibin profil bilgilerini çek
    const token = localStorage.getItem('token');
    fetch(`/api/profile/user/${opponentUsername}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setOpponentStats({
            id: data.user.id,
            total_wins: data.user.total_wins || 0,
            total_losses: data.user.total_losses || 0,
            total_games: data.user.total_games || 0
          });
        }
      })
      .catch(err => {
        console.error('Rakip istatistikleri çekilemedi:', err);
      });
  }, [game?.mode, game?.player1Name, game?.player2Name, user]);

  // Online oyun - Rakip hamlelerini dinle
  useEffect(() => {
    if (!onlineSocket || !onlineRoomId || game?.mode !== 'online') {
      return;
    }

    const handleGameUpdate = ({ gameState }: { gameState: any }) => {
      console.log('[BOARD] Rakipten hamle geldi:', gameState);
      // Oyun durumunu güncelle
      useGameStore.setState({ game: gameState });
    };

    const handleOpponentLeft = ({ message, waitingForPlayer, becameHost }: { message: string; waitingForPlayer?: boolean; becameHost?: boolean }) => {
      console.log('[BOARD] Rakip ayrıldı:', message);
      // Kullanıcıya sadece bilgi ver, soru sorma
      alert(message + '\n\nOyun alanında kalıp yeni rakip bekleyebilirsiniz.');

      // Not: Kullanıcı isterse "Salona Dön" butonuyla çıkabilir
    };

    onlineSocket.on('game:update', handleGameUpdate);
    onlineSocket.on('room:opponent-left', handleOpponentLeft);

    return () => {
      onlineSocket.off('game:update', handleGameUpdate);
      onlineSocket.off('room:opponent-left', handleOpponentLeft);
    };
  }, [onlineSocket, onlineRoomId, game?.mode]);

  // Online oyun - Hamle yapıldığında rakibe gönder
  const lastMoveCountRef = useRef<number>(0);
  useEffect(() => {
    console.log('[BOARD] useEffect triggered', {
      hasSocket: !!onlineSocket,
      hasRoomId: !!onlineRoomId,
      gameMode: game?.mode,
      hasGame: !!game
    });

    if (!onlineSocket || !onlineRoomId || game?.mode !== 'online' || !game) {
      console.log('[BOARD] Conditions not met for emitting move');
      return;
    }

    const currentSet = game.sets[game.currentSetIndex];
    const currentMoveCount = currentSet?.moves.length || 0;

    console.log('[BOARD] Move count check:', {
      currentMoveCount,
      lastMoveCount: lastMoveCountRef.current
    });

    // İlk render'da veya move count değişmediyse emit etme
    if (currentMoveCount === 0 || currentMoveCount === lastMoveCountRef.current) {
      lastMoveCountRef.current = currentMoveCount;
      return;
    }

    lastMoveCountRef.current = currentMoveCount;

    console.log('[BOARD] Hamle yapıldı, rakibe gönderiliyor:', {
      roomId: onlineRoomId,
      moveCount: currentMoveCount,
      currentPlayer: currentSet.currentPlayer
    });

    // Her hamle sonrası game state'i rakibe gönder
    onlineSocket.emit('game:move', {
      roomId: onlineRoomId,
      gameState: game
    });
  }, [game, onlineSocket, onlineRoomId]);

  // Bot sırası kontrolü - Her state değişiminde kontrol et
  useEffect(() => {
    if (!game || isAnimating || game.mode !== 'pve') {
      return;
    }

    // Oyun bitmiş mi kontrol et
    if (game.status === 'finished') {
      console.log('[BOARD USEEFFECT] Oyun bitti, bot hamlesi yapılmayacak');
      return;
    }

    // CurrentSet var mı kontrol et
    if (!game.sets || game.currentSetIndex >= game.sets.length) {
      console.log('[BOARD USEEFFECT] Geçerli set yok, bot hamlesi yapılmayacak');
      return;
    }

    const currentSet = game.sets[game.currentSetIndex];

    if (!currentSet) {
      console.log('[BOARD USEEFFECT] CurrentSet undefined, bot hamlesi yapılmayacak');
      return;
    }

    if (currentSet.currentPlayer === 'player2' && currentSet.status === 'active') {
      // Aynı durumda birden fazla bot hamlesi çağrılmasını engelle
      const currentState = `${game.currentSetIndex}-${currentSet.moves.length}`;
      if (lastBotMoveRef.current === currentState) {
        console.log('[BOARD USEEFFECT] Aynı durum, bot hamlesi zaten çağrıldı, skip');
        return;
      }
      lastBotMoveRef.current = currentState;

      console.log('[BOARD USEEFFECT] Bot sırası tespit edildi, bot hamlesi çağrılacak', {
        isAnimating,
        currentSetIndex: game.currentSetIndex,
        setStatus: currentSet.status,
        moveCount: currentSet.moves.length
      });

      // Timeout kullanmadan direkt çağır - isAnimating false olduğunda zaten güvenli
      console.log('[BOARD USEEFFECT] Bot hamlesi çağrılıyor - useGameStore.getState().makeBotMove()');
      useGameStore.getState().makeBotMove();
    }
  }, [game?.currentSetIndex, game?.sets[game?.currentSetIndex || 0]?.currentPlayer, isAnimating]);

  if (!game) {
    console.log('[BOARD] Game yok, render edilmiyor');
    return null;
  }

  const currentSet = game.sets[game.currentSetIndex];

  if (!currentSet) {
    console.error('[BOARD] Current set bulunamadı!', {
      currentSetIndex: game.currentSetIndex,
      totalSets: game.sets.length,
      gameStatus: game.status
    });

    // Oyun bittiyse GameOverModal gösterilecek, boş ekran gösterme
    if (game.status === 'finished') {
      console.log('[BOARD] Oyun bitti, son set gösteriliyor');
      // Son set'i göster
      const lastSet = game.sets[game.sets.length - 1];
      if (!lastSet) {
        return <div className="text-center p-8">Oyun yükleniyor...</div>;
      }
      // Son set ile devam et, GameOverModal zaten açılacak
      return null; // GameOverModal App.tsx'de gösterilecek
    }

    return <div className="text-center p-8">Yeni set başlıyor...</div>;
  }

  const board = currentSet.board;
  const currentPlayer = currentSet.currentPlayer;

  console.log('[BOARD RENDER]', {
    setIndex: game.currentSetIndex,
    setStatus: currentSet.status,
    currentPlayer,
    gameStatus: game.status
  });

  // Online oyunda: Kullanıcının sırası mı kontrol et
  let isMyTurn = true; // Default: PvP ve PvE için her zaman true
  if (game.mode === 'online' && user) {
    const currentUserName = user.username;
    // Eğer mevcut kullanıcı player1 ise ve sıra player1'deyse -> true
    // Eğer mevcut kullanıcı player2 ise ve sıra player2'deyse -> true
    if (game.player1Name === currentUserName) {
      isMyTurn = currentPlayer === 'player1';
    } else if (game.player2Name === currentUserName) {
      isMyTurn = currentPlayer === 'player2';
    }
  }

  // Online oyunda: Her oyuncu kendi bölgesini altta görür
  let topPlayerName = game.player2Name;
  let bottomPlayerName = game.player1Name;
  let topPlayerScore = game.scores.player2;
  let bottomPlayerScore = game.scores.player1;
  let topPlayerPits = [12, 11, 10, 9, 8, 7]; // Player 2'nin kuyuları (ters - sağdan sola)
  let bottomPlayerPits = [0, 1, 2, 3, 4, 5]; // Player 1'in kuyuları (soldan sağa)
  let leftTreasure = 13;  // Player 2 hazne
  let rightTreasure = 6;  // Player 1 hazne
  let topPlayer: 'player1' | 'player2' = 'player2';
  let bottomPlayer: 'player1' | 'player2' = 'player1';

  // Sıra gösterimi için - hangi oyuncunun adı gösterilecek
  let currentTurnPlayerName = currentPlayer === 'player1' ? game.player1Name : game.player2Name;

  if (game.mode === 'online' && user) {
    const currentUserName = user.username;
    // Eğer mevcut kullanıcı player2 ise tahtayı ters çevir
    if (game.player2Name === currentUserName) {
      topPlayerName = game.player1Name;
      bottomPlayerName = game.player2Name;
      topPlayerScore = game.scores.player1;
      bottomPlayerScore = game.scores.player2;
      // Player2 perspektifi: kendi kuyularını altta SOLDAN SAĞA görmeli
      topPlayerPits = [5, 4, 3, 2, 1, 0]; // Player 1'in kuyuları üstte (ters - sağdan sola)
      bottomPlayerPits = [7, 8, 9, 10, 11, 12]; // Player 2'nin kuyuları altta (soldan sağa)
      leftTreasure = 6;  // Player 1 hazne sol
      rightTreasure = 13;  // Player 2 hazne sağ
      topPlayer = 'player1';
      bottomPlayer = 'player2';
      // Sıra player2'de ise bottomPlayerName (kendi), player1'de ise topPlayerName (rakip)
      currentTurnPlayerName = currentPlayer === 'player2' ? bottomPlayerName : topPlayerName;
    } else {
      // player1 perspektifi - normal
      currentTurnPlayerName = currentPlayer === 'player1' ? bottomPlayerName : topPlayerName;
    }
  }

  const boardBgClass =
    boardStyle === 'wood'
      ? 'bg-gradient-to-br from-amber-700 to-amber-900'
      : boardStyle === 'metal'
      ? 'bg-gradient-to-br from-slate-600 to-slate-800'
      : 'bg-gradient-to-br from-blue-500 to-blue-700';

  return (
    <div className="flex flex-row items-start justify-center gap-3 sm:gap-4 md:gap-6 lg:gap-8 p-2 sm:p-4 md:p-6 lg:p-8 min-h-[80vh]">
      {/* Ana oyun alanı - Sol ve Orta */}
      <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 md:gap-6 lg:gap-8">
      {/* Settings Button - Sağ Üst */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="absolute top-2 right-2 z-50 btn btn-secondary p-2 rounded-full w-10 h-10 flex items-center justify-center"
        title="Ayarlar"
      >
        ⚙️
      </button>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-14 right-2 z-50 card p-4 space-y-4 min-w-[200px]">
          <h3 className="font-bold text-sm dark:text-white text-gray-900">{t('settings.title') || 'Ayarlar'}</h3>

          {/* Tema */}
          <div className="flex items-center justify-between">
            <span className="text-xs dark:text-gray-300 text-gray-700">{t('theme.theme') || 'Tema'}</span>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="btn btn-secondary px-3 py-1 text-xs"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>

          {/* Ses Açma/Kapama */}
          <div className="flex items-center justify-between">
            <span className="text-xs dark:text-gray-300 text-gray-700">{t('settings.sound') || 'Ses'}</span>
            <button
              onClick={toggleSound}
              className="btn btn-secondary px-3 py-1 text-xs"
            >
              {soundEnabled ? '🔊' : '🔇'}
            </button>
          </div>

          {/* Ses Seviyesi */}
          {soundEnabled && (
            <div className="space-y-1">
              <label className="text-xs dark:text-gray-300 text-gray-700">{t('settings.volume') || 'Ses Seviyesi'}: {volume}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full"
              />
            </div>
          )}

          {/* Dil Seçici */}
          <div className="space-y-1">
            <label className="text-xs dark:text-gray-300 text-gray-700">{t('settings.language') || 'Dil'}</label>
            <select
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="w-full p-2 rounded dark:bg-gray-700 bg-white dark:text-white text-gray-900 text-xs border dark:border-gray-600 border-gray-300"
            >
              <option value="tr">🇹🇷 TR</option>
              <option value="kk">🇰🇿 KZ</option>
              <option value="en">🇬🇧 EN</option>
              <option value="ru">🇷🇺 RU</option>
            </select>
          </div>
        </div>
      )}

      {/* Skor Tablosu - EN ÜSTTE */}
      <div className="flex gap-2 sm:gap-3 md:gap-4 lg:gap-8">
        <div className="card text-center p-2 sm:p-3 md:p-4 min-w-[80px] sm:min-w-[100px] md:min-w-[120px]">
          <p className="text-[10px] sm:text-xs md:text-sm dark:text-gray-400 text-gray-600 mb-1">{game.player1Name}</p>
          <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-blue-500">{game.scores.player1}</p>
        </div>
        <div className="card text-center p-2 sm:p-3 md:p-4 min-w-[80px] sm:min-w-[100px] md:min-w-[120px]">
          <p className="text-[10px] sm:text-xs md:text-sm dark:text-gray-400 text-gray-600 mb-1">{t('score.set')}</p>
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold dark:text-white text-gray-900">{game.currentSetIndex + 1} / 5</p>
          <p className="text-[10px] sm:text-xs md:text-sm text-yellow-500 mt-1 sm:mt-2 animate-pulse font-semibold">
            {t('messages.turnIndicator', { player: currentTurnPlayerName })}
          </p>
        </div>
        <div className="card text-center p-2 sm:p-3 md:p-4 min-w-[80px] sm:min-w-[100px] md:min-w-[120px]">
          <p className="text-[10px] sm:text-xs md:text-sm dark:text-gray-400 text-gray-600 mb-1">{game.player2Name}</p>
          <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-red-500">{game.scores.player2}</p>
        </div>
      </div>

      {/* Üst Oyuncu İsmi */}
      <div className="text-center relative z-10">
        <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-red-500 drop-shadow-md">
          {topPlayerName}
          {game.mode === 'online' && opponentStats && topPlayerName !== user?.username && (
            <span className="text-xs sm:text-sm ml-2 opacity-75">
              ({opponentStats.total_games}O {opponentStats.total_wins}G {opponentStats.total_losses}M)
            </span>
          )}
        </h3>
      </div>

      {/* Oyun Tahtası - Ortada */}
      <div
        className="rounded-2xl sm:rounded-3xl shadow-2xl p-2 sm:p-3 md:p-5 lg:p-7 xl:p-8 relative"
        style={{
          background: 'linear-gradient(135deg, #8b4513 0%, #a0522d 50%, #8b4513 100%)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
        }}
      >
        {/* Ahşap Doku Efekti */}
        <div
          className="absolute inset-0 rounded-2xl sm:rounded-3xl opacity-20 pointer-events-none"
          style={{
            backgroundImage: `repeating-linear-gradient(
              90deg,
              transparent,
              transparent 2px,
              rgba(101, 67, 33, 0.3) 2px,
              rgba(101, 67, 33, 0.3) 4px
            )`
          }}
        />

        {/* İç Çerçeve - Dekoratif */}
        <div className="absolute inset-2 sm:inset-3 md:inset-4 border-2 sm:border-3 md:border-4 border-yellow-700 rounded-xl sm:rounded-2xl opacity-40"
          style={{ boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)' }}
        />

        {/* Logo - Ortada */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-0 opacity-20">
          <img
            src="/assets/images/okul_logo.jpg"
            alt="Logo"
            className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40 object-contain rounded-full"
            style={{ filter: 'brightness(1.5) contrast(0.8)' }}
          />
        </div>

        <div className="relative z-10 flex items-center gap-2 sm:gap-3 md:gap-4 lg:gap-8">
          {/* Sol Hazne */}
          <Treasure
            stones={board.pits[leftTreasure]}
            player={leftTreasure === 13 ? 'player2' : 'player1'}
            isActive={currentPlayer === (leftTreasure === 13 ? 'player2' : 'player1')}
          />

          {/* Kuyular */}
          <div className="flex flex-col gap-1 sm:gap-2 md:gap-3 lg:gap-6">
            {/* Üst Sıra Kuyuları */}
            <div className="flex gap-0.5 sm:gap-1 md:gap-2 lg:gap-4">
              {topPlayerPits.map((pitIndex) => (
                <Pit
                  key={pitIndex}
                  pitIndex={pitIndex}
                  stones={board.pits[pitIndex]}
                  player={topPlayer}
                  isActive={currentPlayer === topPlayer && isMyTurn}
                  isStartPit={lastMove?.startPit === pitIndex}
                  isEndPit={lastMove?.endPit === pitIndex}
                />
              ))}
            </div>

            {/* Alt Sıra Kuyuları */}
            <div className="flex gap-0.5 sm:gap-1 md:gap-2 lg:gap-4">
              {bottomPlayerPits.map((pitIndex) => (
                <Pit
                  key={pitIndex}
                  pitIndex={pitIndex}
                  stones={board.pits[pitIndex]}
                  player={bottomPlayer}
                  isActive={currentPlayer === bottomPlayer && isMyTurn}
                  isStartPit={lastMove?.startPit === pitIndex}
                  isEndPit={lastMove?.endPit === pitIndex}
                />
              ))}
            </div>
          </div>

          {/* Sağ Hazne */}
          <Treasure
            stones={board.pits[rightTreasure]}
            player={rightTreasure === 6 ? 'player1' : 'player2'}
            isActive={currentPlayer === (rightTreasure === 6 ? 'player1' : 'player2')}
          />
        </div>
      </div>

      {/* Alt Oyuncu İsmi */}
      <div className="text-center relative z-10">
        <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-blue-500 drop-shadow-md">
          {bottomPlayerName}
          {game.mode === 'online' && opponentStats && bottomPlayerName !== user?.username && (
            <span className="text-xs sm:text-sm ml-2 opacity-75">
              ({opponentStats.total_games}O {opponentStats.total_wins}G {opponentStats.total_losses}M)
            </span>
          )}
        </h3>
      </div>

      {/* Hamle Geçmişi - Mobilde tahtanın altında */}
      <div className="lg:hidden w-full max-w-md mx-auto">
        <MoveHistory />
      </div>
      </div>

      {/* Hamle Geçmişi - Masaüstünde sağda */}
      <div className="hidden lg:block">
        <MoveHistory />
      </div>

      {/* Chat - Sadece online oyunda */}
      {game.mode === 'online' && onlineSocket && onlineRoomId && user && (
        <Chat
          socket={onlineSocket}
          roomId={onlineRoomId}
          username={user.username}
          opponentUsername={game.player1Name === user.username ? game.player2Name : game.player1Name}
          opponentUserId={opponentStats?.id}
        />
      )}
    </div>
  );
};

export default Board;
