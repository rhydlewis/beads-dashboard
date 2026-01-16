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
import type { Issue, IssueStatus } from '@shared/types';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import { X, Edit2 } from 'lucide-react';
import { marked } from 'marked';

interface KanbanBoardProps {
  issues: Issue[];
}

function KanbanBoard({ issues }: KanbanBoardProps) {
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Optimistic updates - track status changes before they're persisted
  const [optimisticStatusUpdates, setOptimisticStatusUpdates] = useState<Record<string, IssueStatus>>({});

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
    'in_progress',
    'blocked',
    'closed',
    'deferred',
    'tombstone',
  ];

  // Apply optimistic updates to issues
  const issuesWithOptimisticUpdates = issues.map(issue => {
    const optimisticStatus = optimisticStatusUpdates[issue.id];
    return optimisticStatus ? { ...issue, status: optimisticStatus } : issue;
  });

  // Group issues by status (with optimistic updates applied)
  const issuesByStatus = columnOrder.reduce((acc, status) => {
    acc[status] = issuesWithOptimisticUpdates.filter(issue => issue.status === status);
    return acc;
  }, {} as Record<IssueStatus, Issue[]>);

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
    const newStatus = over.id as IssueStatus;
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
      const res = await fetch(`/api/issues/${issueId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
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
    setEditValue(issue.description || '');
    setIsEditing(false);
  };

  // Handle save
  const handleSave = async () => {
    if (!selectedIssue) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/issues/${selectedIssue.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: editValue }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setSelectedIssue(null);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert('Failed to save description');
    } finally {
      setSaving(false);
    }
  };

  // WIP limits (configurable in future)
  const wipLimits: Partial<Record<IssueStatus, number>> = {
    in_progress: 5,
  };

  return (
    <>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start p-6 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{selectedIssue.title}</h3>
                <p className="text-sm text-slate-500 font-mono mt-1">{selectedIssue.id}</p>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                    title="Edit Description"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedIssue(null);
                    setIsEditing(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {isEditing ? (
                <textarea
                  className="w-full h-64 p-3 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Enter issue description..."
                />
              ) : selectedIssue.description ? (
                <div
                  className="prose prose-sm max-w-none text-slate-700"
                  dangerouslySetInnerHTML={{ __html: marked.parse(selectedIssue.description) }}
                />
              ) : (
                <div className="text-slate-400 italic text-center py-8">
                  ⚠️ No description provided for this issue.
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-lg flex justify-end gap-3">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setSelectedIssue(null);
                    setIsEditing(false);
                  }}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default KanbanBoard;
