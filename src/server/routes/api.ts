import express, { Request, Response } from 'express';
import { exec, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { readBeadsData } from '../utils/beadsReader.js';
import type { 
  UpdateIssueDescriptionRequest, 
  UpdateIssueStatusRequest, 
  UpdateIssuePriorityRequest,
  UpdateIssueDesignRequest,
  UpdateIssueAcceptanceRequest
} from '@shared/types';

export function createApiRouter(projectRoot: string, emitRefresh: () => void) {
  const router = express.Router();

  /**
   * GET /api/data
   * Returns all issues from .beads/issues.jsonl
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
    const { description } = req.body as UpdateIssueDescriptionRequest;

    if (!description && description !== '') {
      return res.status(400).json({ error: 'Description is required' });
    }

    // Write desc to temp file to avoid escaping issues
    const tempFile = path.join(process.cwd(), `desc-${Date.now()}.txt`);

    try {
      fs.writeFileSync(tempFile, description);

      await new Promise<void>((resolve, reject) => {
        exec(`bd update ${id} --body-file "${tempFile}"`, { cwd: projectRoot }, (error, _stdout, stderr) => {
          fs.unlinkSync(tempFile); // cleanup

          if (error) {
            console.error(`exec error: ${error}`);
            return reject(new Error(stderr || error.message));
          }

          resolve();
        });
      });

      // Flush changes to JSONL file
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

      // Manually trigger refresh after sync
      emitRefresh();
    } catch (error) {
      // Clean up temp file if it still exists
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
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
    const { status } = req.body as UpdateIssueStatusRequest;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    try {
      await new Promise<void>((resolve, reject) => {
        exec(`bd update ${id} --status=${status}`, { cwd: projectRoot }, (error, _stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`);
            return reject(new Error(stderr || error.message));
          }
          resolve();
        });
      });

      // Flush changes to JSONL file
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

      // Manually trigger refresh after sync
      emitRefresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * POST /api/issues/:id/priority
   * Updates issue priority via bd update command
   */
  router.post('/issues/:id/priority', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { priority } = req.body as UpdateIssuePriorityRequest;

    if (priority === undefined || priority === null) {
      return res.status(400).json({ error: 'Priority is required' });
    }

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

      // Flush changes to JSONL file
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

      // Manually trigger refresh after sync
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
    const { design } = req.body as UpdateIssueDesignRequest;

    if (design === undefined) {
      return res.status(400).json({ error: 'Design is required' });
    }

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

      // Flush changes to JSONL file
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
      emitRefresh();
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
    const { acceptance_criteria } = req.body as UpdateIssueAcceptanceRequest;

    if (acceptance_criteria === undefined) {
      return res.status(400).json({ error: 'Acceptance criteria is required' });
    }

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

      // Flush changes to JSONL file
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
      emitRefresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  });

  return router;
}
