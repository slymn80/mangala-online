/**
 * SQLite Database Connection
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database dosyası: Production'da /data, development'ta proje kökünde
const dbPath = process.env.NODE_ENV === 'production' && process.env.RENDER
  ? '/data/mangala.db'
  : path.join(__dirname, '../../../mangala.db');

export const db = new Database(dbPath);

// WAL mode - daha iyi performans
db.pragma('journal_mode = WAL');

// Foreign keys aktif
db.pragma('foreign_keys = ON');

console.log('[DB] Database connected:', dbPath);
