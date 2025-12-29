CREATE TABLE IF NOT EXISTS tournament_referee_applications (
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

CREATE TABLE IF NOT EXISTS tournament_match_spectators (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  joined_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (match_id) REFERENCES tournament_matches(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(match_id, user_id)
);

ALTER TABLE tournament_matches ADD COLUMN referee_id INTEGER REFERENCES users(id);

ALTER TABLE tournaments ADD COLUMN started_by INTEGER REFERENCES users(id);
ALTER TABLE tournaments ADD COLUMN started_at TEXT;

CREATE INDEX IF NOT EXISTS idx_referee_apps_tournament ON tournament_referee_applications(tournament_id);
CREATE INDEX IF NOT EXISTS idx_referee_apps_user ON tournament_referee_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_match_spectators_match ON tournament_match_spectators(match_id);
CREATE INDEX IF NOT EXISTS idx_match_spectators_user ON tournament_match_spectators(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_referee ON tournament_matches(referee_id);
