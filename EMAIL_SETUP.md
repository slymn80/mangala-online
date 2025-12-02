# Email Doğrulama Kurulum Rehberi

Bu rehber, Mangala uygulamasında gerçek email doğrulamasını aktif etmek için gerekli adımları açıklar.

## Seçenek 1: Gmail SMTP (Önerilen - Kolay Kurulum)

### Adım 1: Google App Password Oluşturma

1. Google hesabınıza gidin: https://myaccount.google.com/
2. "Güvenlik" (Security) sekmesine tıklayın
3. "2 Adımlı Doğrulama"yı (2-Step Verification) aktif edin (eğer değilse)
4. "Uygulama şifreleri" (App passwords) bölümüne gidin
5. "Diğer (Özel ad)" seçin ve "Mangala" yazın
6. "Oluştur" butonuna tıklayın
7. Gösterilen 16 haneli şifreyi kopyalayın (boşluklar olmadan)

### Adım 2: .env Dosyasını Yapılandırma

`.env` dosyanızı oluşturun (`.env.example`'dan kopyalayın) ve şu değerleri güncelleyin:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=sizin-gmail-adresiniz@gmail.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx  # Google App Password (16 haneli)
SMTP_FROM="Mangala Oyunu <sizin-gmail-adresiniz@gmail.com>"
```

### Adım 3: Sunucuyu Yeniden Başlatın

```bash
npm run dev
```

Artık gerçek email'ler gönderilecek!

---

## Seçenek 2: Resend (Modern, Ücretsiz - Önerilen Production için)

Resend, modern bir email gönderme servisidir ve aylık 100 email ücretsizdir.

### Kurulum:

1. https://resend.com/ adresine gidin ve kayıt olun
2. API Key oluşturun
3. Domain doğrulayın (veya ücretsiz test domain kullanın)

### Kod Değişikliği:

```bash
npm install resend
```

`src/server/services/email.ts` dosyasını güncelleyin:

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(
  email: string,
  username: string,
  token: string
): Promise<boolean> {
  const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;

  try {
    await resend.emails.send({
      from: 'Mangala <onboarding@resend.dev>', // veya kendi domain'iniz
      to: email,
      subject: 'Email Adresinizi Doğrulayın - Mangala',
      html: `<!-- HTML içeriği aynı kalır -->`,
    });
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send:', error);
    return false;
  }
}
```

`.env` dosyasına ekleyin:
```env
RESEND_API_KEY=re_xxxxxxxxxxxx
```

---

## Seçenek 3: SendGrid (Aylık 100 email ücretsiz)

### Kurulum:

1. https://sendgrid.com/ adresine gidin
2. Ücretsiz hesap oluşturun
3. API Key oluşturun

```bash
npm install @sendgrid/mail
```

`src/server/services/email.ts`:

```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendVerificationEmail(
  email: string,
  username: string,
  token: string
): Promise<boolean> {
  const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;

  const msg = {
    to: email,
    from: process.env.SMTP_FROM || 'noreply@mangala.com',
    subject: 'Email Adresinizi Doğrulayın - Mangala',
    html: `<!-- HTML içeriği -->`,
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('[EMAIL] SendGrid error:', error);
    return false;
  }
}
```

`.env`:
```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxx
```

---

## Seçenek 4: Ethereal Email (Sadece Test/Geliştirme)

Geliştirme aşamasında gerçek email göndermeden test etmek için:

```typescript
import nodemailer from 'nodemailer';

// Test hesabı oluştur
const testAccount = await nodemailer.createTestAccount();

const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  secure: false,
  auth: {
    user: testAccount.user,
    pass: testAccount.pass,
  },
});

// Email gönder
const info = await transporter.sendMail(mailOptions);

// Test URL'sini konsola yazdır
console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
```

---

## Güvenlik Notları

⚠️ **ÖNEMLİ:**

1. **ASLA** `.env` dosyasını git'e commit etmeyin
2. Production'da mutlaka güçlü JWT_SECRET kullanın
3. Gmail kullanıyorsanız, ana şifrenizi değil App Password kullanın
4. Email gönderme limitlerini kontrol edin (spam önleme)

---

## Test Etme

Email kurulumunu test etmek için:

1. Yeni bir kullanıcı kaydı yapın
2. Konsol çıktısını kontrol edin (SMTP yapılandırılmadıysa link orada görünür)
3. Email kutunuzu kontrol edin
4. Doğrulama linkine tıklayın

---

## Sorun Giderme

### Gmail "Less secure app" hatası:
- App Password kullandığınızdan emin olun
- 2-Step Verification aktif olmalı

### Email gönderilmiyor:
- `.env` dosyası doğru konumda mı?
- SMTP bilgileri doğru mu?
- Port 587 açık mı? (firewall kontrol edin)
- Sunucuyu yeniden başlattınız mı?

### Email spam'e düşüyor:
- SPF/DKIM kayıtlarını ekleyin (kendi domain kullanıyorsanız)
- Resend veya SendGrid gibi profesyonel servis kullanın

---

## Önerilen Yapılandırma

**Geliştirme:** Console'a yazdırma (mevcut durum) veya Ethereal Email
**Production:** Resend veya SendGrid (profesyonel, güvenilir, ücretsiz tier)

---

## Production Deployment (Render.com için)

Render.com environment variables bölümünde şu değişkenleri ekleyin:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Mangala <your-email@gmail.com>"
APP_URL=https://mangala-your-app.onrender.com
```

Veya Resend kullanıyorsanız:
```
RESEND_API_KEY=re_xxxxxxxxxxxxxx
APP_URL=https://mangala-your-app.onrender.com
```
