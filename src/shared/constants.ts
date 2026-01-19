/**
 * Shared constants used across the application
 * Centralized location for configuration values and magic numbers
 */

// Auto-hide options for Kanban columns (in hours)
export const AUTO_HIDE_OPTIONS = [4, 8, 24, 72] as const;

// Default aging thresholds
export const DEFAULT_AGE_THRESHOLDS = {
  critical: 8 * 60 * 60 * 1000,  // 8 hours in milliseconds
  warning: 4 * 60 * 60 * 1000,   // 4 hours in milliseconds
} as const;

// Chart configuration
export const CHART_MARGINS = {
  top: 20,
  right: 30,
  left: 20,
  bottom: 5,
} as const;

// Cumulative Flow Diagram limit for sub-daily granularity
export const CFD_SUB_DAILY_LIMIT_DAYS = 30;

// Maximum number of items to show in aging alert preview dropdown
export const AGING_ALERT_PREVIEW_LIMIT = 10;

// Buffer size for CLI command execution (10MB)
export const CLI_BUFFER_SIZE = 10 * 1024 * 1024;
