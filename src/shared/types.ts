// Time granularity options for metrics display
export type TimeGranularity = 'hourly' | '4-hourly' | '8-hourly' | 'daily';

// Granularity configuration
export interface GranularityConfig {
  value: TimeGranularity;
  label: string;
  hoursPerBucket: number;
  displayUnit: 'hours' | 'days';
}

// Granularity options constant
export const GRANULARITY_OPTIONS: GranularityConfig[] = [
  { value: 'hourly', label: 'Hourly', hoursPerBucket: 1, displayUnit: 'hours' },
  { value: '4-hourly', label: '4-Hour', hoursPerBucket: 4, displayUnit: 'hours' },
  { value: '8-hourly', label: '8-Hour', hoursPerBucket: 8, displayUnit: 'days' },
  { value: 'daily', label: 'Daily', hoursPerBucket: 24, displayUnit: 'days' },
];

// Issue statuses as defined by Beads
export type IssueStatus =
  | 'open'
  | 'in_progress'
  | 'blocked'
  | 'closed'
  | 'tombstone'
  | 'deferred'
  | 'pinned'
  | 'hooked';

// Issue types
export type IssueType = 'task' | 'bug' | 'feature' | 'epic';

// Priority levels (0=Critical, 1=High, 2=Medium, 3=Low, 4=Lowest)
export type Priority = 0 | 1 | 2 | 3 | 4;

// Main Issue interface matching .beads/issues.jsonl structure
export interface Issue {
  id: string;
  title: string;
  description?: string;
  design?: string;
  acceptance_criteria?: string;
  status: IssueStatus;
  issue_type: IssueType;
  priority: Priority;
  created_at: string; // ISO 8601 timestamp
  updated_at?: string; // ISO 8601 timestamp
  closed_at?: string; // ISO 8601 timestamp for when issue was closed
  parent_id?: string; // ID of parent epic (for child issues)
  assignee?: string;
  labels?: string[];
  dependencies?: string[]; // IDs of issues this depends on
  blocked_by?: string[]; // IDs of issues blocking this one
}

// Data point for lead time scatterplot
export interface LeadTimeDataPoint {
  id: string;
  closedDate: number; // Unix timestamp for X axis (bucketed by granularity)
  closedDateStr: string; // Formatted date string
  cycleTimeHours: number; // Cycle time in hours
  cycleTimeDays: number; // Cycle time in days
  title: string;
}

// Data point for aging WIP scatterplot
export interface AgingWipDataPoint {
  id: string;
  status: string;
  ageHours: number; // Age in hours
  ageDays: number; // Age in days
  title: string;
  color: string; // Color based on age (green/orange/red)
}

// Data point for cumulative flow diagram
export interface FlowChartDataPoint {
  date: string; // Bucket identifier (YYYY-MM-DD or YYYY-MM-DD HH:00)
  timestamp: number; // Unix timestamp for sorting
  open: number; // Running total of open issues
  closed: number; // Running total of closed issues
  throughput: number; // Issues closed in this bucket
}

// Age distribution bucket
export interface AgeChartDataPoint {
  range: string; // e.g., "0-7d", "8-14d" or "0-4h", "4-8h"
  count: number;
  bucketIndex: number; // For consistent coloring
}

// Calculated metrics for dashboard
export interface Metrics {
  avgAge: string; // Average age of open issues (formatted with unit)
  avgAgeRaw: number; // Raw numeric value in hours
  displayUnit: 'hours' | 'days'; // Which unit is being displayed
  openCount: number; // Total open issues
  cycleTimeP50: number; // 50th percentile cycle time (in hours)
  cycleTimeP85: number; // 85th percentile cycle time (in hours)
  leadTimeData: LeadTimeDataPoint[];
  agingWipData: AgingWipDataPoint[];
  flowChartData: FlowChartDataPoint[];
  ageChartData: AgeChartDataPoint[];
  granularity: TimeGranularity; // Current granularity setting
}

// API request/response types
export interface UpdateIssueDescriptionRequest {
  description: string;
}

export interface UpdateIssueDesignRequest {
  design: string;
}

export interface UpdateIssueAcceptanceRequest {
  acceptance_criteria: string;
}

export interface UpdateIssueStatusRequest {
  status: IssueStatus;
}

export interface UpdateIssuePriorityRequest {
  priority: Priority;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Validation schemas
import { z } from 'zod';

// Maximum size for text inputs (100KB as suggested)
const MAX_TEXT_LENGTH = 100 * 1024;

export const UpdateIssueDescriptionSchema = z.object({
  description: z.string().max(MAX_TEXT_LENGTH, 'Description must be less than 100KB'),
});

export const UpdateIssueDesignSchema = z.object({
  design: z.string().max(MAX_TEXT_LENGTH, 'Design must be less than 100KB'),
});

export const UpdateIssueAcceptanceSchema = z.object({
  acceptance_criteria: z.string().max(MAX_TEXT_LENGTH, 'Acceptance criteria must be less than 100KB'),
});

export const UpdateIssueStatusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'blocked', 'closed', 'deferred', 'tombstone', 'pinned', 'hooked']),
});

export const UpdateIssuePrioritySchema = z.object({
  priority: z.number().int().min(0).max(4, 'Priority must be between 0 and 4'),
});

// Priority display labels
export const PRIORITY_LABELS: Record<Priority, string> = {
  0: 'Critical',
  1: 'High',
  2: 'Medium',
  3: 'Low',
  4: 'Lowest',
};
