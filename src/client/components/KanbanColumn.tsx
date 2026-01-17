import { useState, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Settings, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Issue, IssueStatus } from '@shared/types';
import KanbanCard from './KanbanCard';

interface KanbanColumnProps {
  status: IssueStatus;
  issues: Issue[];
  onCardClick: (issue: Issue) => void;
  wipLimit?: number;
  autoHideDays?: number | null;
  onAutoHideDaysChange?: (days: number | null) => void;
  hiddenCount?: number;
  showAllHidden?: boolean;
  onShowAllHiddenToggle?: (show: boolean) => void;
}

function KanbanColumn({
  status,
  issues,
  onCardClick,
  wipLimit,
  autoHideDays,
  onAutoHideDaysChange,
  hiddenCount,
  showAllHidden,
  onShowAllHiddenToggle,
}: KanbanColumnProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(`beads-kanban-column-collapsed-${status}`);
    return saved === 'true';
  });

  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  // Persist collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem(`beads-kanban-column-collapsed-${status}`, isCollapsed.toString());
  }, [isCollapsed, status]);

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowSettings(false);
    if (showSettings) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showSettings]);

  const getStatusLabel = (status: IssueStatus) => {
    switch (status) {
      case 'open': return 'Open';
      case 'in_progress': return 'In Progress';
      case 'blocked': return 'Blocked';
      case 'closed': return 'Done';
      case 'deferred': return 'Deferred';
      case 'tombstone': return 'Archive';
      case 'pinned': return 'Pinned';
      case 'hooked': return 'Hooked';
      default: return status;
    }
  };

  const getStatusColor = (status: IssueStatus) => {
    switch (status) {
      case 'open': return 'bg-slate-100 text-slate-700';
      case 'in_progress': return 'bg-blue-100 text-blue-700';
      case 'blocked': return 'bg-red-100 text-red-700';
      case 'closed': return 'bg-green-100 text-green-700';
      case 'deferred': return 'bg-amber-100 text-amber-700';
      case 'pinned': return 'bg-purple-100 text-purple-700';
      case 'hooked': return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const count = issues.length;
  const isOverLimit = wipLimit !== undefined && count >= wipLimit;

  // Collapsed view - vertical header
  if (isCollapsed) {
    return (
      <div className="flex-shrink-0 w-12 flex flex-col">
        <div className={`h-full flex flex-col items-center py-4 px-2 rounded-lg ${getStatusColor(status)}`}>
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-1 hover:bg-white/50 rounded transition-colors mb-2"
            title={`Expand ${getStatusLabel(status)} column`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="flex-1 flex flex-col items-center justify-center gap-2">
            <h3 className="font-semibold text-xs uppercase tracking-wide whitespace-nowrap" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
              {getStatusLabel(status)}
            </h3>
          </div>
          <span className={`text-sm font-bold mt-2 ${isOverLimit ? 'text-red-600' : ''}`}>
            {count}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 w-80 flex flex-col">
      {/* Column Header */}
      <div className={`sticky top-0 z-10 px-4 py-3 rounded-t-lg border-b-2 ${getStatusColor(status)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1 hover:bg-white/50 rounded transition-colors"
              title="Collapse column"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="font-semibold text-sm uppercase tracking-wide">
              {getStatusLabel(status)}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${isOverLimit ? 'text-red-600' : ''}`}>
              {count}
              {wipLimit !== undefined && ` / ${wipLimit}`}
            </span>
            {isOverLimit && (
              <span className="text-xs font-medium text-red-600">⚠️</span>
            )}
            {onAutoHideDaysChange && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSettings(!showSettings);
                  }}
                  className="p-1 hover:bg-white/50 rounded transition-colors"
                  title="Auto-hide settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                {showSettings && (
                  <div
                    className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-2">
                      <div className="text-xs font-semibold text-slate-700 mb-2">Auto-hide cards older than:</div>
                      <button
                        onClick={() => { onAutoHideDaysChange(null); setShowSettings(false); }}
                        className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-slate-100 ${autoHideDays === null ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}
                      >
                        Disabled (show all)
                      </button>
                      {[7, 14, 30, 90].map((days) => (
                        <button
                          key={days}
                          onClick={() => { onAutoHideDaysChange(days); setShowSettings(false); }}
                          className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-slate-100 ${autoHideDays === days ? 'bg-blue-50 text-blue-700' : 'text-slate-700'}`}
                        >
                          {days} days
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Column Body */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[200px] p-3 bg-slate-50 transition-colors ${
          isOver ? 'bg-blue-50 ring-2 ring-blue-300' : ''
        } ${hiddenCount !== undefined && hiddenCount > 0 && !showAllHidden ? '' : 'rounded-b-lg'}`}
      >
        <SortableContext items={issues.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {issues.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
              No items
            </div>
          ) : (
            issues.map((issue) => (
              <KanbanCard
                key={issue.id}
                issue={issue}
                onClick={() => onCardClick(issue)}
              />
            ))
          )}
        </SortableContext>
      </div>

      {/* Footer - Show hidden count and toggle */}
      {hiddenCount !== undefined && hiddenCount > 0 && onShowAllHiddenToggle && (
        <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 rounded-b-lg">
          <button
            onClick={() => onShowAllHiddenToggle(!showAllHidden)}
            className="w-full flex items-center justify-between text-xs text-slate-600 hover:text-slate-900 transition-colors"
          >
            <span className="flex items-center gap-1">
              {showAllHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {hiddenCount} card{hiddenCount !== 1 ? 's' : ''} hidden
            </span>
            <span className="text-blue-600 font-medium">
              {showAllHidden ? 'Hide old cards' : 'Show all'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

export default KanbanColumn;
