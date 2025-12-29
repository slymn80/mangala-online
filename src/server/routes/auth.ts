/**
 * Authentication Routes
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../database/db.js';
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth.js';
import { sendVerificationEmail } from '../services/email.js';
import type { User, UserPublic } from '../types/user.types.js';

const router = Router();

// Kullanıcı kaydı
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;
    console.log('[AUTH] Registration request:', { username, email, displayName });

    // Validasyon
    if (!username || !email || !password || !displayName) {
      return res.status(400).json({ error: 'Tüm alanları doldurunuz' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Kullanıcı adı en az 3 karakter olmalı' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
    }

    // Email formatı kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Geçerli bir email adresi giriniz' });
    }

    // Kullanıcı adı kontrolü
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
    }

    // Email kontrolü
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingEmail) {
      return res.status(409).json({ error: 'Bu email adresi zaten kullanılıyor' });
    }

    // Şifre hashleme
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Verification token oluştur
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat

    // Kullanıcı oluştur
    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, display_name, verification_token, verification_token_expires)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(username, email, passwordHash, displayName, verificationToken, tokenExpires.toISOString());

    const userId = result.lastInsertRowid as number;

    // Verification email gönder
    console.log('[AUTH] Sending verification email to:', email);
    await sendVerificationEmail(email, username, verificationToken);
    console.log('[AUTH] Verification email sent successfully');

    // Token oluştur
    const token = generateToken(userId, username);

    // Kullanıcı bilgileri
    const user = db.prepare(`
      SELECT id, username, email, display_name, is_admin, email_verified, created_at, total_games, total_wins, total_losses, total_draws, total_abandoned
      FROM users WHERE id = ?
    `).get(userId) as UserPublic;

    res.status(201).json({
      message: 'Kayıt başarılı! Email adresinize gönderilen linke tıklayarak hesabınızı aktifleştiriniz.',
      token,
      user
    });
  } catch (error) {
    console.error('[AUTH] Register error:', error);
    res.status(500).json({ error: 'Kayıt sırasında bir hata oluştu' });
  }
});

// Kullanıcı girişi
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
    }

    // Kullanıcıyı bul
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;

    if (!user) {
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
    }

    // Şifre kontrolü
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
    }

    // Son giriş zamanını güncelle
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

    // Token oluştur
    const token = generateToken(user.id, user.username);

    // Kullanıcı bilgileri (şifre olmadan)
    const userPublic: UserPublic = {
      id: user.id,
      username: user.username,
      email: user.email,
      display_name: user.display_name,
      is_admin: user.is_admin,
      email_verified: user.email_verified,
      created_at: user.created_at,
      total_games: user.total_games,
      total_wins: user.total_wins,
      total_losses: user.total_losses,
      total_draws: user.total_draws,
      total_abandoned: user.total_abandoned
    };

    res.json({
      message: 'Giriş başarılı',
      token,
      user: userPublic
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    res.status(500).json({ error: 'Giriş sırasında bir hata oluştu' });
  }
});

// Kullanıcı bilgilerini getir (token ile)
router.get('/me', authenticateToken, (req: AuthRequest, res) => {
  try {
    const user = db.prepare(`
      SELECT id, username, email, display_name, is_admin, email_verified, created_at, last_login,
             total_games, total_wins, total_losses, total_draws, total_abandoned
      FROM users WHERE id = ?
    `).get(req.userId) as UserPublic | undefined;

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    res.json({ user });
  } catch (error) {
    console.error('[AUTH] Get user error:', error);
    res.status(500).json({ error: 'Kullanıcı bilgileri alınamadı' });
  }
});

// Email doğrulama
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Token ile kullanıcıyı bul
    const user = db.prepare(`
      SELECT id, username, email, verification_token_expires
      FROM users
      WHERE verification_token = ? AND email_verified = 0
    `).get(token) as any;

    if (!user) {
      return res.status(400).json({ error: 'Geçersiz veya süresi dolmuş doğrulama linki' });
    }

    // Token süresini kontrol et
    const now = new Date();
    const expires = new Date(user.verification_token_expires);

    if (now > expires) {
      return res.status(400).json({ error: 'Doğrulama linkinin süresi dolmuş. Lütfen yeni bir doğrulama linki talep edin.' });
    }

    // Email'i doğrula
    db.prepare(`
      UPDATE users
      SET email_verified = 1,
          verification_token = NULL,
          verification_token_expires = NULL
      WHERE id = ?
    `).run(user.id);

    console.log(`[AUTH] Email verified for user: ${user.username}`);

    res.json({
      message: 'Email adresiniz başarıyla doğrulandı! Artık tüm özellikleri kullanabilirsiniz.',
      verified: true
    });
  } catch (error) {
    console.error('[AUTH] Verify email error:', error);
    res.status(500).json({ error: 'Email doğrulama sırasında bir hata oluştu' });
  }
});

// Yeni doğrulama linki gönder
router.post('/resend-verification', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = db.prepare(`
      SELECT id, username, email, email_verified
      FROM users WHERE id = ?
    `).get(req.userId) as any;

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    if (user.email_verified) {
      return res.status(400).json({ error: 'Email adresiniz zaten doğrulanmış' });
    }

    // Yeni verification token oluştur
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat

    // Token'ı güncelle
    db.prepare(`
      UPDATE users
      SET verification_token = ?,
          verification_token_expires = ?
      WHERE id = ?
    `).run(verificationToken, tokenExpires.toISOString(), user.id);

    // Verification email gönder
    await sendVerificationEmail(user.email, user.username, verificationToken);

    res.json({
      message: 'Yeni doğrulama linki email adresinize gönderildi'
    });
  } catch (error) {
    console.error('[AUTH] Resend verification error:', error);
    res.status(500).json({ error: 'Email gönderme sırasında bir hata oluştu' });
  }
});

// Admin kullanıcısı oluştur (özel güvenlik şifresi ile)
router.post('/create-admin', async (req, res) => {
  try {
    const { username, password, displayName, adminSecret } = req.body;

    // Güvenlik şifresi kontrolü
    const ADMIN_SECRET = process.env.ADMIN_SECRET_KEY;
    if (!adminSecret || adminSecret !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Geçersiz admin güvenlik şifresi' });
    }

    // Validasyon
    if (!username || !password || !displayName) {
      return res.status(400).json({ error: 'Tüm alanları doldurunuz' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Kullanıcı adı en az 3 karakter olmalı' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
    }

    // Kullanıcı adı kontrolü
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
    }

    // Şifre hashleme
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Admin kullanıcı oluştur (email dummy değer)
    const adminEmail = `${username}@admin.local`;
    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, display_name, is_admin, email_verified)
      VALUES (?, ?, ?, ?, 1, 1)
    `).run(username, adminEmail, passwordHash, displayName);

    const userId = result.lastInsertRowid as number;

    // Token oluştur
    const token = generateToken(userId, username);

    // Kullanıcı bilgileri
    const user = db.prepare(`
      SELECT id, username, display_name, is_admin, created_at, total_games, total_wins, total_losses, total_draws, total_abandoned
      FROM users WHERE id = ?
    `).get(userId) as UserPublic;

    console.log(`[AUTH] Admin user created: ${username} (ID: ${userId})`);

    res.status(201).json({
      message: 'Admin kullanıcısı başarıyla oluşturuldu',
      token,
      user
    });
  } catch (error) {
    console.error('[AUTH] Create admin error:', error);
    res.status(500).json({ error: 'Admin oluşturma sırasında bir hata oluştu' });
  }
});

export default router;
