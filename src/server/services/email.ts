/**
 * Email Service
 * Supports multiple email providers: Nodemailer (SMTP), Resend
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { Resend } from 'resend';

// Email transporter
let transporter: Transporter | null = null;
let resendClient: Resend | null = null;
let emailProvider: 'smtp' | 'resend' | 'test' = 'test';

// Initialize email transporter
export function initializeEmailService() {
  // Check for Resend API key first (preferred for production)
  if (process.env.RESEND_API_KEY) {
    try {
      resendClient = new Resend(process.env.RESEND_API_KEY);
      emailProvider = 'resend';
      console.log('[EMAIL] ✅ Resend email service initialized');
      console.log('[EMAIL] 📧 Ready to send emails via Resend');
      return;
    } catch (error) {
      console.error('[EMAIL] ❌ Failed to initialize Resend:', error);
      emailProvider = 'test';
    }
  }

  // Check for SMTP credentials
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const emailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };

    try {
      transporter = nodemailer.createTransport(emailConfig);
      emailProvider = 'smtp';
      console.log('[EMAIL] ✅ SMTP email service initialized');
      console.log(`[EMAIL] 📧 Using: ${process.env.SMTP_USER}`);

      // Test connection
      transporter.verify((error) => {
        if (error) {
          console.error('[EMAIL] ⚠️  SMTP connection test failed:', error.message);
          console.log('[EMAIL] 💡 Gmail kullanıyorsanız App Password kullandığınızdan emin olun');
          console.log('[EMAIL] 💡 2-Step Verification aktif olmalı');
        } else {
          console.log('[EMAIL] ✅ SMTP connection verified');
        }
      });
    } catch (error) {
      console.error('[EMAIL] ❌ Failed to initialize SMTP:', error);
      emailProvider = 'test';
    }
  } else {
    console.log('[EMAIL] ⚠️  No email service configured');
    console.log('[EMAIL] 📝 Email verification links will be logged to console');
    console.log('[EMAIL] 📝 See EMAIL_SETUP.md for configuration instructions');
    emailProvider = 'test';
  }
}

// Generate email HTML template
function getVerificationEmailHTML(username: string, verificationUrl: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Doğrulama - Mangala</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
      <div style="max-width: 600px; margin: 20px auto; background-color: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); padding: 30px; text-align: center;">
          <h1 style="margin: 0; color: white; font-size: 32px;">🎮 MANGALA</h1>
          <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Türk Zeka ve Strateji Oyunu</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #2c3e50; margin: 0 0 20px 0;">Hoş Geldiniz, ${username}! 👋</h2>
          <p style="color: #555; line-height: 1.6; margin-bottom: 20px;">
            Mangala oyununa kaydınız için teşekkür ederiz. Hesabınızı aktif etmek ve oyuna başlamak için email adresinizi doğrulamanız gerekiyor.
          </p>

          <!-- Button -->
          <div style="text-align: center; margin: 35px 0;">
            <a href="${verificationUrl}"
               style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                      color: white;
                      padding: 15px 40px;
                      text-decoration: none;
                      border-radius: 8px;
                      display: inline-block;
                      font-weight: bold;
                      font-size: 16px;
                      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);">
              ✓ Email Adresimi Doğrula
            </a>
          </div>

          <p style="color: #888; font-size: 13px; line-height: 1.6; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <strong>Link çalışmıyor mu?</strong><br>
            Aşağıdaki adresi kopyalayıp tarayıcınıza yapıştırın:<br>
            <a href="${verificationUrl}" style="color: #3b82f6; word-break: break-all;">${verificationUrl}</a>
          </p>

          <p style="color: #888; font-size: 12px; margin-top: 20px;">
            ⏰ Bu link 24 saat geçerlidir.<br>
            🔒 Eğer bu hesabı siz oluşturmadıysanız, bu emaili görmezden gelebilirsiniz.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #eee;">
          <p style="margin: 0; color: #888; font-size: 12px;">
            © 2025 Mangala - Özel Talgar 1 Nolu Yatılı Lisesi<br>
            by Süleyman Tongut
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Send verification email
export async function sendVerificationEmail(
  email: string,
  username: string,
  token: string
): Promise<boolean> {
  const verificationUrl = `${process.env.APP_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
  const emailHTML = getVerificationEmailHTML(username, verificationUrl);

  // Test mode - console'a yazdır
  if (emailProvider === 'test') {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║       📧 EMAIL DOĞRULAMA (TEST MODE)                  ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║ Alıcı: ${email.padEnd(48)}║`);
    console.log(`║ Kullanıcı: ${username.padEnd(44)}║`);
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log('║ 🔗 DOĞRULAMA LİNKİ:                                   ║');
    console.log(`║ ${verificationUrl.substring(0, 52).padEnd(54)}║`);
    if (verificationUrl.length > 52) {
      console.log(`║ ${verificationUrl.substring(52).padEnd(54)}║`);
    }
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log('║ 💡 Gerçek email göndermek için EMAIL_SETUP.md         ║');
    console.log('║    dosyasındaki talimatları takip edin                ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    return true;
  }

  // SMTP mode
  if (emailProvider === 'smtp' && transporter) {
    const mailOptions = {
      from: process.env.SMTP_FROM || '"Mangala Oyunu" <noreply@mangala.com>',
      to: email,
      subject: '🎮 Email Adresinizi Doğrulayın - Mangala',
      html: emailHTML,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`[EMAIL] ✅ Verification email sent to ${email}`);
      console.log(`[EMAIL] 📧 Message ID: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error('[EMAIL] ❌ Failed to send verification email:', error.message);
      console.log('[EMAIL] 💡 Check your SMTP credentials in .env file');
      return false;
    }
  }

  // Resend mode
  if (emailProvider === 'resend' && resendClient) {
    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
      await resendClient.emails.send({
        from: `Mangala <${fromEmail}>`,
        to: email,
        subject: '🎮 Email Adresinizi Doğrulayın - Mangala',
        html: emailHTML,
      });
      console.log(`[EMAIL] ✅ Verification email sent to ${email} via Resend`);
      console.log(`[EMAIL] 📧 From: ${fromEmail}`);
      return true;
    } catch (error: any) {
      console.error('[EMAIL] ❌ Resend error:', error.message);
      console.log('[EMAIL] 💡 Check your RESEND_API_KEY in .env file');
      return false;
    }
  }

  return false;
}

// Send password reset email (gelecekte kullanmak için)
export async function sendPasswordResetEmail(
  email: string,
  username: string,
  token: string
): Promise<boolean> {
  const resetUrl = `${process.env.APP_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

  const mailOptions = {
    from: process.env.SMTP_FROM || '"Mangala Oyunu" <noreply@mangala.com>',
    to: email,
    subject: 'Şifre Sıfırlama - Mangala',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Şifre Sıfırlama Talebi</h2>
        <p>Merhaba ${username},</p>
        <p>Hesabınız için şifre sıfırlama talebinde bulundunuz.</p>
        <p>Yeni şifre oluşturmak için aşağıdaki butona tıklayın:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="background-color: #e74c3c; color: white; padding: 12px 24px;
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Şifremi Sıfırla
          </a>
        </div>
        <p style="color: #7f8c8d; font-size: 12px;">
          Bu link 1 saat geçerlidir. Eğer şifre sıfırlama talebinde bulunmadıysanız, bu emaili görmezden gelebilirsiniz.
        </p>
      </div>
    `,
  };

  if (!transporter) {
    console.log('\n[EMAIL] 📧 Password reset email (TEST MODE):');
    console.log('To:', email);
    console.log('Reset URL:', resetUrl);
    return true;
  }

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] ✅ Password reset email sent to ${email}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] ❌ Failed to send password reset email:', error);
    return false;
  }
}
