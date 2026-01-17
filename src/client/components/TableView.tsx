import { useState, useEffect } from 'react';
import { FilterX, Search } from 'lucide-react';
import type { Issue, IssueStatus, Priority } from '@shared/types';
import { PRIORITY_LABELS } from '@shared/types';
import IssueViewModal from './IssueViewModal';
import TableFilter from './TableFilter';
import TableRow from './TableRow';
import { AgingThresholdConfig } from '@/utils/agingAlerts';

interface TableViewProps {
  issues: Issue[];
  onRefresh: () => void;
  thresholdConfig: AgingThresholdConfig;
}

function TableView({ issues, onRefresh, thresholdConfig }: TableViewProps) {
  const [filterText, setFilterText] = useState('');
  const [activeDescription, setActiveDescription] = useState<Issue | null>(null);
  const [today] = useState(() => new Date());

  // Column filters with localStorage persistence
  const [statusFilter, setStatusFilter] = useState<IssueStatus[]>(() => {
    const saved = localStorage.getItem('beads-filter-status');
    return saved ? JSON.parse(saved) : [];
  });
  const [typeFilter, setTypeFilter] = useState<string[]>(() => {
    const saved = localStorage.getItem('beads-filter-type');
    return saved ? JSON.parse(saved) : [];
  });
  const [priorityFilter, setPriorityFilter] = useState<Priority[]>(() => {
    const saved = localStorage.getItem('beads-filter-priority');
    return saved ? JSON.parse(saved) : [];
  });

  // Priority update state
  const [updatingPriority, setUpdatingPriority] = useState<string | null>(null);

  // Persist filters to localStorage
  useEffect(() => {
    localStorage.setItem('beads-filter-status', JSON.stringify(statusFilter));
  }, [statusFilter]);

  useEffect(() => {
    localStorage.setItem('beads-filter-type', JSON.stringify(typeFilter));
  }, [typeFilter]);

  useEffect(() => {
    localStorage.setItem('beads-filter-priority', JSON.stringify(priorityFilter));
  }, [priorityFilter]);

  // Get unique values for filters
  const uniqueStatuses = Array.from(
    new Set(issues.filter((i) => i.status !== 'tombstone').map((i) => i.status))
  ).sort();

  const uniqueTypes = Array.from(
    new Set(
      issues
        .filter((i) => i.status !== 'tombstone' && i.issue_type)
        .map((i) => i.issue_type)
    )
  ).sort();

  const uniquePriorities = Array.from(
    new Set(
      issues
        .filter((i) => i.status !== 'tombstone' && i.priority !== undefined)
        .map((i) => i.priority)
    )
  ).sort((a, b) => a - b);

  // Filter issues based on all criteria
  const filteredIssues = issues.filter((issue) => {
    // 1. Exclude deleted issues
    if (issue.status === 'tombstone') return false;

    // 2. Apply column filters
    if (statusFilter.length > 0 && !statusFilter.includes(issue.status)) {
      return false;
    }
    if (typeFilter.length > 0 && !typeFilter.includes(issue.issue_type)) {
      return false;
    }
    if (priorityFilter.length > 0 && !priorityFilter.includes(issue.priority)) {
      return false;
    }

    // 3. Apply text filter if present
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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Filter management functions
  const toggleFilterValue = (filterType: string, value: string | number) => {
    if (filterType === 'status') {
      const newFilter = statusFilter.includes(value as IssueStatus)
        ? statusFilter.filter((v) => v !== value)
        : [...statusFilter, value as IssueStatus];
      setStatusFilter(newFilter);
    } else if (filterType === 'type') {
      const newFilter = typeFilter.includes(value as string)
        ? typeFilter.filter((v) => v !== value)
        : [...typeFilter, value as string];
      setTypeFilter(newFilter);
    } else if (filterType === 'priority') {
      const newFilter = priorityFilter.includes(value as Priority)
        ? priorityFilter.filter((v) => v !== value)
        : [...priorityFilter, value as Priority];
      setPriorityFilter(newFilter);
    }
  };

  const clearFilter = (filterType: string) => {
    if (filterType === 'status') setStatusFilter([]);
    else if (filterType === 'type') setTypeFilter([]);
    else if (filterType === 'priority') setPriorityFilter([]);
  };

  const clearAllFilters = () => {
    setStatusFilter([]);
    setTypeFilter([]);
    setPriorityFilter([]);
  };

  const hasActiveFilters =
    statusFilter.length > 0 || typeFilter.length > 0 || priorityFilter.length > 0;

  const openDescription = (issue: Issue) => {
    setActiveDescription(issue);
  };

  const closeDescription = () => {
    setActiveDescription(null);
  };

  const handlePriorityUpdate = async (issueId: string, newPriority: Priority) => {
    setUpdatingPriority(issueId);
    try {
      const res = await fetch(`/api/issues/${issueId}/priority`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update priority');
      }
    } catch (err) {
      console.error(err);
      alert(`Failed to update priority: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUpdatingPriority(null);
    }
  };

  return (
    <>
      <div className="card overflow-hidden">
        {/* Search Control */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50">
          <div className="relative">
            <input
              type="text"
              placeholder="Filter by ID, Title, Status, Type, or Priority..."
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          </div>
        </div>

        {/* Clear All Filters Button */}
        {hasActiveFilters && (
          <div className="px-4 py-2 border-b border-slate-200 bg-blue-50/50 flex items-center justify-between">
            <span className="text-xs text-slate-600">
              {statusFilter.length + typeFilter.length + priorityFilter.length} filter(s) active
            </span>
            <button
              onClick={clearAllFilters}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <FilterX className="w-3.5 h-3.5" />
              Clear All Filters
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b">
              <tr>
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">
                  <div className="flex items-center">
                    Type
                    <TableFilter
                      column="type"
                      values={uniqueTypes}
                      activeFilters={typeFilter}
                      onToggle={(value) => toggleFilterValue('type', value)}
                      onClear={() => clearFilter('type')}
                    />
                  </div>
                </th>
                <th className="px-6 py-3">
                  <div className="flex items-center">
                    Priority
                    <TableFilter
                      column="priority"
                      values={uniquePriorities}
                      activeFilters={priorityFilter}
                      onToggle={(value) => toggleFilterValue('priority', value)}
                      onClear={() => clearFilter('priority')}
                    />
                  </div>
                </th>
                <th className="px-6 py-3">
                  <div className="flex items-center">
                    Status
                    <TableFilter
                      column="status"
                      values={uniqueStatuses}
                      activeFilters={statusFilter}
                      onToggle={(value) => toggleFilterValue('status', value)}
                      onClear={() => clearFilter('status')}
                    />
                  </div>
                </th>
                <th className="px-6 py-3">Created</th>
                <th className="px-6 py-3">Updated</th>
                <th className="px-6 py-3">Cycle Time</th>
                <th className="px-6 py-3">Age</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIssues.map((issue) => (
                <TableRow
                  key={issue.id}
                  issue={issue}
                  today={today}
                  thresholdConfig={thresholdConfig}
                  onOpenDescription={openDescription}
                  onCopy={handleCopy}
                  onPriorityUpdate={handlePriorityUpdate}
                  updatingPriority={updatingPriority}
                />
              ))}
              {filteredIssues.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center text-slate-400">
                    No issues found matching "{filterText}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Description Modal */}
      {activeDescription && (
        <IssueViewModal 
          issue={activeDescription} 
          onClose={closeDescription} 
          onUpdate={onRefresh}
        />
      )}
    </>
  );
}

export default TableView;