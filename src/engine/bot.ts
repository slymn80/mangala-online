/**
 * MANGALA BOT AI
 * Beş zorluk seviyesi: Acemi, Kolay, Orta, Zor, Usta
 * - Acemi (Beginner): Tamamen rastgele hamleler
 * - Kolay (Easy): Basit heuristik + düşük derinlik (depth 1)
 * - Orta (Medium): Minimax + orta derinlik (depth 3)
 * - Zor (Hard): Alpha-Beta + yüksek derinlik (depth 5)
 * - Usta (Master): Alpha-Beta + çok yüksek derinlik + gelişmiş heuristik (depth 7)
 *
 * NOT: Tüm seviyelerde hamle hızı aynıdır, sadece algoritma derinliği değişir
 */

import type { BoardState, BotDifficulty, Player, SetState } from '../types/game.types';
import { getValidMoves, applyMove } from './engine';

/**
 * Bot'un hamlesini hesapla
 * Tüm seviyeler için sabit hamle hızı (maxThinkTime)
 */
export function getBotMove(
  gameState: any,
  setIndex: number,
  difficulty: BotDifficulty,
  maxThinkTime: number = 1000 // Tüm seviyeler için aynı düşünme süresi
): number {
  const set = gameState.sets[setIndex];
  const player = set.currentPlayer;
  const validMoves = getValidMoves(set, player);

  if (validMoves.length === 0) {
    return -1;
  }

  if (validMoves.length === 1) {
    return validMoves[0];
  }

  // Zorluk seviyesine göre hamle seç
  switch (difficulty) {
    case 'beginner':
      return getBeginnerMove(validMoves);
    case 'easy':
      return getEasyMove(set, player, validMoves);
    case 'medium':
      return getMediumMove(gameState, setIndex, player, validMoves, maxThinkTime);
    case 'hard':
      return getHardMove(gameState, setIndex, player, validMoves, maxThinkTime);
    case 'master':
      return getMasterMove(gameState, setIndex, player, validMoves, maxThinkTime);
    default:
      return validMoves[0];
  }
}

/**
 * ACEMİ BOT: Tamamen rastgele hamleler
 * Depth: 0 (algoritma yok, sadece rastgele)
 */
function getBeginnerMove(validMoves: number[]): number {
  return validMoves[Math.floor(Math.random() * validMoves.length)];
}

/**
 * KOLAY BOT: Basit heuristik + depth 1
 * Sadece bir hamle ilerisini düşünür
 */
