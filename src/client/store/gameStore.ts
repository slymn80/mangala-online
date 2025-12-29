/**
 * Mangala Oyun State Management (Zustand)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameState, SetState } from '../../types/game.types';
import { initializeGame, applyMove, updateGameScore } from '../../engine/engine';
import { getBotMove } from '../../engine/bot';
import i18n from '../i18n/config';

// Ses çalma helper fonksiyonu
const playSound = (soundFile: string, volume: number, enabled: boolean) => {
  if (!enabled) return;
  const audio = new Audio(soundFile);
  audio.volume = volume / 100;
  audio.play().catch(() => {
    // Ses çalınamadı, sessizce devam et
  });
};

interface GameStore {
  // State
  game: GameState | null;
  selectedPit: number | null;
  isAnimating: boolean;
  message: string | null;
  isBotThinking: boolean;
  lastMove: { startPit: number; endPit: number } | null;
  animatedPit: number | null; // Animasyon sırasında hangi kuyu ışıldıyor

  // Settings
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number;
  animationsEnabled: boolean;
  theme: 'light' | 'dark';
  boardStyle: 'wood' | 'metal' | 'plastic';
  stoneColor: 'red' | 'white' | 'blue';

  // Actions
  startNewGame: (params: any) => void;
  clearGame: () => void;
  loadGame: (gameState: GameState) => void;
  makeMove: (pitIndex: number) => void;
  selectPit: (pitIndex: number | null) => void;
  setMessage: (message: string | null) => void;
  setAnimating: (isAnimating: boolean) => void;

  // Settings Actions
  toggleSound: () => void;
  toggleMusic: () => void;
  setVolume: (volume: number) => void;
  toggleAnimations: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setBoardStyle: (style: 'wood' | 'metal' | 'plastic') => void;
  setStoneColor: (color: 'red' | 'white' | 'blue') => void;

  // Bot
  makeBotMove: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
  // Initial State
  game: null,
  selectedPit: null,
  isAnimating: false,
  message: null,
  isBotThinking: false,
  lastMove: null,
  animatedPit: null,

  // Default Settings
  soundEnabled: true,
  musicEnabled: true,
  volume: 70,
  animationsEnabled: true,
  theme: 'light',
  boardStyle: 'wood',
  stoneColor: 'blue',

  // Actions
  startNewGame: (params) => {
    const game = initializeGame(params);
    set({ game, selectedPit: null, message: null, isAnimating: false, isBotThinking: false, lastMove: null, animatedPit: null });
    // Bot sırası kontrolü artık Board.tsx useEffect'inde yapılıyor
  },

  clearGame: () => {
    set({
      game: null,
      selectedPit: null,
      message: null,
      isAnimating: false,
      isBotThinking: false,
      lastMove: null,
      animatedPit: null
    });
  },

  loadGame: (gameState: GameState) => {
    console.log('[GAMESTORE] Loading saved game state:', gameState);
    set({
      game: gameState,
      selectedPit: null,
      message: null,
      isAnimating: false,
      isBotThinking: false,
      lastMove: null,
      animatedPit: null
    });
  },

  makeMove: (pitIndex) => {
    const { game, isAnimating } = get();

    console.log('[MOVE] makeMove çağrıldı:', { pitIndex, gameExists: !!game, isAnimating });

    if (!game || isAnimating) {
      console.log('[MOVE] Hamle reddedildi - oyun yok veya animating:', { gameExists: !!game, isAnimating });
      return;
    }

    const currentSet = game.sets[game.currentSetIndex];

    if (currentSet.status === 'finished') {
      set({ message: i18n.t('messages.setFinished') });
      return;
    }

    // Hamle yap
    set({ isAnimating: true });

    const result = applyMove(game, pitIndex);

    if (!result.success) {
      set({ message: result.message, isAnimating: false });
      setTimeout(() => set({ message: null }), 2000);
      return;
    }

    // GERÇEK ZAMANLI ANIMASYON: Taşları adım adım hareket ettir
    const { soundEnabled, volume, animationsEnabled } = get();
    const stoneCount = result.stoneMoves?.length || 0;
    const bubblePopTime = animationsEnabled && stoneCount > 0 ? stoneCount * 350 : 0;

    if (animationsEnabled && result.stoneMoves && result.stoneMoves.length > 0) {
      // Başlangıç board state'ini sakla ve başlangıç kuyusunu boşalt
      const animatedBoard = { pits: [...currentSet.board.pits] };
      const stonesInHand = animatedBoard.pits[pitIndex];
      animatedBoard.pits[pitIndex] = 0; // Başlangıç kuyusunu boşalt

      // İlk state'i hemen göster (başlangıç kuyusu boş)
      const animatedSet: SetState = {
        ...currentSet,
        board: animatedBoard
      };
      const animatedSets = [...game.sets];
      animatedSets[game.currentSetIndex] = animatedSet;
      set({
        game: { ...game, sets: animatedSets }
      });

      // Her taş hareketi için board'u gerçek zamanlı güncelle
      result.stoneMoves.forEach((targetPit, index) => {
        setTimeout(() => {
          // Ses çal
          if (soundEnabled) {
            playSound('/assets/sounds/bubble-pop-04-323580.mp3', volume, soundEnabled);
          }

          // Board'u güncelle - hedef kuyuya +1 taş ekle
          const currentGame = get().game;
          if (!currentGame) return;

          const currentBoard = currentGame.sets[currentGame.currentSetIndex].board;
          const updatedBoard = { pits: [...currentBoard.pits] };
          updatedBoard.pits[targetPit]++; // Her adımda bir taş ekle

          const updatedSet: SetState = {
            ...currentGame.sets[currentGame.currentSetIndex],
            board: updatedBoard
          };
          const updatedSets = [...currentGame.sets];
          updatedSets[currentGame.currentSetIndex] = updatedSet;

          set({
            game: { ...currentGame, sets: updatedSets }
          });

          // Kuyuyu vurgula
          set({ animatedPit: targetPit });
          setTimeout(() => {
            set({ animatedPit: null });
          }, 400); // 400ms vurgu süresi - oyuncuların takip edebilmesi için
        }, index * 350); // Her taş arası 350ms gecikme - daha takip edilebilir
      });
    }

    // Animasyon bittikten sonra final state'i uygula
    setTimeout(() => {
      // Game state güncelle - final result ile
      const currentGame = get().game;
      if (!currentGame) return;

      const updatedSet: SetState = {
        ...currentGame.sets[currentGame.currentSetIndex],
        board: result.board, // Final board state (capture dahil)
        currentPlayer: result.nextPlayer,
        status: result.setFinished ? 'finished' : 'active',
        winner: result.setWinner,
        moves: [
          ...currentGame.sets[currentGame.currentSetIndex].moves,
          {
            player: currentSet.currentPlayer,
            pitIndex,
            timestamp: Date.now(),
            resultState: result.board,
            capturedStones: result.capturedStones,
            extraTurn: result.extraTurn
          }
        ]
      };

      const newSets = [...currentGame.sets];
      newSets[currentGame.currentSetIndex] = updatedSet;

      let updatedGame: GameState = {
        ...currentGame,
        sets: newSets
      };

      // lastMove bilgisini sakla
      const lastMoveInfo = result.startPit !== undefined && result.endPit !== undefined
        ? { startPit: result.startPit, endPit: result.endPit }
        : null;
      set({ game: updatedGame, selectedPit: null, lastMove: lastMoveInfo });

      // Set bittiyse skor güncelle
      if (result.setFinished && result.setWinner) {
        updatedGame = updateGameScore(updatedGame, result.setWinner);
        set({ game: updatedGame, isAnimating: false });

        // Set bitişi sesi ve mesajı
        const { soundEnabled, volume } = get();
        if (updatedGame.status === 'finished') {
          // Oyun bitti
          playSound('/assets/sounds/applause-cheer-236786.mp3', volume, soundEnabled);
        } else {
          // Set bitti
          playSound('/assets/sounds/level-complete-394515.mp3', volume, soundEnabled);
        }

        set({ message: i18n.t('messages.setFinishedWinner', { winner: result.setWinner }) });
        setTimeout(() => set({ message: null }), 2000);

        // Bot sırası kontrolü artık Board.tsx useEffect'inde yapılıyor
        console.log('[SET BİTTİ] Yeni set başladı:', {
          currentSetIndex: updatedGame.currentSetIndex,
          currentPlayer: updatedGame.sets[updatedGame.currentSetIndex]?.currentPlayer
        });
      } else {
        // Normal hamle - mesajları göster
        const { soundEnabled, volume } = get();

        if (result.extraTurn) {
          playSound('/assets/sounds/combine-special-394482.mp3', volume, soundEnabled);
          set({ message: i18n.t('messages.extraTurn') });
          setTimeout(() => set({ message: null }), 1500);
        } else if (result.capturedStones > 0) {
          playSound('/assets/sounds/clear-combo-4-394493.mp3', volume, soundEnabled);
          // Kural tipine göre mesaj göster
          let message = i18n.t('messages.captured', { count: result.capturedStones });
          if (result.rule === 'RULE_18_CAPTURE_EVEN') {
            message = i18n.t('messages.capturedDoubling', { count: result.capturedStones });
          } else if (result.rule === 'RULE_19_CAPTURE_OPPOSITE') {
            message = i18n.t('messages.capturedFox', { count: result.capturedStones });
          }
          set({ message });
          setTimeout(() => set({ message: null }), 1500);
        }

        set({ isAnimating: false });

        // Bot sırası kontrolü artık Board.tsx useEffect'inde yapılıyor
        const isBotNext = updatedGame.mode === 'pve' && result.nextPlayer === 'player2' && !result.setFinished;
        if (isBotNext) {
          console.log('[HAMLE SONRASI] Bot sırası - Board useEffect otomatik çağıracak');
        }
      }
    }, bubblePopTime + 100); // Tüm taşlar yerleştikten 100ms sonra final state'i uygula
  },

  selectPit: (pitIndex) => {
    set({ selectedPit: pitIndex });
  },

  setMessage: (message) => {
    set({ message });
  },

  setAnimating: (isAnimating) => {
    set({ isAnimating });
  },

  // Settings
  toggleSound: () => {
    set((state) => ({ soundEnabled: !state.soundEnabled }));
  },

  toggleMusic: () => {
    set((state) => ({ musicEnabled: !state.musicEnabled }));
  },

  setVolume: (volume) => {
    set({ volume });
  },

  toggleAnimations: () => {
    set((state) => ({ animationsEnabled: !state.animationsEnabled }));
  },

  setTheme: (theme) => {
    set({ theme });
    document.documentElement.classList.toggle('dark', theme === 'dark');
  },

  setBoardStyle: (boardStyle) => {
    set({ boardStyle });
  },

  setStoneColor: (stoneColor) => {
    set({ stoneColor });
  },

  // Bot
  makeBotMove: () => {
    const state = get();
    const { game } = state;

    console.log('[BOT] makeBotMove çağrıldı', {
      gameExists: !!game,
      isAnimating: state.isAnimating,
      isBotThinking: state.isBotThinking,
      mode: game?.mode,
      currentSetIndex: game?.currentSetIndex,
      setsLength: game?.sets?.length,
      currentPlayer: game?.sets[game?.currentSetIndex]?.currentPlayer,
      setStatus: game?.sets[game?.currentSetIndex]?.status,
      gameStatus: game?.status
    });

    // Temel kontroller
    if (!game || game.mode !== 'pve') {
      console.log('[BOT] Hamle yapılamadı - oyun yok veya PvE değil');
      return;
    }

    // Oyun bitmiş mi kontrol et
    if (game.status === 'finished') {
      console.log('[BOT] Hamle yapılamadı - oyun bitti');
      return;
    }

    // CurrentSet var mı kontrol et
    if (!game.sets || game.currentSetIndex >= game.sets.length) {
      console.log('[BOT] Hamle yapılamadı - geçerli set yok');
      return;
    }

    const currentSet = game.sets[game.currentSetIndex];

    if (!currentSet) {
      console.log('[BOT] Hamle yapılamadı - currentSet undefined');
      return;
    }

    if (currentSet.currentPlayer !== 'player2' || currentSet.status === 'finished') {
      console.log('[BOT] Hamle yapılamadı - player2 değil veya set bitti');
      return;
    }

    // isAnimating true yap - böylece aynı anda birden fazla bot hamlesi engellensin
    set({ isAnimating: true, message: i18n.t('messages.thinking') });

    // Bot hamlesini hesapla - Tüm zorluk seviyeleri için sabit süre
    const difficulty = game.botDifficulty || 'medium';
    const thinkTime = 1000; // Tüm seviyeler için sabit düşünme süresi

    const botMove = getBotMove(
      game,
      game.currentSetIndex,
      difficulty,
      thinkTime
    );

    console.log('[BOT] Bot hamlesi hesaplandı:', { difficulty, botMove });

    if (botMove === -1) {
      console.log('[BOT] Bot hamle yapamadı - geçerli hamle yok');
      set({ isAnimating: false, message: null });
      return;
    }

    // Normal insan hızında hamle yap (1-2 saniye arası düşünme süresi)
    // Tüm zorluk seviyeleri için aynı görünür düşünme süresi
    const thinkingTime = 1200;

    setTimeout(() => {
      set({ message: null, isAnimating: false }); // isAnimating'i false yap ki makeMove kabul etsin
      console.log('[BOT] Hamle yapılıyor:', botMove);

      // Tekrar kontrol et - game state değişmiş olabilir
      const currentGame = get().game;
      if (currentGame && currentGame.sets[currentGame.currentSetIndex].currentPlayer === 'player2') {
        get().makeMove(botMove);
      }
    }, thinkingTime);
  }
}),
    {
      name: 'mangala-game-storage',
      partialize: (state) => ({
        game: state.game,
        soundEnabled: state.soundEnabled,
        musicEnabled: state.musicEnabled,
        volume: state.volume,
        animationsEnabled: state.animationsEnabled,
        theme: state.theme,
        boardStyle: state.boardStyle,
        stoneColor: state.stoneColor
      })
    }
  )
);
