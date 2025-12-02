/**
 * Hazne (Treasure) Bileşeni
 * Oyuncuların topladıkları taşların bulunduğu büyük hazne
 */

import React from 'react';
import { useGameStore } from '../store/gameStore';
import type { Player } from '../../types/game.types';
import { useTranslation } from 'react-i18next';

interface TreasureProps {
  stones: number;
  player: Player;
  isActive: boolean;
}

const Treasure: React.FC<TreasureProps> = ({ stones, player, isActive }) => {
  const { t } = useTranslation();
  const stoneColor = useGameStore((state) => state.stoneColor);
  const animatedPit = useGameStore((state) => state.animatedPit);

  // Treasure indeksleri: player1 = 6, player2 = 13
  const treasureIndex = player === 'player1' ? 6 : 13;
  const isReceivingStone = animatedPit === treasureIndex;

  const getStoneColorClass = () => {
    // Player 1 (sağ hazne): siyah taşlar
    // Player 2 (sol hazne): beyaz taşlar
    if (player === 'player1') {
      return 'from-gray-700 to-gray-900';
    } else {
      return 'from-gray-100 to-gray-300';
    }
  };

  const playerColor = player === 'player1' ? 'blue' : 'red';

  return (
    <div className="flex flex-col items-center gap-1 sm:gap-2">
      {/* Hazne - Ahşap görünümlü büyük delik */}
      <div
        className={`
          w-16 h-28 sm:w-20 sm:h-36 md:w-24 md:h-44 lg:w-28 lg:h-52 xl:w-32 xl:h-56 rounded-3xl
          flex flex-col items-center justify-center
          relative
          transition-all duration-200
          ${isActive ? 'ring-2 ring-yellow-400' : ''}
          ${isReceivingStone ? 'ring-4 ring-cyan-400 scale-105 animate-pulse' : ''}
        `}
        style={{
          background: 'linear-gradient(180deg, #2c1810 0%, #1a0f0a 50%, #2c1810 100%)',
          boxShadow: isActive
            ? '0 0 20px rgba(251, 191, 36, 0.5), inset 0 8px 20px rgba(0,0,0,0.9)'
            : isReceivingStone
            ? '0 0 30px rgba(34, 211, 238, 0.9), inset 0 8px 20px rgba(0,0,0,0.9)'
            : 'inset 0 8px 20px rgba(0,0,0,0.9), inset 0 -4px 8px rgba(139,69,19,0.3)'
        }}
      >

        {/* Taş gösterimi */}
        <div className="relative flex flex-col items-center justify-center h-full">
          {/* Taş yığını görsel efekti */}
          {stones > 0 && (
            <div className="absolute inset-0 flex items-end justify-center pb-2 sm:pb-2.5 md:pb-3 lg:pb-4 xl:pb-6">
              <div
                className={`w-5 sm:w-6 md:w-8 lg:w-10 xl:w-14 rounded-t-full bg-gradient-to-br ${getStoneColorClass()} opacity-70`}
                style={{
                  height: `${Math.min((stones / 48) * 100, 90)}%`,
                  transition: 'height 0.5s ease-out'
                }}
              />
            </div>
          )}

          {/* Taş sayısı */}
          <div
            className={`
              relative z-10
              w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 xl:w-16 xl:h-16 rounded-full
              flex items-center justify-center
              bg-gradient-to-br ${getStoneColorClass()}
              shadow-lg
              border-2 sm:border-2 md:border-3 lg:border-4
              ${playerColor === 'blue' ? 'border-blue-400' : 'border-red-400'}
            `}
          >
            <span className={`text-[10px] sm:text-xs md:text-sm lg:text-lg xl:text-2xl font-bold drop-shadow-lg ${
              player === 'player1' ? 'text-white' : 'text-gray-800'
            }`}>
              {stones}
            </span>
          </div>

          {/* Sparkle efekti (taş eklendiğinde) */}
          {isActive && stones > 0 && (
            <div className="absolute -top-1 sm:-top-2 -right-1 sm:-right-2 w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 bg-yellow-400 rounded-full animate-sparkle opacity-80"></div>
          )}
        </div>

        {/* Oyuncu etiketi kaldırıldı */}
      </div>
    </div>
  );
};

export default Treasure;
