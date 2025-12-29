/**
 * Game History Routes
 */

import { Router } from 'express';
import { db } from '../database/db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import type { GameHistory } from '../types/user.types.js';

const router = Router();

// Oyun kaydet
router.post('/save', authenticateToken, (req: AuthRequest, res) => {
  try {
    const {
      player1Name,
      player2Name,
      gameMode,
      winner,
      finalScoreP1,
      finalScoreP2,
      totalSets,
      durationSeconds,
      gameData
    } = req.body;

    // Validasyon
    if (!player1Name || !player2Name || !gameMode || finalScoreP1 === undefined || finalScoreP2 === undefined) {
      return res.status(400).json({ error: 'Eksik oyun bilgileri' });
    }

    // Player 2 bot mu kontrol et - bot ise player2_id null olacak
    const isPlayer2Bot = gameMode === 'pve';

    // Online oyunlarda player2'nin ID'sini bul
    let player2Id = null;
    if (!isPlayer2Bot && gameMode === 'online') {
      const player2 = db.prepare('SELECT id FROM users WHERE username = ?').get(player2Name) as { id: number } | undefined;
      player2Id = player2?.id || null;
    }

    // Oyunu kaydet
    const result = db.prepare(`
      INSERT INTO game_history (
        player1_id, player2_id, player1_name, player2_name,
        game_mode, winner, final_score_p1, final_score_p2,
        total_sets, duration_seconds, game_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      req.userId,
      player2Id,
      player1Name,
      player2Name,
      gameMode,
      winner,
      finalScoreP1,
      finalScoreP2,
      totalSets,
      durationSeconds || null,
      gameData ? JSON.stringify(gameData) : null
    );

    // Kullanıcı istatistiklerini güncelle
    // Not: Online oyunlarda her oyuncu kendi istatistiğini günceller (her ikisi de bu endpoint'i çağırır)
    // Bu yüzden sadece istek gönderen kullanıcının istatistiğini güncelliyoruz

    // İstek gönderen kullanıcı player1 mi player2 mi?
    const currentUser = db.prepare('SELECT username FROM users WHERE id = ?').get(req.userId) as { username: string } | undefined;
    const isCurrentUserPlayer1 = currentUser?.username === player1Name;

    if (isCurrentUserPlayer1) {
      // Player1 perspektifi
      if (winner === 'player1') {
        db.prepare('UPDATE users SET total_games = total_games + 1, total_wins = total_wins + 1 WHERE id = ?')
          .run(req.userId);
      } else if (winner === 'player2') {
        db.prepare('UPDATE users SET total_games = total_games + 1, total_losses = total_losses + 1 WHERE id = ?')
          .run(req.userId);
      } else {
        db.prepare('UPDATE users SET total_games = total_games + 1, total_draws = total_draws + 1 WHERE id = ?')
          .run(req.userId);
      }
    } else {
      // Player2 perspektifi
      if (winner === 'player2') {
        db.prepare('UPDATE users SET total_games = total_games + 1, total_wins = total_wins + 1 WHERE id = ?')
          .run(req.userId);
      } else if (winner === 'player1') {
        db.prepare('UPDATE users SET total_games = total_games + 1, total_losses = total_losses + 1 WHERE id = ?')
          .run(req.userId);
      } else {
        db.prepare('UPDATE users SET total_games = total_games + 1, total_draws = total_draws + 1 WHERE id = ?')
          .run(req.userId);
      }
    }

    res.status(201).json({
      message: 'Oyun kaydedildi',
      gameId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('[GAMES] Save error:', error);
    res.status(500).json({ error: 'Oyun kaydedilemedi' });
  }
});

// Kullanıcının oyun geçmişi
router.get('/history', authenticateToken, (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const games = db.prepare(`
      SELECT id, player1_name, player2_name, game_mode, winner,
             final_score_p1, final_score_p2, total_sets,
             duration_seconds, created_at
      FROM game_history
      WHERE player1_id = ? OR player2_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.userId, req.userId, limit, offset) as GameHistory[];

    const totalGames = db.prepare(`
      SELECT COUNT(*) as count
      FROM game_history
      WHERE player1_id = ? OR player2_id = ?
    `).get(req.userId, req.userId) as { count: number };

    res.json({
      games,
      total: totalGames.count,
      limit,
      offset
    });
  } catch (error) {
    console.error('[GAMES] History error:', error);
    res.status(500).json({ error: 'Oyun geçmişi alınamadı' });
  }
});

// Liderlik tablosu
router.get('/leaderboard', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const leaders = db.prepare(`
      SELECT username, display_name, total_games, total_wins, total_losses, total_draws,
             ROUND(CAST(total_wins AS FLOAT) / NULLIF(total_games, 0) * 100, 2) as win_rate
      FROM users
      WHERE total_games > 0
      ORDER BY total_wins DESC, win_rate DESC
      LIMIT ?
    `).all(limit);

    res.json({ leaderboard: leaders });
  } catch (error) {
    console.error('[GAMES] Leaderboard error:', error);
    res.status(500).json({ error: 'Liderlik tablosu alınamadı' });
  }
});

// Oyun terk et
router.post('/abandon', authenticateToken, (req: AuthRequest, res) => {
  try {
    const { gameMode, currentSetIndex } = req.body;

    // Validasyon
    if (!gameMode) {
      return res.status(400).json({ error: 'Oyun modu belirtilmedi' });
    }

    // Kullanıcının total_abandoned sayısını artır
    db.prepare('UPDATE users SET total_abandoned = total_abandoned + 1 WHERE id = ?')
      .run(req.userId);

    console.log(`[GAMES] User ${req.userId} abandoned a ${gameMode} game at set ${currentSetIndex || 0}`);

    res.json({
      message: 'Terk edilen oyun kaydedildi'
    });
  } catch (error) {
    console.error('[GAMES] Abandon error:', error);
    res.status(500).json({ error: 'Terk edilen oyun kaydedilemedi' });
  }
});

export default router;
