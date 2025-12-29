# 🎮 Mangala - Türk Zeka ve Strateji Oyunu

Modern web teknolojileri ile geliştirilmiş tam özellikli Mangala oyunu.

## ✨ Özellikler

### Oyun Özellikleri
- ⚡ Gerçek zamanlı oyun deneyimi
- 🤖 3 seviyeli yapay zeka (Kolay, Orta, Zor)
- 👥 İki oyuncu modu (PvP)
- 🌐 **Online Multiplayer** - Ağ üzerinden arkadaşlarınızla oynayın
- 🎯 5 set sistemi
- 📊 Detaylı hamle geçmişi
- 🎨 Karanlık/Aydınlık tema desteği
- 🌍 Çok dilli destek (TR, EN, KZ, RU)
- 🔊 Ses efektleri ve müzik
- 📱 Tam responsive tasarım

### Kullanıcı Sistemi
- 🔐 Güvenli kayıt ve giriş sistemi
- ✉️ Email doğrulama (SMTP/Resend desteği)
- 👤 Kullanıcı profilleri ve dashboard
- 📈 Detaylı istatistikler ve liderlik tablosu
- 💾 Otomatik oyun kaydetme
- 🏆 Oyun geçmişi izleme
- 🎯 Win streak takibi
- 📊 Mod bazlı performans analizi

## 🚀 Teknolojiler

### Frontend
- React 18 + TypeScript
- Zustand (State Management)
- TailwindCSS
- Vite
- i18next (Çok dil desteği)

### Backend
- Express.js + TypeScript
- SQLite (Veritabanı)
- JWT (Authentication)
- bcrypt (Şifre güvenliği)

## 📦 Kurulum

### Gereksinimler
- Node.js 18+
- npm veya yarn

### Yerel Geliştirme

1. Depoyu klonlayın:
\`\`\`bash
git clone https://github.com/your-username/mangala.git
cd mangala
\`\`\`

2. Bağımlılıkları yükleyin:
\`\`\`bash
npm install
\`\`\`

3. Environment variables oluşturun:
\`\`\`bash
cp .env.example .env
\`\`\`

**Not:** Email doğrulaması için `.env` dosyasında SMTP ayarlarını yapılandırabilirsiniz. Detaylar için `README_EMAIL.md` dosyasına bakın.

4. Geliştirme sunucusunu başlatın:
\`\`\`bash
npm run dev
\`\`\`

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## 🌐 Online Multiplayer Kurulumu

Online multiplayer özelliğini kullanmak için ek yapılandırma gerekir.

### Hızlı Başlangıç

1. **Sunucu IP'nizi öğrenin:**
```bash
npm run get-ip
```

2. **Gösterilen IP'yi `.env.local` dosyasına ekleyin:**
```env
VITE_SOCKET_URL=http://192.168.1.100:3001
```

3. **Sunucuyu başlatın:**
```bash
# Terminal 1: Backend sunucu
npm run dev:server

# Terminal 2: Frontend
npm run dev:client
```

4. **Diğer oyuncular şu adresten bağlanabilir:**
```
http://192.168.1.100:5173
```

**Detaylı kurulum için:**
- 🇹🇷 Türkçe: `ONLINE_OYUN_KURULUM.md`
- 🇬🇧 English: `NETWORK_SETUP.md`

**Önemli notlar:**
- Tüm oyuncular aynı WiFi/LAN ağında olmalı
- Firewall 3001 ve 5173 portlarına izin vermeli
- İnternet üzerinden oynamak için cloud hosting gerekir

## 📧 Email Doğrulama

Uygulama varsayılan olarak **test modunda** çalışır (doğrulama linkleri konsola yazdırılır).

**Gerçek email göndermek için:**
- 📖 Hızlı başlangıç: `README_EMAIL.md`
- 📚 Detaylı kurulum: `EMAIL_SETUP.md`

**Desteklenen servisler:**
- Gmail SMTP (Kolay kurulum - 5 dakika)
- Resend (Modern, ücretsiz 100 email/ay)
- SendGrid, diğer SMTP servisleri

## 🏗️ Build

Production build oluşturmak için:

\`\`\`bash
npm run build
\`\`\`

Production sunucusunu başlatmak için:

\`\`\`bash
npm start
\`\`\`

## 🌐 Deploy

### Render.com

1. GitHub repository'yi Render'a bağlayın
2. "New Web Service" seçin
3. Build Command: \`npm install && npm run build\`
4. Start Command: \`npm start\`
5. Environment variables ekleyin:
   - \`NODE_ENV=production\`
   - \`JWT_SECRET=your-secret-key\`

### Railway

1. Railway'e projeyi import edin
2. Otomatik olarak Procfile'ı algılayacak
3. Environment variables ekleyin

## 📝 API Endpoints

### Authentication
- POST \`/api/auth/register\` - Yeni kullanıcı kaydı
- POST \`/api/auth/login\` - Kullanıcı girişi
- GET \`/api/auth/me\` - Kullanıcı bilgilerini getir

### Games
- POST \`/api/games/save\` - Oyun kaydet (Auth required)
- GET \`/api/games/history\` - Oyun geçmişi (Auth required)
- GET \`/api/games/leaderboard\` - Liderlik tablosu

## 🎮 Oyun Kuralları

Mangala, Türk kültüründe geleneksel olarak oynanan bir zeka oyunudur:

1. İki oyuncu karşılıklı 6 kuyudan oluşan tahtada oynar
2. Her oyuncunun bir hazinesi vardır
3. Oyun başında her kuyuda 4 taş bulunur
4. Oyuncular sırayla kuyularından taşları alıp saat yönünde dağıtır
5. Son taş kendi hazinesine düşerse ekstra tur hakkı kazanır
6. Boş bir kuyuya düşen son taş, karşı kuyudaki taşları toplar
7. 5 set kazanan oyunu kazanır

## 👨‍💻 Geliştirici

**Süleyman Tongut**
- Özel Talgar 1 Nolu Yatılı Lisesi

## 📄 Lisans

MIT License

## 🙏 Teşekkürler

Bu proje, Türk kültürünün önemli bir parçası olan Mangala oyununu dijital ortama taşıma amacıyla geliştirilmiştir.

---

© 2025 Mangala - Türk Zeka ve Strateji Oyunu
