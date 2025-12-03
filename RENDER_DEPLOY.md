# Render Deployment Guide

## 🚀 Render'a Deploy Adımları

### 1. Repository Bağlantısı
1. [Render Dashboard](https://dashboard.render.com) açın
2. **"New +"** → **"Web Service"** seçin
3. GitHub repository'nizi bağlayın: `slymn80/mangala_new`

### 2. Render Ayarları
Blueprint (render.yaml) dosyası otomatik algılanacak, ama kontrol edin:

**Build & Deploy Settings:**
```
Name: mangala-new
Environment: Node
Build Command: npm install && npm run build
Start Command: node dist/server/index.js
```

### 3. Environment Variables (ZORUNLU!)

**Otomatik Oluşturulanlar** (render.yaml'da tanımlı):
- ✅ `NODE_ENV=production`
- ✅ `PORT=10000`
- ✅ `JWT_SECRET` (auto-generated)
- ✅ `ADMIN_SECRET_KEY` (auto-generated)

**Manuel Eklemeniz Gerekenler:**
Dashboard → Settings → Environment → "Add Environment Variable"

```bash
CLIENT_URL=https://mangala-new.onrender.com
APP_URL=https://mangala-new.onrender.com
RESEND_API_KEY=your-resend-api-key-here
```

**VEYA** `.env.render` dosyasını kullanarak:
1. Settings → Environment
2. "Add from .env" butonuna tıklayın
3. `.env.render` dosyasını yükleyin
4. URL'leri ve API key'i düzenleyin

### 4. Disk (SQLite için ZORUNLU!)

render.yaml'da disk tanımlı ama kontrol edin:
```yaml
disk:
  name: mangala-data
  mountPath: /data
  sizeGB: 1
```

**ÖNEMLİ**: Disk aylık **$0.25** ücretlidir!

### 5. Deploy & Test

1. **"Create Web Service"** butonuna tıklayın
2. İlk deploy 5-10 dakika sürer
3. Deploy tamamlanınca URL: `https://mangala-new.onrender.com`

**Test Endpoint:**
```bash
https://mangala-new.onrender.com/api/health
```

### 6. İlk Kullanıcı Oluşturma

Deploy sonrası otomatik admin kullanıcısı oluşur:
```
Username: admin
Password: admin2025
```

**MUTLAKA** admin şifresini değiştirin!

## ⚠️ Önemli Notlar

### Free Plan Limitleri:
- ✅ 750 saat/ay çalışma (yeterli)
- ✅ Otomatik suspend (15 dakika aktivite yoksa)
- ✅ İlk istekte cold start (~30 saniye)
- ⚠️ Disk ayda $0.25

### SQLite Performansı:
- ✅ 0-5,000 kullanıcı: Sorunsuz
- ⚠️ 5,000+ kullanıcı: PostgreSQL'e geçiş önerilir
- ❌ Disk olmadan: Her deploy'da data sıfırlanır!

### Debugging:
Render Dashboard → Logs sekmesinden canlı logları izleyin:
```
[DB] Database connected: /data/mangala.db
🎮 Mangala Server running on port 10000
[SOCKET] ✅ WebSocket server initialized
```

## 🔧 Sorun Giderme

### CORS Hatası:
```bash
# CLIENT_URL ve APP_URL'lerin doğru olduğundan emin olun
CLIENT_URL=https://your-app.onrender.com  # Kendi URL'iniz!
```

### Database Bulunamadı:
```bash
# Disk'in mount edildiğinden emin olun
# Logs'ta şunu görmeli: [DB] Database connected: /data/mangala.db
```

### Build Hatası:
```bash
# Node version kontrol (18.x önerilir)
# package.json'da "type": "module" olduğundan emin olun
```

## 📊 Monitoring

**Health Check:**
- Endpoint: `/api/health`
- Interval: 5 dakika
- Timeout: 30 saniye

**Custom Domain (Opsiyonel):**
Settings → Custom Domain → Add Domain

## 🆙 Güncelleme

Her GitHub push otomatik deploy tetikler:
```bash
git add .
git commit -m "Update"
git push
```

Render otomatik build & deploy yapar (5-10 dakika).

## 💰 Maliyet

**Free Plan:**
- Web Service: Ücretsiz (750 saat/ay)
- **Disk (1GB): $0.25/ay** ⚠️

**Toplam:** ~$0.25/ay (sadece disk için)

PostgreSQL'e geçerseniz: +$0 (1GB free)

---

🎮 **Mutlu Oyunlar!**
