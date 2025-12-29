/**
 * Mangala Oyun Türleri ve Arayüzleri
 * 23 maddelik resmi kurallara göre tasarlanmıştır
 */

export type Player = 'player1' | 'player2';
export type GameMode = 'pvp' | 'pve' | 'online';
export type BotDifficulty = 'beginner' | 'easy' | 'medium' | 'hard' | 'master';
export type GameStatus = 'waiting' | 'active' | 'paused' | 'finished';
export type SetStatus = 'active' | 'finished';

/**
 * Oyun tahtası durumu
 * player1: Alt sıra (0-5 indeks), hazine: 6
 * player2: Üst sıra (7-12 indeks), hazne: 13
 */
export interface BoardState {
  pits: number[];  // 14 elemanlı dizi: [0-5: p1 kuyuları, 6: p1 hazne, 7-12: p2 kuyuları, 13: p2 hazne]
}

/**
 * Oyun seti durumu
 */
export interface SetState {
  id: string;
  board: BoardState;
  currentPlayer: Player;
  status: SetStatus;
  moves: Move[];
  winner?: Player | 'draw';
  startTimestamp?: number; // Set başlangıç zamanı (Unix timestamp)
  pausedAt?: number; // Timer duraklatıldığı zaman (Unix timestamp)
  totalPausedDuration?: number; // Toplam duraklatılma süresi (ms)
}

/**
 * Hamle bilgisi
 */
export interface Move {
  player: Player;
  pitIndex: number;
  timestamp: number;
  resultState: BoardState;
  capturedStones?: number;
  extraTurn?: boolean;
}

/**
 * Hamle sonucu
 */
export interface MoveResult {
  success: boolean;
  board: BoardState;
  nextPlayer: Player;
  extraTurn: boolean;
  capturedStones: number;
  setFinished: boolean;
  setWinner?: Player | 'draw';
  message?: string;
  rule?: string; // Hangi kuralın uygulandığı
  stoneMoves?: number[]; // Her taşın düştüğü kuyu indeksleri (ses için)
  startPit?: number; // Hamlenin başladığı kuyu
  endPit?: number; // Son taşın düştüğü kuyu
}

/**
 * Oyun durumu (5 setlik oyun)
 */
export interface GameState {
  id: string;
  mode: GameMode;
  botDifficulty?: BotDifficulty;
  player1Name: string;
  player2Name: string;
  sets: SetState[];
  currentSetIndex: number;
  scores: {
    player1: number;
    player2: number;
  };
  status: GameStatus;
  winner?: Player | 'draw';
  createdAt: number;
  _isHost?: boolean; // Online oyunda bu kullanıcının host olup olmadığı
}

/**
 * Oyun başlatma parametreleri
 */
export interface InitGameParams {
  mode: GameMode;
  player1Name: string;
  player2Name: string;
  botDifficulty?: BotDifficulty;
  firstPlayer?: Player;
}

/**
 * Hamle validasyonu
 */
export interface MoveValidation {
  valid: boolean;
  reason?: string;
}

/**
 * Bot AI için değerlendirme
 */
export interface BoardEvaluation {
  score: number;
  bestMove?: number;
}
