import { describe, it, expect } from 'vitest';
import type { Issue } from '@shared/types';
import {
  calculateLeadTime,
  calculatePercentile,
  calculateAgingWIP,
  calculateAgeDistribution,
  calculateCumulativeFlow,
  calculateAverageAge,
  calculateMetrics,
  getGranularityConfig,
  bucketTimestamp,
  formatBucketKey,
  formatTimeValue,
  getAgeBuckets,
  getAgeColor,
} from '@/utils/metricsCalculations';

// Test fixtures
const createIssue = (overrides: Partial<Issue>): Issue => ({
  id: 'test-123',
  title: 'Test Issue',
  status: 'open',
  issue_type: 'task',
  priority: 2,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('Granularity Helper Functions', () => {
  describe('getGranularityConfig', () => {
    it('returns correct config for each granularity', () => {
      expect(getGranularityConfig('hourly').hoursPerBucket).toBe(1);
      expect(getGranularityConfig('hourly').displayUnit).toBe('hours');

      expect(getGranularityConfig('4-hourly').hoursPerBucket).toBe(4);
      expect(getGranularityConfig('4-hourly').displayUnit).toBe('hours');

      expect(getGranularityConfig('8-hourly').hoursPerBucket).toBe(8);
      expect(getGranularityConfig('8-hourly').displayUnit).toBe('days');

      expect(getGranularityConfig('daily').hoursPerBucket).toBe(24);
      expect(getGranularityConfig('daily').displayUnit).toBe('days');
    });
  });

  describe('bucketTimestamp', () => {
    it('buckets hourly correctly', () => {
      const ts = new Date('2024-01-01T13:45:30Z').getTime();
      const bucketed = new Date(bucketTimestamp(ts, 1));
      expect(bucketed.toISOString()).toBe('2024-01-01T13:00:00.000Z');
    });

    it('buckets 4-hourly correctly', () => {
      const ts = new Date('2024-01-01T13:45:30Z').getTime();
      const bucketed = new Date(bucketTimestamp(ts, 4));
      expect(bucketed.toISOString()).toBe('2024-01-01T12:00:00.000Z');
    });

    it('buckets 8-hourly correctly', () => {
      const ts = new Date('2024-01-01T13:45:30Z').getTime();
      const bucketed = new Date(bucketTimestamp(ts, 8));
      expect(bucketed.toISOString()).toBe('2024-01-01T08:00:00.000Z');
    });

    it('buckets daily correctly', () => {
      const ts = new Date('2024-01-01T13:45:30Z').getTime();
      const bucketed = new Date(bucketTimestamp(ts, 24));
      expect(bucketed.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    });

    it('handles midnight correctly', () => {
      const ts = new Date('2024-01-01T00:00:00Z').getTime();
      const bucketed = new Date(bucketTimestamp(ts, 4));
      expect(bucketed.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('formatBucketKey', () => {
    it('formats daily as YYYY-MM-DD', () => {
      const ts = new Date('2024-01-15T13:00:00Z').getTime();
      expect(formatBucketKey(ts, 'daily')).toBe('2024-01-15');
    });

    it('formats sub-daily with hour', () => {
      const ts = new Date('2024-01-15T13:00:00Z').getTime();
      expect(formatBucketKey(ts, 'hourly')).toBe('2024-01-15 13:00');
      expect(formatBucketKey(ts, '4-hourly')).toBe('2024-01-15 13:00');
      expect(formatBucketKey(ts, '8-hourly')).toBe('2024-01-15 13:00');
    });

    it('formats midnight hour correctly', () => {
      const ts = new Date('2024-01-15T00:00:00Z').getTime();
      expect(formatBucketKey(ts, 'hourly')).toBe('2024-01-15 00:00');
    });
  });

  describe('formatTimeValue', () => {
    it('formats hours with h suffix', () => {
      expect(formatTimeValue(12.5, 'hours')).toBe('12.5h');
      expect(formatTimeValue(1, 'hours')).toBe('1.0h');
      expect(formatTimeValue(0, 'hours')).toBe('0.0h');
    });

    it('formats days with d suffix', () => {
      expect(formatTimeValue(48, 'days')).toBe('2.0d');
      expect(formatTimeValue(24, 'days')).toBe('1.0d');
      expect(formatTimeValue(12, 'days')).toBe('0.5d');
    });

    it('rounds to 1 decimal place', () => {
      expect(formatTimeValue(12.456, 'hours')).toBe('12.5h');
      expect(formatTimeValue(12.444, 'hours')).toBe('12.4h');
    });
  });

  describe('getAgeBuckets', () => {
    it('returns hour buckets for hourly/4-hourly', () => {
      const { ranges, limits } = getAgeBuckets('hourly');
      expect(ranges).toEqual(['0-4h', '4-8h', '8-12h', '12h+']);
      expect(limits).toEqual([4, 8, 12, Infinity]);

      const result2 = getAgeBuckets('4-hourly');
      expect(result2.ranges).toEqual(['0-4h', '4-8h', '8-12h', '12h+']);
    });

    it('returns day buckets for 8-hourly/daily', () => {
      const { ranges, limits } = getAgeBuckets('daily');
      expect(ranges).toEqual(['0-7d', '8-14d', '15-30d', '30d+']);
      expect(limits).toEqual([7 * 24, 14 * 24, 30 * 24, Infinity]);

      const result2 = getAgeBuckets('8-hourly');
      expect(result2.ranges).toEqual(['0-7d', '8-14d', '15-30d', '30d+']);
    });
  });

  describe('getAgeColor', () => {
    it('applies hour-based thresholds for hourly views', () => {
      expect(getAgeColor(2, 'hourly')).toBe('#10b981'); // green <=4h
      expect(getAgeColor(4, 'hourly')).toBe('#10b981'); // green <=4h
      expect(getAgeColor(6, 'hourly')).toBe('#f59e0b'); // orange <=12h
      expect(getAgeColor(12, 'hourly')).toBe('#f59e0b'); // orange <=12h
      expect(getAgeColor(15, 'hourly')).toBe('#ef4444'); // red >12h
    });

    it('applies day-based thresholds for daily views', () => {
      expect(getAgeColor(5 * 24, 'daily')).toBe('#10b981'); // green <=7d
      expect(getAgeColor(7 * 24, 'daily')).toBe('#10b981'); // green <=7d
      expect(getAgeColor(20 * 24, 'daily')).toBe('#f59e0b'); // orange <=30d
      expect(getAgeColor(30 * 24, 'daily')).toBe('#f59e0b'); // orange <=30d
      expect(getAgeColor(40 * 24, 'daily')).toBe('#ef4444'); // red >30d
    });

    it('applies thresholds correctly for 4-hourly and 8-hourly', () => {
      expect(getAgeColor(3, '4-hourly')).toBe('#10b981'); // hours mode
      expect(getAgeColor(10 * 24, '8-hourly')).toBe('#f59e0b'); // days mode
    });
  });
});

describe('calculateLeadTime', () => {
  it('returns empty array for no issues', () => {
    expect(calculateLeadTime([])).toEqual([]);
  });

  it('excludes open issues', () => {
    const issues: Issue[] = [
      createIssue({ id: 'open-1', status: 'open' }),
      createIssue({ id: 'in-progress-1', status: 'in_progress' }),
    ];
    expect(calculateLeadTime(issues)).toEqual([]);
  });

  it('calculates cycle time for closed issues', () => {
    const issues: Issue[] = [
      createIssue({
        id: 'closed-1',
        status: 'closed',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z', // 2 days later
      }),
    ];

    const result = calculateLeadTime(issues);
    expect(result).toHaveLength(1);
    expect(result[0].cycleTimeDays).toBe(2);
    expect(result[0].id).toBe('closed-1');
  });

  it('handles same-day closure', () => {
    const issues: Issue[] = [
      createIssue({
        id: 'same-day',
        status: 'closed',
        created_at: '2024-01-01T09:00:00Z',
        updated_at: '2024-01-01T17:00:00Z',
      }),
    ];

    const result = calculateLeadTime(issues);
    expect(result[0].cycleTimeHours).toBe(8); // 8 hours
    expect(result[0].cycleTimeDays).toBeCloseTo(8/24, 2); // ~0.33 days
  });

  it('sorts by close date', () => {
    const issues: Issue[] = [
      createIssue({
        id: 'second',
        status: 'closed',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-10T00:00:00Z',
      }),
      createIssue({
        id: 'first',
        status: 'closed',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-05T00:00:00Z',
      }),
    ];

    const result = calculateLeadTime(issues);
    expect(result[0].id).toBe('first');
    expect(result[1].id).toBe('second');
  });
});

describe('calculatePercentile', () => {
  it('returns 0 for empty array', () => {
    expect(calculatePercentile([], 0.5)).toBe(0);
  });

  it('calculates 50th percentile correctly', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(calculatePercentile(values, 0.5)).toBe(6); // 50% of 10 = index 5 (6th element)
  });

  it('calculates 85th percentile correctly', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(calculatePercentile(values, 0.85)).toBe(9); // 85% of 10 = index 8 (9th element)
  });

  it('handles unsorted arrays', () => {
    const values = [5, 1, 9, 3, 7];
    const result = calculatePercentile(values, 0.5);
    expect(result).toBe(5); // Median of [1,3,5,7,9]
  });

  it('handles single value', () => {
    expect(calculatePercentile([42], 0.5)).toBe(42);
  });
});

describe('calculateAgingWIP', () => {
  const today = new Date('2024-01-15T00:00:00Z');

  it('returns empty array for no issues', () => {
    expect(calculateAgingWIP([], today)).toEqual([]);
  });

  it('excludes closed issues', () => {
    const issues: Issue[] = [
      createIssue({ status: 'closed', created_at: '2024-01-01T00:00:00Z' }),
    ];
    expect(calculateAgingWIP(issues, today)).toEqual([]);
  });

  it('calculates age correctly', () => {
    const issues: Issue[] = [
      createIssue({ id: 'test-1', created_at: '2024-01-05T00:00:00Z' }), // 10 days old
    ];

    const result = calculateAgingWIP(issues, today);
    expect(result[0].ageDays).toBe(10);
  });

  it('colors based on age thresholds', () => {
    const issues: Issue[] = [
      createIssue({ id: 'green', created_at: '2024-01-10T00:00:00Z' }), // 5 days (green)
      createIssue({ id: 'orange', created_at: '2024-01-01T00:00:00Z' }), // 14 days (orange)
      createIssue({ id: 'red', created_at: '2023-12-01T00:00:00Z' }), // 45 days (red)
    ];

    const result = calculateAgingWIP(issues, today);
    expect(result.find((r) => r.id === 'green')?.color).toBe('#10b981');
    expect(result.find((r) => r.id === 'orange')?.color).toBe('#f59e0b');
    expect(result.find((r) => r.id === 'red')?.color).toBe('#ef4444');
  });
});

describe('calculateAgeDistribution', () => {
  const today = new Date('2024-01-15T00:00:00Z');

  it('returns correct buckets for no issues', () => {
    const result = calculateAgeDistribution([], today);
    expect(result).toHaveLength(4);
    expect(result.every((bucket) => bucket.count === 0)).toBe(true);
  });

  it('places issues in correct buckets', () => {
    const issues: Issue[] = [
      createIssue({ id: '1', created_at: '2024-01-12T00:00:00Z' }), // 3d -> 0-7d
      createIssue({ id: '2', created_at: '2024-01-05T00:00:00Z' }), // 10d -> 8-14d
      createIssue({ id: '3', created_at: '2023-12-20T00:00:00Z' }), // 26d -> 15-30d
      createIssue({ id: '4', created_at: '2023-11-01T00:00:00Z' }), // 75d -> 30d+
    ];

    const result = calculateAgeDistribution(issues, today);
    const buckets = Object.fromEntries(result.map((r) => [r.range, r.count]));

    expect(buckets['0-7d']).toBe(1);
    expect(buckets['8-14d']).toBe(1);
    expect(buckets['15-30d']).toBe(1);
    expect(buckets['30d+']).toBe(1);
  });

  it('excludes closed issues', () => {
    const issues: Issue[] = [
      createIssue({ status: 'closed', created_at: '2024-01-10T00:00:00Z' }),
    ];

    const result = calculateAgeDistribution(issues, today);
    expect(result.every((bucket) => bucket.count === 0)).toBe(true);
  });
});

describe('calculateCumulativeFlow', () => {
  const today = new Date('2024-01-05T00:00:00Z');

  it('returns empty array for no issues', () => {
    expect(calculateCumulativeFlow([], today)).toEqual([]);
  });

  it('fills in all dates from earliest to today', () => {
    const issues: Issue[] = [
      createIssue({ created_at: '2024-01-01T00:00:00Z' }),
    ];

    const result = calculateCumulativeFlow(issues, today);
    expect(result).toHaveLength(5); // Jan 1-5 = 5 days
    expect(result[0].date).toBe('2024-01-01');
    expect(result[4].date).toBe('2024-01-05');
  });

  it('tracks cumulative created and closed issues', () => {
    const issues: Issue[] = [
      createIssue({ id: '1', created_at: '2024-01-01T00:00:00Z' }),
      createIssue({ id: '2', created_at: '2024-01-02T00:00:00Z' }),
      createIssue({
        id: '3',
        status: 'closed',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
      }),
    ];

    const result = calculateCumulativeFlow(issues, today);

    // Day 1: 2 created (issues 1 and 3), 0 closed
    expect(result[0].open).toBe(2);
    expect(result[0].closed).toBe(0);

    // Day 2: 3 created total (issue 2 added), 0 closed
    expect(result[1].open).toBe(3);
    expect(result[1].closed).toBe(0);

    // Day 3: 3 created total, 1 closed (issue 3)
    expect(result[2].open).toBe(2); // 3 created - 1 closed
    expect(result[2].closed).toBe(1);
    expect(result[2].throughput).toBe(1); // 1 issue closed on this day
  });

  it('handles multiple creations and closures on same day', () => {
    const issues: Issue[] = [
      createIssue({ id: '1', created_at: '2024-01-01T09:00:00Z' }),
      createIssue({ id: '2', created_at: '2024-01-01T10:00:00Z' }),
      createIssue({
        id: '3',
        status: 'closed',
        created_at: '2024-01-01T08:00:00Z',
        updated_at: '2024-01-01T16:00:00Z',
      }),
    ];

    const result = calculateCumulativeFlow(issues, today);
    expect(result[0].open).toBe(2); // 3 created - 1 closed
    expect(result[0].closed).toBe(1);
  });
});

describe('calculateAverageAge', () => {
  const today = new Date('2024-01-15T00:00:00Z');

  it('returns 0 for no issues', () => {
    const result = calculateAverageAge([], today);
    expect(result.value).toBe(0);
    expect(result.unit).toBe('days');
    expect(result.formatted).toBe('0d');
  });

  it('returns 0 for only closed issues', () => {
    const issues: Issue[] = [
      createIssue({ status: 'closed', created_at: '2024-01-01T00:00:00Z' }),
    ];
    const result = calculateAverageAge(issues, today);
    expect(result.value).toBe(0);
    expect(result.unit).toBe('days');
    expect(result.formatted).toBe('0d');
  });

  it('calculates average age correctly', () => {
    const issues: Issue[] = [
      createIssue({ id: '1', created_at: '2024-01-05T00:00:00Z' }), // 10 days
      createIssue({ id: '2', created_at: '2024-01-10T00:00:00Z' }), // 5 days
      createIssue({ id: '3', created_at: '2024-01-15T00:00:00Z' }), // 0 days
    ];

    const avg = calculateAverageAge(issues, today);
    expect(avg.value).toBe(120); // (10 + 5 + 0) / 3 = 5 days = 120 hours
    expect(avg.unit).toBe('days');
    expect(avg.formatted).toBe('5.0d');
  });
});

describe('calculateMetrics', () => {
  const today = new Date('2024-01-15T00:00:00Z');

  it('returns null for empty issues array', () => {
    expect(calculateMetrics([], today)).toBeNull();
  });

  it('returns null for only tombstone issues', () => {
    const issues: Issue[] = [
      createIssue({ status: 'tombstone' }),
    ];
    expect(calculateMetrics(issues, today)).toBeNull();
  });

  it('calculates all metrics correctly', () => {
    const issues: Issue[] = [
      createIssue({ id: '1', status: 'open', created_at: '2024-01-10T00:00:00Z' }),
      createIssue({ id: '2', status: 'in_progress', created_at: '2024-01-05T00:00:00Z' }),
      createIssue({
        id: '3',
        status: 'closed',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
      }),
      createIssue({ id: '4', status: 'tombstone' }), // Should be filtered out
    ];

    const result = calculateMetrics(issues, today);

    expect(result).not.toBeNull();
    expect(result!.openCount).toBe(2); // Excludes closed and tombstone
    expect(result!.leadTimeData).toHaveLength(1);
    expect(result!.agingWipData).toHaveLength(2);
    expect(result!.flowChartData.length).toBeGreaterThan(0);
    expect(result!.ageChartData).toHaveLength(4);
    expect(typeof result!.avgAge).toBe('string');
    expect(typeof result!.cycleTimeP50).toBe('number');
    expect(typeof result!.cycleTimeP85).toBe('number');
  });

  it('calculates percentiles from lead time data', () => {
    const issues: Issue[] = [
      ...Array.from({ length: 10 }, (_, i) =>
        createIssue({
          id: `closed-${i}`,
          status: 'closed',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: `2024-01-${String(i + 2).padStart(2, '0')}T00:00:00Z`, // 1-10 days cycle times
        })
      ),
    ];

    const result = calculateMetrics(issues, today);
    expect(result!.cycleTimeP50).toBeGreaterThan(0);
    expect(result!.cycleTimeP85).toBeGreaterThan(result!.cycleTimeP50);
  });
});
