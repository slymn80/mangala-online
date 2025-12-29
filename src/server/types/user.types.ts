/**
 * Server-side User Types
 */

export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  display_name: string;
  is_admin: number;
  email_verified: number;
  verification_token: string | null;
  verification_token_expires: string | null;
  created_at: string;
  last_login: string | null;
  total_games: number;
  total_wins: number;
  total_losses: number;
  total_draws: number;
  total_abandoned: number;
}

export interface UserPublic {
  id: number;
  username: string;
  email: string;
  display_name: string;
  is_admin: number;
  email_verified: number;
  created_at: string;
  total_games: number;
  total_wins: number;
  total_losses: number;
  total_draws: number;
  total_abandoned: number;
}

export interface GameHistory {
  id: number;
  player1_id: number | null;
  player2_id: number | null;
  player1_name: string;
  player2_name: string;
  game_mode: string;
  winner: string | null;
  final_score_p1: number;
  final_score_p2: number;
  total_sets: number;
  duration_seconds: number | null;
  created_at: string;
  game_data: string | null;
}
