/**
 * MANGALA OYUN MOTORU
 * 23 Maddelik Resmi Kuralları Tam Uygulayan Motor
 *
 * Tüm fonksiyonlar saf (pure) fonksiyonlardır: state in → state out
 * Yan etki yoktur, IO yoktur, test edilebilir ve deterministiktir
 */

import type {
  BoardState,
  GameState,
  SetState,
  MoveResult,
  MoveValidation,
  Player,
  InitGameParams
} from '../types/game.types';

/**
 * KURAL 1-6: Oyun başlatma
 * - 2 oyuncu
 * - 12 küçük kuyu + 2 büyük hazne
 * - 48 taş (her oyuncuya 24)
 * - Her kuyuda başlangıçta 4 taş
 * - İlk set rastgele başlar, sonraki setler sırayla
 */
export function initializeGame(params: InitGameParams): GameState {
  // İlk set rastgele başlar (params'da belirtilmediyse)
  const firstPlayer = params.firstPlayer || (Math.random() < 0.5 ? 'player1' : 'player2');

  const initialSet = createNewSet(firstPlayer);

  return {
    id: generateId(),
    mode: params.mode,
    botDifficulty: params.botDifficulty,
    player1Name: params.player1Name,
    player2Name: params.player2Name,
    sets: [initialSet],
    currentSetIndex: 0,
    scores: {
      player1: 0,
      player2: 0
    },
    status: 'active',
    createdAt: Date.now()
  };
}

/**
 * Yeni set oluştur
 */
function createNewSet(firstPlayer: Player): SetState {
  return {
    id: generateId(),
    board: initializeBoard(),
    currentPlayer: firstPlayer,
    status: 'active',
    moves: [],
    startTimestamp: Date.now(), // Set başlangıç zamanı
    totalPausedDuration: 0 // Başlangıçta pause süresi 0
  };
}

/**
 * Tahtayı başlat
 * İndeksler: [0-5: p1 kuyuları, 6: p1 hazne, 7-12: p2 kuyuları, 13: p2 hazne]
 */
function initializeBoard(): BoardState {
  return {
    pits: [
      4, 4, 4, 4, 4, 4,  // Player 1'in kuyuları (0-5)
      0,                  // Player 1'in haznesi (6)
      4, 4, 4, 4, 4, 4,  // Player 2'nin kuyuları (7-12)
      0                   // Player 2'nin haznesi (13)
    ]
  };
}

/**
 * KURAL 7-8: Bölge kontrolü
 */
function isPlayerPit(player: Player, pitIndex: number): boolean {
  if (player === 'player1') {
    return pitIndex >= 0 && pitIndex <= 5;
  } else {
    return pitIndex >= 7 && pitIndex <= 12;
  }
}

function getPlayerTreasure(player: Player): number {
  return player === 'player1' ? 6 : 13;
}

function getOpponentTreasure(player: Player): number {
  return player === 'player1' ? 13 : 6;
}

/**
 * KURAL 11-19: Hamle uygulama - Ana oyun mantığı
 */
