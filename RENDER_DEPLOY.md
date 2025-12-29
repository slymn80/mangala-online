# Mangala Online - Render Deployment Guide

## Hızlı Başlangıç

Bu proje Render.com'da ücretsiz olarak deploy edilebilir.

### 1. Render Dashboard

1. [Render.com](https://render.com) hesabınıza giriş yapın
2. "New +" butonuna tıklayın
3. "Web Service" seçin
4. GitHub repository'nizi bağlayın: `https://github.com/slymn80/mangala-online.git`

### 2. Deployment Ayarları

Render otomatik olarak `render.yaml` dosyasını algılayacaktır. Manuel ayarlar:

- **Name**: mangala-online
- **Region**: Frankfurt (veya size en yakın)
- **Branch**: main
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Instance Type**: Free

### 3. Environment Variables

Aşağıdaki environment variable'ları Render dashboard'undan ekleyin:

#### Zorunlu Değişkenler:

```bash
NODE_ENV=production
PORT=3001
```

#### Auto-Generate (Render otomatik oluşturur):

```bash
JWT_SECRET=[Render otomatik oluşturur]
ADMIN_SECRET_KEY=[Render otomatik oluşturur]
```

#### Email Servisi (Resend):

```bash
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@your-domain.com
```

Resend API key için:
1. [Resend.com](https://resend.com) hesabı oluşturun
2. API Keys bölümünden yeni key oluşturun
3. Doğrulanmış bir domain veya email ekleyin

#### Frontend URL:

```bash
FRONTEND_URL=https://your-app-name.onrender.com
```

Not: Render deploy edildikten sonra size bir URL verecek (örn: `https://mangala-online.onrender.com`). Bu URL'yi `FRONTEND_URL` değişkenine ekleyin.

### 4. Database

- SQLite dosyası (`mangala.db`) otomatik olarak oluşturulacak
- **ÖNEMLİ**: Free tier'da disk ephemeral'dır, restart sonrası veriler silinebilir
- Production için PostgreSQL kullanmanız önerilir

### 5. Admin Kullanıcısı Oluşturma

Deploy edildikten sonra, admin kullanıcısı oluşturmak için:

```bash
curl -X POST https://your-app-name.onrender.com/api/auth/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "YourSecurePassword123!",
    "displayName": "Admin User",
    "adminSecret": "YOUR_ADMIN_SECRET_KEY"
  }'
```

`adminSecret` değeri, Render'da ayarladığınız `ADMIN_SECRET_KEY` environment variable'ının değeridir.

### 6. CORS ve WebSocket Ayarları

Frontend ve backend aynı domain'de olduğu için CORS otomatik ayarlanmıştır. WebSocket bağlantıları da otomatik çalışacaktır.

### 7. Health Check

Render health check için `/api/health` endpoint'ini kullanır. Bu endpoint otomatik olarak eklenmiştir.

### 8. Auto Deploy

`render.yaml`'da `autoDeploy: true` ayarlanmıştır. GitHub'a yaptığınız her push otomatik olarak deploy edilecektir.

## Deployment Sonrası

1. Render size bir URL verecek (örn: `https://mangala-online.onrender.com`)
2. Bu URL'yi `FRONTEND_URL` environment variable'ına ekleyin
3. Service'i restart edin
4. Admin kullanıcısı oluşturun (yukarıdaki curl komutu ile)
5. Tarayıcınızda açın ve test edin!

## Sorun Giderme

### Build Hatası

- Render logs'ları kontrol edin: Dashboard > Service > Logs
- `npm install` ve `npm run build` komutlarının başarılı olduğundan emin olun

### Runtime Hatası

- Environment variables'ların doğru ayarlandığından emin olun
- Logs'larda hata mesajlarını kontrol edin

### Email Gönderilmiyor

- `RESEND_API_KEY` doğru mu?
- `EMAIL_FROM` adresi Resend'de doğrulanmış mı?

### Database Sıfırlanıyor

- Free tier'da disk ephemeral'dır
- Production için PostgreSQL migration yapın veya persistent disk ekleyin

## Üretim Önerileri

1. **PostgreSQL Kullanın**: SQLite yerine Render'ın PostgreSQL servisini kullanın
2. **Persistent Disk**: Render'da persistent disk ekleyin (ücretli)
3. **Custom Domain**: Kendi domain'inizi bağlayın
4. **SSL**: Otomatik olarak Render tarafından sağlanır
5. **Monitoring**: Render metrics'lerini takip edin

## Destek

Sorun yaşarsanız:
- Render Documentation: https://render.com/docs
- GitHub Issues: https://github.com/slymn80/mangala-online/issues
