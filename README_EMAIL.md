# Email Doğrulama - Hızlı Başlangıç

## Test Modunda Çalıştırma (Varsayılan)

Email yapılandırması yapmadan test edebilirsiniz. Doğrulama linkleri konsol çıktısında görünecektir.

Yeni kullanıcı kaydı yaptığınızda, terminalde şöyle bir çıktı göreceksiniz:

```
╔════════════════════════════════════════════════════════╗
║       📧 EMAIL DOĞRULAMA (TEST MODE)                  ║
╠════════════════════════════════════════════════════════╣
║ Alıcı: user@example.com                               ║
║ Kullanıcı: testuser                                   ║
╠════════════════════════════════════════════════════════╣
║ 🔗 DOĞRULAMA LİNKİ:                                   ║
║ http://localhost:5173/verify-email?token=abc123...    ║
╠════════════════════════════════════════════════════════╣
║ 💡 Gerçek email göndermek için EMAIL_SETUP.md         ║
║    dosyasındaki talimatları takip edin                ║
╚════════════════════════════════════════════════════════╝
```

Bu linki kopyalayıp tarayıcınıza yapıştırarak hesabınızı doğrulayabilirsiniz.

## Gerçek Email Göndermek (Gmail ile 5 Dakikada)

### 1. Google App Password Oluşturun

1. https://myaccount.google.com/ adresine gidin
2. "Güvenlik" > "2 Adımlı Doğrulama"yı aktif edin
3. "Uygulama şifreleri" bölümüne gidin
4. "Diğer (Özel ad)" > "Mangala" > "Oluştur"
5. Gösterilen 16 haneli şifreyi kopyalayın

### 2. .env Dosyasını Oluşturun

```bash
cp .env.example .env
```

`.env` dosyasını açın ve şu satırları güncelleyin:

```env
SMTP_USER=sizin-gmail-adresiniz@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  # Google App Password
SMTP_FROM="Mangala <sizin-gmail-adresiniz@gmail.com>"
```

### 3. Sunucuyu Yeniden Başlatın

```bash
npm run dev
```

Şu çıktıyı görmelisiniz:

```
[EMAIL] ✅ SMTP email service initialized
[EMAIL] 📧 Using: sizin-gmail-adresiniz@gmail.com
[EMAIL] ✅ SMTP connection verified
```

Artık gerçek email'ler gönderilecek! 🎉

## Sorun Giderme

### "SMTP connection test failed" hatası:
- App Password'u doğru kopyaladığınızdan emin olun (boşluklar olmadan)
- 2-Step Verification aktif olmalı
- Gmail hesabınızın "Less secure app access" ayarını kontrol edin

### Email gelmiyor:
- Spam klasörünü kontrol edin
- SMTP_USER ve SMTP_FROM aynı email adresi olmalı
- Gmail günlük gönderim limitini kontrol edin (500 email/gün)

### Hala çalışmıyor:
- Detaylı kurulum için `EMAIL_SETUP.md` dosyasına bakın
- Alternatif email servisleri (Resend, SendGrid) için talimatlar orada

## Production Deployment

Render.com veya başka bir platformda deploy ederken, Environment Variables bölümüne şu değişkenleri ekleyin:

```
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="Mangala <your-email@gmail.com>"
APP_URL=https://your-app-url.onrender.com
```

**Güvenlik Notu:** Asla `.env` dosyasını git'e commit etmeyin!
