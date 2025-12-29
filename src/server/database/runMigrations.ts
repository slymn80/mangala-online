/**
 * Database Migration Runner
 */

import { db } from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function runMigrations() {
  console.log('[MIGRATIONS] Starting database migrations...');

  const migrationsDir = path.join(__dirname, 'migrations');

  // migrations klasörü yoksa oluştur
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
    console.log('[MIGRATIONS] Created migrations directory');
  }

  // Migration dosyalarını oku
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Alfabetik sıraya göre çalıştır

  console.log(`[MIGRATIONS] Found ${files.length} migration files`);

  files.forEach(file => {
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    try {
      // Split by semicolon and execute each statement separately
      // This allows us to handle ALTER TABLE failures gracefully
      const statements = sql.split(';').filter(s => s.trim());

      statements.forEach(statement => {
        const trimmed = statement.trim();
        if (!trimmed || trimmed.startsWith('--')) return;

        try {
          db.exec(trimmed + ';');
        } catch (error: any) {
          // Ignore duplicate column errors (SQLite error code)
          if (error.code === 'SQLITE_ERROR' && error.message.includes('duplicate column')) {
            console.log(`[MIGRATIONS] ⚠️  Skipping duplicate column in ${file}`);
          } else {
            throw error;
          }
        }
      });

      console.log(`[MIGRATIONS] ✅ Applied: ${file}`);
    } catch (error) {
      console.error(`[MIGRATIONS] ❌ Failed: ${file}`, error);
      throw error;
    }
  });

  console.log('[MIGRATIONS] All migrations completed successfully');
}
