import { useState, useEffect } from 'react';
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
  Filter,
  FilterX,
  ChevronDown,
  ChevronUp,
  Play,
  Check,
  Search,
} from 'lucide-react';
import type { Issue, IssueStatus, Priority } from '@shared/types';
import { PRIORITY_LABELS } from '@shared/types';
import IssueViewModal from './IssueViewModal';

interface TableViewProps {
  issues: Issue[];
  onRefresh: () => void;
}

function TableView({ issues, onRefresh }: TableViewProps) {
  const [filterText, setFilterText] = useState('');
  const [activeDescription, setActiveDescription] = useState<Issue | null>(null);

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

  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Quick action state
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
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

  // Priority icons mapping
  const getPriorityIcon = (priority: Priority) => {
    switch (priority) {
      case 0: return <AlertOctagon className="w-3.5 h-3.5" />;
      case 1: return <AlertTriangle className="w-3.5 h-3.5" />;
      case 2: return <ArrowUp className="w-3.5 h-3.5" />;
      case 3: return <ArrowDown className="w-3.5 h-3.5" />;
      case 4: return <ArrowDownFromLine className="w-3.5 h-3.5" />;
      default: return <AlertCircle className="w-3.5 h-3.5" />;
    }
  };

  // Type icons mapping
  const getTypeIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t === 'bug') return <Bug className="w-3 h-3" />;
    if (t === 'feature') return <Box className="w-3 h-3" />;
    if (t === 'epic') return <Boxes className="w-3 h-3" />;
    return <ListCheck className="w-3 h-3" />; // Default (Task)
  };

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

  const getPriorityStyle = (priority: Priority) => {
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
  };

  const getTypeInfo = (type: string) => {
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
  };

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdown(null);
    if (openDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown]);

  const openDescription = (issue: Issue) => {
    setActiveDescription(issue);
  };

  const closeDescription = () => {
    setActiveDescription(null);
  };

  const handleStatusUpdate = async (issueId: string, newStatus: IssueStatus) => {
    setUpdatingStatus(issueId);
    try {
      const res = await fetch(`/api/issues/${issueId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update status');
      }
    } catch (err) {
      console.error(err);
      alert(`Failed to update status: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUpdatingStatus(null);
    }
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

  // FilterDropdown component
  interface FilterDropdownProps {
    column: string;
    values: (string | number)[];
    activeFilters: (string | number)[];
    onToggle: (value: string | number) => void;
    onClear: () => void;
  }

  const FilterDropdown = ({ column, values, activeFilters, onToggle, onClear }: FilterDropdownProps) => {
    const isOpen = openDropdown === column;
    const hasFilters = activeFilters.length > 0;

    const getDisplayValue = (value: string | number) => {
      if (column === 'priority') {
        return PRIORITY_LABELS[value as Priority] || value;
      }
      return value;
    };

    return (
      <div className="relative inline-block">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpenDropdown(isOpen ? null : column);
          }}
          className={`ml-2 p-1 rounded transition-colors ${
            hasFilters
              ? 'text-blue-600 hover:text-blue-700 bg-blue-50'
              : 'text-slate-400 hover:text-slate-600'
          }`}
          title={hasFilters ? `Filtered (${activeFilters.length})` : 'Filter'}
        >
          {hasFilters ? <Filter className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {isOpen && (
          <div
            className="absolute left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-[160px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2 border-b border-slate-100 flex justify-between items-center">
              <span className="text-xs font-medium text-slate-600 uppercase">Filter</span>
              {hasFilters && (
                <button
                  onClick={() => onClear()}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto">
              {values.map((value) => {
                const isSelected = activeFilters.includes(value);
                const displayValue = getDisplayValue(value);

                return (
                  <label
                    key={value}
                    className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggle(value)}
                      className="mr-2 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span
                      className={`capitalize ${
                        isSelected ? 'font-medium text-slate-900' : 'text-slate-700'
                      }`}
                    >
                      {displayValue}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
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
                    <FilterDropdown
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
                    <FilterDropdown
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
                    <FilterDropdown
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
              {filteredIssues.map((issue) => {
                const created = new Date(issue.created_at);
                const updated = issue.updated_at ? new Date(issue.updated_at) : null;
                const isClosed = issue.status === 'closed';
                const today = new Date();
                const ageInDays = Math.floor((today.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
                const isStale = !isClosed && ageInDays > 30;

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

                return (
                  <tr key={issue.id} className="hover:bg-slate-50 group">
                    <td className="px-6 py-3 font-mono text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{shortId}</span>
                        <button
                          onClick={() => handleCopy(issue.id)}
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
                          onClick={() => openDescription(issue)}
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
                              handlePriorityUpdate(issue.id, (issue.priority - 1) as Priority);
                            }
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            if (issue.priority < 4 && updatingPriority !== issue.id) {
                              handlePriorityUpdate(issue.id, (issue.priority + 1) as Priority);
                            }
                          }
                        }}
                      >
                        <button
                          onClick={() => handlePriorityUpdate(issue.id, (issue.priority - 1) as Priority)}
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
                          onClick={() => handlePriorityUpdate(issue.id, (issue.priority + 1) as Priority)}
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
                    <td className={`px-6 py-3 ${isStale ? 'text-red-600 font-bold' : 'text-slate-500'}`}>{age}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        {issue.status !== 'closed' && issue.status !== 'in_progress' && (
                          <button
                            onClick={() => handleStatusUpdate(issue.id, 'in_progress')}
                            disabled={updatingStatus === issue.id}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                            title="Start Progress"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {issue.status !== 'closed' && (
                          <button
                            onClick={() => handleStatusUpdate(issue.id, 'closed')}
                            disabled={updatingStatus === issue.id}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                            title="Close Issue"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
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