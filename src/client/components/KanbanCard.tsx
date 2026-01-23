import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ArrowDownFromLine,
  Bug,
  Box,
  Boxes,
  ListCheck,
  User,
  Bot,
  Info,
} from 'lucide-react';
import type { Issue, Priority } from '@shared/types';
import { extractShortId } from '@/utils/commonUtils';

interface KanbanCardProps {
  issue: Issue;
  onClick: () => void;
}

function KanbanCard({ issue, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Calculate age
  const created = new Date(issue.created_at);
  const now = new Date();
  const ageInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
  const ageInDays = Math.floor(ageInHours / 24);

  // Age badge color based on thresholds (hour-based for agent work)
  const getAgeBadgeColor = () => {
    if (ageInHours < 2) return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700';
    if (ageInHours < 4) return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700';
    return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700';
  };

  // Format age display
  const formatAge = () => {
    if (ageInHours < 24) {
      const hours = ageInHours;
      const minutes = Math.floor(((now.getTime() - created.getTime()) / (1000 * 60)) % 60);
      return `${hours}h ${minutes}m`;
    }
    return `${ageInDays}d`;
  };

  // Priority icon and color
  const getPriorityIcon = (priority: Priority) => {
    switch (priority) {
      case 0: return <AlertOctagon className="w-3 h-3" />;
      case 1: return <AlertTriangle className="w-3 h-3" />;
      case 2: return <ArrowUp className="w-3 h-3" />;
      case 3: return <ArrowDown className="w-3 h-3" />;
      case 4: return <ArrowDownFromLine className="w-3 h-3" />;
      default: return null;
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 0: return 'border-red-500';
      case 1: return 'border-orange-500';
      case 2: return 'border-yellow-500';
      case 3: return 'border-blue-500';
      case 4: return 'border-slate-400';
      default: return 'border-slate-300';
    }
  };

  // Type icon
  const getTypeIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t === 'bug') return <Bug className="w-3 h-3" />;
    if (t === 'feature') return <Box className="w-3 h-3" />;
    if (t === 'epic') return <Boxes className="w-3 h-3" />;
    return <ListCheck className="w-3 h-3" />;
  };

  // Detect if assignee is an agent (simple heuristic - can be configured)
  const isAgent = (assignee: string | undefined) => {
    if (!assignee) return false;
    const agentPatterns = ['agent', 'bot', 'claude', 'gpt', '@'];
    return agentPatterns.some(pattern => assignee.toLowerCase().includes(pattern));
  };

  // Short ID
  const shortId = extractShortId(issue.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white dark:bg-slate-800 rounded-lg border-l-4 ${getPriorityColor(issue.priority)} shadow-sm hover:shadow-md dark:shadow-slate-900/50 transition-shadow cursor-grab active:cursor-grabbing p-3 mb-2`}
    >
      {/* Header: ID + Priority + Info Button */}
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{shortId}</span>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
            {getPriorityIcon(issue.priority)}
            {getTypeIcon(issue.issue_type)}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="text-slate-400 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400 transition-colors p-0.5 cursor-pointer"
            title="View details"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2 line-clamp-2">
        {issue.title || 'Untitled'}
      </h4>

      {/* Footer: Assignee + Age */}
      <div className="flex items-center justify-between text-xs">
        {/* Assignee */}
        {issue.assignee ? (
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
            {isAgent(issue.assignee) ? (
              <Bot className="w-3 h-3 text-blue-500" />
            ) : (
              <User className="w-3 h-3 text-slate-400 dark:text-slate-500" />
            )}
            <span className="truncate max-w-[100px]">{issue.assignee}</span>
          </div>
        ) : (
          <span className="text-slate-400 dark:text-slate-500">Unassigned</span>
        )}

        {/* Age Badge */}
        <span className={`px-1.5 py-0.5 rounded border text-xs font-medium ${getAgeBadgeColor()}`}>
          {formatAge()}
        </span>
      </div>
    </div>
  );
}

export default KanbanCard;
