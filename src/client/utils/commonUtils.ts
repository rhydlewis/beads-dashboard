import type { Issue } from '@shared/types';

/**
 * Calculate age of an issue in hours
 * @param issue - The issue to calculate age for
 * @param now - Current date/time
 * @returns Age in hours
 */
export function calculateAge(issue: Issue, now: Date): number {
  const createdDate = new Date(issue.created_at);
  return (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
}

/**
 * Calculate age between two dates in days
 * @param date - The date to calculate age from
 * @param now - Current date/time
 * @returns Age in days
 */
export function calculateAgeDays(date: string | Date, now: Date): number {
  const createdDate = typeof date === 'string' ? new Date(date) : date;
  return Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate percentile from an array of numbers
 * @param values - Array of numeric values
 * @param percentile - Percentile to calculate (0-1)
 * @returns The percentile value
 */
export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * percentile);
  return sorted[index];
}

/**
 * Extract short ID from full issue ID (e.g., "beads-dashboard-abc123" -> "abc123")
 * @param fullId - Full issue ID
 * @returns Short ID (last segment after hyphen)
 */
export function extractShortId(fullId: string): string {
  return fullId.includes('-') ? fullId.split('-').pop()! : fullId;
}

/**
 * Extract project name from issue ID (e.g., "beads-dashboard-abc123" -> "beads-dashboard")
 * @param issueId - Full issue ID
 * @returns Project name (all segments before last hyphen)
 */
export function extractProjectName(issueId: string): string {
  const parts = issueId.split('-');
  if (parts.length <= 1) return issueId;
  return parts.slice(0, -1).join('-');
}