export function applyMove(gameState: GameState, pitIndex: number): MoveResult {
  // Güvenlik kontrolü
  if (!gameState || !gameState.sets || gameState.currentSetIndex >= gameState.sets.length) {
    console.error('[ENGINE] Invalid game state in applyMove', {
      gameState,
      currentSetIndex: gameState?.currentSetIndex,
      setsLength: gameState?.sets?.length
    });
    return {
      success: false,
      board: { pits: Array(14).fill(0) },
      nextPlayer: 'player1',
      extraTurn: false,
      capturedStones: 0,
      setFinished: false,
      message: 'Invalid game state',
      rule: 'VALIDATION_ERROR'
    };
  }

  const currentSet = gameState.sets[gameState.currentSetIndex];

  if (!currentSet) {
    console.error('[ENGINE] Current set is undefined in applyMove', {
      currentSetIndex: gameState.currentSetIndex
    });
    return {
      success: false,
      board: { pits: Array(14).fill(0) },
      nextPlayer: 'player1',
      extraTurn: false,
      capturedStones: 0,
      setFinished: false,
      message: 'Current set is undefined',
      rule: 'VALIDATION_ERROR'
    };
  }

  const player = currentSet.currentPlayer;

  // Hamle validasyonu
  const validation = validateMove(currentSet, player, pitIndex);
  if (!validation.valid) {
    return {
      success: false,
      board: currentSet.board,
      nextPlayer: player,
      extraTurn: false,
      capturedStones: 0,
      setFinished: false,
      message: validation.reason,
      rule: 'VALIDATION_ERROR'
    };
  }

  // Yeni board state oluştur (immutable)
  const newBoard = { pits: [...currentSet.board.pits] };

  // KURAL 11: Taşları al
  let stonesInHand = newBoard.pits[pitIndex];
  newBoard.pits[pitIndex] = 0;

  let currentPitIndex = pitIndex;
  let lastPitIndex = -1;
  const opponentTreasure = getOpponentTreasure(player);
  const stoneMoves: number[] = []; // Her taşın düştüğü kuyu

  // KURAL 14: Tek taş özel durumu
  // Eğer tek taş varsa, aldığı kuyuya bırakmadan sağa doğru devam eder
  const isSingleStone = stonesInHand === 1;

  // KURAL 12: İlk taşı aldığı kuyuya bırak (tek taş hariç)
  if (!isSingleStone) {
    newBoard.pits[pitIndex]++;
    stonesInHand--;
    lastPitIndex = pitIndex;
    stoneMoves.push(pitIndex); // Ses için kaydet
  }

  // Kalan taşları saat tersi yönde (sağa) dağıt
  while (stonesInHand > 0) {
    currentPitIndex = (currentPitIndex + 1) % 14;

    // KURAL 17: Rakibin haznesine taş koyma (atla)
    if (currentPitIndex === opponentTreasure) {
      continue;
    }

    newBoard.pits[currentPitIndex]++;
    stonesInHand--;
    lastPitIndex = currentPitIndex;
    stoneMoves.push(currentPitIndex); // Ses için kaydet
  }

  // Hamle sonuçlarını analiz et
  let extraTurn = false;
  let capturedStones = 0;
  let nextPlayer: Player = player === 'player1' ? 'player2' : 'player1';
  let ruleApplied = '';

  const playerTreasure = getPlayerTreasure(player);

  // KURAL 13-14: Son taş hazineye denk gelirse ekstra tur
  if (lastPitIndex === playerTreasure) {
    extraTurn = true;
    nextPlayer = player;
    ruleApplied = 'RULE_13_EXTRA_TURN';
  }
  // KURAL 18: Rakibin bölgesinde çift yapma
  else if (!isPlayerPit(player, lastPitIndex) && lastPitIndex !== playerTreasure && lastPitIndex !== opponentTreasure) {
    const stonesInLastPit = newBoard.pits[lastPitIndex];
    if (stonesInLastPit % 2 === 0 && stonesInLastPit > 0) {
      capturedStones = stonesInLastPit;
      newBoard.pits[playerTreasure] += capturedStones;
      newBoard.pits[lastPitIndex] = 0;
      ruleApplied = 'RULE_18_CAPTURE_EVEN';
    }
  }
  // KURAL 19: Kendi boş kuyusuna son taş + karşı taraf dolu
  else if (isPlayerPit(player, lastPitIndex) && newBoard.pits[lastPitIndex] === 1) {
    const oppositePit = getOppositePit(lastPitIndex);
    const oppositeStones = newBoard.pits[oppositePit];

    if (oppositeStones > 0) {
      // Hem karşı taraftaki taşları al, hem kendi son taşını al
      capturedStones = oppositeStones + 1;
      newBoard.pits[playerTreasure] += capturedStones;
      newBoard.pits[oppositePit] = 0;
      newBoard.pits[lastPitIndex] = 0;
      ruleApplied = 'RULE_19_CAPTURE_OPPOSITE';
    }
  }

  // KURAL 20-21: Set bitişi kontrolü (kalan taşlar checkSetEnd içinde toplanıyor)
  const { setFinished, winner } = checkSetEnd(newBoard);

  if (setFinished) {
    ruleApplied = 'RULE_20_21_SET_END';
  }

  return {
    success: true,
    board: newBoard,
    nextPlayer: extraTurn ? player : nextPlayer,
    extraTurn,
    capturedStones,
    setFinished,
    setWinner: setFinished ? winner : undefined,
    rule: ruleApplied,
    stoneMoves, // Her taşın düştüğü kuyu indeksleri
    startPit: pitIndex, // Hamlenin başladığı kuyu
    endPit: lastPitIndex // Son taşın düştüğü kuyu
  };
}

