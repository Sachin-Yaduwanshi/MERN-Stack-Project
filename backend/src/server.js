import dotenv from 'dotenv';
// Load environment variables before importing dependent modules
dotenv.config();

import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

// Start Server
const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`[StayPulse Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`[StayPulse Server] Health check available at: http://localhost:${PORT}/api/health`);
  });

  // Graceful shutdown handling
  const handleExit = (signal) => {
    console.log(`\n[StayPulse Server] Received ${signal}. Shutting down gracefully...`);
    server.close(() => {
      console.log('[StayPulse Server] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => handleExit('SIGINT'));
  process.on('SIGTERM', () => handleExit('SIGTERM'));

  return server;
};

startServer().catch((err) => {
  console.error('[StayPulse Server Fatal Error]:', err);
  process.exit(1);
});
