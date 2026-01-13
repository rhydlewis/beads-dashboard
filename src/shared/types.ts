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
  status: IssueStatus;
  issue_type: IssueType;
  priority: Priority;
  created_at: string; // ISO 8601 timestamp
  updated_at?: string; // ISO 8601 timestamp
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

export interface UpdateIssueStatusRequest {
  status: IssueStatus;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Priority display labels
export const PRIORITY_LABELS: Record<Priority, string> = {
  0: 'Critical',
  1: 'High',
  2: 'Medium',
  3: 'Low',
  4: 'Lowest',
};
