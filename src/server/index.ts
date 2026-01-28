import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import chokidar from 'chokidar';
import path from 'path';
import minimist from 'minimist';
import { fileURLToPath } from 'url';
import { createApiRouter } from './routes/api.js';
import { beadsDirectoryExists } from './utils/beadsReader.js';
import { logger } from './utils/logger.js';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = minimist(process.argv.slice(2));
const projectRoot = args._[0] || process.cwd();
const PORT = args.port || 3001; // Changed from 3000 to 3001 for dev mode (Vite uses 3000)

// Determine environment
const isProduction = process.env.NODE_ENV === 'production';

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Configure CORS based on environment
const allowedOrigins = isProduction
  ? (process.env.ALLOWED_ORIGINS?.split(',') || [])
  : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'];

const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

app.use(express.json());

// Serve static files in production
if (isProduction) {
  const distPath = path.join(__dirname, '../../client');
  logger.info({ distPath }, 'Serving static files');
  app.use(express.static(distPath));
}

// API routes
const apiRouter = createApiRouter(projectRoot, () => {
  io.emit('refresh');
});
app.use('/api', apiRouter);

// Serve index.html for all other routes in production (SPA fallback)
if (isProduction) {
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(__dirname, '../../client/index.html'));
  });
}

logger.info('Starting Beads Dashboard Server...');
logger.info({ environment: isProduction ? 'production' : 'development' }, 'Environment');
logger.info({ projectRoot }, 'Watching directory');

// Watch for changes to beads.db (SQLite database)
const beadsDir = path.join(projectRoot, '.beads');
const beadsDbPath = path.join(beadsDir, 'beads.db');

if (beadsDirectoryExists(projectRoot)) {
  logger.info({ beadsDbPath }, 'Setting up file watcher');
  const watcher = chokidar.watch(beadsDbPath, {
    persistent: true,
    ignoreInitial: true, // Don't trigger on startup - only on actual changes
    awaitWriteFinish: {
      stabilityThreshold: 200, // Wait for 200ms of no changes before emitting
      pollInterval: 100, // Check every 100ms
    },
  });

  watcher.on('ready', () => {
    logger.info('File watcher ready');
  });

  // Use 'change' event to catch database updates
  // Long debounce (10s) to batch rapid daemon writes while still catching external CLI changes
  // Note: bd daemon in events mode continuously imports/exports, causing frequent db writes
  let refreshTimeout: NodeJS.Timeout | null = null;
  watcher.on('change', () => {
    if (refreshTimeout) {
      clearTimeout(refreshTimeout);
    }
    refreshTimeout = setTimeout(() => {
      logger.info({ event: 'refresh' }, 'Database changed - emitting refresh to clients');
      io.emit('refresh');
      refreshTimeout = null;
    }, 10000); // 10 second debounce to batch daemon activity
  });

  watcher.on('error', (error) => {
    logger.error({ err: error }, 'Watcher error');
  });
} else {
  logger.info({ beadsDir }, 'No .beads directory found. Waiting for it to be created...');

  // Watch parent directory for .beads creation
  const watcher = chokidar.watch(projectRoot, {
    depth: 0,
    persistent: true,
    ignoreInitial: true,
  });

  watcher.on('addDir', (dirPath) => {
    if (path.basename(dirPath) === '.beads') {
      logger.info({ dirPath }, '.beads directory created! Emitting refresh...');
      io.emit('refresh');
    }
  });
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'Client connected');
  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id }, 'Client disconnected');
  });
});

// Start server
server.listen(PORT, () => {
  logger.info({ port: PORT, url: `http://localhost:${PORT}` }, 'Server running');
});

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    logger.error({ port: PORT, err: error }, `Port ${PORT} is already in use`);
    logger.error(`\nTry one of the following:`);
    logger.error(`  • Stop the other process using port ${PORT}`);
    logger.error(`  • Run with a different port: beads-dashboard --port=<PORT>`);
    logger.error(`  • Find the process: lsof -ti:${PORT}\n`);
    process.exit(1);
  } else {
    logger.error({ err: error }, 'Server error');
    process.exit(1);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing server...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});
