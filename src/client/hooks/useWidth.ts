import { useState, useEffect } from 'react';

export type WidthMode = 'narrow' | 'medium' | 'wide';

const STORAGE_KEY = 'dashboardWidth';
const DEFAULT_WIDTH: WidthMode = 'medium';

const WIDTH_VALUES: Record<WidthMode, string> = {
  narrow: '1024px',
  medium: '1440px',
  wide: '100%',
};

/**
 * Hook to manage dashboard width setting with localStorage persistence
 *
 * @returns [widthMode, setWidthMode, maxWidth] tuple
 */
export function useWidth(): [WidthMode, (value: WidthMode) => void, string] {
  const [widthMode, setWidthModeState] = useState<WidthMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved === 'narrow' || saved === 'medium' || saved === 'wide') ? saved : DEFAULT_WIDTH;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, widthMode);
  }, [widthMode]);

  const maxWidth = WIDTH_VALUES[widthMode];

  return [widthMode, setWidthModeState, maxWidth];
}
