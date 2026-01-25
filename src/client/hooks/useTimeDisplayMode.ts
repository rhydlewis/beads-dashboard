import { useState, useEffect } from 'react';
import type { TimeDisplayMode } from '../utils/timeFormatting';

const STORAGE_KEY = 'beads-time-display-mode';
const DEFAULT_MODE: TimeDisplayMode = 'day';

/**
 * Hook to manage time display mode setting with localStorage persistence
 *
 * @returns [displayMode, setDisplayMode] tuple
 */
export function useTimeDisplayMode(): [TimeDisplayMode, (value: TimeDisplayMode) => void] {
  const [displayMode, setDisplayModeState] = useState<TimeDisplayMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved === 'hour' || saved === 'day') ? saved : DEFAULT_MODE;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, displayMode);
  }, [displayMode]);

  return [displayMode, setDisplayModeState];
}
