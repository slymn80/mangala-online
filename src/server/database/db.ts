/**
 * SQLite Database Connection
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database dosyası: Production'da proje içinde, development'ta proje kökünde
const dbPath = process.env.NODE_ENV === 'production'
  ? path.join(__dirname, '../../data/mangala.db')
  : path.join(__dirname, '../../../mangala.db');

// Veritabanı klasörünü oluştur (yoksa)
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('[DB] Created database directory:', dbDir);
}

export const db = new Database(dbPath);

// WAL mode - daha iyi performans
db.pragma('journal_mode = WAL');

// Foreign keys aktif
db.pragma('foreign_keys = ON');

console.log('[DB] Database connected:', dbPath);
