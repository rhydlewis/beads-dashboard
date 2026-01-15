import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createApiRouter } from '@server/routes/api';

// Mock child_process exec
vi.mock('child_process', () => {
  const execMock = vi.fn((cmd: string, options: any, callback: (error: Error | null, stdout: string, stderr: string) => void) => {
    // Simulate successful command execution
    if (typeof callback === 'function') {
      setTimeout(() => {
        callback(null, 'success', '');
      }, 0);
    }
  });

  return {
    default: { exec: execMock },
    exec: execMock,
  };
});

describe('API Priority Routes', () => {
  let app: express.Application;
  let tempDir: string;
  let beadsDir: string;
  let emitRefreshSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create temporary directory for testing
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'beads-api-priority-test-'));
    beadsDir = path.join(tempDir, '.beads');

    // Create .beads directory
    fs.mkdirSync(beadsDir);

    // Create Express app with API router
    app = express();
    app.use(express.json());

    emitRefreshSpy = vi.fn();
    const apiRouter = createApiRouter(tempDir, emitRefreshSpy);
    app.use('/api', apiRouter);
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    vi.clearAllMocks();
  });

  describe('POST /api/issues/:id/priority', () => {
    it('returns 400 when priority is missing', async () => {
      const response = await request(app)
        .post('/api/issues/test-123/priority')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Priority is required');
    });

    it('updates issue priority successfully', async () => {
      const response = await request(app)
        .post('/api/issues/test-123/priority')
        .send({ priority: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(emitRefreshSpy).toHaveBeenCalled();
    });

    it('accepts priority 0 (Critical)', async () => {
      const response = await request(app)
        .post('/api/issues/test-123/priority')
        .send({ priority: 0 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('emits refresh event after successful priority update', async () => {
      await request(app)
        .post('/api/issues/test-123/priority')
        .send({ priority: 2 });

      expect(emitRefreshSpy).toHaveBeenCalled();
    });
  });
});
