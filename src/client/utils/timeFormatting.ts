/**
 * Time formatting utilities for displaying timestamps with configurable granularity
 */

export type TimeDisplayMode = 'hour' | 'day';

const HOUR_MS = 1000 * 60 * 60;
const DAY_MS = HOUR_MS * 24;
const WEEK_MS = DAY_MS * 7;

/**
 * Format a timestamp based on time granularity setting
 *
 * When granularity is 'day' (default):
 * - Returns date string like "Jan 25, 2026" for all timestamps
 *
 * When granularity is 'hour':
 * - <24h: "2h ago", "45m ago"
 * - 1-7 days: "2d 5h ago", "6d 12h ago"
 * - ≥7 days: "Jan 15" or similar date format
 *
 * @param timestamp - ISO 8601 timestamp string or Date object
 * @param displayMode - 'hour' or 'day' (default: 'day')
 * @param now - Current time (for testing, defaults to Date.now())
 * @returns Formatted time string
 */
export function formatTimestamp(
  timestamp: string | Date | undefined,
  displayMode: TimeDisplayMode = 'day',
  now: number = Date.now()
): string {
  if (!timestamp) return '—';

  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const ms = date.getTime();

  // Day display mode: just show the date
  if (displayMode === 'day') {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date(now).getFullYear() ? 'numeric' : undefined
    });
  }

  // Hour granularity: hybrid format
  const diff = now - ms;

  // Future dates (shouldn't happen, but handle gracefully)
  if (diff < 0) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  // <24 hours: show hours or minutes
  if (diff < DAY_MS) {
    const hours = Math.floor(diff / HOUR_MS);
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60));
      return minutes <= 1 ? 'just now' : `${minutes}m ago`;
    }
    return `${hours}h ago`;
  }

  // 1-7 days: show days + hours
  if (diff < WEEK_MS) {
    const days = Math.floor(diff / DAY_MS);
    const hours = Math.floor((diff % DAY_MS) / HOUR_MS);
    return `${days}d ${hours}h ago`;
  }

  // ≥7 days: show date only
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== new Date(now).getFullYear() ? 'numeric' : undefined
  });
}

/**
 * Format age (time since creation) with adaptive precision
 *
 * When granularity is 'day':
 * - Returns "Xd" format for all ages
 *
 * When granularity is 'hour':
 * - <7 days: "Xd Yh" format (e.g., "2d 5h")
 * - ≥7 days: "Xd" format only (no hour noise on old issues)
 *
 * @param timestamp - ISO 8601 timestamp string or Date object
 * @param displayMode - 'hour' or 'day' (default: 'day')
 * @param now - Current time (for testing, defaults to Date.now())
 * @returns Formatted age string
 */
export function formatAge(
  timestamp: string | Date | undefined,
  displayMode: TimeDisplayMode = 'day',
  now: number = Date.now()
): string {
  if (!timestamp) return '—';

  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const diff = now - date.getTime();

  // Handle future dates
  if (diff < 0) return '0d';

  const days = Math.floor(diff / DAY_MS);

  // Day display mode: just show days
  if (displayMode === 'day') {
    return `${days}d`;
  }

  // Hour display mode with adaptive precision
  // <7 days: show days + hours
  if (diff < WEEK_MS) {
    const hours = Math.floor((diff % DAY_MS) / HOUR_MS);
    return `${days}d ${hours}h`;
  }

  // ≥7 days: show days only (no hour noise)
  return `${days}d`;
}

/**
 * Format cycle time (time from created to closed) for closed issues
 *
 * @param createdAt - Creation timestamp
 * @param closedAt - Close timestamp
 * @param displayMode - 'hour' or 'day' (default: 'day')
 * @returns Formatted cycle time or '—' if not applicable
 */
export function formatCycleTime(
  createdAt: string | Date | undefined,
  closedAt: string | Date | undefined,
  displayMode: TimeDisplayMode = 'day'
): string {
  if (!createdAt || !closedAt) return '—';

  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const closed = typeof closedAt === 'string' ? new Date(closedAt) : closedAt;
  const diff = closed.getTime() - created.getTime();

  if (diff < 0) return '—';

  const days = Math.ceil(diff / DAY_MS);

  // Day display mode: just show days
  if (displayMode === 'day') {
    return `${days}d`;
  }

  // Hour display mode with adaptive precision
  // <7 days: show days + hours
  if (diff < WEEK_MS) {
    const wholeDays = Math.floor(diff / DAY_MS);
    const hours = Math.floor((diff % DAY_MS) / HOUR_MS);
    return `${wholeDays}d ${hours}h`;
  }

  // ≥7 days: show days only
  return `${days}d`;
}
