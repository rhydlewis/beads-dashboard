import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { Issue } from '../../shared/types.js';
import { CLI_BUFFER_SIZE } from '../../shared/constants.js';

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
    // Use bd CLI to read directly from the SQLite database
    // This ensures we get the latest data, not stale JSONL file
    const { stdout, stderr } = await execAsync('bd list --json --status=all', {
      cwd: projectRoot,
      maxBuffer: CLI_BUFFER_SIZE
    });

    if (stderr) {
      console.warn('bd list stderr:', stderr);
    }

    if (!stdout.trim()) {
      return [];
    }

    // Parse the JSON output
    const issues = JSON.parse(stdout) as Issue[];
    return issues;
  } catch (error) {
    console.error('Error reading beads data from database:', error);
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
