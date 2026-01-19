import type {
  Issue,
  Metrics,
  LeadTimeDataPoint,
  AgingWipDataPoint,
  FlowChartDataPoint,
  AgeChartDataPoint,
  TimeGranularity,
  GranularityConfig,
} from '@shared/types';
import { CFD_SUB_DAILY_LIMIT_DAYS } from '@shared/constants';
import { GRANULARITY_OPTIONS } from '@shared/types';
import { calculatePercentile as calcPercentile } from './commonUtils';

/**
 * Get granularity configuration
 */
export function getGranularityConfig(granularity: TimeGranularity): GranularityConfig {
  return GRANULARITY_OPTIONS.find(opt => opt.value === granularity)!;
}

/**
 * Bucket timestamp to nearest time boundary
 */
export function bucketTimestamp(timestamp: number, hoursPerBucket: number): number {
  const date = new Date(timestamp);
  const hours = date.getUTCHours();
  const bucketedHour = Math.floor(hours / hoursPerBucket) * hoursPerBucket;
  date.setUTCHours(bucketedHour, 0, 0, 0);
  return date.getTime();
}

/**
 * Format bucket key for display
 */
export function formatBucketKey(timestamp: number, granularity: TimeGranularity): string {
  const date = new Date(timestamp);
  const dateStr = date.toISOString().split('T')[0];

  if (granularity === 'daily') {
    return dateStr;
  }

  const hour = date.getUTCHours().toString().padStart(2, '0');
  return `${dateStr} ${hour}:00`;
}

/**
 * Format time value for display
 */
export function formatTimeValue(hours: number, unit: 'hours' | 'days'): string {
  if (unit === 'hours') {
    return `${hours.toFixed(1)}h`;
  } else {
    const days = hours / 24;
    return `${days.toFixed(1)}d`;
  }
}

/**
 * Get age distribution buckets based on granularity
 */
export function getAgeBuckets(granularity: TimeGranularity): { ranges: string[]; limits: number[] } {
  const config = getGranularityConfig(granularity);

  if (config.displayUnit === 'hours') {
    return {
      ranges: ['0-4h', '4-8h', '8-12h', '12h+'],
      limits: [4, 8, 12, Infinity],
    };
  } else {
    return {
      ranges: ['0-7d', '8-14d', '15-30d', '30d+'],
      limits: [7 * 24, 14 * 24, 30 * 24, Infinity],
    };
  }
}

/**
 * Determine color based on age thresholds
 */
export function getAgeColor(ageHours: number, granularity: TimeGranularity): string {
  const config = getGranularityConfig(granularity);

  if (config.displayUnit === 'hours') {
    return ageHours <= 4 ? '#10b981' : ageHours <= 12 ? '#f59e0b' : '#ef4444';
  } else {
    return ageHours <= 7 * 24 ? '#10b981' : ageHours <= 30 * 24 ? '#f59e0b' : '#ef4444';
  }
}

/**
 * Calculate lead time data for closed issues
 * Returns an array of data points with cycle times for the scatterplot
 */
export function calculateLeadTime(
  issues: Issue[],
  granularity: TimeGranularity = 'daily'
): LeadTimeDataPoint[] {
  const config = getGranularityConfig(granularity);
  const closedIssues = issues.filter(
    (i) => i.status === 'closed' && i.updated_at
  );

  const leadTimeData = closedIssues
    .map((i) => {
      const created = new Date(i.created_at);
      const closed = new Date(i.updated_at!);

      const cycleTimeHours = Math.max(
        0,
        (closed.getTime() - created.getTime()) / (1000 * 60 * 60)
      );

      const bucketedTimestamp = bucketTimestamp(closed.getTime(), config.hoursPerBucket);
      const bucketKey = formatBucketKey(bucketedTimestamp, granularity);

      return {
        id: i.id,
        closedDate: bucketedTimestamp,
        closedDateStr: bucketKey,
        cycleTimeHours,
        cycleTimeDays: cycleTimeHours / 24,
        title: i.title || i.id,
      };
    })
    .sort((a, b) => a.closedDate - b.closedDate);

  return leadTimeData;
}

/**
 * Calculate percentiles from an array of numbers
 * Re-exported from commonUtils for backward compatibility
 */
export function calculatePercentile(values: number[], percentile: number): number {
  return calcPercentile(values, percentile);
}

/**
 * Calculate aging WIP (work in progress) data
 * Returns data points for the aging WIP scatterplot with color coding
 */
export function calculateAgingWIP(
  issues: Issue[],
  today: Date = new Date(),
  granularity: TimeGranularity = 'daily'
): AgingWipDataPoint[] {
  const openIssues = issues.filter((i) => i.status !== 'closed');

  return openIssues.map((i) => {
    const ageHours = (today.getTime() - new Date(i.created_at).getTime()) / (1000 * 60 * 60);

    return {
      id: i.id,
      status: i.status,
      ageHours,
      ageDays: ageHours / 24,
      title: i.title || i.id,
      color: getAgeColor(ageHours, granularity),
    };
  });
}

/**
 * Calculate age distribution buckets for open issues
 */
export function calculateAgeDistribution(
  issues: Issue[],
  today: Date = new Date(),
  granularity: TimeGranularity = 'daily'
): AgeChartDataPoint[] {
  const openIssues = issues.filter((i) => i.status !== 'closed');
  const { ranges, limits } = getAgeBuckets(granularity);

  const bucketCounts = ranges.map(() => 0);

  openIssues.forEach((i) => {
    const ageHours = (today.getTime() - new Date(i.created_at).getTime()) / (1000 * 60 * 60);

    for (let idx = 0; idx < limits.length; idx++) {
      if (ageHours <= limits[idx] || idx === limits.length - 1) {
        bucketCounts[idx]++;
        break;
      }
    }
  });

  return ranges.map((range, idx) => ({
    range,
    count: bucketCounts[idx],
    bucketIndex: idx,
  }));
}

