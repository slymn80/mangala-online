/**
 * Oyun Sonu Modalı
 * 5 set bittiğinde gösterilir
 */

import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from 'react-i18next';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3001/api');

const GameOverModal: React.FC = () => {
  const { t } = useTranslation();
  const game = useGameStore((state) => state.game);
  const startNewGame = useGameStore((state) => state.startNewGame);
  const clearGame = useGameStore((state) => state.clearGame);
  const { user, token } = useAuthStore();
  const [gameSaved, setGameSaved] = useState(false);

  // Oyun bittiğinde veritabanına kaydet
  useEffect(() => {
    if (game && game.status === 'finished' && token && !gameSaved) {
      saveGameToDatabase();
    }
  }, [game?.status]);

  const saveGameToDatabase = async () => {
    if (!game || !token) return;

    try {
      const response = await fetch(`${API_URL}/games/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          player1Name: game.player1Name,
          player2Name: game.player2Name,
          gameMode: game.mode,
          winner: game.winner,
          finalScoreP1: game.scores.player1,
          finalScoreP2: game.scores.player2,
          totalSets: game.sets.length,
          gameData: game // Tüm oyun verisini kaydet
        })
      });

      if (response.ok) {
        setGameSaved(true);
        console.log('[GAME] Oyun veritabanına kaydedildi');
      }
    } catch (error) {
      console.error('[GAME] Oyun kaydedilemedi:', error);
    }
  };

  if (!game || game.status !== 'finished') return null;

  const handleNewGame = () => {
    startNewGame({
      mode: game.mode,
      player1Name: game.player1Name,
      player2Name: game.player2Name,
      botDifficulty: game.botDifficulty
    });
  };

  const getWinnerText = () => {
    if (game.winner === 'draw') {
      return t('game.draw');
    }
    return game.winner === 'player1' ? game.player1Name : game.player2Name;
  };

  const getWinnerEmoji = () => {
    if (game.winner === 'draw') return '🤝';
    return '🏆';
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
      <div className="card max-w-2xl w-full mx-4 bounce-in">
        {/* Konfeti Animasyonu */}
        <div className="absolute -top-20 left-1/2 transform -translate-x-1/2">
          <div className="text-8xl animate-bounce">{getWinnerEmoji()}</div>
        </div>

        <div className="text-center space-y-6 mt-12">
          <h2 className="text-5xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            {t('game.gameOver')}
          </h2>

          {/* Kazanan */}
          <div className="space-y-2">
            <p className="text-xl text-gray-400">{t('game.winner')}</p>
            <p className="text-4xl font-bold">
              {getWinnerText()}
            </p>
          </div>

          {/* Skor Tablosu */}
          <div className="grid grid-cols-2 gap-6 my-8">
            <div className="card bg-blue-900 bg-opacity-30">
              <p className="text-lg font-semibold mb-2">{game.player1Name}</p>
              <p className="text-5xl font-bold text-blue-400">{game.scores.player1}</p>
              <p className="text-sm text-gray-400 mt-2">{t('score.score')}</p>
            </div>
            <div className="card bg-red-900 bg-opacity-30">
              <p className="text-lg font-semibold mb-2">{game.player2Name}</p>
              <p className="text-5xl font-bold text-red-400">{game.scores.player2}</p>
              <p className="text-sm text-gray-400 mt-2">{t('score.score')}</p>
            </div>
          </div>

          {/* Set Detayları */}
          <div className="space-y-3">
            <p className="text-sm text-gray-400 font-semibold">{t('score.set')} Sonuçları</p>
            <div className="grid grid-cols-5 gap-2">
              {game.sets.map((set, index) => {
                const setWinnerName =
                  set.winner === 'draw'
                    ? '🤝'
                    : set.winner === 'player1'
                    ? game.player1Name.substring(0, 1)
                    : game.player2Name.substring(0, 1);

                return (
                  <div
                    key={index}
                    className={`p-3 rounded-lg ${
                      set.winner === 'player1'
                        ? 'bg-blue-600'
                        : set.winner === 'player2'
                        ? 'bg-red-600'
                        : 'bg-gray-600'
                    }`}
                  >
                    <p className="text-xs text-gray-300">Set {index + 1}</p>
                    <p className="text-lg font-bold">{setWinnerName}</p>
                    <p className="text-xs">
                      {set.board.pits[6]} - {set.board.pits[13]}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Butonlar */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={handleNewGame}
              className="btn btn-success flex-1 text-lg py-4"
            >
              🔄 {t('menu.newGame')}
            </button>
            <button
              onClick={() => {
                clearGame();
                window.location.reload();
              }}
              className="btn btn-secondary flex-1 text-lg py-4"
            >
              🏠 {t('menu.quit')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameOverModal;
