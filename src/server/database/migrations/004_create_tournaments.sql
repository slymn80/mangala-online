CREATE TABLE IF NOT EXISTS tournaments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  creator_id INTEGER NOT NULL,
  max_players INTEGER NOT NULL CHECK(max_players IN (2, 4, 8, 16, 32, 64, 128, 256)),
  current_players INTEGER DEFAULT 0,
  start_datetime TEXT NOT NULL,
  status TEXT DEFAULT 'registration' CHECK(status IN ('registration', 'ready', 'ongoing', 'completed', 'cancelled')),
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tournament_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  applied_at TEXT DEFAULT (datetime('now')),
  reviewed_at TEXT,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(tournament_id, user_id)
);

CREATE TABLE IF NOT EXISTS tournament_rounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  round_number INTEGER NOT NULL,
  round_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'ongoing', 'completed')),
  started_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  UNIQUE(tournament_id, round_number)
);

CREATE TABLE IF NOT EXISTS tournament_matches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tournament_id INTEGER NOT NULL,
  round_id INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  player1_id INTEGER,
  player2_id INTEGER,
  winner_id INTEGER,
  match_status TEXT DEFAULT 'pending' CHECK(match_status IN ('pending', 'ongoing', 'completed', 'no_show', 'bye')),
  scheduled_time TEXT,
  started_at TEXT,
  completed_at TEXT,
  game_state TEXT,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (round_id) REFERENCES tournament_rounds(id) ON DELETE CASCADE,
  FOREIGN KEY (player1_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (player2_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_start ON tournaments(start_datetime);
CREATE INDEX IF NOT EXISTS idx_tournament_applications_tournament ON tournament_applications(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_applications_user ON tournament_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_applications_status ON tournament_applications(status);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_round ON tournament_matches(round_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_status ON tournament_matches(match_status);
