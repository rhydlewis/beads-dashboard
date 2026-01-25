import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import type { Issue } from '@shared/types';
import KanbanCard from '@/components/KanbanCard';

// Helper to wrap component in DndContext
const renderWithDnd = (component: React.ReactElement) => {
  return render(<DndContext>{component}</DndContext>);
};

describe('KanbanCard', () => {
  const mockIssue: Issue = {
    id: 'beads-test-123',
    title: 'Test Issue',
    description: 'Test description',
    status: 'open',
    issue_type: 'task',
    priority: 2,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    assignee: 'john.doe',
  };

  const mockOnClick = vi.fn();

  it('renders issue title', () => {
    renderWithDnd(<KanbanCard issue={mockIssue} onClick={mockOnClick} />);
    expect(screen.getByText('Test Issue')).toBeInTheDocument();
  });

  it('displays short ID', () => {
    renderWithDnd(<KanbanCard issue={mockIssue} onClick={mockOnClick} />);
    expect(screen.getByText('123')).toBeInTheDocument();
  });

  it('displays priority icon for priority 2', () => {
    const { container } = renderWithDnd(<KanbanCard issue={mockIssue} onClick={mockOnClick} />);
    // Check for priority border color
    const card = container.querySelector('.border-yellow-500');
    expect(card).toBeInTheDocument();
  });

  it('displays priority icon for priority 0 (critical)', () => {
    const criticalIssue = { ...mockIssue, priority: 0 as const };
    const { container } = renderWithDnd(<KanbanCard issue={criticalIssue} onClick={mockOnClick} />);
    const card = container.querySelector('.border-red-500');
    expect(card).toBeInTheDocument();
  });

  it('displays priority icon for priority 1', () => {
    const highPriorityIssue = { ...mockIssue, priority: 1 as const };
    const { container } = renderWithDnd(<KanbanCard issue={highPriorityIssue} onClick={mockOnClick} />);
    const card = container.querySelector('.border-orange-500');
    expect(card).toBeInTheDocument();
  });

  it('displays priority icon for priority 3', () => {
    const lowPriorityIssue = { ...mockIssue, priority: 3 as const };
    const { container } = renderWithDnd(<KanbanCard issue={lowPriorityIssue} onClick={mockOnClick} />);
    const card = container.querySelector('.border-blue-500');
    expect(card).toBeInTheDocument();
  });

  it('displays priority icon for priority 4', () => {
    const lowestPriorityIssue = { ...mockIssue, priority: 4 as const };
    const { container } = renderWithDnd(<KanbanCard issue={lowestPriorityIssue} onClick={mockOnClick} />);
    const card = container.querySelector('.border-slate-400');
    expect(card).toBeInTheDocument();
  });

  it('displays assignee name', () => {
    renderWithDnd(<KanbanCard issue={mockIssue} onClick={mockOnClick} />);
    expect(screen.getByText('john.doe')).toBeInTheDocument();
  });

  it('shows "Unassigned" when no assignee', () => {
    const unassignedIssue = { ...mockIssue, assignee: undefined };
    renderWithDnd(<KanbanCard issue={unassignedIssue} onClick={mockOnClick} />);
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  it('identifies agent assignees with robot icon', () => {
    const agentIssue = { ...mockIssue, assignee: 'claude-agent' };
    const { container } = renderWithDnd(<KanbanCard issue={agentIssue} onClick={mockOnClick} />);
    // Bot icon should be present (lucide-react Bot component)
    expect(container.querySelector('svg.lucide-bot')).toBeInTheDocument();
  });

  it('identifies human assignees with user icon', () => {
    const { container } = renderWithDnd(<KanbanCard issue={mockIssue} onClick={mockOnClick} />);
    // User icon should be present (lucide-react User component)
    expect(container.querySelector('svg.lucide-user')).toBeInTheDocument();
  });

  it('displays age in hours and minutes for recent issues (< 24h)', () => {
    const recentIssue = { ...mockIssue, created_at: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString() };
    renderWithDnd(<KanbanCard issue={recentIssue} onClick={mockOnClick} timeDisplayMode="hour" />);
    // Should show format like "0d 3h" in hour mode
    expect(screen.getByText(/0d 3h/)).toBeInTheDocument();
  });

  it('displays age in days for older issues (>= 24h)', () => {
    const oldIssue = { ...mockIssue, created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() };
    renderWithDnd(<KanbanCard issue={oldIssue} onClick={mockOnClick} />);
    expect(screen.getByText('2d')).toBeInTheDocument();
  });

  it('applies green badge color for issues < 2 hours old', () => {
    const veryRecentIssue = { ...mockIssue, created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() };
    const { container } = renderWithDnd(<KanbanCard issue={veryRecentIssue} onClick={mockOnClick} />);
    const badge = container.querySelector('.bg-green-100');
    expect(badge).toBeInTheDocument();
  });

  it('applies orange badge color for issues 2-4 hours old', () => {
    const moderateIssue = { ...mockIssue, created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() };
    const { container } = renderWithDnd(<KanbanCard issue={moderateIssue} onClick={mockOnClick} />);
    const badge = container.querySelector('.bg-orange-100');
    expect(badge).toBeInTheDocument();
  });

  it('applies red badge color for issues > 4 hours old', () => {
    const oldIssue = { ...mockIssue, created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() };
    const { container } = renderWithDnd(<KanbanCard issue={oldIssue} onClick={mockOnClick} />);
    const badge = container.querySelector('.bg-red-100');
    expect(badge).toBeInTheDocument();
  });

  it('displays type icon for bug', () => {
    const bugIssue = { ...mockIssue, issue_type: 'bug' as const };
    const { container } = renderWithDnd(<KanbanCard issue={bugIssue} onClick={mockOnClick} />);
    expect(container.querySelector('svg.lucide-bug')).toBeInTheDocument();
  });

  it('displays type icon for feature', () => {
    const featureIssue = { ...mockIssue, issue_type: 'feature' as const };
    const { container } = renderWithDnd(<KanbanCard issue={featureIssue} onClick={mockOnClick} />);
    expect(container.querySelector('svg.lucide-box')).toBeInTheDocument();
  });

  it('displays type icon for epic', () => {
    const epicIssue = { ...mockIssue, issue_type: 'epic' as const };
    const { container } = renderWithDnd(<KanbanCard issue={epicIssue} onClick={mockOnClick} />);
    expect(container.querySelector('svg.lucide-boxes')).toBeInTheDocument();
  });

  it('displays type icon for task (default)', () => {
    const { container } = renderWithDnd(<KanbanCard issue={mockIssue} onClick={mockOnClick} />);
    expect(container.querySelector('svg.lucide-list-check')).toBeInTheDocument();
  });

  it('truncates long titles with line-clamp-2', () => {
    const longTitleIssue = {
      ...mockIssue,
      title: 'This is a very long title that should be truncated after two lines to prevent the card from becoming too tall',
    };
    const { container } = renderWithDnd(<KanbanCard issue={longTitleIssue} onClick={mockOnClick} />);
    const titleElement = container.querySelector('.line-clamp-2');
    expect(titleElement).toBeInTheDocument();
  });

  it('shows "Untitled" when title is missing', () => {
    const noTitleIssue = { ...mockIssue, title: '' };
    renderWithDnd(<KanbanCard issue={noTitleIssue} onClick={mockOnClick} />);
    expect(screen.getByText('Untitled')).toBeInTheDocument();
  });
});
