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

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
  },
});

app.use(express.json());

// Serve static files in production
const isProduction = process.env.NODE_ENV === 'production';
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

// Watch for changes in .beads directory
const beadsDir = path.join(projectRoot, '.beads');

if (beadsDirectoryExists(projectRoot)) {
  const watcher = chokidar.watch(beadsDir, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
  });

  watcher.on('all', (event, filePath) => {
    console.log(`File ${event}: ${filePath}`);
    io.emit('refresh');
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
