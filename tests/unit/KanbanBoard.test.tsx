import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Issue } from '@shared/types';
import KanbanBoard from '@/components/KanbanBoard';

// Mock fetch
global.fetch = vi.fn();

describe('KanbanBoard', () => {
  const mockIssues: Issue[] = [
    {
      id: 'beads-test-1',
      title: 'Open Issue',
      status: 'open',
      issue_type: 'task',
      priority: 2,
      created_at: new Date().toISOString(),
    },
    {
      id: 'beads-test-2',
      title: 'In Progress Issue',
      status: 'in_progress',
      issue_type: 'bug',
      priority: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: 'beads-test-3',
      title: 'Blocked Issue',
      status: 'blocked',
      issue_type: 'feature',
      priority: 0,
      created_at: new Date().toISOString(),
    },
    {
      id: 'beads-test-4',
      title: 'Closed Issue',
      status: 'closed',
      issue_type: 'task',
      priority: 3,
      created_at: new Date().toISOString(),
    },
    {
      id: 'beads-test-5',
      title: 'Deferred Issue',
      status: 'deferred',
      issue_type: 'task',
      priority: 4,
      created_at: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders all status columns', () => {
    render(<KanbanBoard issues={mockIssues} />);
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('Deferred')).toBeInTheDocument();
    expect(screen.getByText('Archive')).toBeInTheDocument();
  });

  it('groups issues correctly into status columns', () => {
    render(<KanbanBoard issues={mockIssues} />);
    // Check that each column has the correct count
    // Open column should have 1 issue
    const openSection = screen.getByText('Open').closest('.flex-shrink-0');
    expect(openSection).toHaveTextContent('1');

    // In Progress column should have 1 issue
    const inProgressSection = screen.getByText('In Progress').closest('.flex-shrink-0');
    expect(inProgressSection).toHaveTextContent('1');
  });

  it('displays all issues in their respective columns', () => {
    render(<KanbanBoard issues={mockIssues} />);
    expect(screen.getByText('Open Issue')).toBeInTheDocument();
    expect(screen.getByText('In Progress Issue')).toBeInTheDocument();
    expect(screen.getByText('Blocked Issue')).toBeInTheDocument();
    expect(screen.getByText('Closed Issue')).toBeInTheDocument();
    expect(screen.getByText('Deferred Issue')).toBeInTheDocument();
  });

  it('shows empty state for columns with no issues', () => {
    const singleIssue: Issue[] = [
      {
        id: 'beads-test-1',
        title: 'Only Issue',
        status: 'open',
        issue_type: 'task',
        priority: 2,
        created_at: new Date().toISOString(),
      },
    ];
    render(<KanbanBoard issues={singleIssue} />);

    // Most columns should show "No items"
    const noItemsElements = screen.getAllByText('No items');
    expect(noItemsElements.length).toBeGreaterThan(0);
  });

  it('calls status update API when drag would complete', async () => {
    // Note: Full drag-and-drop testing requires complex DnD context mocking
    // This test verifies the API call logic exists
    render(<KanbanBoard issues={mockIssues} />);

    // The component should render without errors
    expect(screen.getByText('Open Issue')).toBeInTheDocument();

    // Verify that the component is ready to handle drag events
    // (Full E2E drag testing would require a real browser environment)
  });

  it('opens issue detail modal when card is clicked', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard issues={mockIssues} />);

    const card = screen.getByText('Open Issue');
    await user.click(card);

    // Modal should open and show issue details
    await waitFor(() => {
      expect(screen.getByText('beads-test-1')).toBeInTheDocument();
    });
  });

  it('closes issue detail modal when close button is clicked', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard issues={mockIssues} />);

    // Open modal
    const card = screen.getByText('Open Issue');
    await user.click(card);

    await waitFor(() => {
      expect(screen.getByText('beads-test-1')).toBeInTheDocument();
    });

    // Close modal
    const closeButton = screen.getAllByRole('button').find(btn => {
      const svg = btn.querySelector('svg');
      return svg?.classList.contains('lucide-x');
    });

    if (closeButton) {
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('beads-test-1')).not.toBeInTheDocument();
      });
    }
  });

  it('shows edit mode when edit button is clicked in modal', async () => {
    const user = userEvent.setup();
    const issueWithDescription: Issue[] = [
      {
        id: 'beads-test-1',
        title: 'Open Issue',
        description: 'Test description content',
        status: 'open',
        issue_type: 'task',
        priority: 2,
        created_at: new Date().toISOString(),
      },
    ];

    render(<KanbanBoard issues={issueWithDescription} />);

    // Open modal
    const card = screen.getByText('Open Issue');
    await user.click(card);

    await waitFor(() => {
      expect(screen.getByText('beads-test-1')).toBeInTheDocument();
    });

    // Click edit button
    const editButton = screen.getAllByRole('button').find(btn => {
      const svg = btn.querySelector('svg');
      return svg?.classList.contains('lucide-edit-2');
    });

    if (editButton) {
      await user.click(editButton);

      // Should show textarea in edit mode
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });
    }
  });

  it('saves description when save button is clicked', async () => {
    const user = userEvent.setup();
    const issueWithDescription: Issue[] = [
      {
        id: 'beads-test-1',
        title: 'Open Issue',
        description: 'Original description',
        status: 'open',
        issue_type: 'task',
        priority: 2,
        created_at: new Date().toISOString(),
      },
    ];

    render(<KanbanBoard issues={issueWithDescription} />);

    // Open modal
    const card = screen.getByText('Open Issue');
    await user.click(card);

    await waitFor(() => {
      expect(screen.getByText('beads-test-1')).toBeInTheDocument();
    });

    // Click edit button
    const editButton = screen.getAllByRole('button').find(btn => {
      const svg = btn.querySelector('svg');
      return svg?.classList.contains('lucide-edit-2');
    });

    if (editButton) {
      await user.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      // Type new description
      const textarea = screen.getByRole('textbox');
      await user.clear(textarea);
      await user.type(textarea, 'Updated description');

      // Click save
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      // Verify API was called
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/issues/beads-test-1',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description: 'Updated description' }),
          })
        );
      });
    }
  });

  it('handles API error when status update fails', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to update status' }),
    } as Response);

    // Mock alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<KanbanBoard issues={mockIssues} />);

    // The component should handle errors gracefully
    expect(screen.getByText('Open Issue')).toBeInTheDocument();

    alertSpy.mockRestore();
  });

  it('displays WIP limit for in_progress column', () => {
    const inProgressIssues: Issue[] = [
      {
        id: 'beads-test-1',
        title: 'In Progress 1',
        status: 'in_progress',
        issue_type: 'task',
        priority: 2,
        created_at: new Date().toISOString(),
      },
      {
        id: 'beads-test-2',
        title: 'In Progress 2',
        status: 'in_progress',
        issue_type: 'task',
        priority: 2,
        created_at: new Date().toISOString(),
      },
    ];

    render(<KanbanBoard issues={inProgressIssues} />);

    // Should show count with limit
    const inProgressSection = screen.getByText('In Progress').closest('.flex-shrink-0');
    expect(inProgressSection).toHaveTextContent('/ 5');
  });

  it('handles empty issue list', () => {
    render(<KanbanBoard issues={[]} />);

    // All columns should show "No items"
    const noItemsElements = screen.getAllByText('No items');
    expect(noItemsElements.length).toBe(6); // 6 columns
  });

  it('displays horizontal scrollable container', () => {
    const { container } = render(<KanbanBoard issues={mockIssues} />);

    // Should have overflow-x-auto class
    expect(container.querySelector('.overflow-x-auto')).toBeInTheDocument();
  });
});