function getEasyMove(set: SetState, player: Player, validMoves: number[]): number {
  const playerTreasure = player === 'player1' ? 6 : 13;
  const opponentTreasure = player === 'player1' ? 13 : 6;

  // 1. ÖNCELİK: Hazneye ulaşan hamle (ekstra tur)
  for (const move of validMoves) {
    const stones = set.board.pits[move];
    const landingIndex = (move + stones) % 14;

    if (landingIndex === playerTreasure) {
      return move; // Ekstra tur kazanmak en önemli
    }
  }

  // 2. ÖNCELİK: En çok taş hazneye götüren hamle
  let bestMove = validMoves[0];
  let maxTreasureGain = 0;

  for (const move of validMoves) {
    const stones = set.board.pits[move];
    let treasureGain = 0;

    // Kaç taş hazneye gidecek?
    for (let i = 1; i <= stones; i++) {
      const targetIndex = (move + i) % 14;
      if (targetIndex === playerTreasure) {
        treasureGain++;
      }
    }

    if (treasureGain > maxTreasureGain) {
      maxTreasureGain = treasureGain;
      bestMove = move;
    }
  }

  // 3. ÖNCELİK: Hazneye taş giden hamle varsa onu oyna
  if (maxTreasureGain > 0) {
    return bestMove;
  }

  // 4. ÖNCELİK: En basit skorlama - en çok taş veren hamle
  bestMove = validMoves[0];
  let bestScore = -Infinity;

  for (const move of validMoves) {
    // Basit skorlama: sadece anında kazanılan taşlara bak
    const stones = set.board.pits[move];
    let score = 0;

    // Kaç taş hazneye gidecek?
    for (let i = 1; i <= stones; i++) {
      const targetIndex = (move + i) % 14;
      if (targetIndex === playerTreasure) {
        score += 10; // Hazneye her taş 10 puan
      }
    }

    // Toplam taş sayısı da önemli (ama daha az)
    score += stones;

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

/**
 * ORTA BOT: Minimax algoritması + depth 3
 * Üç hamle ilerisini düşünür
 */
function getMediumMove(
  gameState: any,
  setIndex: number,
  player: Player,
  validMoves: number[],
  maxThinkTime: number
): number {
  const depth = 3; // Orta seviye için depth 3
  let bestMove = validMoves[0];
  let bestScore = -Infinity;

  const startTime = Date.now();

  for (const move of validMoves) {
    if (Date.now() - startTime > maxThinkTime) break;

    const score = minimax(gameState, setIndex, move, depth - 1, false, player);

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

/**
 * ZOR BOT: Alpha-Beta Pruning + depth 5
 * Beş hamle ilerisini düşünür, budama ile optimize edilmiş
 */
function getHardMove(
  gameState: any,
  setIndex: number,
  player: Player,
  validMoves: number[],
  maxThinkTime: number
): number {
  const depth = 5; // Zor seviye için depth 5
  let bestMove = validMoves[0];
  let bestScore = -Infinity;

  const startTime = Date.now();

  for (const move of validMoves) {
    if (Date.now() - startTime > maxThinkTime) break;

    const score = alphaBeta(
      gameState,
      setIndex,
      move,
      depth - 1,
      -Infinity,
      Infinity,
      false,
      player
    );

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

/**
 * USTA BOT: Alpha-Beta Pruning + depth 7 + gelişmiş heuristik
 * Yedi hamle ilerisini düşünür, en gelişmiş değerlendirme fonksiyonu
 */
function getMasterMove(
  gameState: any,
  setIndex: number,
  player: Player,
  validMoves: number[],
  maxThinkTime: number
): number {
  const depth = 7; // Usta seviye için depth 7
  let bestMove = validMoves[0];
  let bestScore = -Infinity;

  const startTime = Date.now();

  for (const move of validMoves) {
    if (Date.now() - startTime > maxThinkTime) break;

    const score = alphaBeta(
      gameState,
      setIndex,
      move,
      depth - 1,
      -Infinity,
      Infinity,
      false,
      player
    );

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

/**
 * Minimax algoritması
 */
function minimax(
  gameState: any,
  setIndex: number,
  moveIndex: number,
  depth: number,
  isMaximizing: boolean,
  originalPlayer: Player
): number {
  // Güvenlik kontrolü
  if (!gameState || !gameState.sets || setIndex >= gameState.sets.length) {
    console.error('[BOT MINIMAX] Invalid game state', { gameState, setIndex });
    return 0;
  }

  const currentSet = gameState.sets[setIndex];

  if (!currentSet) {
    console.error('[BOT MINIMAX] Current set is undefined', { setIndex });
    return 0;
  }

  // Simüle edilmiş hamle
  const result = applyMove(gameState, moveIndex);

  if (depth === 0 || result.setFinished) {
    return evaluateBoard(result.board, originalPlayer);
  }

  const nextPlayer = result.nextPlayer;
  const validMoves = getValidMoves(
    { ...currentSet, board: result.board, currentPlayer: nextPlayer } as SetState,
    nextPlayer
  );

  if (validMoves.length === 0) {
    return evaluateBoard(result.board, originalPlayer);
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of validMoves) {
      const evaluation = minimax(
        { ...gameState, sets: [{ ...currentSet, board: result.board, currentPlayer: nextPlayer }] },
        0,
        move,
        depth - 1,
        false,
        originalPlayer
      );
      maxEval = Math.max(maxEval, evaluation);
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of validMoves) {
      const evaluation = minimax(
        { ...gameState, sets: [{ ...currentSet, board: result.board, currentPlayer: nextPlayer }] },
        0,
        move,
        depth - 1,
        true,
        originalPlayer
      );
      minEval = Math.min(minEval, evaluation);
    }
    return minEval;
  }
}

/**
 * Alpha-Beta Pruning
 */
function alphaBeta(
  gameState: any,
  setIndex: number,
  moveIndex: number,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  originalPlayer: Player
): number {
  const currentSet = gameState.sets[setIndex];

  // Simüle edilmiş hamle
  const result = applyMove(gameState, moveIndex);

  if (depth === 0 || result.setFinished) {
    return evaluateBoardAdvanced(result.board, originalPlayer);
  }

  const nextPlayer = result.nextPlayer;
  const validMoves = getValidMoves(
    { ...currentSet, board: result.board, currentPlayer: nextPlayer } as SetState,
    nextPlayer
  );

  if (validMoves.length === 0) {
    return evaluateBoardAdvanced(result.board, originalPlayer);
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of validMoves) {
      // Yeni gameState oluştur - sets array'inde sadece simüle edilen set'i tut
      const newGameState = {
        ...gameState,
        sets: [{ ...currentSet, board: result.board, currentPlayer: nextPlayer }],
        currentSetIndex: 0 // Tek set olduğu için index 0
      };
      const evaluation = alphaBeta(
        newGameState,
        0, // setIndex artık 0 çünkü yukarıda tek set'li bir gameState oluşturduk
        move,
        depth - 1,
        alpha,
        beta,
        false,
        originalPlayer
      );
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break; // Beta cut-off
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of validMoves) {
      // Yeni gameState oluştur - sets array'inde sadece simüle edilen set'i tut
      const newGameState = {
        ...gameState,
        sets: [{ ...currentSet, board: result.board, currentPlayer: nextPlayer }],
        currentSetIndex: 0 // Tek set olduğu için index 0
      };
      const evaluation = alphaBeta(
        newGameState,
        0, // setIndex artık 0 çünkü yukarıda tek set'li bir gameState oluşturduk
        move,
        depth - 1,
        alpha,
        beta,
        true,
        originalPlayer
      );
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break; // Alpha cut-off
    }
    return minEval;
  }
}

/**
 * Basit board değerlendirmesi - Hazne odaklı
 */
function evaluateBoard(board: BoardState, player: Player): number {
  const playerTreasure = player === 'player1' ? 6 : 13;
  const opponentTreasure = player === 'player1' ? 13 : 6;

  // Hazne farkı çok önemli (ağırlık: 20)
  const treasureDiff = (board.pits[playerTreasure] - board.pits[opponentTreasure]) * 20;

  // Tahtadaki taşlar da önemli (ağırlık: 1)
  const playerPits = player === 'player1' ? [0, 1, 2, 3, 4, 5] : [7, 8, 9, 10, 11, 12];
  const opponentPits = player === 'player1' ? [7, 8, 9, 10, 11, 12] : [0, 1, 2, 3, 4, 5];

  let playerBoardStones = 0;
  let opponentBoardStones = 0;

  for (const i of playerPits) {
    playerBoardStones += board.pits[i];
  }

  for (const i of opponentPits) {
    opponentBoardStones += board.pits[i];
  }

  const boardDiff = playerBoardStones - opponentBoardStones;

  return treasureDiff + boardDiff;
}

/**
 * Gelişmiş board değerlendirmesi - Kazanma odaklı (Zor bot için)
 */
function evaluateBoardAdvanced(board: BoardState, player: Player): number {
  const playerTreasure = player === 'player1' ? 6 : 13;
  const opponentTreasure = player === 'player1' ? 13 : 6;

  const playerPits = player === 'player1' ? [0, 1, 2, 3, 4, 5] : [7, 8, 9, 10, 11, 12];
  const opponentPits = player === 'player1' ? [7, 8, 9, 10, 11, 12] : [0, 1, 2, 3, 4, 5];

  // 1. HAZNE FARKI (en önemli - ağırlık: 50)
  const treasureDiff = (board.pits[playerTreasure] - board.pits[opponentTreasure]) * 50;

  // 2. TAHTADAKI TAŞ FARKI (ağırlık: 3)
  let playerBoardStones = 0;
  let opponentBoardStones = 0;

  for (const i of playerPits) {
    playerBoardStones += board.pits[i];
  }

  for (const i of opponentPits) {
    opponentBoardStones += board.pits[i];
  }

  const boardDiff = (playerBoardStones - opponentBoardStones) * 3;

  // 3. STRATEJİK POZISYONLAR - Hazneye yakın kuyular (ağırlık: 5)
  let strategicValue = 0;
  const strategicIndices = player === 'player1' ? [4, 5] : [11, 12];

  for (const idx of strategicIndices) {
    strategicValue += board.pits[idx] * 5;
  }

  // 4. EKSTRA TUR POTANSİYELİ - Hazneye tam ulaşacak taşlar (ağırlık: 10)
  let extraTurnPotential = 0;
  for (const idx of playerPits) {
    const stones = board.pits[idx];
    if (stones > 0) {
      const landingIndex = (idx + stones) % 14;
      if (landingIndex === playerTreasure) {
        extraTurnPotential += 10; // Ekstra tur kazanma şansı
      }
    }
  }

  // 5. YAKALAMA POTANSİYELİ - Boş kuyular ve karşı dolu kuyular (ağırlık: 8)
  let capturePotential = 0;
  for (const idx of playerPits) {
    if (board.pits[idx] === 0) {
      // Boş kuyu varsa, karşısındaki rakip kuyusu dolu mu?
      const oppositeIdx = 12 - idx;
      if (board.pits[oppositeIdx] > 0) {
        capturePotential += board.pits[oppositeIdx] * 8;
      }
    }
  }

  // Toplam skor (kazanma odaklı)
  return treasureDiff + boardDiff + strategicValue + extraTurnPotential + capturePotential;
}
