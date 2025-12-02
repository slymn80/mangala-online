/**
 * Database Schema Initialization
 */

import { db } from './db.js';
import bcrypt from 'bcryptjs';

export function initializeDatabase() {
  console.log('[DB] Initializing database schema...');

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      email_verified INTEGER DEFAULT 0,
      verification_token TEXT,
      verification_token_expires DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      total_games INTEGER DEFAULT 0,
      total_wins INTEGER DEFAULT 0,
      total_losses INTEGER DEFAULT 0,
      total_draws INTEGER DEFAULT 0,
      total_abandoned INTEGER DEFAULT 0
    )
  `);

  // Game history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS game_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player1_id INTEGER,
      player2_id INTEGER,
      player1_name TEXT NOT NULL,
      player2_name TEXT NOT NULL,
      game_mode TEXT NOT NULL,
      winner TEXT,
      final_score_p1 INTEGER NOT NULL,
      final_score_p2 INTEGER NOT NULL,
      total_sets INTEGER NOT NULL,
      duration_seconds INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      game_data TEXT,
      FOREIGN KEY (player1_id) REFERENCES users(id),
      FOREIGN KEY (player2_id) REFERENCES users(id)
    )
  `);

  // Blocked users table (for user blocking feature)
  db.exec(`
    CREATE TABLE IF NOT EXISTS blocked_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      blocker_id INTEGER NOT NULL,
      blocked_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (blocker_id) REFERENCES users(id),
      FOREIGN KEY (blocked_id) REFERENCES users(id),
      UNIQUE(blocker_id, blocked_id)
    )
  `);

  // Index for faster queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_games_player1 ON game_history(player1_id);
    CREATE INDEX IF NOT EXISTS idx_games_player2 ON game_history(player2_id);
    CREATE INDEX IF NOT EXISTS idx_games_created ON game_history(created_at);
    CREATE INDEX IF NOT EXISTS idx_blocked_blocker ON blocked_users(blocker_id);
    CREATE INDEX IF NOT EXISTS idx_blocked_blocked ON blocked_users(blocked_id);
  `);

  // Migrations: Add new columns if they don't exist
  try {
    const columns = db.prepare(`PRAGMA table_info(users)`).all() as any[];

    if (!columns.some((col: any) => col.name === 'is_admin')) {
      console.log('[DB] Adding is_admin column to users table...');
      db.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`);
    }

    if (!columns.some((col: any) => col.name === 'email')) {
      console.log('[DB] Adding email column to users table...');
      db.exec(`ALTER TABLE users ADD COLUMN email TEXT`);
    }

    if (!columns.some((col: any) => col.name === 'email_verified')) {
      console.log('[DB] Adding email_verified column to users table...');
      db.exec(`ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0`);
    }

    if (!columns.some((col: any) => col.name === 'verification_token')) {
      console.log('[DB] Adding verification_token column to users table...');
      db.exec(`ALTER TABLE users ADD COLUMN verification_token TEXT`);
    }

    if (!columns.some((col: any) => col.name === 'verification_token_expires')) {
      console.log('[DB] Adding verification_token_expires column to users table...');
      db.exec(`ALTER TABLE users ADD COLUMN verification_token_expires DATETIME`);
    }

    if (!columns.some((col: any) => col.name === 'total_abandoned')) {
      console.log('[DB] Adding total_abandoned column to users table...');
      db.exec(`ALTER TABLE users ADD COLUMN total_abandoned INTEGER DEFAULT 0`);
    }

    console.log('[DB] Database migrations completed successfully');
  } catch (error) {
    console.error('[DB] Migration error:', error);
  }

  console.log('[DB] Database schema initialized successfully');
}

// Otomatik admin kullanıcısı oluştur
async function createDefaultAdmin() {
  try {
    // Admin kullanıcısı var mı kontrol et
    const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');

    if (!adminExists) {
      console.log('[DB] Creating default admin user...');

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('admin2025', salt);

      db.prepare(`
        INSERT INTO users (username, email, password_hash, display_name, is_admin, email_verified)
        VALUES (?, ?, ?, ?, 1, 1)
      `).run('admin', 'admin@mangala.com', passwordHash, 'Admin');

      console.log('[DB] ✅ Default admin user created successfully');
      console.log('[DB] 👤 Username: admin');
      console.log('[DB] 🔑 Password: admin2025');
    }
  } catch (error) {
    console.error('[DB] Error creating default admin:', error);
  }
}

// Initialize on module load
initializeDatabase();
createDefaultAdmin();
