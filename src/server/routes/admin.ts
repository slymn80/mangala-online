/**
 * Admin Routes
 */

import { Router, Response } from 'express';
import { db } from '../database/db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Admin kontrolü middleware
function requireAdmin(req: AuthRequest, res: Response, next: Function) {
  const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.userId) as { is_admin: number } | undefined;

  if (!user || !user.is_admin) {
    return res.status(403).json({ error: 'Yetkiniz yok - Sadece adminler erişebilir' });
  }

  next();
}

// Tüm kullanıcıları listele
router.get('/users', authenticateToken, requireAdmin, (_req: AuthRequest, res) => {
  try {
    const users = db.prepare(`
      SELECT id, username, display_name, is_admin, created_at, last_login,
             total_games, total_wins, total_losses, total_draws
      FROM users
      ORDER BY created_at DESC
    `).all();

    res.json({ users });
  } catch (error) {
    console.error('[ADMIN] Get users error:', error);
    res.status(500).json({ error: 'Kullanıcılar listelenemedi' });
  }
});

// Kullanıcıyı admin yap/kaldır
router.post('/users/:id/toggle-admin', authenticateToken, requireAdmin, (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (userId === req.userId) {
      return res.status(400).json({ error: 'Kendi admin durumunuzu değiştiremezsiniz' });
    }

    const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(userId) as { is_admin: number } | undefined;

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const newAdminStatus = user.is_admin ? 0 : 1;

    db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(newAdminStatus, userId);

    res.json({
      message: newAdminStatus ? 'Kullanıcı admin yapıldı' : 'Kullanıcının admin yetkisi kaldırıldı',
      is_admin: newAdminStatus
    });
  } catch (error) {
    console.error('[ADMIN] Toggle admin error:', error);
    res.status(500).json({ error: 'Admin durumu değiştirilemedi' });
  }
});

// Kullanıcı sil
router.delete('/users/:id', authenticateToken, requireAdmin, (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (userId === req.userId) {
      return res.status(400).json({ error: 'Kendi hesabınızı silemezsiniz' });
    }

    // Kullanıcının oyunlarını da sil
    db.prepare('DELETE FROM game_history WHERE player1_id = ? OR player2_id = ?').run(userId, userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    res.json({ message: 'Kullanıcı silindi' });
  } catch (error) {
    console.error('[ADMIN] Delete user error:', error);
    res.status(500).json({ error: 'Kullanıcı silinemedi' });
  }
});

// Dashboard istatistikleri
router.get('/stats', authenticateToken, requireAdmin, (_req: AuthRequest, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const totalGames = db.prepare('SELECT COUNT(*) as count FROM game_history').get() as { count: number };
    const totalAdmins = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_admin = 1').get() as { count: number };

    const recentGames = db.prepare(`
      SELECT id, player1_name, player2_name, winner, final_score_p1, final_score_p2, created_at
      FROM game_history
      ORDER BY created_at DESC
      LIMIT 10
    `).all();

    const topPlayers = db.prepare(`
      SELECT username, display_name, total_games, total_wins,
             ROUND(CAST(total_wins AS FLOAT) / NULLIF(total_games, 0) * 100, 1) as win_rate
      FROM users
      WHERE total_games > 0
      ORDER BY total_wins DESC
      LIMIT 5
    `).all();

    res.json({
      stats: {
        totalUsers: totalUsers.count,
        totalGames: totalGames.count,
        totalAdmins: totalAdmins.count
      },
      recentGames,
      topPlayers
    });
  } catch (error) {
    console.error('[ADMIN] Get stats error:', error);
    res.status(500).json({ error: 'İstatistikler alınamadı' });
  }
});

export default router;
