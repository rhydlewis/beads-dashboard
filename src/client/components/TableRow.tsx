import {
  AlertOctagon,
  AlertTriangle,
  AlertCircle,
  ArrowDown,
  ArrowDownFromLine,
  ArrowUp,
  Copy,
  PanelTopOpen,
  Bug,
  Box,
  Boxes,
  ListCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Issue, Priority } from '@shared/types';
import { PRIORITY_LABELS } from '@shared/types';
import {
  AgingThresholdConfig,
  classifyIssueAge,
  getAgingStatusClass,
  getIssueAgeHours,
  formatAgeDisplay,
} from '@/utils/agingAlerts';
import { extractShortId } from '@/utils/commonUtils';
import QuickActions from './QuickActions';

interface TableRowProps {
  issue: Issue;
  today: Date;
  thresholdConfig: AgingThresholdConfig;
  onOpenDescription: (issue: Issue) => void;
  onCopy: (text: string) => void;
  onPriorityUpdate: (issueId: string, priority: Priority) => void;
  updatingPriority: string | null;
}

export default function TableRow({
  issue,
  today,
  thresholdConfig,
  onOpenDescription,
  onCopy,
  onPriorityUpdate,
  updatingPriority,
}: TableRowProps) {
  const created = new Date(issue.created_at);
  const updated = issue.updated_at ? new Date(issue.updated_at) : null;
  const isClosed = issue.status === 'closed';
  const ageInDays = Math.floor((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

  let cycleTime = '-';
  let age = '-';

  if (isClosed && updated) {
    const diff = Math.ceil((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    cycleTime = `${diff}d`;
  } else {
    age = `${ageInDays}d`;
  }

  const priorityLabel = PRIORITY_LABELS[issue.priority] || issue.priority;
  const PriorityIcon = getPriorityIcon(issue.priority);

  // Remove prefix from ID
  const shortId = extractShortId(issue.id);
  const typeInfo = getTypeInfo(issue.issue_type);

  // Calculate aging status
  const agingStatus = classifyIssueAge(issue, thresholdConfig, today);
  const agingClass = getAgingStatusClass(agingStatus);
  const ageHours = getIssueAgeHours(issue, today);
  const ageDisplay = formatAgeDisplay(ageHours);

  return (
    <tr key={issue.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700 group ${agingClass}`}>
      <td className="px-6 py-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span>{shortId}</span>
          <button
            onClick={() => onCopy(issue.id)}
            className="text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 transition-colors opacity-0 group-hover:opacity-100"
            title="Copy full ID"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
      <td className="px-6 py-3 font-medium text-slate-900 dark:text-slate-100">
        <div className="flex items-center gap-2">
          <span>{issue.title || 'Untitled'}</span>
          <button
            onClick={() => onOpenDescription(issue)}
            className="ml-auto text-slate-300 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="View Description"
          >
            <PanelTopOpen className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
      <td className="px-6 py-3">
        <span className={`capitalize inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${typeInfo.class}`}>
          {typeInfo.icon}
          {issue.issue_type}
        </span>
      </td>
      <td className="px-6 py-3">
        <div
          className="flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1 -ml-1"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (issue.priority > 0 && updatingPriority !== issue.id) {
                onPriorityUpdate(issue.id, (issue.priority - 1) as Priority);
              }
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (issue.priority < 4 && updatingPriority !== issue.id) {
                onPriorityUpdate(issue.id, (issue.priority + 1) as Priority);
              }
            }
          }}
        >
          <button
            onClick={() => onPriorityUpdate(issue.id, (issue.priority - 1) as Priority)}
            disabled={issue.priority === 0 || updatingPriority === issue.id}
            className="text-slate-300 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 disabled:text-slate-200 dark:disabled:text-slate-700 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-0.5"
            title="Increase Priority (Up Arrow)"
            tabIndex={-1}
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${getPriorityStyle(issue.priority)}`}>
            {PriorityIcon}
            {priorityLabel}
          </span>
          <button
            onClick={() => onPriorityUpdate(issue.id, (issue.priority + 1) as Priority)}
            disabled={issue.priority === 4 || updatingPriority === issue.id}
            className="text-slate-300 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 disabled:text-slate-200 dark:disabled:text-slate-700 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-0.5"
            title="Decrease Priority (Down Arrow)"
            tabIndex={-1}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
      <td className="px-6 py-3">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
            ${
              issue.status === 'closed'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                : issue.status === 'in_progress'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                : issue.status === 'blocked'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                : issue.status === 'deferred'
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                : issue.status === 'pinned'
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                : issue.status === 'hooked'
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200'
            }`}
        >
          {issue.status}
        </span>
      </td>
      <td className="px-6 py-3 text-slate-500 dark:text-slate-400">{created.toLocaleDateString()}</td>
      <td className="px-6 py-3 text-slate-500 dark:text-slate-400">{updated ? updated.toLocaleDateString() : '-'}</td>
      <td className="px-6 py-3 text-slate-500 dark:text-slate-400">{cycleTime}</td>
      <td className={`px-6 py-3 ${agingStatus === 'critical' ? 'text-red-600 dark:text-red-400 font-bold' : agingStatus === 'warning' ? 'text-yellow-600 dark:text-yellow-400 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
        {agingStatus === 'normal' ? age : (
          <div className="flex items-center gap-1">
            {agingStatus === 'critical' ? (
              <AlertOctagon className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            <span>{ageDisplay}</span>
          </div>
        )}
      </td>
      <td className="px-6 py-3">
        <QuickActions issue={issue} />
      </td>
    </tr>
  );
}

// Helper functions (kept internal to this component for now)
function getPriorityIcon(priority: Priority) {
  switch (priority) {
    case 0: return <AlertOctagon className="w-3.5 h-3.5" />;
    case 1: return <AlertTriangle className="w-3.5 h-3.5" />;
    case 2: return <ArrowUp className="w-3.5 h-3.5" />;
    case 3: return <ArrowDown className="w-3.5 h-3.5" />;
    case 4: return <ArrowDownFromLine className="w-3.5 h-3.5" />;
    default: return <AlertCircle className="w-3.5 h-3.5" />;
  }
}

function getTypeInfo(type: string) {
  const t = (type || '').toLowerCase();
  if (t === 'bug')
    return {
      class: 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 ring-1 ring-inset ring-rose-600/20 dark:ring-rose-500/30',
      icon: <Bug className="w-3 h-3" />,
    };
  if (t === 'feature')
    return {
      class: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 ring-1 ring-inset ring-purple-700/10 dark:ring-purple-500/30',
      icon: <Box className="w-3 h-3" />,
    };
  if (t === 'epic')
    return {
      class: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-700/10 dark:ring-indigo-500/30',
      icon: <Boxes className="w-3 h-3" />,
    };
  return {
    class: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-700/10 dark:ring-blue-500/30',
    icon: <ListCheck className="w-3 h-3" />,
  };
}

function getPriorityStyle(priority: Priority) {
  switch (priority) {
    case 0:
      return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800';
    case 1:
      return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800';
    case 2:
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800';
    case 3:
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800';
    case 4:
      return 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600';
    default:
      return 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600';
  }
}
