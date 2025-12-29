#!/usr/bin/env node
/**
 * Network IP Adresi Bulucu
 * Bu script sunucu bilgisayarın IP adresini otomatik bulur
 */

const os = require('os');

function getLocalIP() {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // IPv4 ve internal olmayan adresleri filtrele
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }

  return 'localhost';
}

const ip = getLocalIP();

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║          🌐 MANGALA ONLINE MULTIPLAYER KURULUM            ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('📍 Sunucu IP Adresi:');
console.log(`   ${ip}\n`);

console.log('📝 .env.local dosyanıza şu satırı ekleyin:\n');
console.log(`   VITE_SOCKET_URL=http://${ip}:3001\n`);

console.log('🎮 Diğer oyuncular şu adresten bağlanabilir:\n');
console.log(`   http://${ip}:5173\n`);

console.log('⚠️  DİKKAT:');
console.log('   - Tüm oyuncular aynı WiFi ağında olmalı');
console.log('   - Firewall 3001 ve 5173 portlarına izin vermeli\n');

console.log('✅ Sunucuyu başlatmak için:');
console.log('   npm run dev:server    (Terminal 1)');
console.log('   npm run dev           (Terminal 2)\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
