import { useState } from 'react';
import { AlertTriangle, AlertOctagon, Clock, User, Bug, Box, Boxes, ListCheck, Filter } from 'lucide-react';
import type { Issue } from '@shared/types';
import {
  AgingThresholdConfig,
  getAgingIssues,
} from '@/utils/agingAlerts';
import { extractShortId } from '@/utils/commonUtils';

interface AgingAlertListProps {
  issues: Issue[];
  onConfigureClick: () => void;
  thresholdConfig: AgingThresholdConfig;
}

export function AgingAlertList({ issues, onConfigureClick, thresholdConfig }: AgingAlertListProps) {
  const [today] = useState(() => new Date());
  const [filterStatus, setFilterStatus] = useState<'all' | 'warning' | 'critical'>('all');
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Type icons mapping
  const getTypeIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t === 'bug') return <Bug className="w-3 h-3" />;
    if (t === 'feature') return <Box className="w-3 h-3" />;
    if (t === 'epic') return <Boxes className="w-3 h-3" />;
    return <ListCheck className="w-3 h-3" />; // Default (Task)
  };

  // Get all aging issues
  const allAgingIssues = getAgingIssues(issues, thresholdConfig, today);

  // Apply filters
  const filteredIssues = allAgingIssues.filter((item) => {
    // Filter by status
    if (filterStatus !== 'all' && item.status !== filterStatus) {
      return false;
    }

    // Filter by assignee
    if (filterAssignee && item.issue.assignee !== filterAssignee) {
      return false;
    }

    return true;
  });

  // Get unique assignees for filter
  const uniqueAssignees = Array.from(
    new Set(
      allAgingIssues
        .map((item) => item.issue.assignee)
        .filter((assignee): assignee is string => !!assignee)
    )
  ).sort();

  // Clear filters
  const clearFilters = () => {
    setFilterStatus('all');
    setFilterAssignee(null);
  };

  const hasFilters = filterStatus !== 'all' || filterAssignee !== null;

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Aging Work Items</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {filteredIssues.length} of {allAgingIssues.length} items exceeding thresholds
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onConfigureClick}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center gap-1.5"
          >
            <Settings className="w-4 h-4" />
            Configure Thresholds
          </button>

          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                hasFilters
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600'
              }`}
            >
              <Filter className="w-4 h-4" />
              {hasFilters ? 'Filters Active' : 'Filter'}
            </button>

            {showFilters && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg z-50">
                <div className="p-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Filters</h4>
                  {hasFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="p-3 space-y-4">
                  {/* Status Filter */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as 'all' | 'warning' | 'critical')}
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Statuses</option>
                      <option value="warning">Warning Only</option>
                      <option value="critical">Critical Only</option>
                    </select>
                  </div>

                  {/* Assignee Filter */}
                  {uniqueAssignees.length > 0 && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Assignee</label>
                      <select
                        value={filterAssignee || ''}
                        onChange={(e) => setFilterAssignee(e.target.value || null)}
                        className="w-full px-2 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">All Assignees</option>
                        {uniqueAssignees.map((assignee) => (
                          <option key={assignee} value={assignee}>{assignee}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`card ${filterStatus === 'warning' || filterStatus === 'all' ? '' : 'opacity-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${filterStatus === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-yellow-50 dark:bg-yellow-900/20'}`}>
              <AlertTriangle className={`w-5 h-5 ${filterStatus === 'warning' ? 'text-yellow-700 dark:text-yellow-400' : 'text-yellow-500 dark:text-yellow-500'}`} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
                {allAgingIssues.filter((item) => item.status === 'warning').length}
              </div>
              <div className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase">Warning Items</div>
            </div>
          </div>
        </div>

        <div className={`card ${filterStatus === 'critical' || filterStatus === 'all' ? '' : 'opacity-50'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${filterStatus === 'critical' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-red-50 dark:bg-red-900/20'}`}>
              <AlertOctagon className={`w-5 h-5 ${filterStatus === 'critical' ? 'text-red-700 dark:text-red-400' : 'text-red-500 dark:text-red-500'}`} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-800 dark:text-slate-100">
                {allAgingIssues.filter((item) => item.status === 'critical').length}
              </div>
              <div className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase">Critical Items</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium border-b dark:border-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Issue</th>
                <th className="px-4 py-3 text-left">Age</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Assignee</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                    No aging items found matching filters
                  </td>
                </tr>
              ) : (
                filteredIssues.map(({ issue, ageDisplay, status, ageHours }) => {
                  const shortId = extractShortId(issue.id);
                  const createdDate = new Date(issue.created_at);

                  return (
                    <tr
                      key={issue.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                        status === 'critical'
                          ? 'bg-red-50/50 dark:bg-red-900/20 border-l-4 border-red-300 dark:border-red-500'
                          : 'bg-yellow-50/50 dark:bg-yellow-900/20 border-l-4 border-yellow-300 dark:border-yellow-500'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-500 dark:text-slate-400 text-xs">{shortId}</span>
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {issue.title || 'Untitled'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                          <div>
                            <div className={`font-medium ${status === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                              {ageDisplay}
                            </div>
                            <div className="text-xs text-slate-400 dark:text-slate-500">
                              {ageHours >= 24 ? 'Over 1 day' : 'Recent'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          status === 'critical'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                        }`}>
                          {status === 'critical' ? 'Critical' : 'Warning'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {issue.assignee ? (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                            <span className="text-slate-700 dark:text-slate-300">{issue.assignee}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-xs">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          {getTypeIcon(issue.issue_type)}
                          {issue.issue_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {createdDate.toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredIssues.length > 0 && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-700 text-xs text-slate-500 dark:text-slate-400">
            Showing {filteredIssues.length} of {allAgingIssues.length} aging items
          </div>
        )}
      </div>

      {/* Threshold Information */}
      <div className="card">
        <h3 className="text-sm font-bold mb-3 text-slate-700 dark:text-slate-200">Current Thresholds</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-700 dark:text-yellow-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Warning Threshold</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {thresholdConfig.warningThreshold} {thresholdConfig.warningUnit}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertOctagon className="w-5 h-5 text-red-700 dark:text-red-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Critical Threshold</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {thresholdConfig.criticalThreshold} {thresholdConfig.criticalUnit}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Settings icon import for the component
import { Settings } from 'lucide-react';