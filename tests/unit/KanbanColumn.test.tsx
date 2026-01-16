import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import type { Issue } from '@shared/types';
import KanbanColumn from '@/components/KanbanColumn';

// Helper to wrap component in DndContext
const renderWithDnd = (component: React.ReactElement) => {
  return render(<DndContext>{component}</DndContext>);
};

describe('KanbanColumn', () => {
  const mockIssues: Issue[] = [
    {
      id: 'beads-test-1',
      title: 'Issue 1',
      status: 'open',
      issue_type: 'task',
      priority: 2,
      created_at: new Date().toISOString(),
    },
    {
      id: 'beads-test-2',
      title: 'Issue 2',
      status: 'open',
      issue_type: 'bug',
      priority: 1,
      created_at: new Date().toISOString(),
    },
  ];

  const mockOnCardClick = vi.fn();

  it('renders column with correct status label', () => {
    renderWithDnd(<KanbanColumn status="open" issues={[]} onCardClick={mockOnCardClick} />);
    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('renders "In Progress" label for in_progress status', () => {
    renderWithDnd(<KanbanColumn status="in_progress" issues={[]} onCardClick={mockOnCardClick} />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('renders "Done" label for closed status', () => {
    renderWithDnd(<KanbanColumn status="closed" issues={[]} onCardClick={mockOnCardClick} />);
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('renders "Blocked" label for blocked status', () => {
    renderWithDnd(<KanbanColumn status="blocked" issues={[]} onCardClick={mockOnCardClick} />);
    expect(screen.getByText('Blocked')).toBeInTheDocument();
  });

  it('renders "Deferred" label for deferred status', () => {
    renderWithDnd(<KanbanColumn status="deferred" issues={[]} onCardClick={mockOnCardClick} />);
    expect(screen.getByText('Deferred')).toBeInTheDocument();
  });

  it('renders "Archive" label for tombstone status', () => {
    renderWithDnd(<KanbanColumn status="tombstone" issues={[]} onCardClick={mockOnCardClick} />);
    expect(screen.getByText('Archive')).toBeInTheDocument();
  });

  it('displays correct card count', () => {
    const { container } = renderWithDnd(<KanbanColumn status="open" issues={mockIssues} onCardClick={mockOnCardClick} />);
    // Find the count in the header specifically
    const header = container.querySelector('.font-bold');
    expect(header).toHaveTextContent('2');
  });

  it('displays card count with WIP limit', () => {
    renderWithDnd(<KanbanColumn status="in_progress" issues={mockIssues} onCardClick={mockOnCardClick} wipLimit={5} />);
    expect(screen.getByText('2 / 5')).toBeInTheDocument();
  });

  it('shows warning indicator when at WIP limit', () => {
    const manyIssues = Array.from({ length: 5 }, (_, i) => ({
      id: `beads-test-${i}`,
      title: `Issue ${i}`,
      status: 'in_progress' as const,
      issue_type: 'task' as const,
      priority: 2 as const,
      created_at: new Date().toISOString(),
    }));
    renderWithDnd(<KanbanColumn status="in_progress" issues={manyIssues} onCardClick={mockOnCardClick} wipLimit={5} />);
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('shows warning indicator when over WIP limit', () => {
    const tooManyIssues = Array.from({ length: 6 }, (_, i) => ({
      id: `beads-test-${i}`,
      title: `Issue ${i}`,
      status: 'in_progress' as const,
      issue_type: 'task' as const,
      priority: 2 as const,
      created_at: new Date().toISOString(),
    }));
    renderWithDnd(<KanbanColumn status="in_progress" issues={tooManyIssues} onCardClick={mockOnCardClick} wipLimit={5} />);
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('does not show warning when under WIP limit', () => {
    renderWithDnd(<KanbanColumn status="in_progress" issues={mockIssues} onCardClick={mockOnCardClick} wipLimit={5} />);
    expect(screen.queryByText('⚠️')).not.toBeInTheDocument();
  });

  it('renders all issue cards', () => {
    renderWithDnd(<KanbanColumn status="open" issues={mockIssues} onCardClick={mockOnCardClick} />);
    expect(screen.getByText('Issue 1')).toBeInTheDocument();
    expect(screen.getByText('Issue 2')).toBeInTheDocument();
  });

  it('displays empty state when no issues', () => {
    renderWithDnd(<KanbanColumn status="open" issues={[]} onCardClick={mockOnCardClick} />);
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('applies correct background color for open status', () => {
    const { container } = renderWithDnd(<KanbanColumn status="open" issues={[]} onCardClick={mockOnCardClick} />);
    expect(container.querySelector('.bg-slate-100')).toBeInTheDocument();
  });

  it('applies correct background color for in_progress status', () => {
    const { container } = renderWithDnd(<KanbanColumn status="in_progress" issues={[]} onCardClick={mockOnCardClick} />);
    expect(container.querySelector('.bg-blue-100')).toBeInTheDocument();
  });

  it('applies correct background color for blocked status', () => {
    const { container } = renderWithDnd(<KanbanColumn status="blocked" issues={[]} onCardClick={mockOnCardClick} />);
    expect(container.querySelector('.bg-red-100')).toBeInTheDocument();
  });

  it('applies correct background color for closed status', () => {
    const { container } = renderWithDnd(<KanbanColumn status="closed" issues={[]} onCardClick={mockOnCardClick} />);
    expect(container.querySelector('.bg-green-100')).toBeInTheDocument();
  });

  it('applies correct background color for deferred status', () => {
    const { container } = renderWithDnd(<KanbanColumn status="deferred" issues={[]} onCardClick={mockOnCardClick} />);
    expect(container.querySelector('.bg-amber-100')).toBeInTheDocument();
  });

  it('has correct width class (w-80)', () => {
    const { container } = renderWithDnd(<KanbanColumn status="open" issues={[]} onCardClick={mockOnCardClick} />);
    expect(container.querySelector('.w-80')).toBeInTheDocument();
  });

  it('has sticky header', () => {
    const { container } = renderWithDnd(<KanbanColumn status="open" issues={[]} onCardClick={mockOnCardClick} />);
    expect(container.querySelector('.sticky')).toBeInTheDocument();
  });
});
