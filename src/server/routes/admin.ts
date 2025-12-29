/**
 * Admin Routes
 * Admin paneli için istatistik ve yönetim endpoint'leri
 */

import { Router } from 'express';
import { db } from '../database/db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Admin kontrolü middleware
const requireAdmin = (req: AuthRequest, res: any, next: any) => {
  const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.userId) as { is_admin: number } | undefined;

  if (!user || user.is_admin !== 1) {
    return res.status(403).json({ error: 'Bu işlem için admin yetkisi gereklidir' });
  }

  next();
};

// Genel istatistikler
router.get('/stats', authenticateToken, requireAdmin, (req: AuthRequest, res) => {
  try {
    // Toplam kullanıcı sayısı
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };

    // Email doğrulanmış kullanıcı sayısı
    const verifiedUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE email_verified = 1').get() as { count: number };

    // Toplam oyun sayısı
    const totalGames = db.prepare('SELECT COUNT(*) as count FROM game_history').get() as { count: number };

    // Oyun modlarına göre dağılım
    const gamesByMode = db.prepare(`
      SELECT game_mode, COUNT(*) as count
      FROM game_history
      GROUP BY game_mode
    `).all() as Array<{ game_mode: string; count: number }>;

    // Son 24 saatte oynanan oyunlar
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const gamesLast24h = db.prepare(`
      SELECT COUNT(*) as count
      FROM game_history
      WHERE created_at > ?
    `).get(last24Hours) as { count: number };

    // Son 7 günde oynanan oyunlar
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const gamesLast7d = db.prepare(`
      SELECT COUNT(*) as count
      FROM game_history
      WHERE created_at > ?
    `).get(last7Days) as { count: number };

    // Kazananlar istatistiği
    const winStats = db.prepare(`
      SELECT
        winner,
        COUNT(*) as count
      FROM game_history
      WHERE winner != 'draw'
      GROUP BY winner
    `).all() as Array<{ winner: string; count: number }>;

    // Beraberlik sayısı
    const draws = db.prepare(`
      SELECT COUNT(*) as count
      FROM game_history
      WHERE winner = 'draw'
    `).get() as { count: number };

    // Ortalama oyun süresi (saniye)
    const avgDuration = db.prepare(`
      SELECT AVG(duration_seconds) as avg
      FROM game_history
      WHERE duration_seconds IS NOT NULL
    `).get() as { avg: number | null };

    // Terk edilen oyun sayısı
    const totalAbandoned = db.prepare(`
      SELECT SUM(total_abandoned) as total
      FROM users
    `).get() as { total: number };

    res.json({
      users: {
        total: totalUsers.count,
        verified: verifiedUsers.count,
        unverified: totalUsers.count - verifiedUsers.count
      },
      games: {
        total: totalGames.count,
        last24h: gamesLast24h.count,
        last7d: gamesLast7d.count,
        byMode: gamesByMode,
        abandoned: totalAbandoned.total || 0,
        draws: draws.count
      },
      performance: {
        avgDurationSeconds: avgDuration.avg ? Math.round(avgDuration.avg) : 0,
        winStats
      }
    });
  } catch (error) {
    console.error('[ADMIN] Stats error:', error);
    res.status(500).json({ error: 'İstatistikler alınamadı' });
  }
});

// Son oyunlar
router.get('/recent-games', authenticateToken, requireAdmin, (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;

    const recentGames = db.prepare(`
      SELECT
        id,
        player1_name,
        player2_name,
        game_mode,
        winner,
        final_score_p1,
        final_score_p2,
        total_sets,
        duration_seconds,
        created_at
      FROM game_history
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit);

    res.json({ games: recentGames });
  } catch (error) {
    console.error('[ADMIN] Recent games error:', error);
    res.status(500).json({ error: 'Son oyunlar alınamadı' });
  }
});

// Kullanıcı listesi
router.get('/users', authenticateToken, requireAdmin, (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const users = db.prepare(`
      SELECT
        id,
        username,
        display_name,
        email,
        email_verified,
        is_admin,
        created_at,
        last_login,
        total_games,
        total_wins,
        total_losses,
        total_draws,
        total_abandoned
      FROM users
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const totalCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };

    res.json({
      users,
      total: totalCount.count,
      limit,
      offset
    });
  } catch (error) {
    console.error('[ADMIN] Users list error:', error);
    res.status(500).json({ error: 'Kullanıcı listesi alınamadı' });
  }
});

// Kullanıcı detayı
router.get('/users/:id', authenticateToken, requireAdmin, (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id);

    const user = db.prepare(`
      SELECT
        id,
        username,
        display_name,
        email,
        email_verified,
        is_admin,
        created_at,
        last_login,
        total_games,
        total_wins,
        total_losses,
        total_draws,
        total_abandoned
      FROM users
      WHERE id = ?
    `).get(userId);

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Kullanıcının oyun geçmişi
    const games = db.prepare(`
      SELECT
        id,
        player1_name,
        player2_name,
        game_mode,
        winner,
        final_score_p1,
        final_score_p2,
        total_sets,
        duration_seconds,
        created_at
      FROM game_history
      WHERE player1_id = ? OR player2_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).all(userId, userId);

    res.json({
      user,
      recentGames: games
    });
  } catch (error) {
    console.error('[ADMIN] User detail error:', error);
    res.status(500).json({ error: 'Kullanıcı detayları alınamadı' });
  }
});

// Günlük aktivite grafik datası
router.get('/activity-chart', authenticateToken, requireAdmin, (req: AuthRequest, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;

    const activityData = db.prepare(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as game_count
      FROM game_history
      WHERE created_at > datetime('now', '-' || ? || ' days')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `).all(days);

    res.json({ activityData });
  } catch (error) {
    console.error('[ADMIN] Activity chart error:', error);
    res.status(500).json({ error: 'Aktivite verisi alınamadı' });
  }
});

export default router;
