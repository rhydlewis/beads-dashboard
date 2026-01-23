import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'beads-theme';

/**
 * Hook to manage dark mode theme
 * - Defaults to system preference
 * - Allows manual override via toggle
 * - Persists preference to localStorage
 * - Listens for system preference changes (respects manual override)
 */
export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    // Check localStorage first
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark') return true;
    if (stored === 'light') return false;

    // Fall back to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Apply theme to document
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent | { matches: boolean }) => {
      // Only update if user hasn't set a manual preference
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setIsDark(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const newValue = !prev;
      localStorage.setItem(STORAGE_KEY, newValue ? 'dark' : 'light');
      return newValue;
    });
  }, []);

  return { isDark, toggle };
}
