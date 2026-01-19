import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '@/App';
import type { Issue } from '@shared/types';

// Mock socket.io-client
const mockSocket = {
  on: vi.fn(),
  disconnect: vi.fn(),
  off: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

// Mock child components
vi.mock('@/components/DashboardView', () => ({
  default: ({ metrics, granularity }: any) => (
    <div data-testid="dashboard-view">
      Dashboard View - Granularity: {granularity}
    </div>
  ),
}));

vi.mock('@/components/TableView', () => ({
  default: ({ issues, onRefresh }: any) => (
    <div data-testid="table-view">
      Table View - {issues.length} issues
      <button onClick={onRefresh}>Refresh</button>
    </div>
  ),
}));

vi.mock('@/components/KanbanBoard', () => ({
  default: ({ issues }: any) => (
    <div data-testid="kanban-board">Kanban Board - {issues.length} issues</div>
  ),
}));

vi.mock('@/components/AgingAlertBadge', () => ({
  AgingAlertBadge: ({ issues, onConfigureClick }: any) => (
    <div data-testid="aging-alert-badge">
      Badge - {issues.length} issues
      <button onClick={onConfigureClick}>Configure</button>
    </div>
  ),
}));

vi.mock('@/components/AgingAlertList', () => ({
  AgingAlertList: ({ issues, onConfigureClick }: any) => (
    <div data-testid="aging-alert-list">
      Aging List - {issues.length} issues
      <button onClick={onConfigureClick}>Configure</button>
    </div>
  ),
}));

vi.mock('@/components/AgingThresholdConfig', () => ({
  AgingThresholdConfig: ({ onClose, onSave }: any) => (
    <div data-testid="threshold-config-modal">
      Config Modal
      <button onClick={() => onSave({ warning: 48, critical: 96 })}>Save</button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock useMetrics hook
vi.mock('@/hooks/useMetrics', () => ({
  useMetrics: vi.fn((issues: Issue[]) => ({
    leadTime: [],
    agingWIP: [],
    cumulativeFlow: [],
    ageDistribution: [],
    dailyThroughput: [],
    averageAge: 5,
    wipCount: issues.filter(i => i.status !== 'closed' && i.status !== 'tombstone').length,
    staleCount: 0,
    daysTracked: 30,
    p50LeadTime: 3,
    p85LeadTime: 7,
  })),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Sample test data
const mockIssues: Issue[] = [
  {
    id: 'test-project-abc123',
    title: 'Issue 1',
    description: 'Description 1',
    status: 'open',
    issue_type: 'task',
    priority: 2,
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'test-project-def456',
    title: 'Issue 2',
    description: 'Description 2',
    status: 'in_progress',
    issue_type: 'bug',
    priority: 1,
    created_at: '2026-01-12T10:00:00Z',
    updated_at: '2026-01-16T10:00:00Z',
  },
  {
    id: 'test-project-ghi789',
    title: 'Deleted issue',
    description: 'This is tombstoned',
    status: 'tombstone',
    issue_type: 'task',
    priority: 3,
    created_at: '2026-01-01T10:00:00Z',
    updated_at: '2026-01-02T10:00:00Z',
  },
];

describe('App Component', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockIssues),
      } as Response)
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Rendering', () => {
    it('should render the app with project name in header', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Beads Performance Dashboard/)).toBeInTheDocument();
        expect(screen.getByText(/test-project \//)).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      render(<App />);
      expect(screen.getByText(/Loading data.../)).toBeInTheDocument();
    });

    it('should display active issues count (excluding tombstones)', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/2 issues loaded/)).toBeInTheDocument();
      });
    });

    it('should update page title with project name', async () => {
      render(<App />);

      await waitFor(() => {
        expect(document.title).toBe('test-project - Beads Performance Dashboard');
      });
    });

    it('should set default page title when no issues', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        } as Response)
      );

      render(<App />);

      await waitFor(() => {
        expect(document.title).toBe('Beads Performance Dashboard');
      });
    });
  });

  describe('Data Fetching', () => {
    it('should fetch data from /api/data on mount', async () => {
      render(<App />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/data');
      });
    });

    it('should display fetched issues in table view', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('table-view')).toBeInTheDocument();
        expect(screen.getByText(/Table View - 3 issues/)).toBeInTheDocument();
      });
    });

    it('should show error state when fetch fails', async () => {
      global.fetch = vi.fn(() =>
        Promise.reject(new Error('Network error'))
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });

    it('should show error when API returns non-ok response', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
        } as Response)
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Failed to fetch data/)).toBeInTheDocument();
      });
    });

    it('should show empty state when no issues found', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        } as Response)
      );

      // Need to mock useMetrics to return null when no issues
      const { useMetrics } = await import('@/hooks/useMetrics');
      vi.mocked(useMetrics).mockReturnValue(null as any);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/No issues found/)).toBeInTheDocument();
      });
    });
  });

  describe('Socket.IO Connection', () => {
    it('should establish socket connection on mount', async () => {
      const { io } = await import('socket.io-client');

      render(<App />);

      await waitFor(() => {
        expect(io).toHaveBeenCalled();
      });
    });

    it('should listen for refresh events', async () => {
      render(<App />);

      await waitFor(() => {
        expect(mockSocket.on).toHaveBeenCalledWith('refresh', expect.any(Function));
      });
    });

    it('should refetch data when refresh event received', async () => {
      let refreshCallback: Function;
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'refresh') {
          refreshCallback = callback;
        }
      });

      render(<App />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Trigger refresh event
      refreshCallback!();

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });

    it('should disconnect socket on unmount', async () => {
      const { unmount } = render(<App />);

      await waitFor(() => {
        expect(mockSocket.on).toHaveBeenCalled();
      });

      unmount();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should show connection status', async () => {
      render(<App />);

      // Initially shows "Connecting..."
      expect(screen.getByText(/Connecting.../)).toBeInTheDocument();

      // After data loads, shows "Connected"
      await waitFor(() => {
        expect(screen.getByText(/Connected/)).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should default to table tab', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('table-view')).toBeInTheDocument();
      });
    });

    it('should switch to board tab when clicked', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('table-view')).toBeInTheDocument();
      });

      const boardTab = screen.getByText('Board');
      await user.click(boardTab);

      expect(screen.getByTestId('kanban-board')).toBeInTheDocument();
      expect(screen.queryByTestId('table-view')).not.toBeInTheDocument();
    });

    it('should switch to dashboard tab when clicked', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('table-view')).toBeInTheDocument();
      });

      const dashboardTab = screen.getByText('Dashboard');
      await user.click(dashboardTab);

      expect(screen.getByTestId('dashboard-view')).toBeInTheDocument();
      expect(screen.queryByTestId('table-view')).not.toBeInTheDocument();
    });

    it('should switch to aging items tab when clicked', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('table-view')).toBeInTheDocument();
      });

      const agingTab = screen.getByText('Aging Items');
      await user.click(agingTab);

      expect(screen.getByTestId('aging-alert-list')).toBeInTheDocument();
      expect(screen.queryByTestId('table-view')).not.toBeInTheDocument();
    });

    it('should apply active tab styling', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('All Issues')).toBeInTheDocument();
      });

      const allIssuesTab = screen.getByText('All Issues');
      expect(allIssuesTab.className).toContain('border-blue-500');

      const dashboardTab = screen.getByText('Dashboard');
      expect(dashboardTab.className).toContain('text-slate-500');

      await user.click(dashboardTab);

      expect(dashboardTab.className).toContain('border-blue-500');
    });
  });

  describe('LocalStorage Persistence', () => {
    it('should save active tab to localStorage', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('All Issues')).toBeInTheDocument();
      });

      const boardTab = screen.getByText('Board');
      await user.click(boardTab);

      await waitFor(() => {
        expect(localStorage.getItem('beads-active-tab')).toBe('board');
      });
    });

    it('should load active tab from localStorage on mount', async () => {
      localStorage.setItem('beads-active-tab', 'dashboard');

      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-view')).toBeInTheDocument();
      });
    });

    it('should save granularity to localStorage', async () => {
      render(<App />);

      await waitFor(() => {
        expect(localStorage.getItem('beads-granularity')).toBe('daily');
      });
    });

    it('should load granularity from localStorage on mount', async () => {
      localStorage.setItem('beads-granularity', 'weekly');

      render(<App />);

      // Switch to dashboard tab to see granularity
      const user = userEvent.setup();
      const dashboardTab = await screen.findByText('Dashboard');
      await user.click(dashboardTab);

      await waitFor(() => {
        expect(screen.getByText(/Granularity: weekly/)).toBeInTheDocument();
      });
    });
  });

  describe('Threshold Configuration', () => {
    it('should pass threshold config to components', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('aging-alert-badge')).toBeInTheDocument();
      });
    });

    it('should open config modal when configure button clicked', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('aging-alert-badge')).toBeInTheDocument();
      });

      const configureButtons = screen.getAllByText('Configure');
      await user.click(configureButtons[0]);

      expect(screen.getByTestId('threshold-config-modal')).toBeInTheDocument();
    });

    it('should close config modal when close button clicked', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('aging-alert-badge')).toBeInTheDocument();
      });

      const configureButtons = screen.getAllByText('Configure');
      await user.click(configureButtons[0]);

      const closeButton = screen.getByText('Close');
      await user.click(closeButton);

      expect(screen.queryByTestId('threshold-config-modal')).not.toBeInTheDocument();
    });

    it('should save threshold config and close modal', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByTestId('aging-alert-badge')).toBeInTheDocument();
      });

      const configureButtons = screen.getAllByText('Configure');
      await user.click(configureButtons[0]);

      const saveButton = screen.getByText('Save');
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.queryByTestId('threshold-config-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Component Integration', () => {
    it('should pass issues to TableView', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Table View - 3 issues/)).toBeInTheDocument();
      });
    });

    it('should pass issues to KanbanBoard', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('All Issues')).toBeInTheDocument();
      });

      const boardTab = screen.getByText('Board');
      await user.click(boardTab);

      expect(screen.getByText(/Kanban Board - 3 issues/)).toBeInTheDocument();
    });

    it('should pass metrics to DashboardView', async () => {
      const user = userEvent.setup();
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('All Issues')).toBeInTheDocument();
      });

      const dashboardTab = screen.getByText('Dashboard');
      await user.click(dashboardTab);

      expect(screen.getByTestId('dashboard-view')).toBeInTheDocument();
    });

  });

  describe('Project Name Extraction', () => {
    it('should extract project name from issue IDs', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/test-project \//)).toBeInTheDocument();
      });
    });

    it('should handle issues with different ID formats', async () => {
      const issuesWithDifferentFormat: Issue[] = [
        {
          id: 'my-project-name-xyz789',
          title: 'Issue',
          description: 'Description',
          status: 'open',
          issue_type: 'task',
          priority: 2,
          created_at: '2026-01-10T10:00:00Z',
          updated_at: '2026-01-15T10:00:00Z',
        },
      ];

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(issuesWithDifferentFormat),
        } as Response)
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/my-project-name \//)).toBeInTheDocument();
      });
    });

    it('should not show project name when no issues', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        } as Response)
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.queryByText(/\//)).not.toBeInTheDocument();
      });
    });
  });
});
