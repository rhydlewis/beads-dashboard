import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { Issue } from '../../shared/types.js';
import { CLI_BUFFER_SIZE } from '../../shared/constants.js';
import { logger } from './logger.js';

const execAsync = promisify(exec);

/**
 * Read and parse issues from the beads SQLite database using bd CLI
 * This ensures we always read the latest data, even if JSONL sync is pending
 * @param projectRoot - Root directory containing .beads folder
 * @returns Promise<Issue[]> - Array of parsed issues
 */
export async function readBeadsData(projectRoot: string): Promise<Issue[]> {
  const beadsDir = path.join(projectRoot, '.beads');

  if (!fs.existsSync(beadsDir)) {
    return [];
  }

  try {
    // Use bd export to get complete issue data including dependencies
    // bd list --json doesn't include dependencies or parent_id fields
    // bd export returns all issues by default (no status filter needed)
    const { stdout, stderr } = await execAsync('bd export', {
      cwd: projectRoot,
      maxBuffer: CLI_BUFFER_SIZE
    });

    if (stderr) {
      logger.warn({ stderr }, 'bd export stderr output');
    }

    if (!stdout.trim()) {
      return [];
    }

    // Parse JSONL output (one JSON object per line)
    const lines = stdout.trim().split('\n').filter(line => line.trim());
    const rawIssues = lines.map(line => JSON.parse(line));

    // Transform dependencies from bd export format to our format
    const issues: Issue[] = rawIssues.map(issue => {
      // Transform dependencies array from {issue_id, depends_on_id, type} to just string[]
      const dependencies = issue.dependencies
        ? issue.dependencies.map((dep: any) => dep.depends_on_id)
        : undefined;

      // Extract parent_id from dependencies if there's an epic
      // An issue's parent epic is a dependency where the depended-on issue is type 'epic'
      const parentEpicDep = issue.dependencies?.find((dep: any) => {
        const dependedOnIssue = rawIssues.find((i: any) => i.id === dep.depends_on_id);
        return dependedOnIssue?.issue_type === 'epic';
      });
      const parent_id = parentEpicDep?.depends_on_id;

      return {
        ...issue,
        dependencies,
        parent_id
      };
    });

    return issues;
  } catch (error) {
    logger.error({ err: error }, 'Error reading beads data from database');
    // Fall back to empty array if bd command fails
    return [];
  }
}

/**
 * Check if .beads directory exists
 * @param projectRoot - Root directory to check
 * @returns boolean
 */
export function beadsDirectoryExists(projectRoot: string): boolean {
  const beadsDir = path.join(projectRoot, '.beads');
  return fs.existsSync(beadsDir);
}
