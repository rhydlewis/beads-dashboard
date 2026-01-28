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
  UpdateIssueAcceptanceRequest,
  CreateIssueRequest,
  CreateIssueResponse
} from '../../shared/types.js';
import {
  UpdateIssueDescriptionSchema,
  UpdateIssueStatusSchema,
  UpdateIssuePrioritySchema,
  UpdateIssueDesignSchema,
  UpdateIssueAcceptanceSchema,
  CreateIssueSchema,
} from '../../shared/types.js';

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
   * POST /api/issues
   * Creates a new issue via bd create command
   */
  router.post('/issues', async (req: Request, res: Response) => {
    console.log('[API] Creating new issue with body:', req.body);

    // Validate input
    try {
      CreateIssueSchema.parse(req.body);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: error.issues[0].message });
      }
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const { title, type, priority = 2, description } = req.body as CreateIssueRequest;

    // Build bd create command
    let command = `bd create --title="${title.replace(/"/g, '\\"')}" --type=${type} --priority=${priority}`;

    let tempFile: string | null = null;
    if (description) {
      // Use temp file for description to avoid shell escaping issues
      tempFile = path.join(os.tmpdir(), `beads-create-${Date.now()}-${process.pid}.txt`);
      try {
        fs.writeFileSync(tempFile, description, { mode: 0o600 });
        command += ` --body-file="${tempFile}"`;
      } catch (error) {
        console.error('[API] Failed to write temp file:', error);
        return res.status(500).json({ error: 'Failed to prepare issue description' });
      }
    }

    try {
      const output = await new Promise<string>((resolve, reject) => {
        exec(command, { cwd: projectRoot }, (error, stdout, stderr) => {
          // Always cleanup temp file
          if (tempFile) {
            try {
              fs.unlinkSync(tempFile);
            } catch (cleanupError) {
              console.error('[API] Failed to cleanup temp file:', cleanupError);
            }
          }

          if (error) {
            console.error(`[API] bd create error: ${error}`);
            console.error(`[API] stderr: ${stderr}`);
            return reject(new Error(stderr || error.message));
          }

          console.log(`[API] bd create stdout: ${stdout}`);
          resolve(stdout);
        });
      });

      // Parse the issue ID from the output
      // bd create output format: "✓ Created issue: <issue-id>"
      const match = output.match(/Created issue: ([\w-]+)/);
      const issueId = match ? match[1] : undefined;

      console.log(`[API] Successfully created issue: ${issueId}`);

      // Fetch the created issue data
      let issue = undefined;
      if (issueId) {
        try {
          const allIssues = await readBeadsData(projectRoot);
          issue = allIssues.find(i => i.id === issueId);
        } catch (error) {
          console.error('[API] Failed to fetch created issue:', error);
        }
      }

      const response: CreateIssueResponse = {
        success: true,
        issueId,
        issue,
      };

      res.json(response);

      // Emit refresh so clients reload from database
      emitRefresh();
    } catch (error) {
      // Clean up temp file if it still exists
      if (tempFile) {
        try {
          if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
          }
        } catch (cleanupError) {
          console.error('[API] Failed to cleanup temp file on error:', cleanupError);
        }
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[API] Error creating issue: ${errorMessage}`);
      res.status(500).json({ error: errorMessage });
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
        return res.status(400).json({ error: error.issues[0].message });
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
        return res.status(400).json({ error: error.issues[0].message });
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
        return res.status(400).json({ error: error.issues[0].message });
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
        return res.status(400).json({ error: error.issues[0].message });
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

      res.json({ success: true });

      // Emit refresh so clients reload from database
      // Note: Daemon auto-sync handles flushing to disk, file watcher detects beads.db changes
      emitRefresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  });

  /**
   * GET /api/issues/:id/dependencies
   * Returns dependency data for a specific issue (both what it depends on and what depends on it)
   */
  router.get('/issues/:id/dependencies', async (req: Request, res: Response) => {
    const { id } = req.params;

    console.log(`[API] Fetching dependencies for issue ${id}`);

    try {
      // Fetch what this issue depends on (direction=down)
      const dependenciesOutput = await new Promise<string>((resolve, reject) => {
        exec(`bd dep list ${id} --direction=down --json`, { cwd: projectRoot }, (error, stdout, stderr) => {
          if (error) {
            console.error(`[API] bd dep list error: ${error}`);
            console.error(`[API] stderr: ${stderr}`);
            return reject(new Error(stderr || error.message));
          }
          resolve(stdout);
        });
      });

      // Fetch what depends on this issue (direction=up)
      const dependentsOutput = await new Promise<string>((resolve, reject) => {
        exec(`bd dep list ${id} --direction=up --json`, { cwd: projectRoot }, (error, stdout, stderr) => {
          if (error) {
            console.error(`[API] bd dep list error: ${error}`);
            console.error(`[API] stderr: ${stderr}`);
            return reject(new Error(stderr || error.message));
          }
          resolve(stdout);
        });
      });

      const dependencies = JSON.parse(dependenciesOutput || '[]');
      const dependents = JSON.parse(dependentsOutput || '[]');

      console.log(`[API] Found ${dependencies.length} dependencies and ${dependents.length} dependents`);

      res.json({
        dependencies,
        dependents,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[API] Error fetching dependencies: ${errorMessage}`);
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
        return res.status(400).json({ error: error.issues[0].message });
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

      res.json({ success: true });

      // Emit refresh so clients reload from database
      // Note: Daemon auto-sync handles flushing to disk, file watcher detects beads.db changes
      emitRefresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: errorMessage });
    }
  });

  return router;
}
