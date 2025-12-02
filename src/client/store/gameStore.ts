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

    // Her taş hareketi için bubble pop sesi çal VE kuyuyu animasyonla vurgula
    const { soundEnabled, volume, animationsEnabled } = get();
    if (result.stoneMoves && result.stoneMoves.length > 0) {
      result.stoneMoves.forEach((pitIndex, index) => {
        setTimeout(() => {
          // Ses çal
          if (soundEnabled) {
            playSound('/assets/sounds/bubble-pop-04-323580.mp3', volume, soundEnabled);
          }

          // Animasyon aktifse kuyuyu vurgula
          if (animationsEnabled) {
            set({ animatedPit: pitIndex });
            setTimeout(() => {
              set({ animatedPit: null });
            }, 200); // 200ms vurgu süresi
          }
        }, index * 150); // Her taş arası 150ms gecikme
      });
    }

    // Game state güncelle
    const updatedSet: SetState = {
      ...currentSet,
      board: result.board,
      currentPlayer: result.nextPlayer,
      status: result.setFinished ? 'finished' : 'active',
      winner: result.setWinner,
      moves: [
        ...currentSet.moves,
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

    const newSets = [...game.sets];
    newSets[game.currentSetIndex] = updatedSet;

    let updatedGame: GameState = {
      ...game,
      sets: newSets
    };

    // State'i güncelle (önce!) - lastMove bilgisini sakla
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
      // Animasyon süresi: bubble pop seslerinin bitmesini bekle
      const stoneCount = result.stoneMoves?.length || 0;
      const bubblePopTime = stoneCount * 150; // Her taş arası 150ms
      const baseAnimationTime = get().animationsEnabled ? 600 : 100;
      const animationTime = Math.max(baseAnimationTime, bubblePopTime + 200); // +200ms buffer

      // Mesaj ve ses göster (bubble pop bittikten sonra)
      const { soundEnabled, volume } = get();

      if (result.extraTurn) {
        setTimeout(() => {
          playSound('/assets/sounds/combine-special-394482.mp3', volume, soundEnabled);
          set({ message: i18n.t('messages.extraTurn') });
          setTimeout(() => set({ message: null }), 1500);
        }, bubblePopTime);
      } else if (result.capturedStones > 0) {
        setTimeout(() => {
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
        }, bubblePopTime);
      }

      const isBotNext = updatedGame.mode === 'pve' && result.nextPlayer === 'player2' && !result.setFinished;

      setTimeout(() => {
        set({ isAnimating: false });
        // Bot sırası kontrolü artık Board.tsx useEffect'inde yapılıyor
        if (isBotNext) {
          console.log('[HAMLE SONRASI] Bot sırası - Board useEffect otomatik çağıracak');
        }
      }, animationTime);
    }
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
      currentPlayer: game?.sets[game?.currentSetIndex]?.currentPlayer,
      setStatus: game?.sets[game?.currentSetIndex]?.status
    });

    // Temel kontroller
    if (!game || game.mode !== 'pve') {
      console.log('[BOT] Hamle yapılamadı - oyun yok veya PvE değil');
      return;
    }

    const currentSet = game.sets[game.currentSetIndex];

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
