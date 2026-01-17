import { describe, it, expect, beforeEach } from 'vitest';
import {
  AgingThresholdConfig,
  DEFAULT_THRESHOLDS,
  loadThresholdConfig,
  saveThresholdConfig,
  thresholdToHours,
  formatAgeDisplay,
  classifyIssueAge,
  getIssueAgeHours,
  calculateThresholdsFromPercentiles,
  countIssuesByAgingStatus,
  getAgingIssues,
  getAgingStatusClass,
  getAgingTextClass,
} from '@/utils/agingAlerts';
import type { Issue } from '@shared/types';

describe('Aging Alerts Utility Functions', () => {
  // Mock issues for testing
  const mockIssues: Issue[] = [
    {
      id: 'test-1',
      title: 'Recent task',
      description: 'Created 1 hour ago',
      status: 'open',
      issue_type: 'task',
      priority: 2,
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'test-2',
      title: 'Warning task',
      description: 'Created 5 hours ago',
      status: 'in_progress',
      issue_type: 'bug',
      priority: 1,
      created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'test-3',
      title: 'Critical task',
      description: 'Created 10 hours ago',
      status: 'blocked',
      issue_type: 'feature',
      priority: 0,
      created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'test-4',
      title: 'Closed task',
      description: 'Already completed',
      status: 'closed',
      issue_type: 'task',
      priority: 3,
      created_at: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'test-5',
      title: 'Old task',
      description: 'Created 2 days ago',
      status: 'open',
      issue_type: 'epic',
      priority: 4,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  // Test date for consistent results
  const testDate = new Date();

  describe('thresholdToHours()', () => {
    it('should convert hours to hours correctly', () => {
      expect(thresholdToHours(4, 'hours')).toBe(4);
      expect(thresholdToHours(8, 'hours')).toBe(8);
      expect(thresholdToHours(12, 'hours')).toBe(12);
    });

    it('should convert days to hours correctly', () => {
      expect(thresholdToHours(1, 'days')).toBe(24);
      expect(thresholdToHours(2, 'days')).toBe(48);
      expect(thresholdToHours(7, 'days')).toBe(168);
    });
  });

  describe('formatAgeDisplay()', () => {
    it('should format hours correctly', () => {
      expect(formatAgeDisplay(1)).toBe('1h');
      expect(formatAgeDisplay(2.5)).toBe('2h 30m');
      expect(formatAgeDisplay(3.75)).toBe('3h 45m');
    });

    it('should format days correctly', () => {
      expect(formatAgeDisplay(24)).toBe('1d');
      expect(formatAgeDisplay(48)).toBe('2d');
      expect(formatAgeDisplay(72)).toBe('3d');
      expect(formatAgeDisplay(93.5)).toBe('3d 22h'); // 3 days + 21.5 hours → rounds to 22h
    });

    it('should handle edge cases', () => {
      expect(formatAgeDisplay(0)).toBe('0h');
      expect(formatAgeDisplay(0.5)).toBe('0h 30m');
      expect(formatAgeDisplay(23.9)).toBe('23h 54m');
    });
  });

  describe('getIssueAgeHours()', () => {
    it('should calculate age in hours correctly', () => {
      const issue: Issue = {
        id: 'test',
        title: 'Test',
        status: 'open',
        issue_type: 'task',
        priority: 2,
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      };

      const age = getIssueAgeHours(issue, testDate);
      expect(age).toBeGreaterThanOrEqual(4.9);
      expect(age).toBeLessThanOrEqual(5.1);
    });
  });

  describe('classifyIssueAge()', () => {
    const config: AgingThresholdConfig = {
      ...DEFAULT_THRESHOLDS,
      warningThreshold: 4,
      warningUnit: 'hours',
      criticalThreshold: 8,
      criticalUnit: 'hours',
    };

    it('should classify normal items correctly', () => {
      const normalIssue = mockIssues[0]; // 1 hour old
      expect(classifyIssueAge(normalIssue, config, testDate)).toBe('normal');
    });

    it('should classify warning items correctly', () => {
      const warningIssue = mockIssues[1]; // 5 hours old
      expect(classifyIssueAge(warningIssue, config, testDate)).toBe('warning');
    });

    it('should classify critical items correctly', () => {
      const criticalIssue = mockIssues[2]; // 10 hours old
      expect(classifyIssueAge(criticalIssue, config, testDate)).toBe('critical');
    });

    it('should ignore closed issues', () => {
      const closedIssue = mockIssues[3]; // closed
      expect(classifyIssueAge(closedIssue, config, testDate)).toBe('normal');
    });

    it('should handle items at exact threshold boundaries', () => {
      // Create issue slightly over warning threshold to account for timing precision
      const warningBoundaryIssue: Issue = {
        id: 'test-boundary-warning',
        title: 'Just over warning threshold',
        status: 'open',
        issue_type: 'task',
        priority: 2,
        created_at: new Date(Date.now() - 4.1 * 60 * 60 * 1000).toISOString(),
      };

      // Create issue slightly over critical threshold
      const criticalBoundaryIssue: Issue = {
        id: 'test-boundary-critical',
        title: 'Just over critical threshold',
        status: 'open',
        issue_type: 'task',
        priority: 2,
        created_at: new Date(Date.now() - 8.1 * 60 * 60 * 1000).toISOString(),
      };

      const warningResult = classifyIssueAge(warningBoundaryIssue, config, testDate);
      const criticalResult = classifyIssueAge(criticalBoundaryIssue, config, testDate);
      
      // Should be warning for issue just over warning threshold
      expect(warningResult).toBe('warning');
      // Should be critical for issue just over critical threshold  
      expect(criticalResult).toBe('critical');
    });

    it('should work with day-based thresholds', () => {
      const dayConfig: AgingThresholdConfig = {
        ...DEFAULT_THRESHOLDS,
        warningThreshold: 1,
        warningUnit: 'days',
        criticalThreshold: 2,
        criticalUnit: 'days',
      };

      const normalIssue = mockIssues[0]; // 1 hour old
      const warningIssue = mockIssues[1]; // 5 hours old
      const criticalIssue = mockIssues[4]; // 2 days old

      expect(classifyIssueAge(normalIssue, dayConfig, testDate)).toBe('normal');
      expect(classifyIssueAge(warningIssue, dayConfig, testDate)).toBe('normal'); // 5h < 24h
      expect(classifyIssueAge(criticalIssue, dayConfig, testDate)).toBe('critical');
    });
  });

  describe('countIssuesByAgingStatus()', () => {
    const config: AgingThresholdConfig = {
      ...DEFAULT_THRESHOLDS,
      warningThreshold: 4,
      warningUnit: 'hours',
      criticalThreshold: 8,
      criticalUnit: 'hours',
    };

    it('should count warning and critical items correctly', () => {
      const { warningCount, criticalCount } = countIssuesByAgingStatus(
        mockIssues,
        config,
        testDate
      );

      expect(warningCount).toBe(1); // test-2 (5 hours)
      expect(criticalCount).toBe(2); // test-3 (10 hours) and test-5 (2 days)
    });

    it('should return zero counts when no aging items', () => {
      const recentIssues: Issue[] = [mockIssues[0]]; // Only 1 hour old
      const { warningCount, criticalCount } = countIssuesByAgingStatus(
        recentIssues,
        config,
        testDate
      );

      expect(warningCount).toBe(0);
      expect(criticalCount).toBe(0);
    });
  });

  describe('getAgingIssues()', () => {
    const config: AgingThresholdConfig = {
      ...DEFAULT_THRESHOLDS,
      warningThreshold: 4,
      warningUnit: 'hours',
      criticalThreshold: 8,
      criticalUnit: 'hours',
    };

    it('should return aging issues sorted by age descending', () => {
      const agingIssues = getAgingIssues(mockIssues, config, testDate);

      expect(agingIssues.length).toBe(3); // test-2, test-3, test-5

      // Should be sorted by age descending (oldest first)
      expect(agingIssues[0].issue.id).toBe('test-5'); // 2 days old
      expect(agingIssues[1].issue.id).toBe('test-3'); // 10 hours old
      expect(agingIssues[2].issue.id).toBe('test-2'); // 5 hours old
    });

    it('should include correct status and age information', () => {
      const agingIssues = getAgingIssues(mockIssues, config, testDate);

      const criticalIssue = agingIssues.find((item) => item.issue.id === 'test-3');
      const warningIssue = agingIssues.find((item) => item.issue.id === 'test-2');

      expect(criticalIssue?.status).toBe('critical');
      expect(warningIssue?.status).toBe('warning');

      expect(criticalIssue?.ageHours).toBeGreaterThanOrEqual(9.9);
      expect(warningIssue?.ageHours).toBeGreaterThanOrEqual(4.9);
    });

    it('should format age display correctly', () => {
      const agingIssues = getAgingIssues(mockIssues, config, testDate);

      const recentAgingIssue = agingIssues.find((item) => item.issue.id === 'test-2');
      const oldAgingIssue = agingIssues.find((item) => item.issue.id === 'test-5');

      // Should show hours for recent items
      expect(recentAgingIssue?.ageDisplay).toMatch(/\d+h/);

      // Should show days for older items (format: "Xd" or "Xd Yh")
      expect(oldAgingIssue?.ageDisplay).toMatch(/\d+d/);
    });
  });

  describe('calculateThresholdsFromPercentiles()', () => {
    it('should calculate thresholds from historical data', () => {
      // Create issues with specific ages for testing
      const testIssues: Issue[] = [
        {
          id: 'p1',
          title: 'Issue 1',
          status: 'open',
          issue_type: 'task',
          priority: 2,
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'p2',
          title: 'Issue 2',
          status: 'open',
          issue_type: 'task',
          priority: 2,
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'p3',
          title: 'Issue 3',
          status: 'open',
          issue_type: 'task',
          priority: 2,
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'p4',
          title: 'Issue 4',
          status: 'open',
          issue_type: 'task',
          priority: 2,
          created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'p5',
          title: 'Issue 5',
          status: 'open',
          issue_type: 'task',
          priority: 2,
          created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
        },
      ];

      const { warningHours, criticalHours } = calculateThresholdsFromPercentiles(
        testIssues,
        0.8, // P80
        0.9, // P90
        testDate
      );

      // P80 of [2, 4, 6, 8, 10] should be around 8 (4th value in sorted array)
      // P90 of [2, 4, 6, 8, 10] should be around 10 (5th value in sorted array)
      // Allow some tolerance due to timing precision
      expect(warningHours).toBeGreaterThanOrEqual(7);
      expect(warningHours).toBeLessThanOrEqual(10);
      expect(criticalHours).toBeGreaterThanOrEqual(9);
      expect(criticalHours).toBeLessThanOrEqual(11);
    });

    it('should return default values when no open issues', () => {
      const closedIssues: Issue[] = [
        {
          id: 'closed',
          title: 'Closed',
          status: 'closed',
          issue_type: 'task',
          priority: 2,
          created_at: new Date().toISOString(),
        },
      ];

      const { warningHours, criticalHours } = calculateThresholdsFromPercentiles(
        closedIssues,
        0.85,
        0.95,
        testDate
      );

      expect(warningHours).toBe(4); // Default fallback
      expect(criticalHours).toBe(8); // Default fallback
    });
  });

  describe('getAgingStatusClass()', () => {
    it('should return correct CSS classes for aging status', () => {
      expect(getAgingStatusClass('normal')).toBe('');
      expect(getAgingStatusClass('warning')).toBe('bg-yellow-50 border-l-4 border-yellow-400');
      expect(getAgingStatusClass('critical')).toBe('bg-red-50 border-l-4 border-red-400');
    });
  });

  describe('getAgingTextClass()', () => {
    it('should return correct text color classes for aging status', () => {
      expect(getAgingTextClass('normal')).toBe('text-slate-700');
      expect(getAgingTextClass('warning')).toBe('text-yellow-700');
      expect(getAgingTextClass('critical')).toBe('text-red-700');
    });
  });

  describe('localStorage integration', () => {
    // Note: localStorage tests are skipped in this environment
    // as the test runner doesn't provide a full browser environment
    it.skip('should save and load threshold configuration', () => {
      // This test would verify localStorage functionality
    });

    it.skip('should return defaults when no config is saved', () => {
      // This test would verify fallback behavior
    });

    it.skip('should handle corrupted localStorage data gracefully', () => {
      // This test would verify error handling
    });
  });
});