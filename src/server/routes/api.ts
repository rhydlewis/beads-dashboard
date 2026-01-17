import express, { Request, Response } from 'express';
import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ZodError } from 'zod';
import { readBeadsData } from '../utils/beadsReader.js';
import type {
  UpdateIssueDescriptionRequest,
  UpdateIssueStatusRequest,
  UpdateIssuePriorityRequest,
  UpdateIssueDesignRequest,
  UpdateIssueAcceptanceRequest
} from '@shared/types';
import {
  UpdateIssueDescriptionSchema,
  UpdateIssueStatusSchema,
  UpdateIssuePrioritySchema,
  UpdateIssueDesignSchema,
  UpdateIssueAcceptanceSchema,
} from '@shared/types';

export function createApiRouter(projectRoot: string, emitRefresh: () => void) {
  const router = express.Router();

  /**
   * GET /api/data
   * Returns all issues from the Beads SQLite database via `bd list --json` command
   */
  router.get('/data', async (_req: Request, res: Response) => {
    try {
      const data = await readBeadsData(projectRoot);
      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to read data' });
    }
  });

  /**
   * POST /api/issues/:id
   * Updates issue description via bd update command
   */
  router.post('/issues/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    // Validate input
    try {
      UpdateIssueDescriptionSchema.parse(req.body);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const { description } = req.body as UpdateIssueDescriptionRequest;

    // Write description to temp file in OS temp directory to avoid escaping issues
    // Use timestamp and process ID for uniqueness
    const tempFile = path.join(os.tmpdir(), `beads-desc-${Date.now()}-${process.pid}.txt`);

    try {
      fs.writeFileSync(tempFile, description, { mode: 0o600 }); // Secure file permissions

      await new Promise<void>((resolve, reject) => {
        exec(`bd update ${id} --body-file "${tempFile}"`, { cwd: projectRoot }, (error, _stdout, stderr) => {
          // Always cleanup temp file
          try {
            fs.unlinkSync(tempFile);
          } catch (cleanupError) {
            console.error('Failed to cleanup temp file:', cleanupError);
          }

          if (error) {
            console.error(`exec error: ${error}`);
            return reject(new Error(stderr || error.message));
          }

          resolve();
        });
      });

      res.json({ success: true });

      // Emit refresh so clients reload from database
      emitRefresh();
    } catch (error) {
      // Clean up temp file if it still exists
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      } catch (cleanupError) {
        console.error('Failed to cleanup temp file on error:', cleanupError);
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * POST /api/issues/:id/status
   * Updates issue status via bd update command
   */
  router.post('/issues/:id/status', async (req: Request, res: Response) => {
    const { id } = req.params;

    console.log(`[API] Updating issue ${id} to status: ${req.body.status}`);

    // Validate input
    try {
      UpdateIssueStatusSchema.parse(req.body);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const { status } = req.body as UpdateIssueStatusRequest;

    try {
      await new Promise<void>((resolve, reject) => {
        exec(`bd update ${id} --status=${status}`, { cwd: projectRoot }, (error, stdout, stderr) => {
          if (error) {
            console.error(`[API] bd update error: ${error}`);
            console.error(`[API] stderr: ${stderr}`);
            return reject(new Error(stderr || error.message));
          }
          console.log(`[API] bd update stdout: ${stdout}`);
          console.log(`[API] bd update stderr: ${stderr}`);
          resolve();
        });
      });

      console.log(`[API] Sending success response`);
      res.json({ success: true });

      // Emit refresh so clients reload from database
      // Note: We no longer need bd sync --flush-only because we read directly from the database
      emitRefresh();
      // and emit refresh automatically
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[API] Error updating status: ${errorMessage}`);
      res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * POST /api/issues/:id/close
   * Closes issue via bd close command
   */
  router.post('/issues/:id/close', async (req: Request, res: Response) => {
    const { id } = req.params;

    console.log(`[API] Closing issue ${id}`);

    try {
      await new Promise<void>((resolve, reject) => {
        exec(`bd close ${id}`, { cwd: projectRoot }, (error, stdout, stderr) => {
          if (error) {
            console.error(`[API] bd close error: ${error}`);
            console.error(`[API] stderr: ${stderr}`);
            return reject(new Error(stderr || error.message));
          }
          console.log(`[API] bd close stdout: ${stdout}`);
          resolve();
        });
      });

      console.log(`[API] Sending success response`);
      res.json({ success: true });

      // Emit refresh so clients reload from database
      emitRefresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[API] Error closing issue: ${errorMessage}`);
      res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * POST /api/issues/:id/priority
   * Updates issue priority via bd update command
   */
  router.post('/issues/:id/priority', async (req: Request, res: Response) => {
    const { id } = req.params;

    // Validate input
    try {
      UpdateIssuePrioritySchema.parse(req.body);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const { priority } = req.body as UpdateIssuePriorityRequest;

    try {
      await new Promise<void>((resolve, reject) => {
        exec(`bd update ${id} --priority=${priority}`, { cwd: projectRoot }, (error, _stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`);
            return reject(new Error(stderr || error.message));
          }
          resolve();
        });
      });

      res.json({ success: true });

      // Emit refresh so clients reload from database
      emitRefresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * POST /api/issues/:id/design
   * Updates issue design via bd update command
   */
  router.post('/issues/:id/design', async (req: Request, res: Response) => {
    const { id } = req.params;
    const issueId = String(id);

    // Validate input
    try {
      UpdateIssueDesignSchema.parse(req.body);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const { design } = req.body as UpdateIssueDesignRequest;

    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn('bd', ['update', issueId, '--design', design], { cwd: projectRoot });
        
        let stderr = '';
        if (child.stderr) {
          child.stderr.on('data', (data: any) => {
            stderr += data.toString();
          });
        }

        child.on('close', (code: number | null) => {
          if (code !== 0) {
            reject(new Error(stderr || `Process exited with code ${code}`));
          } else {
            resolve();
          }
        });
        
        child.on('error', (err: Error) => {
            reject(err);
        });
      });

      // Flush changes from SQLite to disk
      await new Promise<void>((resolve, _reject) => {
        exec('bd sync --flush-only', { cwd: projectRoot }, (syncError, _syncStdout, _syncStderr) => {
          if (syncError) {
            console.error(`sync error: ${syncError}`);
            // Don't fail the request if sync fails
          }
          resolve();
        });
      });

      res.json({ success: true });
      // Don't manually emit refresh - the file watcher will detect the beads.db change
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * POST /api/issues/:id/acceptance
   * Updates issue acceptance criteria via bd update command
   */
  router.post('/issues/:id/acceptance', async (req: Request, res: Response) => {
    const { id } = req.params;
    const issueId = String(id);

    // Validate input
    try {
      UpdateIssueAcceptanceSchema.parse(req.body);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const { acceptance_criteria } = req.body as UpdateIssueAcceptanceRequest;

    try {
      await new Promise<void>((resolve, reject) => {
        const child = spawn('bd', ['update', issueId, '--acceptance', acceptance_criteria], { cwd: projectRoot });
        
        let stderr = '';
        if (child.stderr) {
          child.stderr.on('data', (data: any) => {
            stderr += data.toString();
          });
        }

        child.on('close', (code: number | null) => {
          if (code !== 0) {
            reject(new Error(stderr || `Process exited with code ${code}`));
          } else {
            resolve();
          }
        });

        child.on('error', (err: Error) => {
            reject(err);
        });
      });

      // Flush changes from SQLite to disk
      await new Promise<void>((resolve, _reject) => {
        exec('bd sync --flush-only', { cwd: projectRoot }, (syncError, _syncStdout, _syncStderr) => {
          if (syncError) {
            console.error(`sync error: ${syncError}`);
            // Don't fail the request if sync fails
          }
          resolve();
        });
      });

      res.json({ success: true });
      // Don't manually emit refresh - the file watcher will detect the beads.db change
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  });

  return router;
}
