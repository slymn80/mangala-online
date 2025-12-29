/**
 * Kuyu (Pit) Bileşeni
 * Taşların bulunduğu küçük kuyular
 */

import React from 'react';
import { useGameStore } from '../store/gameStore';
import { useSounds } from '../hooks/useSounds';
import type { Player } from '../../types/game.types';

interface PitProps {
  pitIndex: number;
  stones: number;
  player: Player; // eslint-disable-line @typescript-eslint/no-unused-vars
  isActive: boolean;
  isStartPit?: boolean; // Son hamlenin başlangıç kuyusu
  isEndPit?: boolean; // Son hamlenin bitiş kuyusu
}

const Pit: React.FC<PitProps> = ({ pitIndex, stones, isActive, isStartPit = false, isEndPit = false }) => {
  const makeMove = useGameStore((state) => state.makeMove);
  const selectedPit = useGameStore((state) => state.selectedPit);
  const selectPit = useGameStore((state) => state.selectPit);
  const isAnimating = useGameStore((state) => state.isAnimating);
  const stoneColor = useGameStore((state) => state.stoneColor);
  const animatedPit = useGameStore((state) => state.animatedPit);
  const { playSound } = useSounds();

  const isSelected = selectedPit === pitIndex;
  const canClick = isActive && stones > 0 && !isAnimating;
  const isReceivingStone = animatedPit === pitIndex; // Bu kuyu şu anda taş alıyor mu?

  const handleClick = () => {
    if (!canClick) return;

    if (isSelected) {
      // İkinci tıklama - hamleyi yap
      playSound('move');
      makeMove(pitIndex);
      selectPit(null);
    } else {
      // İlk tıklama - kuyuyu seç
      playSound('click');
      selectPit(pitIndex);
    }
  };

  const getStoneColorClass = () => {
    // Player 1 (alt sıra, 1-6): beyaz taşlar
    // Player 2 (üst sıra, 7-12): siyah taşlar
    if (pitIndex >= 0 && pitIndex <= 5) {
      // Player 1 - Beyaz taşlar
      return 'bg-gradient-to-br from-gray-100 to-gray-300 border border-gray-400';
    } else if (pitIndex >= 7 && pitIndex <= 12) {
      // Player 2 - Siyah taşlar
      return 'bg-gradient-to-br from-gray-700 to-gray-900';
    }

    // Fallback (hazne için, ama bu component'te hazne yok)
    return 'bg-gradient-to-br from-blue-700 to-blue-900';
  };

  // Kuyu zemin rengi
  const getPitBackgroundColor = () => {
    if (pitIndex >= 0 && pitIndex <= 5) {
      // Player 1 - Siyah zemin
      return '#1a1311';
    } else if (pitIndex >= 7 && pitIndex <= 12) {
      // Player 2 - Beyaz zemin
      return '#e5e5e5';
    }
    return '#3e2723';
  };

  const stoneColorClass = getStoneColorClass();

  // Kullanıcı dostu kuyu numarası: 1-12
  // Player 1 (0-5) → 1-6, Player 2 (7-12) → 7-12
  const displayNumber = pitIndex >= 0 && pitIndex <= 5 ? pitIndex + 1 : pitIndex;

  return (
    <div className="relative flex flex-col items-center">
      {/* Kuyu Numarası kaldırıldı */}

      {/* Kuyu - Renkli zemin */}
      <div
        onClick={handleClick}
        className={`
          w-10 h-10 sm:w-14 sm:h-14 md:w-18 md:h-18 lg:w-22 lg:h-22 xl:w-24 xl:h-24 rounded-full
          flex items-center justify-center
          relative
          transition-all duration-200
          ${canClick ? 'cursor-pointer hover:scale-105' : 'opacity-80 cursor-not-allowed'}
          ${isSelected ? 'ring-4 ring-yellow-400 scale-105' : ''}
          ${isStartPit ? 'ring-3 ring-green-500' : ''}
          ${isEndPit ? 'ring-3 ring-purple-500' : ''}
          ${isReceivingStone ? 'ring-4 ring-cyan-400 scale-110 animate-pulse' : ''}
        `}
        style={{
          backgroundColor: getPitBackgroundColor(),
          boxShadow: isSelected
            ? '0 0 20px rgba(251, 191, 36, 0.8), inset 0 4px 12px rgba(0,0,0,0.5)'
            : isReceivingStone
            ? '0 0 25px rgba(34, 211, 238, 0.9), inset 0 4px 12px rgba(0,0,0,0.5)'
            : isStartPit
            ? '0 0 15px rgba(34, 197, 94, 0.6), inset 0 4px 12px rgba(0,0,0,0.5)'
            : isEndPit
            ? '0 0 15px rgba(168, 85, 247, 0.6), inset 0 4px 12px rgba(0,0,0,0.5)'
            : pitIndex >= 0 && pitIndex <= 5
            ? 'inset 0 4px 12px rgba(0,0,0,0.8), inset 0 -2px 4px rgba(139,69,19,0.3)'
            : 'inset 0 4px 8px rgba(0,0,0,0.3), inset 0 -2px 4px rgba(255,255,255,0.1)'
        }}
      >
        {/* Taş Sayısı */}
        <div className="absolute inset-0 flex items-center justify-center">
          {stones > 0 && (
            <div className="relative">
              {/* Taşlar (görsel olarak üst üste) */}
              <div className="flex items-center justify-center relative">
                {stones <= 6 ? (
                  // 6 ve daha az taş için ayrı ayrı göster
                  <div className="flex flex-wrap gap-0.5 w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-12 lg:h-12 xl:w-14 xl:h-14 items-center justify-center">
                    {Array.from({ length: Math.min(stones, 6) }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-1 h-1 sm:w-1.5 sm:h-1.5 md:w-2 md:h-2 lg:w-3 lg:h-3 xl:w-4 xl:h-4 rounded-full ${stoneColorClass} shadow-sm`}
                        style={{
                          transform: `rotate(${i * 15}deg) translateY(${i % 2 ? -1 : 1}px)`,
                          zIndex: i
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  // 7+ taş için sadece sayı göster
                  <div className="relative">
                    <div className={`w-4 h-4 sm:w-5 sm:h-5 md:w-7 md:h-7 lg:w-9 lg:h-9 xl:w-10 xl:h-10 rounded-full ${stoneColorClass} shadow-lg`} />
                    <span
                      className={`absolute inset-0 flex items-center justify-center font-bold text-[9px] sm:text-[10px] md:text-xs lg:text-sm xl:text-lg ${
                        pitIndex >= 0 && pitIndex <= 5 ? 'text-gray-900' : 'text-white'
                      }`}
                      style={{
                        textShadow: pitIndex >= 0 && pitIndex <= 5
                          ? '0 1px 2px rgba(255,255,255,0.5)'
                          : '0 1px 2px rgba(0,0,0,0.8)'
                      }}
                    >
                      {stones}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Boş kuyu - hiçbir şey gösterme, tahta resmi kendi kuyularını gösteriyor */}
        </div>
      </div>

      {/* Hover bilgisi */}
      {canClick && (
        <div className="absolute -bottom-6 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
          {isSelected ? 'Oyna' : 'Seç'}
        </div>
      )}
    </div>
  );
};

export default Pit;
