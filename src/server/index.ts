/**
 * Mangala Game Server
 * Express + SQLite + WebSocket Backend
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import os from 'os';

// Database initialization
import './database/schema.js';
import { runMigrations } from './database/runMigrations.js';

// Services
import { initializeEmailService } from './services/email.js';
import { initializeSocketServer } from './services/socketService.js';

// Run migrations
runMigrations();

// Routes
import authRoutes from './routes/auth.js';
import gamesRoutes from './routes/games.js';
import adminRoutes from './routes/admin.js';
import profileRoutes from './routes/profile.js';

dotenv.config();

// Initialize email service
initializeEmailService();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.CLIENT_URL, process.env.APP_URL].filter(Boolean)
    : (origin, callback) => {
        // Development modunda tüm localhost ve 127.0.0.1 isteklerine izin ver
        if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/profile', profileRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Mangala API is running' });
});

// Production'da static files serve et
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../../dist');
  app.use(express.static(clientBuildPath));

  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Create HTTP server and initialize WebSocket
const httpServer = createServer(app);
initializeSocketServer(httpServer);

// Helper function to get local IP
function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const ifaces = interfaces[name];
    if (!ifaces) continue;
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// Start server
httpServer.listen(PORT, () => {
  const localIP = getLocalIP();

  console.log(`\n🎮 Mangala Server running on port ${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket: Ready for multiplayer`);
  console.log(`💾 Database: SQLite`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);

  if (localIP !== 'localhost') {
    console.log(`\n📡 Network Access:`);
    console.log(`   - Local: http://localhost:${PORT}`);
    console.log(`   - Network: http://${localIP}:${PORT}`);
    console.log(`\n💡 For online multiplayer, other players can connect to:`);
    console.log(`   http://${localIP}:5173`);
    console.log(`\n⚠️  Make sure to set VITE_SOCKET_URL=http://${localIP}:${PORT} in .env.local`);
  }

  console.log('');
});

export default app;
