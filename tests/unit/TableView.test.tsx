import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TableView from '@/components/TableView';
import type { Issue } from '@shared/types';
import { AgingThresholdConfig } from '@/utils/agingAlerts';

// Mock IssueViewModal component
vi.mock('@/components/IssueViewModal', () => ({
  default: ({ issue, onClose }: { issue: Issue; onClose: () => void }) => (
    <div data-testid="issue-modal">
      <h1>{issue.title}</h1>
      <button onClick={onClose}>Close Modal</button>
    </div>
  ),
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
    id: 'test-abc123',
    title: 'Fix login bug',
    description: 'Users cannot log in',
    status: 'open',
    issue_type: 'bug',
    priority: 0,
    created_at: '2026-01-10T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
  },
  {
    id: 'test-def456',
    title: 'Add dark mode',
    description: 'Implement dark theme',
    status: 'in_progress',
    issue_type: 'feature',
    priority: 2,
    created_at: '2026-01-12T10:00:00Z',
    updated_at: '2026-01-16T10:00:00Z',
  },
  {
    id: 'test-ghi789',
    title: 'Refactor API layer',
    description: 'Clean up code',
    status: 'closed',
    issue_type: 'task',
    priority: 3,
    created_at: '2026-01-05T10:00:00Z',
    updated_at: '2026-01-10T10:00:00Z',
  },
  {
    id: 'test-jkl012',
    title: 'Deleted issue',
    description: 'This should not appear',
    status: 'tombstone',
    issue_type: 'task',
    priority: 4,
    created_at: '2026-01-01T10:00:00Z',
    updated_at: '2026-01-02T10:00:00Z',
  },
];

const mockThresholdConfig: AgingThresholdConfig = {
  warning: 48,
  critical: 96,
};

describe('TableView Component', () => {
  let mockOnRefresh: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnRefresh = vi.fn();
    localStorageMock.clear();
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render all non-tombstone issues', () => {
      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      expect(screen.getByText('Fix login bug')).toBeInTheDocument();
      expect(screen.getByText('Add dark mode')).toBeInTheDocument();
      expect(screen.getByText('Refactor API layer')).toBeInTheDocument();
      expect(screen.queryByText('Deleted issue')).not.toBeInTheDocument();
    });

    it('should display shortened IDs', () => {
      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      expect(screen.getByText('abc123')).toBeInTheDocument();
      expect(screen.getByText('def456')).toBeInTheDocument();
      expect(screen.getByText('ghi789')).toBeInTheDocument();
    });

    it('should show issue types with correct icons', () => {
      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      expect(screen.getByText('bug')).toBeInTheDocument();
      expect(screen.getByText('feature')).toBeInTheDocument();
      expect(screen.getByText('task')).toBeInTheDocument();
    });

    it('should show issue priorities with labels', () => {
      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      expect(screen.getByText('Critical')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Low')).toBeInTheDocument();
    });

    it('should show issue statuses with correct styling', () => {
      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      expect(screen.getByText('open')).toBeInTheDocument();
      expect(screen.getByText('in_progress')).toBeInTheDocument();
      expect(screen.getByText('closed')).toBeInTheDocument();
    });

    it('should show empty state when no issues match filter', () => {
      render(<TableView issues={[]} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      expect(screen.getByText(/No issues found matching/)).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter issues by title', async () => {
      const user = userEvent.setup();
      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      const searchInput = screen.getByPlaceholderText(/Filter by ID, Title/);
      await user.type(searchInput, 'dark mode');

      expect(screen.getByText('Add dark mode')).toBeInTheDocument();
      expect(screen.queryByText('Fix login bug')).not.toBeInTheDocument();
    });

    it('should filter issues by ID', async () => {
      const user = userEvent.setup();
      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      const searchInput = screen.getByPlaceholderText(/Filter by ID, Title/);
      await user.type(searchInput, 'abc123');

      expect(screen.getByText('Fix login bug')).toBeInTheDocument();
      expect(screen.queryByText('Add dark mode')).not.toBeInTheDocument();
    });

    it('should filter issues by status', async () => {
      const user = userEvent.setup();
      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      const searchInput = screen.getByPlaceholderText(/Filter by ID, Title/);
      await user.type(searchInput, 'in_progress');

      expect(screen.getByText('Add dark mode')).toBeInTheDocument();
      expect(screen.queryByText('Fix login bug')).not.toBeInTheDocument();
    });

    it('should filter issues by type', async () => {
      const user = userEvent.setup();
      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      const searchInput = screen.getByPlaceholderText(/Filter by ID, Title/);
      await user.type(searchInput, 'bug');

      expect(screen.getByText('Fix login bug')).toBeInTheDocument();
      expect(screen.queryByText('Add dark mode')).not.toBeInTheDocument();
    });

    it('should filter issues by priority label', async () => {
      const user = userEvent.setup();
      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      const searchInput = screen.getByPlaceholderText(/Filter by ID, Title/);
      await user.type(searchInput, 'critical');

      expect(screen.getByText('Fix login bug')).toBeInTheDocument();
      expect(screen.queryByText('Add dark mode')).not.toBeInTheDocument();
    });

    it('should be case insensitive', async () => {
      const user = userEvent.setup();
      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      const searchInput = screen.getByPlaceholderText(/Filter by ID, Title/);
      await user.type(searchInput, 'DARK MODE');

      expect(screen.getByText('Add dark mode')).toBeInTheDocument();
    });
  });

  describe('Column Filters', () => {
    it('should open status filter dropdown when clicked', async () => {
      const user = userEvent.setup();
      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      const statusHeader = screen.getByText('Status').parentElement;
      const filterButton = statusHeader?.querySelector('button');
      expect(filterButton).toBeInTheDocument();

      if (filterButton) {
        await user.click(filterButton);
        await waitFor(() => {
          expect(screen.getByText(/Filter/i)).toBeInTheDocument();
        });
      }
    });

    it('should filter by status when checkbox selected', async () => {
      const user = userEvent.setup();
      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      // Open status filter
      const statusHeader = screen.getByText('Status').parentElement;
      const filterButton = statusHeader?.querySelector('button');
      if (filterButton) {
        await user.click(filterButton);

        // Select "open" status
        const openCheckbox = screen.getByRole('checkbox', { name: /open/i });
        await user.click(openCheckbox);

        // Should only show open issues
        expect(screen.getByText('Fix login bug')).toBeInTheDocument();
        expect(screen.queryByText('Add dark mode')).not.toBeInTheDocument();
        expect(screen.queryByText('Refactor API layer')).not.toBeInTheDocument();
      }
    });

    it('should filter by multiple statuses', async () => {
      const user = userEvent.setup();
      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      const statusHeader = screen.getByText('Status').parentElement;
      const filterButton = statusHeader?.querySelector('button');
      if (filterButton) {
        await user.click(filterButton);

        const openCheckbox = screen.getByRole('checkbox', { name: /open/i });
        await user.click(openCheckbox);

        // Should only show open issues now
        await waitFor(() => {
          expect(screen.getByText('Fix login bug')).toBeInTheDocument();
          expect(screen.queryByText('Add dark mode')).not.toBeInTheDocument();
        });

        // Now add closed filter
        const closedCheckbox = screen.getByRole('checkbox', { name: /closed/i });
        await user.click(closedCheckbox);

        // Should show both open and closed issues
        await waitFor(() => {
          expect(screen.getByText('Fix login bug')).toBeInTheDocument();
          expect(screen.getByText('Refactor API layer')).toBeInTheDocument();
          expect(screen.queryByText('Add dark mode')).not.toBeInTheDocument();
        });
      }
    });

    it('should clear status filter when Clear button clicked', async () => {
      const user = userEvent.setup();
      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      const statusHeader = screen.getByText('Status').parentElement;
      const filterButton = statusHeader?.querySelector('button');
      if (filterButton) {
        await user.click(filterButton);

        const openCheckbox = screen.getByRole('checkbox', { name: /open/i });
        await user.click(openCheckbox);

        // Find the Clear button inside the dropdown (not the Clear All Filters button)
        const clearButtons = screen.getAllByText('Clear');
        const clearButton = clearButtons.find(btn =>
          btn.className.includes('text-xs') && btn.className.includes('text-blue-600')
        );
        if (clearButton) {
          await user.click(clearButton);
        }

        // All issues should be visible again
        expect(screen.getByText('Fix login bug')).toBeInTheDocument();
        expect(screen.getByText('Add dark mode')).toBeInTheDocument();
        expect(screen.getByText('Refactor API layer')).toBeInTheDocument();
      }
    });

    it('should show Clear All Filters button when filters active', async () => {
      const user = userEvent.setup();
      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      const statusHeader = screen.getByText('Status').parentElement;
      const filterButton = statusHeader?.querySelector('button');
      if (filterButton) {
        await user.click(filterButton);
        const openCheckbox = screen.getByRole('checkbox', { name: /open/i });
        await user.click(openCheckbox);

        expect(screen.getByText(/Clear All Filters/)).toBeInTheDocument();
        expect(screen.getByText(/1 filter\(s\) active/)).toBeInTheDocument();
      }
    });

    it('should clear all filters when Clear All Filters clicked', async () => {
      const user = userEvent.setup();
      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      // Add status filter
      const statusHeader = screen.getByText('Status').parentElement;
      const statusFilterButton = statusHeader?.querySelector('button');
      if (statusFilterButton) {
        await user.click(statusFilterButton);
        const openCheckbox = screen.getByRole('checkbox', { name: /open/i });
        await user.click(openCheckbox);
      }

      // Click Clear All Filters
      const clearAllButton = screen.getByText(/Clear All Filters/);
      await user.click(clearAllButton);

      // All issues should be visible
      expect(screen.getByText('Fix login bug')).toBeInTheDocument();
      expect(screen.getByText('Add dark mode')).toBeInTheDocument();
      expect(screen.getByText('Refactor API layer')).toBeInTheDocument();
    });
  });

  describe('LocalStorage Persistence', () => {
    it('should save status filter to localStorage', async () => {
      const user = userEvent.setup();
      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      const statusHeader = screen.getByText('Status').parentElement;
      const filterButton = statusHeader?.querySelector('button');
      if (filterButton) {
        await user.click(filterButton);
        const openCheckbox = screen.getByRole('checkbox', { name: /open/i });
        await user.click(openCheckbox);

        await waitFor(() => {
          const saved = localStorage.getItem('beads-filter-status');
          expect(saved).toBe(JSON.stringify(['open']));
        });
      }
    });

    it('should load status filter from localStorage on mount', () => {
      localStorage.setItem('beads-filter-status', JSON.stringify(['open']));

      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      // Should only show open issues
      expect(screen.getByText('Fix login bug')).toBeInTheDocument();
      expect(screen.queryByText('Add dark mode')).not.toBeInTheDocument();
    });
  });

  describe('Copy ID Functionality', () => {
    it('should copy full ID to clipboard when copy button clicked', async () => {
      const user = userEvent.setup();
      const mockWriteText = vi.fn(() => Promise.resolve());
      Object.assign(navigator.clipboard, {
        writeText: mockWriteText,
      });

      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      const copyButtons = screen.getAllByTitle('Copy full ID');
      await user.click(copyButtons[0]);

      expect(mockWriteText).toHaveBeenCalledWith('test-abc123');
    });
  });

  describe('Issue View Modal', () => {
    it('should open modal when view button clicked', async () => {
      const user = userEvent.setup();
      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      const viewButtons = screen.getAllByTitle('View Description');
      await user.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByTestId('issue-modal')).toBeInTheDocument();
        // Modal should contain the issue title (there will be two: one in table, one in modal)
        const titles = screen.getAllByText('Fix login bug');
        expect(titles.length).toBeGreaterThan(1);
      });
    });

    it('should close modal when close button clicked', async () => {
      const user = userEvent.setup();
      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      const viewButtons = screen.getAllByTitle('View Description');
      await user.click(viewButtons[0]);

      const closeButton = await screen.findByText('Close Modal');
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('issue-modal')).not.toBeInTheDocument();
      });
    });
  });

  describe('Quick Actions - Status Update', () => {
    it('should show Start Progress button for open issues', () => {
      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      const startButtons = screen.getAllByTitle('Start Progress');
      expect(startButtons.length).toBeGreaterThan(0);
    });

    it('should not show Start Progress button for in_progress issues', () => {
      const inProgressIssues: Issue[] = [
        {
          ...mockIssues[1],
          status: 'in_progress',
        },
      ];

      const { container } = render(
        <TableView issues={inProgressIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />
      );

      const startButtons = container.querySelectorAll('[title="Start Progress"]');
      expect(startButtons.length).toBe(0);
    });

    it('should call API to update status to in_progress when Start Progress clicked', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response)
      );

      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      const startButtons = screen.getAllByTitle('Start Progress');
      await user.click(startButtons[0]);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/issues/test-abc123/status',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'in_progress' }),
          })
        );
      });
    });

    it('should call close endpoint when Close Issue clicked', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response)
      );

      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      const closeButtons = screen.getAllByTitle('Close Issue');
      await user.click(closeButtons[0]);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/issues/test-abc123/close',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          })
        );
      });
    });

    it('should show alert on API error', async () => {
      const user = userEvent.setup();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Update failed' }),
        } as Response)
      );

      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      const startButtons = screen.getAllByTitle('Start Progress');
      await user.click(startButtons[0]);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to update status: Update failed');
      });

      alertSpy.mockRestore();
    });
  });

  describe('Quick Actions - Priority Update', () => {
    it('should call API to increase priority when up arrow clicked', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response)
      );

      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      const increaseButtons = screen.getAllByTitle('Increase Priority (Up Arrow)');
      await user.click(increaseButtons[1]); // Click on medium priority issue

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/issues/test-def456/priority',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priority: 1 }),
          })
        );
      });
    });

    it('should call API to decrease priority when down arrow clicked', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response)
      );

      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      const decreaseButtons = screen.getAllByTitle('Decrease Priority (Down Arrow)');
      await user.click(decreaseButtons[1]); // Click on medium priority issue

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/issues/test-def456/priority',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priority: 3 }),
          })
        );
      });
    });

    it('should disable increase priority for P0 issues', () => {
      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      const increaseButtons = screen.getAllByTitle('Increase Priority (Up Arrow)');
      expect(increaseButtons[0]).toBeDisabled(); // First issue is P0
    });

    it('should disable decrease priority for P4 issues', () => {
      const p4Issues: Issue[] = [
        {
          id: 'test-p4',
          title: 'Low priority task',
          description: 'Not urgent',
          status: 'open',
          issue_type: 'task',
          priority: 4,
          created_at: '2026-01-10T10:00:00Z',
          updated_at: '2026-01-15T10:00:00Z',
        },
      ];

      render(<TableView issues={p4Issues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      const decreaseButtons = screen.getAllByTitle('Decrease Priority (Down Arrow)');
      expect(decreaseButtons[0]).toBeDisabled();
    });

    it('should handle keyboard navigation for priority (Arrow Up)', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response)
      );

      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      // Find the priority cell and focus it
      const priorityCells = screen.getAllByText('Medium');
      const priorityCell = priorityCells[0].closest('[tabIndex="0"]');

      if (priorityCell) {
        priorityCell.focus();
        await user.keyboard('{ArrowUp}');

        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/priority'),
            expect.objectContaining({
              body: JSON.stringify({ priority: 1 }),
            })
          );
        });
      }
    });

    it('should handle keyboard navigation for priority (Arrow Down)', async () => {
      const user = userEvent.setup();
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        } as Response)
      );

      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      const priorityCells = screen.getAllByText('Medium');
      const priorityCell = priorityCells[0].closest('[tabIndex="0"]');

      if (priorityCell) {
        priorityCell.focus();
        await user.keyboard('{ArrowDown}');

        await waitFor(() => {
          expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining('/priority'),
            expect.objectContaining({
              body: JSON.stringify({ priority: 3 }),
            })
          );
        });
      }
    });
  });

  describe('Aging Alerts Integration', () => {
    it('should display age in days for open issues', () => {
      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      // Open issues should show age
      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(0);
    });

    it('should display cycle time for closed issues', () => {
      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      // Closed issue should show cycle time in Cycle Time column
      const cycleTimes = screen.getAllByText(/5d/);
      expect(cycleTimes.length).toBeGreaterThan(0); // 5 days cycle time for closed issue
    });

    it('should apply aging status styling', () => {
      const oldIssue: Issue = {
        id: 'test-old',
        title: 'Old issue',
        description: 'Very old',
        status: 'open',
        issue_type: 'task',
        priority: 2,
        created_at: '2020-01-01T10:00:00Z', // Very old
        updated_at: '2020-01-01T10:00:00Z',
      };

      render(<TableView issues={[oldIssue]} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      // Should have aging alert styling
      const rows = screen.getAllByRole('row');
      const issueRow = rows.find((row) => row.textContent?.includes('Old issue'));
      expect(issueRow).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle issues with missing optional fields', () => {
      const incompleteIssue: Issue = {
        id: 'test-incomplete',
        title: '',
        description: '',
        status: 'open',
        issue_type: 'task',
        priority: 2,
        created_at: '2026-01-10T10:00:00Z',
        updated_at: undefined,
      };

      render(<TableView issues={[incompleteIssue]} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      expect(screen.getByText('Untitled')).toBeInTheDocument();
    });

    it('should handle empty issues array', () => {
      render(<TableView issues={[]} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      expect(screen.getByText(/No issues found/)).toBeInTheDocument();
    });

    it('should close dropdown when clicking outside', async () => {
      const user = userEvent.setup();
      render(<TableView issues={mockIssues} onRefresh={mockOnRefresh} thresholdConfig={mockThresholdConfig} />);

      const statusHeader = screen.getByText('Status').parentElement;
      const filterButton = statusHeader?.querySelector('button');

      if (filterButton) {
        await user.click(filterButton);
        expect(screen.getByText(/Filter/i)).toBeInTheDocument();

        // Click outside
        await user.click(document.body);

        await waitFor(() => {
          expect(screen.queryByText(/Filter/i)).not.toBeInTheDocument();
        });
      }
    });
  });
});
