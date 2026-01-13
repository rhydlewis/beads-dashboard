#!/usr/bin/env node

// Set production environment before loading the server
process.env.NODE_ENV = 'production';

// Dynamically import the server (not hoisted like static import)
await import('../dist/server/server/index.js');