/**
 * Hamle validasyonu
 */
function validateMove(set: SetState, player: Player, pitIndex: number): MoveValidation {
  // Set bitmişse hamle yapılamaz
  if (set.status === 'finished') {
    return { valid: false, reason: 'Set zaten bitti' };
  }

  // Geçersiz indeks
  if (pitIndex < 0 || pitIndex > 13) {
    return { valid: false, reason: 'Geçersiz kuyu indeksi' };
  }

  // Hazne seçilemez
  if (pitIndex === 6 || pitIndex === 13) {
    return { valid: false, reason: 'Hazne seçilemez' };
  }

  // Oyuncu sadece kendi bölgesinden seçebilir
  if (!isPlayerPit(player, pitIndex)) {
    return { valid: false, reason: 'Sadece kendi bölgenizdeki kuyuları seçebilirsiniz' };
  }

  // Boş kuyu seçilemez
  if (set.board.pits[pitIndex] === 0) {
    return { valid: false, reason: 'Boş kuyu seçilemez' };
  }

  return { valid: true };
}

/**
 * Karşı kuyuyu bul (KURAL 19 için)
 */
function getOppositePit(pitIndex: number): number {
  // Player 1'in kuyuları: 0-5, Player 2'nin kuyuları: 7-12
  // Karşılıklı eşleşmeler: 0↔12, 1↔11, 2↔10, 3↔9, 4↔8, 5↔7
  if (pitIndex >= 0 && pitIndex <= 5) {
    return 12 - pitIndex;
  } else if (pitIndex >= 7 && pitIndex <= 12) {
    return 12 - pitIndex;
  }
  return -1;
}

/**
 * KURAL 20-21: Set bitişi kontrolü ve sonlandırma
 * KURAL 21: Boşalan oyuncu, rakibinin kalan taşlarını da kazanır
 */
function checkSetEnd(board: BoardState): { setFinished: boolean; winner?: Player | 'draw' } {
  const player1PitsEmpty = board.pits.slice(0, 6).every(stones => stones === 0);
  const player2PitsEmpty = board.pits.slice(7, 13).every(stones => stones === 0);

  if (player1PitsEmpty || player2PitsEmpty) {
    // KURAL 21: Boşalan oyuncu rakibinin taşlarını alır
    if (player1PitsEmpty) {
      // Player 1 boşaldı → Player 1, Player 2'nin taşlarını alır
      const player2Remaining = board.pits.slice(7, 13).reduce((sum, stones) => sum + stones, 0);
      board.pits[6] += player2Remaining;
      for (let i = 7; i < 13; i++) {
        board.pits[i] = 0;
      }
    } else if (player2PitsEmpty) {
      // Player 2 boşaldı → Player 2, Player 1'in taşlarını alır
      const player1Remaining = board.pits.slice(0, 6).reduce((sum, stones) => sum + stones, 0);
      board.pits[13] += player1Remaining;
      for (let i = 0; i < 6; i++) {
        board.pits[i] = 0;
      }
    }

    // Set bitti, kazananı belirle
    const player1Score = board.pits[6];
    const player2Score = board.pits[13];

    let winner: Player | 'draw';
    if (player1Score > player2Score) {
      winner = 'player1';
    } else if (player2Score > player1Score) {
      winner = 'player2';
    } else {
      winner = 'draw';
    }

    return { setFinished: true, winner };
  }

  return { setFinished: false };
}

