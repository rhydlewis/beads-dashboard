import type { Issue, TimeGranularity } from '@shared/types';

// Threshold configuration interface
export interface AgingThresholdConfig {
  warningThreshold: number;
  warningUnit: 'hours' | 'days';
  criticalThreshold: number;
  criticalUnit: 'hours' | 'days';
  useAutoCalculation: boolean;
  autoCalcPercentileWarning: number; // e.g., 0.85 for P85
  autoCalcPercentileCritical: number; // e.g., 0.95 for P95
}

// Default thresholds for agent workflows (4h warning, 8h critical)
export const DEFAULT_THRESHOLDS: AgingThresholdConfig = {
  warningThreshold: 4,
  warningUnit: 'hours',
  criticalThreshold: 8,
  criticalUnit: 'hours',
  useAutoCalculation: false,
  autoCalcPercentileWarning: 0.85,
  autoCalcPercentileCritical: 0.95,
};

// Storage key for localStorage
export const THRESHOLD_STORAGE_KEY = 'beads-aging-thresholds';

/**
 * Load threshold configuration from localStorage
 */
export function loadThresholdConfig(): AgingThresholdConfig {
  try {
    const saved = localStorage.getItem(THRESHOLD_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Validate and merge with defaults
      return { ...DEFAULT_THRESHOLDS, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load threshold config:', error);
  }
  return { ...DEFAULT_THRESHOLDS };
}

/**
 * Save threshold configuration to localStorage
 */
export function saveThresholdConfig(config: AgingThresholdConfig): void {
  try {
    localStorage.setItem(THRESHOLD_STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save threshold config:', error);
  }
}

/**
 * Convert threshold value to hours for comparison
 */
export function thresholdToHours(threshold: number, unit: 'hours' | 'days'): number {
  return unit === 'hours' ? threshold : threshold * 24;
}

/**
 * Convert hours to appropriate display format
 */
export function formatAgeDisplay(hours: number): string {
  if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m > 0) {
      return `${h}h ${m}m`;
    }
    return `${h}h`;
  } else {
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours - (days * 24));
    if (remainingHours > 0) {
      return `${days}d ${remainingHours}h`;
    }
    return `${days}d`;
  }
}

/**
 * Classify an issue based on its age and configured thresholds
 */
export function classifyIssueAge(
  issue: Issue,
  config: AgingThresholdConfig,
  today: Date = new Date()
): 'normal' | 'warning' | 'critical' {
  // Only classify open issues
  if (issue.status === 'closed' || issue.status === 'tombstone') {
    return 'normal';
  }

  const createdDate = new Date(issue.created_at);
  const ageHours = (today.getTime() - createdDate.getTime()) / (1000 * 60 * 60);

  const warningHours = thresholdToHours(config.warningThreshold, config.warningUnit);
  const criticalHours = thresholdToHours(config.criticalThreshold, config.criticalUnit);

  if (ageHours >= criticalHours) {
    return 'critical';
  } else if (ageHours >= warningHours) {
    return 'warning';
  }
  return 'normal';
}

/**
 * Get age in hours for an issue
 */
export function getIssueAgeHours(issue: Issue, today: Date = new Date()): number {
  const createdDate = new Date(issue.created_at);
  return (today.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
}

/**
 * Calculate thresholds from historical data percentiles
 */
export function calculateThresholdsFromPercentiles(
  issues: Issue[],
  warningPercentile: number,
  criticalPercentile: number,
  today: Date = new Date()
): { warningHours: number; criticalHours: number } {
  const openIssues = issues.filter((i) => i.status !== 'closed' && i.status !== 'tombstone');
  
  if (openIssues.length === 0) {
    return { warningHours: 4, criticalHours: 8 }; // Default fallback
  }

  const agesHours = openIssues.map((issue) => getIssueAgeHours(issue, today));
  
  // Sort ages for percentile calculation
  const sortedAges = [...agesHours].sort((a, b) => a - b);
  
  const warningIndex = Math.floor(sortedAges.length * warningPercentile);
  const criticalIndex = Math.floor(sortedAges.length * criticalPercentile);
  
  return {
    warningHours: sortedAges[warningIndex],
    criticalHours: sortedAges[criticalIndex],
  };
}

/**
 * Count issues by aging status
 */
export function countIssuesByAgingStatus(
  issues: Issue[],
  config: AgingThresholdConfig,
  today: Date = new Date()
): { warningCount: number; criticalCount: number } {
  let warningCount = 0;
  let criticalCount = 0;

  issues.forEach((issue) => {
    const classification = classifyIssueAge(issue, config, today);
    if (classification === 'critical') {
      criticalCount++;
    } else if (classification === 'warning') {
      warningCount++;
    }
  });

  return { warningCount, criticalCount };
}

/**
 * Get all aging issues (warning or critical) sorted by age
 */
export function getAgingIssues(
  issues: Issue[],
  config: AgingThresholdConfig,
  today: Date = new Date()
): Array<{
  issue: Issue;
  ageHours: number;
  ageDisplay: string;
  status: 'warning' | 'critical';
}> {
  const agingIssues: Array<{
    issue: Issue;
    ageHours: number;
    ageDisplay: string;
    status: 'warning' | 'critical';
  }> = [];

  issues.forEach((issue) => {
    const classification = classifyIssueAge(issue, config, today);
    if (classification === 'warning' || classification === 'critical') {
      const ageHours = getIssueAgeHours(issue, today);
      agingIssues.push({
        issue,
        ageHours,
        ageDisplay: formatAgeDisplay(ageHours),
        status: classification,
      });
    }
  });

  // Sort by age descending (oldest first)
  return agingIssues.sort((a, b) => b.ageHours - a.ageHours);
}

/**
 * Get CSS class for aging status styling
 */
export function getAgingStatusClass(status: 'normal' | 'warning' | 'critical'): string {
  switch (status) {
    case 'warning':
      return 'bg-yellow-50 border-l-4 border-yellow-400';
    case 'critical':
      return 'bg-red-50 border-l-4 border-red-400';
    default:
      return '';
  }
}

/**
 * Get text color class for aging status
 */
export function getAgingTextClass(status: 'normal' | 'warning' | 'critical'): string {
  switch (status) {
    case 'warning':
      return 'text-yellow-700';
    case 'critical':
      return 'text-red-700';
    default:
      return 'text-slate-700';
  }
}