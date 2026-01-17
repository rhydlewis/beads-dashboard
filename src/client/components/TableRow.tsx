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
  const shortId = issue.id.includes('-') ? issue.id.split('-').pop() : issue.id;
  const typeInfo = getTypeInfo(issue.issue_type);

  // Calculate aging status
  const agingStatus = classifyIssueAge(issue, thresholdConfig, today);
  const agingClass = getAgingStatusClass(agingStatus);
  const ageHours = getIssueAgeHours(issue, today);
  const ageDisplay = formatAgeDisplay(ageHours);

  return (
    <tr key={issue.id} className={`hover:bg-slate-50 group ${agingClass}`}>
      <td className="px-6 py-3 font-mono text-slate-500 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span>{shortId}</span>
          <button
            onClick={() => onCopy(issue.id)}
            className="text-slate-300 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
            title="Copy full ID"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
      <td className="px-6 py-3 font-medium text-slate-900">
        <div className="flex items-center gap-2">
          <span>{issue.title || 'Untitled'}</span>
          <button
            onClick={() => onOpenDescription(issue)}
            className="ml-auto text-slate-300 hover:text-blue-600 transition-colors"
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
            className="text-slate-300 hover:text-blue-600 disabled:text-slate-200 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-0.5"
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
            className="text-slate-300 hover:text-blue-600 disabled:text-slate-200 disabled:cursor-not-allowed opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-0.5"
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
                ? 'bg-green-100 text-green-800'
                : issue.status === 'in_progress'
                ? 'bg-blue-100 text-blue-800'
                : issue.status === 'blocked'
                ? 'bg-red-100 text-red-800'
                : issue.status === 'deferred'
                ? 'bg-amber-100 text-amber-800'
                : issue.status === 'pinned'
                ? 'bg-purple-100 text-purple-800'
                : issue.status === 'hooked'
                ? 'bg-indigo-100 text-indigo-800'
                : 'bg-slate-100 text-slate-800'
            }`}
        >
          {issue.status}
        </span>
      </td>
      <td className="px-6 py-3 text-slate-500">{created.toLocaleDateString()}</td>
      <td className="px-6 py-3 text-slate-500">{updated ? updated.toLocaleDateString() : '-'}</td>
      <td className="px-6 py-3 text-slate-500">{cycleTime}</td>
      <td className={`px-6 py-3 ${agingStatus === 'critical' ? 'text-red-600 font-bold' : agingStatus === 'warning' ? 'text-yellow-600 font-medium' : 'text-slate-500'}`}>
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
      class: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20',
      icon: <Bug className="w-3 h-3" />,
    };
  if (t === 'feature')
    return {
      class: 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-700/10',
      icon: <Box className="w-3 h-3" />,
    };
  if (t === 'epic')
    return {
      class: 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-700/10',
      icon: <Boxes className="w-3 h-3" />,
    };
  return {
    class: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10',
    icon: <ListCheck className="w-3 h-3" />,
  };
}

function getPriorityStyle(priority: Priority) {
  switch (priority) {
    case 0:
      return 'bg-red-100 text-red-800 border border-red-200';
    case 1:
      return 'bg-orange-100 text-orange-800 border border-orange-200';
    case 2:
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    case 3:
      return 'bg-green-100 text-green-800 border border-green-200';
    case 4:
      return 'bg-slate-100 text-slate-800 border border-slate-200';
    default:
      return 'bg-slate-100 text-slate-800 border border-slate-200';
  }
}
