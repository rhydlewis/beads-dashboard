import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTheme } from '../../src/client/hooks/useTheme';

describe('useTheme', () => {
  let originalMatchMedia: typeof window.matchMedia;
  let mockAddEventListener: ReturnType<typeof vi.fn>;
  let mockRemoveEventListener: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Remove any existing dark class from document
    document.documentElement.classList.remove('dark');

    // Store original matchMedia
    originalMatchMedia = window.matchMedia;

    // Setup mock matchMedia
    mockAddEventListener = vi.fn();
    mockRemoveEventListener = vi.fn();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  const createMockMatchMedia = (matches: boolean) => {
    return vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
      dispatchEvent: vi.fn(),
    }));
  };

  describe('initial state', () => {
    it('should default to light mode when no localStorage and system prefers light', () => {
      window.matchMedia = createMockMatchMedia(false);

      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(false);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should default to dark mode when no localStorage and system prefers dark', () => {
      window.matchMedia = createMockMatchMedia(true);

      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should use localStorage preference over system preference (dark)', () => {
      window.matchMedia = createMockMatchMedia(false); // system prefers light
      localStorage.setItem('beads-theme', 'dark');

      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should use localStorage preference over system preference (light)', () => {
      window.matchMedia = createMockMatchMedia(true); // system prefers dark
      localStorage.setItem('beads-theme', 'light');

      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(false);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('toggle', () => {
    it('should toggle from light to dark', () => {
      window.matchMedia = createMockMatchMedia(false);

      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(false);

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isDark).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should toggle from dark to light', () => {
      window.matchMedia = createMockMatchMedia(true);

      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(true);

      act(() => {
        result.current.toggle();
      });

      expect(result.current.isDark).toBe(false);
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should persist toggle preference to localStorage', () => {
      window.matchMedia = createMockMatchMedia(false);

      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggle();
      });

      expect(localStorage.getItem('beads-theme')).toBe('dark');

      act(() => {
        result.current.toggle();
      });

      expect(localStorage.getItem('beads-theme')).toBe('light');
    });
  });

  describe('system preference listener', () => {
    it('should register listener for system preference changes', () => {
      window.matchMedia = createMockMatchMedia(false);

      renderHook(() => useTheme());

      expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should clean up listener on unmount', () => {
      window.matchMedia = createMockMatchMedia(false);

      const { unmount } = renderHook(() => useTheme());

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should update theme when system preference changes and no manual override', () => {
      let changeHandler: ((e: { matches: boolean }) => void) | null = null;

      mockAddEventListener.mockImplementation((event: string, handler: (e: { matches: boolean }) => void) => {
        if (event === 'change') {
          changeHandler = handler;
        }
      });

      window.matchMedia = createMockMatchMedia(false);

      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(false);

      // Simulate system preference change
      act(() => {
        if (changeHandler) {
          changeHandler({ matches: true });
        }
      });

      expect(result.current.isDark).toBe(true);
    });

    it('should NOT update theme when system preference changes if manual override exists', () => {
      let changeHandler: ((e: { matches: boolean }) => void) | null = null;

      mockAddEventListener.mockImplementation((event: string, handler: (e: { matches: boolean }) => void) => {
        if (event === 'change') {
          changeHandler = handler;
        }
      });

      window.matchMedia = createMockMatchMedia(false);
      localStorage.setItem('beads-theme', 'light'); // Manual override

      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(false);

      // Simulate system preference change
      act(() => {
        if (changeHandler) {
          changeHandler({ matches: true });
        }
      });

      // Should NOT change because user has manual override
      expect(result.current.isDark).toBe(false);
    });
  });
});
