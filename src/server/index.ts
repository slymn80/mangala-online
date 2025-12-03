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

// Database initialization
import './database/schema.js';

// Services
import { initializeEmailService } from './services/email.js';
import { initializeSocketServer } from './services/socketService.js';

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
    : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
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

  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Create HTTP server and initialize WebSocket
const httpServer = createServer(app);
initializeSocketServer(httpServer);

// Start server
httpServer.listen(PORT, () => {
  console.log(`\n🎮 Mangala Server running on port ${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api`);
  console.log(`🔌 WebSocket: Ready for multiplayer`);
  console.log(`💾 Database: SQLite`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

export default app;
