import { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Search, X } from 'lucide-react';
import type { Issue, IssueStatus } from '@shared/types';
import { PRIORITY_LABELS } from '@shared/types';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import IssueViewModal from './IssueViewModal';

interface KanbanBoardProps {
  issues: Issue[];
  onRefresh: () => void;
}

function KanbanBoard({ issues, onRefresh }: KanbanBoardProps) {
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // Filter text with localStorage persistence
  const [filterText, setFilterText] = useState<string>(() => {
    const saved = localStorage.getItem('beads-kanban-filter');
    return saved || '';
  });

  // Optimistic updates - track status changes before they're persisted
  const [optimisticStatusUpdates, setOptimisticStatusUpdates] = useState<Record<string, IssueStatus>>({});

  // Persist filter text to localStorage
  useEffect(() => {
    localStorage.setItem('beads-kanban-filter', filterText);
  }, [filterText]);

  // Clear optimistic updates only when they're reflected in real data
  useEffect(() => {
    console.log(`[useEffect] Issues changed, checking optimistic updates. Issues count: ${issues.length}`);

    setOptimisticStatusUpdates(prev => {
      const next = { ...prev };
      const optimisticCount = Object.keys(next).length;

      if (optimisticCount === 0) {
        console.log(`[Optimistic Updates] No optimistic updates to check`);
        return next;
      }

      console.log(`[Optimistic Updates] Checking ${optimisticCount} optimistic update(s)`);

      // For each optimistic update, check if it's now in the real data
      Object.keys(next).forEach(issueId => {
        const issue = issues.find(i => i.id === issueId);
        const optimisticStatus = next[issueId];
        const realStatus = issue?.status;

        console.log(`[Optimistic Update Check] Issue ${issueId.substring(0, 20)}...`);
        console.log(`  Optimistic status: ${optimisticStatus}`);
        console.log(`  Real status: ${realStatus}`);
        console.log(`  Issue found in data: ${!!issue}`);

        // If the real data matches our optimistic update, clear it
        if (issue && issue.status === next[issueId]) {
          console.log(`  ✓ Match! Clearing optimistic update`);
          delete next[issueId];
        } else {
          console.log(`  ✗ No match. Keeping optimistic update`);
        }
      });

      console.log(`[Optimistic Updates] Active count after check: ${Object.keys(next).length}`);
      return next;
    });
  }, [issues]);

  // Configure sensors for both mouse and touch
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // 250ms hold before drag starts
        tolerance: 5, // 5px of movement tolerance
      },
    })
  );

  // Define column order
  const columnOrder: IssueStatus[] = [
    'open',
    'deferred',
    'in_progress',
    'blocked',
    'closed',
    'tombstone',
  ];

  // Apply optimistic updates to issues
  const issuesWithOptimisticUpdates = issues.map(issue => {
    const optimisticStatus = optimisticStatusUpdates[issue.id];
    if (optimisticStatus) {
      console.log(`[Grouping] Applying optimistic update: ${issue.id.substring(0, 20)}... → ${optimisticStatus} (original: ${issue.status})`);
    }
    return optimisticStatus ? { ...issue, status: optimisticStatus } : issue;
  });

  // Apply text filter
  const filteredIssues = issuesWithOptimisticUpdates.filter(issue => {
    if (!filterText) return true;

    const searchLower = filterText.toLowerCase();
    const idMatch = issue.id.toLowerCase().includes(searchLower);
    const titleMatch = (issue.title || '').toLowerCase().includes(searchLower);
    const statusMatch = issue.status.toLowerCase().includes(searchLower);
    const typeMatch = (issue.issue_type || '').toLowerCase().includes(searchLower);
    const priorityLabel = PRIORITY_LABELS[issue.priority] || '';
    const priorityMatch = priorityLabel.toLowerCase().includes(searchLower);

    return idMatch || titleMatch || statusMatch || typeMatch || priorityMatch;
  });

  // Group issues by status (with optimistic updates and filter applied)
  const issuesByStatus = columnOrder.reduce((acc, status) => {
    acc[status] = filteredIssues.filter(issue => issue.status === status);
    return acc;
  }, {} as Record<IssueStatus, Issue[]>);

  // Log any issues that don't appear in any column
  const issuesInColumns = Object.values(issuesByStatus).flat();
  const missingIssues = filteredIssues.filter(
    issue => !issuesInColumns.some(i => i.id === issue.id)
  );
  if (missingIssues.length > 0) {
    console.log(`[Grouping] Issues not in any column:`, missingIssues.map(i => ({ id: i.id.substring(0, 20), status: i.status })));
  }

  // Calculate filtered count
  const totalIssues = issues.length;
  const filteredCount = filteredIssues.length;

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const issue = issues.find(i => i.id === event.active.id);
    if (issue) {
      setActiveIssue(issue);
    }
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveIssue(null);

    if (!over || active.id === over.id) {
      return;
    }

    const issueId = active.id as string;
    let newStatus: IssueStatus;

    // Check if we dropped on a column (over.id is a status) or on a card (over.id is an issue ID)
    if (columnOrder.includes(over.id as IssueStatus)) {
      // Dropped on column - use the status directly
      newStatus = over.id as IssueStatus;
    } else {
      // Dropped on a card - find which column that card is in
      const targetIssue = issues.find(i => i.id === over.id);
      if (!targetIssue) {
        console.warn(`[Drag] Could not find target issue ${over.id}`);
        return;
      }
      newStatus = targetIssue.status;
      console.log(`[Drag] Dropped on card ${over.id.substring(0, 20)}... in column ${newStatus}`);
    }

    const issue = issues.find(i => i.id === issueId);

    if (!issue || issue.status === newStatus) {
      return;
    }

    // Optimistically update UI immediately
    console.log(`[Drag] Creating optimistic update: ${issueId.substring(0, 20)}... → ${newStatus}`);
    setOptimisticStatusUpdates(prev => ({ ...prev, [issueId]: newStatus }));
    setUpdatingStatus(issueId);

    try {
      console.log(`[Drag] Sending API request to update status`);

      // Use different endpoint for closing vs status update
      const endpoint = newStatus === 'closed'
        ? `/api/issues/${issueId}/close`
        : `/api/issues/${issueId}/status`;

      const body = newStatus === 'closed'
        ? {} // bd close doesn't need a body
        : { status: newStatus };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update status');
      }

      console.log(`[Drag] API request succeeded`);
      // Success - optimistic update will be automatically cleared by useEffect
      // when the real data arrives with the updated status
    } catch (err) {
      console.error(`[Drag] API request failed:`, err);
      alert(`Failed to update status: ${err instanceof Error ? err.message : 'Unknown error'}`);
      // Revert optimistic update on error
      console.log(`[Drag] Reverting optimistic update due to error`);
      setOptimisticStatusUpdates(prev => {
        const next = { ...prev };
        delete next[issueId];
        return next;
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  // Handle card click
  const handleCardClick = (issue: Issue) => {
    setSelectedIssue(issue);
  };

  const closeModal = () => {
    setSelectedIssue(null);
  };

  // WIP limits (configurable in future)
  const wipLimits: Partial<Record<IssueStatus, number>> = {
    in_progress: 5,
  };

  return (
    <>
      {/* Search Filter */}
      <div className="mb-4 p-4 bg-white rounded-lg border border-slate-200">
        <div className="relative">
          <input
            type="text"
            placeholder="Filter cards by title, ID, status, type, or priority..."
            className="w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          {filterText && (
            <button
              onClick={() => setFilterText('')}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Clear filter"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {filterText && (
          <div className="mt-2 text-xs text-slate-600">
            Showing {filteredCount} of {totalIssues} cards
          </div>
        )}
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-min">
            {columnOrder.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                issues={issuesByStatus[status] || []}
                onCardClick={handleCardClick}
                wipLimit={wipLimits[status]}
              />
            ))}
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeIssue ? (
            <div className="rotate-3 opacity-90">
              <KanbanCard issue={activeIssue} onClick={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Issue Detail Modal */}
      {selectedIssue && (
        <IssueViewModal
          issue={selectedIssue}
          onClose={closeModal}
          onUpdate={onRefresh}
        />
      )}
    </>
  );
}

export default KanbanBoard;
