import { useMemo } from 'react';
import type { Issue, Metrics, TimeGranularity } from '@shared/types';
import { calculateMetrics } from '@/utils/metricsCalculations';

/**
 * Hook to calculate dashboard metrics from issues
 * Memoizes the calculation to avoid unnecessary recomputation
 */
export function useMetrics(
  issues: Issue[],
  granularity: TimeGranularity = 'daily'
): Metrics | null {
  return useMemo(() => {
    if (!issues.length) return null;
    return calculateMetrics(issues, new Date(), granularity);
  }, [issues, granularity]);
}
