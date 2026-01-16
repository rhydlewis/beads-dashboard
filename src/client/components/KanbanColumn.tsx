import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Issue, IssueStatus } from '@shared/types';
import KanbanCard from './KanbanCard';

interface KanbanColumnProps {
  status: IssueStatus;
  issues: Issue[];
  onCardClick: (issue: Issue) => void;
  wipLimit?: number;
}

function KanbanColumn({ status, issues, onCardClick, wipLimit }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

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

  return (
    <div className="flex-shrink-0 w-80 flex flex-col">
      {/* Column Header */}
      <div className={`sticky top-0 z-10 px-4 py-3 rounded-t-lg border-b-2 ${getStatusColor(status)}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm uppercase tracking-wide">
            {getStatusLabel(status)}
          </h3>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${isOverLimit ? 'text-red-600' : ''}`}>
              {count}
              {wipLimit !== undefined && ` / ${wipLimit}`}
            </span>
            {isOverLimit && (
              <span className="text-xs font-medium text-red-600">⚠️</span>
            )}
          </div>
        </div>
      </div>

      {/* Column Body */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[200px] p-3 bg-slate-50 rounded-b-lg transition-colors ${
          isOver ? 'bg-blue-50 ring-2 ring-blue-300' : ''
        }`}
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
    </div>
  );
}

export default KanbanColumn;
