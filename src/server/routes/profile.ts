/**
 * Profile Routes
 */

import { Router } from 'express';
import { db } from '../database/db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import type { GameHistory, UserPublic } from '../types/user.types.js';

const router = Router();

// Kullanıcı profili ve istatistikleri
router.get('/me', authenticateToken, (req: AuthRequest, res) => {
  try {
    const user = db.prepare(`
      SELECT id, username, email, display_name, is_admin, email_verified,
             created_at, last_login, total_games, total_wins, total_losses, total_draws
      FROM users WHERE id = ?
    `).get(req.userId) as UserPublic | undefined;

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Win rate hesapla
    const winRate = user.total_games > 0
      ? Math.round((user.total_wins / user.total_games) * 100)
      : 0;

    res.json({
      user,
      stats: {
        winRate,
        totalGames: user.total_games,
        wins: user.total_wins,
        losses: user.total_losses,
        draws: user.total_draws
      }
    });
  } catch (error) {
    console.error('[PROFILE] Get profile error:', error);
    res.status(500).json({ error: 'Profil bilgileri alınamadı' });
  }
});

// Kullanıcının oyun geçmişi
router.get('/games', authenticateToken, (req: AuthRequest, res) => {
  try {
    const { limit = '20', offset = '0' } = req.query;

    const games = db.prepare(`
      SELECT * FROM game_history
      WHERE player1_id = ? OR player2_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(req.userId, req.userId, parseInt(limit as string), parseInt(offset as string)) as GameHistory[];

    // Toplam oyun sayısı
    const totalCount = db.prepare(`
      SELECT COUNT(*) as count FROM game_history
      WHERE player1_id = ? OR player2_id = ?
    `).get(req.userId, req.userId) as { count: number };

    res.json({
      games,
      pagination: {
        total: totalCount.count,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        hasMore: totalCount.count > parseInt(offset as string) + parseInt(limit as string)
      }
    });
  } catch (error) {
    console.error('[PROFILE] Get game history error:', error);
    res.status(500).json({ error: 'Oyun geçmişi alınamadı' });
  }
});

// Son oynanan oyunlar (hızlı özet)
router.get('/recent-games', authenticateToken, (req: AuthRequest, res) => {
  try {
    const recentGames = db.prepare(`
      SELECT id, player1_name, player2_name, game_mode, winner,
             final_score_p1, final_score_p2, created_at
      FROM game_history
      WHERE player1_id = ? OR player2_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `).all(req.userId, req.userId);

    res.json({ games: recentGames });
  } catch (error) {
    console.error('[PROFILE] Get recent games error:', error);
    res.status(500).json({ error: 'Son oyunlar alınamadı' });
  }
});

// Başka bir kullanıcının profilini görüntüle (public)
router.get('/user/:username', (req, res) => {
  try {
    const { username } = req.params;

    const user = db.prepare(`
      SELECT id, username, display_name, created_at,
             total_games, total_wins, total_losses, total_draws
      FROM users WHERE username = ?
    `).get(username) as any;

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Win rate hesapla
    const winRate = user.total_games > 0
      ? Math.round((user.total_wins / user.total_games) * 100)
      : 0;

    // Son 5 oyunu getir
    const recentGames = db.prepare(`
      SELECT id, player1_name, player2_name, game_mode, winner,
             final_score_p1, final_score_p2, created_at
      FROM game_history
      WHERE player1_id = ? OR player2_id = ?
      ORDER BY created_at DESC
      LIMIT 5
    `).all(user.id, user.id);

    res.json({
      user: {
        username: user.username,
        display_name: user.display_name,
        created_at: user.created_at,
        total_games: user.total_games,
        total_wins: user.total_wins,
        total_losses: user.total_losses,
        total_draws: user.total_draws
      },
      stats: {
        winRate,
        totalGames: user.total_games,
        wins: user.total_wins,
        losses: user.total_losses,
        draws: user.total_draws
      },
      recentGames
    });
  } catch (error) {
    console.error('[PROFILE] Get public profile error:', error);
    res.status(500).json({ error: 'Profil bilgileri alınamadı' });
  }
});

// Liderlik tablosu
router.get('/leaderboard', (req, res) => {
  try {
    const { limit = '10' } = req.query;

    const topPlayers = db.prepare(`
      SELECT username, display_name, total_games, total_wins, total_losses, total_draws,
             CASE
               WHEN total_games > 0 THEN ROUND((total_wins * 100.0 / total_games), 1)
               ELSE 0
             END as win_rate
      FROM users
      WHERE total_games >= 3
      ORDER BY total_wins DESC, win_rate DESC
      LIMIT ?
    `).all(parseInt(limit as string));

    res.json({ leaderboard: topPlayers });
  } catch (error) {
    console.error('[PROFILE] Get leaderboard error:', error);
    res.status(500).json({ error: 'Liderlik tablosu alınamadı' });
  }
});

// Detaylı istatistikler
router.get('/stats/detailed', authenticateToken, (req: AuthRequest, res) => {
  try {
    // Genel istatistikler
    const user = db.prepare(`
      SELECT total_games, total_wins, total_losses, total_draws
      FROM users WHERE id = ?
    `).get(req.userId) as any;

    // Oyun moduna göre istatistikler
    const modeStats = db.prepare(`
      SELECT
        game_mode,
        COUNT(*) as games_played,
        SUM(CASE WHEN (player1_id = ? AND winner = 'player1') OR (player2_id = ? AND winner = 'player2') THEN 1 ELSE 0 END) as wins,
        SUM(CASE WHEN winner = 'draw' THEN 1 ELSE 0 END) as draws
      FROM game_history
      WHERE player1_id = ? OR player2_id = ?
      GROUP BY game_mode
    `).all(req.userId, req.userId, req.userId, req.userId);

    // Son 7 günlük aktivite
    const weeklyActivity = db.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as games_count
      FROM game_history
      WHERE (player1_id = ? OR player2_id = ?)
        AND created_at >= datetime('now', '-7 days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all(req.userId, req.userId);

    // En çok oynanan rakipler
    const topOpponents = db.prepare(`
      SELECT
        CASE
          WHEN player1_id = ? THEN player2_name
          ELSE player1_name
        END as opponent_name,
        COUNT(*) as games_played,
        SUM(CASE
          WHEN (player1_id = ? AND winner = 'player1') OR (player2_id = ? AND winner = 'player2') THEN 1
          ELSE 0
        END) as wins
      FROM game_history
      WHERE player1_id = ? OR player2_id = ?
      GROUP BY opponent_name
      ORDER BY games_played DESC
      LIMIT 5
    `).all(req.userId, req.userId, req.userId, req.userId, req.userId);

    // Ortalama skor
    const avgScore = db.prepare(`
      SELECT
        AVG(CASE WHEN player1_id = ? THEN final_score_p1 ELSE final_score_p2 END) as avg_score
      FROM game_history
      WHERE player1_id = ? OR player2_id = ?
    `).get(req.userId, req.userId, req.userId) as { avg_score: number };

    // Galibiyet serisi
    const recentResults = db.prepare(`
      SELECT
        CASE
          WHEN (player1_id = ? AND winner = 'player1') OR (player2_id = ? AND winner = 'player2') THEN 'W'
          WHEN winner = 'draw' THEN 'D'
          ELSE 'L'
        END as result
      FROM game_history
      WHERE player1_id = ? OR player2_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).all(req.userId, req.userId, req.userId, req.userId) as { result: string }[];

    let currentStreak = 0;
    for (const game of recentResults) {
      if (game.result === 'W') currentStreak++;
      else break;
    }

    res.json({
      general: user,
      modeStats,
      weeklyActivity,
      topOpponents,
      avgScore: Math.round(avgScore.avg_score || 0),
      currentStreak,
      recentResults: recentResults.map(r => r.result)
    });
  } catch (error) {
    console.error('[PROFILE] Get detailed stats error:', error);
    res.status(500).json({ error: 'Detaylı istatistikler alınamadı' });
  }
});

