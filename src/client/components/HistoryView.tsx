import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Bug, Box, Boxes, ListCheck, Inbox } from 'lucide-react';
import type { Issue, IssueType } from '@shared/types';
import type { TimeDisplayMode } from '@/utils/timeFormatting';
import { formatTimestamp, formatCycleTime } from '@/utils/timeFormatting';
import { extractShortId } from '@/utils/commonUtils';

interface HistoryViewProps {
  issues: Issue[];
  timeDisplayMode: TimeDisplayMode;
}

type RangeMode = 7 | 30 | 90 | 'custom';

const TYPE_ORDER: IssueType[] = ['feature', 'bug', 'task', 'epic'];

const TYPE_LABELS: Record<IssueType, string> = {
  feature: 'Features',
  bug: 'Bugs',
  task: 'Tasks',
  epic: 'Epics',
};

const TYPE_ICONS: Record<IssueType, React.ReactNode> = {
  feature: <Box className="w-4 h-4" />,
  bug: <Bug className="w-4 h-4" />,
  task: <ListCheck className="w-4 h-4" />,
  epic: <Boxes className="w-4 h-4" />,
};

const TYPE_COLORS: Record<IssueType, string> = {
  feature: 'text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  bug: 'text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
  task: 'text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  epic: 'text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
};

function getTestHint(issue: Issue): string | null {
  if (issue.acceptance_criteria) return issue.acceptance_criteria;
  if (issue.design) return issue.design;
  return null;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '...';
}

function HistoryView({ issues, timeDisplayMode }: HistoryViewProps) {
  const [rangeMode, setRangeMode] = useState<RangeMode>(30);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { rangeStart, rangeEnd } = useMemo(() => {
    const now = new Date();
    if (rangeMode === 'custom') {
      return {
        rangeStart: customStart ? new Date(customStart + 'T00:00:00') : null,
        rangeEnd: customEnd ? new Date(customEnd + 'T23:59:59.999') : null,
      };
    }
    const start = new Date(now);
    start.setDate(start.getDate() - rangeMode);
    start.setHours(0, 0, 0, 0);
    return { rangeStart: start, rangeEnd: now };
  }, [rangeMode, customStart, customEnd]);

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (issue.status !== 'closed') return false;
      if (!issue.closed_at) return false;
      const closedDate = new Date(issue.closed_at);
      if (rangeStart && closedDate < rangeStart) return false;
      if (rangeEnd && closedDate > rangeEnd) return false;
      return true;
    });
  }, [issues, rangeStart, rangeEnd]);

  const groupedIssues = useMemo(() => {
    const groups = new Map<IssueType, Issue[]>();
    for (const type of TYPE_ORDER) {
      const matching = filteredIssues.filter((i) => i.issue_type === type);
      if (matching.length > 0) {
        // Sort by closed_at descending (most recent first)
        matching.sort((a, b) => new Date(b.closed_at!).getTime() - new Date(a.closed_at!).getTime());
        groups.set(type, matching);
      }
    }
    return groups;
  }, [filteredIssues]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const rangeLabel = rangeMode === 'custom'
    ? (customStart || customEnd ? `${customStart || '...'} to ${customEnd || '...'}` : 'custom range')
    : `last ${rangeMode} days`;

  const presetButtonClass = (mode: RangeMode) =>
    `px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
      rangeMode === mode
        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600'
    }`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">History</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {filteredIssues.length} item{filteredIssues.length !== 1 ? 's' : ''} closed in the {rangeLabel}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button className={presetButtonClass(7)} onClick={() => setRangeMode(7)}>7 days</button>
          <button className={presetButtonClass(30)} onClick={() => setRangeMode(30)}>30 days</button>
          <button className={presetButtonClass(90)} onClick={() => setRangeMode(90)}>90 days</button>
          <button className={presetButtonClass('custom')} onClick={() => setRangeMode('custom')}>Custom</button>
        </div>
      </div>

      {/* Custom date range */}
      {rangeMode === 'custom' && (
        <div className="card flex items-center gap-3 flex-wrap">
          <label className="text-sm text-slate-600 dark:text-slate-400">From</label>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <label className="text-sm text-slate-600 dark:text-slate-400">to</label>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}

      {/* Grouped issue list */}
      {filteredIssues.length === 0 ? (
        <div className="card py-16 text-center">
          <Inbox className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-400 dark:text-slate-500 text-sm">No beads closed in this time range</p>
        </div>
      ) : (
        Array.from(groupedIssues.entries()).map(([type, typeIssues]) => (
          <div key={type} className="space-y-2">
            {/* Group header */}
            <div className={`flex items-center gap-2 text-sm font-semibold ${TYPE_COLORS[type].split(' ').slice(0, 2).join(' ')}`}>
              {TYPE_ICONS[type]}
              <span>{TYPE_LABELS[type]} ({typeIssues.length})</span>
              <div className={`flex-1 border-t ${TYPE_COLORS[type].split(' ').slice(2).join(' ')}`} />
            </div>

            {/* Issue cards */}
            {typeIssues.map((issue) => {
              const isExpanded = expandedIds.has(issue.id);
              const shortId = extractShortId(issue.id);
              const closedDisplay = formatTimestamp(issue.closed_at, timeDisplayMode);
              const cycleTime = formatCycleTime(issue.created_at, issue.closed_at, timeDisplayMode);
              const testHint = getTestHint(issue);

              return (
                <div key={issue.id} className="card !p-0 overflow-hidden">
                  {/* Collapsed row */}
                  <button
                    onClick={() => toggleExpanded(issue.id)}
                    className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <span className="mt-0.5 text-slate-400 dark:text-slate-500 flex-shrink-0">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {issue.title || 'Untitled'}
                        </span>
                        <span className="font-mono text-xs text-slate-400 dark:text-slate-500">{shortId}</span>
                      </div>
                      {!isExpanded && (issue.description || testHint) && (
                        <div className="mt-1 space-y-0.5">
                          {issue.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              <span className="font-medium text-slate-400 dark:text-slate-500">Why: </span>
                              {truncate(issue.description, 150)}
                            </p>
                          )}
                          {testHint && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              <span className="font-medium text-slate-400 dark:text-slate-500">Test: </span>
                              {truncate(testHint, 150)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 whitespace-nowrap">
                      <div>closed {closedDisplay}</div>
                      <div>{cycleTime} cycle time</div>
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 ml-7 space-y-3 border-t border-slate-100 dark:border-slate-700">
                      {issue.description && (
                        <div className="pt-3">
                          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Description</h4>
                          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{issue.description}</p>
                        </div>
                      )}
                      {issue.acceptance_criteria && (
                        <div>
                          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Acceptance Criteria</h4>
                          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{issue.acceptance_criteria}</p>
                        </div>
                      )}
                      {issue.design && (
                        <div>
                          <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Design</h4>
                          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{issue.design}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}

export default HistoryView;