/**
 * Calculate cumulative flow diagram data
 * Returns an array of data points with running totals of created and closed issues
 * Fills in all buckets from the earliest issue to today
 */
export function calculateCumulativeFlow(
  issues: Issue[],
  today: Date = new Date(),
  granularity: TimeGranularity = 'daily'
): FlowChartDataPoint[] {
  if (issues.length === 0) return [];

  const config = getGranularityConfig(granularity);

  // For hourly/4-hourly, limit to last N days
  const isSubDaily = config.hoursPerBucket < 24;
  const limitTimestamp = isSubDaily
    ? today.getTime() - (CFD_SUB_DAILY_LIMIT_DAYS * 24 * 60 * 60 * 1000)
    : 0;

  const activityByBucket: Record<string, { created: number; closed: number }> = {};
  let earliestTimestamp = today.getTime();

  issues.forEach((i) => {
    const createdTimestamp = new Date(i.created_at).getTime();
    const createdBucket = bucketTimestamp(createdTimestamp, config.hoursPerBucket);
    const createdKey = formatBucketKey(createdBucket, granularity);

    if (createdTimestamp < earliestTimestamp) {
      earliestTimestamp = createdTimestamp;
    }

    if (!activityByBucket[createdKey]) {
      activityByBucket[createdKey] = { created: 0, closed: 0 };
    }
    activityByBucket[createdKey].created++;

    if (i.status === 'closed' && i.updated_at) {
      const closedTimestamp = new Date(i.updated_at).getTime();
      const closedBucket = bucketTimestamp(closedTimestamp, config.hoursPerBucket);
      const closedKey = formatBucketKey(closedBucket, granularity);

      if (!activityByBucket[closedKey]) {
        activityByBucket[closedKey] = { created: 0, closed: 0 };
      }
      activityByBucket[closedKey].closed++;
    }
  });

  const flowChartData: FlowChartDataPoint[] = [];
  let runCreated = 0;
  let runClosed = 0;

  let iterTimestamp = bucketTimestamp(earliestTimestamp, config.hoursPerBucket);
  if (limitTimestamp > 0) {
    iterTimestamp = Math.max(iterTimestamp, limitTimestamp);
  }

  const todayBucket = bucketTimestamp(today.getTime(), config.hoursPerBucket);

  while (iterTimestamp <= todayBucket) {
    const bucketKey = formatBucketKey(iterTimestamp, granularity);
    const bucketActivity = activityByBucket[bucketKey] || { created: 0, closed: 0 };

    runCreated += bucketActivity.created;
    runClosed += bucketActivity.closed;

    flowChartData.push({
      date: bucketKey,
      timestamp: iterTimestamp,
      open: runCreated - runClosed,
      closed: runClosed,
      throughput: bucketActivity.closed,
    });

    iterTimestamp += config.hoursPerBucket * 60 * 60 * 1000;
  }

  return flowChartData;
}

/**
 * Calculate average age of open issues
 */
export function calculateAverageAge(
  issues: Issue[],
  today: Date = new Date(),
  granularity: TimeGranularity = 'daily'
): { value: number; formatted: string; unit: 'hours' | 'days' } {
  const openIssues = issues.filter((i) => i.status !== 'closed');
  const config = getGranularityConfig(granularity);

  if (openIssues.length === 0) {
    return {
      value: 0,
      formatted: '0' + (config.displayUnit === 'hours' ? 'h' : 'd'),
      unit: config.displayUnit
    };
  }

  const totalHours = openIssues.reduce((sum, i) => {
    const ageHours = (today.getTime() - new Date(i.created_at).getTime()) / (1000 * 60 * 60);
    return sum + ageHours;
  }, 0);

  const avgHours = totalHours / openIssues.length;
  const formatted = formatTimeValue(avgHours, config.displayUnit);

  return { value: avgHours, formatted, unit: config.displayUnit };
}

/**
 * Main function to calculate all metrics
 * Returns a complete Metrics object for the dashboard
 */
export function calculateMetrics(
  issues: Issue[],
  today: Date = new Date(),
  granularity: TimeGranularity = 'daily'
): Metrics | null {
  if (issues.length === 0) return null;

  // Filter out tombstones (deleted issues)
  const activeIssues = issues.filter((i) => i.status !== 'tombstone');

  if (activeIssues.length === 0) return null;

  const config = getGranularityConfig(granularity);
  const openIssues = activeIssues.filter((i) => i.status !== 'closed');

  const leadTimeData = calculateLeadTime(activeIssues, granularity);
  const agingWipData = calculateAgingWIP(activeIssues, today, granularity);
  const flowChartData = calculateCumulativeFlow(activeIssues, today, granularity);
  const ageChartData = calculateAgeDistribution(activeIssues, today, granularity);
  const avgAgeData = calculateAverageAge(activeIssues, today, granularity);

  // Calculate percentiles from lead time data (always in hours)
  const cycleTimesHours = leadTimeData.map((d) => d.cycleTimeHours);
  const cycleTimeP50 = calculatePercentile(cycleTimesHours, 0.5);
  const cycleTimeP85 = calculatePercentile(cycleTimesHours, 0.85);

  return {
    avgAge: avgAgeData.formatted,
    avgAgeRaw: avgAgeData.value,
    displayUnit: config.displayUnit,
    openCount: openIssues.length,
    cycleTimeP50,
    cycleTimeP85,
    leadTimeData,
    agingWipData,
    flowChartData,
    ageChartData,
    granularity,
  };
}