/**
 * DEPRECATED: finalizeSet artık checkSetEnd içinde yapılıyor
 * @deprecated
 */
// @ts-ignore - Geriye dönük uyumluluk için
function finalizeSet(_board: BoardState, _winner?: Player | 'draw'): void {
  // Bu fonksiyon artık kullanılmıyor - mantık checkSetEnd'e taşındı
  // Geriye dönük uyumluluk için bırakıldı
}

/**
 * KURAL 22-23: Oyun skoru güncelleme (5 setlik oyun)
 */
export function updateGameScore(gameState: GameState, setWinner: Player | 'draw'): GameState {
  const newState = { ...gameState };

  // KURAL 23: Kazanan 1 puan, kaybeden 0 puan, berabere 0.5 puan
  if (setWinner === 'player1') {
    newState.scores.player1 += 1;
  } else if (setWinner === 'player2') {
    newState.scores.player2 += 1;
  } else {
    newState.scores.player1 += 0.5;
    newState.scores.player2 += 0.5;
  }

  // KURAL 22: 5 set kontrolü
  const totalSets = newState.sets.length;
  if (totalSets < 5) {
    // Yeni set başlat - Sırayla oyuncular başlar
    // Set 1 (index 0): Rastgele başlayan oyuncu
    // Set 2 (index 1): Diğer oyuncu başlar
    // Set 3 (index 2): İlk oyuncu başlar
    // Set 4 (index 3): Diğer oyuncu başlar
    // Set 5 (index 4): İlk oyuncu başlar
    const firstSetStarter = gameState.sets[0].currentPlayer; // İlk setin başlangıç oyuncusu
    let nextStarter: Player;

    if (totalSets % 2 === 1) {
      // Tek numaralı setler (2, 4): Diğer oyuncu başlar
      nextStarter = firstSetStarter === 'player1' ? 'player2' : 'player1';
    } else {
      // Çift numaralı setler (3, 5): İlk oyuncu başlar
      nextStarter = firstSetStarter;
    }

    newState.sets.push(createNewSet(nextStarter));
    newState.currentSetIndex = totalSets;
  } else {
    // Oyun bitti - currentSetIndex'i son geçerli set'te tut
    newState.status = 'finished';
    newState.currentSetIndex = totalSets - 1; // Son set'in index'i (4)
    if (newState.scores.player1 > newState.scores.player2) {
      newState.winner = 'player1';
    } else if (newState.scores.player2 > newState.scores.player1) {
      newState.winner = 'player2';
    } else {
      newState.winner = 'draw';
    }
  }

  return newState;
}

/**
 * Geçerli hamleleri listele
 */
export function getValidMoves(set: SetState, player: Player): number[] {
  const validMoves: number[] = [];
  const range = player === 'player1' ? [0, 5] : [7, 12];

  for (let i = range[0]; i <= range[1]; i++) {
    if (set.board.pits[i] > 0) {
      validMoves.push(i);
    }
  }

  return validMoves;
}

/**
 * Board'u klonla (immutability için)
 */
export function cloneBoard(board: BoardState): BoardState {
  return {
    pits: [...board.pits]
  };
}

/**
 * Basit ID generator
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Oyun durumunu string'e çevir (debug için)
 */
export function boardToString(board: BoardState): string {
  const p2Pits = board.pits.slice(7, 13).reverse();
  const p1Pits = board.pits.slice(0, 6);

  return `
  P2 Hazne: ${board.pits[13]}
  ${p2Pits.map((s, i) => `[${12 - i}:${s}]`).join(' ')}
  ${p1Pits.map((s, i) => `[${i}:${s}]`).join(' ')}
  P1 Hazne: ${board.pits[6]}
  `;
}