// Profil güncelleme
router.put('/update', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { display_name } = req.body;

    if (!display_name || display_name.trim().length === 0) {
      return res.status(400).json({ error: 'Görünen ad boş olamaz' });
    }

    if (display_name.length > 50) {
      return res.status(400).json({ error: 'Görünen ad çok uzun (max 50 karakter)' });
    }

    db.prepare(`
      UPDATE users SET display_name = ? WHERE id = ?
    `).run(display_name.trim(), req.userId);

    const updatedUser = db.prepare(`
      SELECT id, username, email, display_name, is_admin, email_verified,
             created_at, last_login, total_games, total_wins, total_losses, total_draws
      FROM users WHERE id = ?
    `).get(req.userId);

    res.json({
      message: 'Profil başarıyla güncellendi',
      user: updatedUser
    });
  } catch (error) {
    console.error('[PROFILE] Update profile error:', error);
    res.status(500).json({ error: 'Profil güncellenemedi' });
  }
});

// Kullanıcı bilgilerini username ile al (oyun sırasında rakip skorları için)
router.get('/user/:username', authenticateToken, (req: AuthRequest, res) => {
  try {
    const { username } = req.params;

    const user = db.prepare(`
      SELECT id, username, display_name, total_games, total_wins, total_losses, total_draws, total_abandoned
      FROM users WHERE username = ?
    `).get(username);

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    res.json({ user });
  } catch (error) {
    console.error('[PROFILE] Get user by username error:', error);
    res.status(500).json({ error: 'Kullanıcı bilgileri alınamadı' });
  }
});

