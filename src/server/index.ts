import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import chokidar from 'chokidar';
import path from 'path';
import minimist from 'minimist';
import { fileURLToPath } from 'url';
import { createApiRouter } from './routes/api.js';
import { beadsDirectoryExists } from './utils/beadsReader.js';

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
  console.log(`Serving static files from: ${distPath}`);
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

console.log(`Starting Beads Dashboard Server...`);
console.log(`Environment: ${isProduction ? 'production' : 'development'}`);
console.log(`Watching directory: ${projectRoot}`);

// Watch for changes to beads.db (SQLite database)
const beadsDir = path.join(projectRoot, '.beads');
const beadsDbPath = path.join(beadsDir, 'beads.db');

if (beadsDirectoryExists(projectRoot)) {
  console.log(`Setting up file watcher for: ${beadsDbPath}`);
  const watcher = chokidar.watch(beadsDbPath, {
    persistent: true,
    ignoreInitial: false,
  });

  watcher.on('ready', () => {
    console.log('File watcher ready');
  });

  watcher.on('all', () => {
    // Database changed - this catches manual bd CLI updates outside the dashboard
    io.emit('refresh');
  });

  watcher.on('error', (error) => {
    console.error('Watcher error:', error);
  });
} else {
  console.log(`No .beads directory found at ${beadsDir}. Waiting for it to be created...`);

  // Watch parent directory for .beads creation
  const watcher = chokidar.watch(projectRoot, {
    depth: 0,
    persistent: true,
    ignoreInitial: true,
  });

  watcher.on('addDir', (dirPath) => {
    if (path.basename(dirPath) === '.beads') {
      console.log('.beads directory created! Emitting refresh...');
      io.emit('refresh');
    }
  });
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected');
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\nError: Port ${PORT} is already in use.`);
    console.error(`\nTry one of the following:`);
    console.error(`  • Stop the other process using port ${PORT}`);
    console.error(`  • Run with a different port: beads-dashboard --port=<PORT>`);
    console.error(`  • Find the process: lsof -ti:${PORT}\n`);
    process.exit(1);
  } else {
    console.error('Server error:', error);
    process.exit(1);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