// Engelleme API'leri
router.post('/block/:userId', authenticateToken, (req: AuthRequest, res) => {
  try {
    const blockedId = parseInt(req.params.userId);
    const blockerId = req.userId!;

    if (blockedId === blockerId) {
      return res.status(400).json({ error: 'Kendinizi engelleyemezsiniz' });
    }

    // Zaten engellenmiş mi kontrol et
    const existing = db.prepare('SELECT id FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?')
      .get(blockerId, blockedId);

    if (existing) {
      return res.status(400).json({ error: 'Kullanıcı zaten engellenmiş' });
    }

    db.prepare('INSERT INTO blocked_users (blocker_id, blocked_id) VALUES (?, ?)').run(blockerId, blockedId);

    res.json({ message: 'Kullanıcı engellendi' });
  } catch (error) {
    console.error('[PROFILE] Block user error:', error);
    res.status(500).json({ error: 'Kullanıcı engellenemedi' });
  }
});

router.delete('/block/:userId', authenticateToken, (req: AuthRequest, res) => {
  try {
    const blockedId = parseInt(req.params.userId);
    const blockerId = req.userId!;

    db.prepare('DELETE FROM blocked_users WHERE blocker_id = ? AND blocked_id = ?').run(blockerId, blockedId);

    res.json({ message: 'Engel kaldırıldı' });
  } catch (error) {
    console.error('[PROFILE] Unblock user error:', error);
    res.status(500).json({ error: 'Engel kaldırılamadı' });
  }
});

router.get('/blocked', authenticateToken, (req: AuthRequest, res) => {
  try {
    const blockerId = req.userId!;

    const blockedUsers = db.prepare(`
      SELECT u.id, u.username, u.display_name
      FROM blocked_users b
      JOIN users u ON u.id = b.blocked_id
      WHERE b.blocker_id = ?
    `).all(blockerId);

    res.json({ blockedUsers });
  } catch (error) {
    console.error('[PROFILE] Get blocked users error:', error);
    res.status(500).json({ error: 'Engellenmiş kullanıcılar alınamadı' });
  }
});

export default router;
