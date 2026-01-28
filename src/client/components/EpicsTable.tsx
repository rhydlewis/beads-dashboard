import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Boxes,
  Bug,
  Box,
  ListCheck,
  FilterX,
  PanelTopOpen,
  Search,
  Settings,
  Play,
  Check,
  Copy,
} from 'lucide-react';
import type { Issue, IssueStatus, Priority } from '@shared/types';
import { PRIORITY_LABELS } from '@shared/types';
import FilterDropdown from './FilterDropdown';
import IssueViewModal from './IssueViewModal';
import DependenciesModal from './DependenciesModal';
import { formatTimestamp, formatAge, formatCycleTime, type TimeDisplayMode } from '@/utils/timeFormatting';

interface EpicsTableProps {
  issues: Issue[];
  onSelectChildren: (epicId: string) => void;
  timeDisplayMode?: TimeDisplayMode;
}

type EpicSortColumn = 'id' | 'title' | 'type' | 'status' | 'priority' | 'assignee' | 'created' | 'updated' | 'children' | 'cycleTime' | 'age' | 'actions';

interface ColumnConfig {
  key: EpicSortColumn;
  label: string;
  visible: boolean;
  width: number;
  minWidth: number;
  resizable: boolean;
}

const DEFAULT_COLUMN_CONFIGS: ColumnConfig[] = [
  { key: 'id', label: 'ID', visible: true, width: 120, minWidth: 80, resizable: true },
  { key: 'title', label: 'Title', visible: true, width: 300, minWidth: 150, resizable: true },
  { key: 'type', label: 'Type', visible: true, width: 100, minWidth: 80, resizable: true },
  { key: 'children', label: 'Children', visible: true, width: 140, minWidth: 100, resizable: true },
  { key: 'status', label: 'Status', visible: true, width: 130, minWidth: 100, resizable: true },
  { key: 'priority', label: 'Priority', visible: true, width: 120, minWidth: 100, resizable: true },
  { key: 'assignee', label: 'Assignee', visible: true, width: 140, minWidth: 100, resizable: true },
  { key: 'created', label: 'Created', visible: true, width: 120, minWidth: 100, resizable: true },
  { key: 'updated', label: 'Updated', visible: true, width: 120, minWidth: 100, resizable: true },
  { key: 'cycleTime', label: 'Cycle Time', visible: true, width: 100, minWidth: 80, resizable: true },
  { key: 'age', label: 'Age', visible: true, width: 80, minWidth: 60, resizable: true },
  { key: 'actions', label: 'Actions', visible: true, width: 120, minWidth: 100, resizable: false },
];

const CLOSED_CHILD_STATUSES: IssueStatus[] = ['closed', 'tombstone'];
const DAY_IN_MS = 1000 * 60 * 60 * 24;

const getAgeInDays = (issue: Issue) => Math.floor((Date.now() - new Date(issue.created_at).getTime()) / DAY_IN_MS);

const getCycleTimeDays = (issue: Issue) => {
  if (issue.status !== 'closed' || !issue.updated_at) return null;
  const created = new Date(issue.created_at).getTime();
  const updated = new Date(issue.updated_at).getTime();
  return Math.ceil((updated - created) / DAY_IN_MS);
};

function EpicsTable({ issues, onSelectChildren, timeDisplayMode = 'day' }: EpicsTableProps) {
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState<IssueStatus[]>(() => {
    const saved = localStorage.getItem('beads-epics-filter-status');
    return saved ? JSON.parse(saved) : [];
  });
  const [priorityFilter, setPriorityFilter] = useState<Priority[]>(() => {
    const saved = localStorage.getItem('beads-epics-filter-priority');
    return saved ? JSON.parse(saved) : [];
  });
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ column: EpicSortColumn; direction: 'asc' | 'desc' }>(() => ({
    column: 'title',
    direction: 'asc',
  }));
  const [activeDescription, setActiveDescription] = useState<Issue | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [dependenciesIssue, setDependenciesIssue] = useState<Issue | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; issue: Issue } | null>(null);
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1);
  const tableBodyRef = useRef<HTMLTableSectionElement>(null);

  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>(() => {
    const saved = localStorage.getItem('beads-epics-column-config');
    if (saved) {
      const parsed = JSON.parse(saved) as ColumnConfig[];
      return DEFAULT_COLUMN_CONFIGS.map(defaultCol => {
        const savedCol = parsed.find(c => c.key === defaultCol.key);
        return savedCol ? { ...defaultCol, ...savedCol } : defaultCol;
      });
    }
    return DEFAULT_COLUMN_CONFIGS;
  });

  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('beads-epics-filter-status', JSON.stringify(statusFilter));
  }, [statusFilter]);

  useEffect(() => {
    localStorage.setItem('beads-epics-filter-priority', JSON.stringify(priorityFilter));
  }, [priorityFilter]);

  useEffect(() => {
    localStorage.setItem('beads-epics-column-config', JSON.stringify(columnConfigs));
  }, [columnConfigs]);

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdown(null);
      setColumnMenuOpen(false);
      setContextMenu(null);
    };
    if (openDropdown || columnMenuOpen || contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown, columnMenuOpen, contextMenu]);

  // Handle context menu close on scroll
  useEffect(() => {
    if (!contextMenu) return;
    const handleScroll = () => setContextMenu(null);
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [contextMenu]);

  useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartX.current;
      const newWidth = Math.max(resizeStartWidth.current + delta, 50);

      setColumnConfigs(prev =>
        prev.map(col =>
          col.key === resizingColumn ? { ...col, width: Math.max(newWidth, col.minWidth) } : col
        )
      );
    };

    const handleMouseUp = () => {
      setResizingColumn(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumn]);

  const epics = useMemo(
    () => issues.filter((issue) => issue.issue_type === 'epic' && issue.status !== 'tombstone'),
    [issues]
  );
  const epicIds = useMemo(() => new Set(epics.map((epic) => epic.id)), [epics]);

  const childCountMap = useMemo(() => {
    const map = new Map<string, { open: number; total: number }>();

    issues.forEach((issue) => {
      if (issue.issue_type === 'epic') return;
      const parents = new Set<string>();
      if (issue.parent_id && epicIds.has(issue.parent_id)) {
        parents.add(issue.parent_id);
      }
      issue.dependencies?.forEach((dep) => {
        if (epicIds.has(dep)) {
          parents.add(dep);
        }
      });

      if (parents.size === 0) return;
      const isOpen = !CLOSED_CHILD_STATUSES.includes(issue.status);

      parents.forEach((parentId) => {
        const current = map.get(parentId) ?? { open: 0, total: 0 };
        map.set(parentId, {
          total: current.total + 1,
          open: current.open + (isOpen ? 1 : 0),
        });
      });
    });

    return map;
  }, [issues, epicIds]);

  const getChildCounts = (epicId: string) => childCountMap.get(epicId) ?? { open: 0, total: 0 };

  const getTypeIcon = (type: string) => {
    const t = (type || '').toLowerCase();
    if (t === 'bug') return <Bug className="w-3 h-3" />;
    if (t === 'feature') return <Box className="w-3 h-3" />;
    if (t === 'epic') return <Boxes className="w-3 h-3" />;
    return <ListCheck className="w-3 h-3" />;
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleContextMenu = (e: React.MouseEvent, issue: Issue) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, issue });
  };

  const handleShowDependencies = (issue: Issue) => {
    setDependenciesIssue(issue);
    setContextMenu(null);
  };

  const handleViewIssueFromDependencies = (issueId: string) => {
    const issue = issues.find(i => i.id === issueId);
    if (issue) {
      setActiveDescription(issue);
    }
  };

  const filteredEpics = epics.filter((epic) => {
    if (statusFilter.length > 0 && !statusFilter.includes(epic.status)) return false;
    if (priorityFilter.length > 0 && !priorityFilter.includes(epic.priority)) return false;

    if (!filterText) return true;
    const searchLower = filterText.toLowerCase();
    return (
      epic.id.toLowerCase().includes(searchLower) ||
      (epic.title || '').toLowerCase().includes(searchLower) ||
      (epic.assignee || '').toLowerCase().includes(searchLower)
    );
  });

  const sortedEpics = [...filteredEpics].sort((a, b) => {
    const direction = sortConfig.direction === 'asc' ? 1 : -1;

    const compareStrings = (strA: string, strB: string) => direction * strA.localeCompare(strB, undefined, { sensitivity: 'base' });
    const compareNumbers = (aValue: number, bValue: number) => direction * (aValue - bValue);

    switch (sortConfig.column) {
      case 'id':
        return compareStrings(a.id, b.id);
      case 'title':
        return compareStrings(a.title || '', b.title || '');
      case 'type':
        return compareStrings(a.issue_type, b.issue_type);
      case 'status':
        return compareStrings(a.status, b.status);
      case 'priority':
        return compareNumbers(a.priority, b.priority);
      case 'assignee':
        return compareStrings(a.assignee || '', b.assignee || '');
      case 'created':
        return compareNumbers(new Date(a.created_at).getTime(), new Date(b.created_at).getTime());
      case 'updated':
        return compareNumbers(
          a.updated_at ? new Date(a.updated_at).getTime() : 0,
          b.updated_at ? new Date(b.updated_at).getTime() : 0
        );
      case 'cycleTime':
        return compareNumbers(getCycleTimeDays(a) ?? Number.POSITIVE_INFINITY, getCycleTimeDays(b) ?? Number.POSITIVE_INFINITY);
      case 'age':
        return compareNumbers(getAgeInDays(a), getAgeInDays(b));
      case 'children': {
        const countsA = getChildCounts(a.id);
        const countsB = getChildCounts(b.id);
        if (countsA.open !== countsB.open) {
          return compareNumbers(countsA.open, countsB.open);
        }
        return compareNumbers(countsA.total, countsB.total);
      }
      default:
        return 0;
    }
  });

  const uniqueStatuses = useMemo(
    () => Array.from(new Set(epics.map((epic) => epic.status))).sort(),
    [epics]
  );
  const uniquePriorities = useMemo(
    () => Array.from(new Set(epics.map((epic) => epic.priority))).sort((a, b) => a - b),
    [epics]
  );

  const hasActiveFilters = statusFilter.length > 0 || priorityFilter.length > 0;

  const handleSort = (column: EpicSortColumn) => {
    setSortConfig((prev) => {
      if (prev.column === column) {
        return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { column, direction: 'asc' };
    });
  };

  const renderSortIndicator = (column: EpicSortColumn) => {
    if (sortConfig.column !== column) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 dark:text-slate-500" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
    );
  };

  const openDescription = (issue: Issue) => {
    setActiveDescription(issue);
  };

  const closeDescription = () => {
    setActiveDescription(null);
  };

  const handleResizeStart = (columnKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const column = columnConfigs.find(c => c.key === columnKey);
    if (!column) return;

    setResizingColumn(columnKey);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = column.width;
  };

  const toggleColumnVisibility = (columnKey: EpicSortColumn) => {
    setColumnConfigs(prev =>
      prev.map(col =>
        col.key === columnKey ? { ...col, visible: !col.visible } : col
      )
    );
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
        throw new Error('Failed to update status');
      }

      // Data will auto-refresh via Socket.IO
    } catch (error) {
      console.error('Failed to update issue status:', error);
      alert('Failed to update issue status. Please try again.');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getColumnStyle = (columnKey: EpicSortColumn): React.CSSProperties => {
    const column = columnConfigs.find(c => c.key === columnKey);
    if (!column || !column.visible) {
      return { display: 'none' };
    }
    return {};
  };

  // Keyboard handler for table rows (only 'd' shortcut)
  const handleRowKeyDown = (e: React.KeyboardEvent, epic: Issue) => {
    if (e.key === 'd') {
      e.preventDefault();
      handleShowDependencies(epic);
    }
  };

  const visibleColumns = columnConfigs.filter(c => c.visible);
  const totalTableWidth = visibleColumns.reduce((sum, col) => sum + col.width, 0);

  const renderColumnHeader = (col: ColumnConfig) => {
    const hasFilters = col.key === 'status' || col.key === 'priority';

    return (
      <th
        key={col.key}
        className="px-6 py-3 relative"
        style={{ width: `${col.width}px` }}
      >
        <div className="flex items-center">
          <button className="flex items-center gap-1" onClick={() => handleSort(col.key)}>
            {col.label}
            {renderSortIndicator(col.key)}
          </button>
          {hasFilters && col.key === 'status' && (
            <FilterDropdown
              column="status"
              values={uniqueStatuses}
              activeFilters={statusFilter}
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
              onToggle={(value) =>
                setStatusFilter((prev) =>
                  prev.includes(value as IssueStatus)
                    ? prev.filter((v) => v !== value)
                    : [...prev, value as IssueStatus]
                )
              }
              onClear={() => setStatusFilter([])}
            />
          )}
          {hasFilters && col.key === 'priority' && (
            <FilterDropdown
              column="priority"
              values={uniquePriorities}
              activeFilters={priorityFilter}
              openDropdown={openDropdown}
              setOpenDropdown={setOpenDropdown}
              onToggle={(value) =>
                setPriorityFilter((prev) =>
                  prev.includes(value as Priority)
                    ? prev.filter((v) => v !== value)
                    : [...prev, value as Priority]
                )
              }
              onClear={() => setPriorityFilter([])}
              formatValue={(value) => PRIORITY_LABELS[value as Priority] || String(value)}
            />
          )}
        </div>
        {col.resizable && (
          <div
            className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-indigo-200/50 dark:hover:bg-indigo-700/50 active:bg-indigo-300 dark:active:bg-indigo-600"
            onMouseDown={(e) => handleResizeStart(col.key, e)}
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </th>
    );
  };

  return (
    <>
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/50">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search epics by ID, title, or owner..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
            </div>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setColumnMenuOpen(!columnMenuOpen);
                }}
                className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                title="Show/hide columns"
              >
                <Settings className="w-4 h-4" />
                Columns
              </button>
              {columnMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg z-10 py-1">
                  {columnConfigs.map((col) => (
                    <label
                      key={col.key}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-slate-700 dark:text-slate-200"
                    >
                      <input
                        type="checkbox"
                        checked={col.visible}
                        onChange={() => toggleColumnVisibility(col.key)}
                        className="rounded border-slate-300 dark:border-slate-600"
                      />
                      <span className="text-sm">{col.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-600 bg-indigo-50/50 dark:bg-indigo-900/20 flex items-center justify-between">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              {statusFilter.length + priorityFilter.length} filter(s) active
            </span>
            <button
              onClick={() => {
                setStatusFilter([]);
                setPriorityFilter([]);
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              <FilterX className="w-3.5 h-3.5" />
              Clear All Filters
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="text-sm text-left" style={{ tableLayout: 'fixed', width: `${totalTableWidth}px` }}>
            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium border-b dark:border-slate-600">
              <tr>
                {visibleColumns.map(renderColumnHeader)}
              </tr>
            </thead>
            <tbody ref={tableBodyRef} className="divide-y divide-slate-100 dark:divide-slate-700">
              {sortedEpics.map((epic, index) => {
                const childCounts = getChildCounts(epic.id);
                const ageInDays = getAgeInDays(epic);
                const isClosed = epic.status === 'closed';
                const isComplete = childCounts.total > 0 && childCounts.open === 0;
                const isAllOpen = childCounts.total > 0 && childCounts.open === childCounts.total;
                const childClass = childCounts.total === 0
                  ? 'text-slate-400 dark:text-slate-500'
                  : isComplete
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : isAllOpen
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-indigo-700 dark:text-indigo-300';
                const completion = childCounts.total === 0
                  ? 0
                  : ((childCounts.total - childCounts.open) / childCounts.total) * 100;

                // Format timestamps using the selected display mode
                const createdDisplay = formatTimestamp(epic.created_at, timeDisplayMode);
                const updatedDisplay = formatTimestamp(epic.updated_at, timeDisplayMode);
                const cycleTime = formatCycleTime(epic.created_at, epic.closed_at, timeDisplayMode);
                const age = !isClosed ? formatAge(epic.created_at, timeDisplayMode) : '-';

                return (
                  <tr
                    key={epic.id}
                    data-issue-id={epic.id}
                    tabIndex={0}
                    className="group hover:bg-slate-50 dark:hover:bg-slate-700 border-l-4 border-indigo-100/70 dark:border-indigo-800/70 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-inset"
                    onContextMenu={(e) => handleContextMenu(e, epic)}
                    onFocus={() => setFocusedRowIndex(index)}
                    onKeyDown={(e) => handleRowKeyDown(e, epic)}
                  >
                    <td style={getColumnStyle('id')} className="px-6 py-3 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                        <span>{epic.id.includes('-') ? epic.id.split('-').pop() : epic.id}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(epic.id);
                          }}
                          className="text-slate-300 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-300 transition-colors opacity-0 group-hover:opacity-100"
                          title="Copy full ID"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td style={getColumnStyle('title')} className="px-6 py-3 font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        <span>{epic.title || 'Untitled epic'}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDescription(epic);
                          }}
                          className="ml-auto text-slate-300 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          title="View Description"
                        >
                          <PanelTopOpen className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td style={getColumnStyle('type')} className="px-6 py-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                        {getTypeIcon(epic.issue_type)}
                        {epic.issue_type}
                      </span>
                    </td>
                    <td style={getColumnStyle('children')} className="px-6 py-3">
                      <button
                        className={`text-left ${childCounts.total === 0 ? 'cursor-default' : 'cursor-pointer'} w-32`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectChildren(epic.id);
                        }}
                        disabled={childCounts.total === 0}
                        title={childCounts.total === 0 ? 'No child issues linked' : `${childCounts.open} open issues, ${childCounts.total} total — Click to view`}
                      >
                        <div className={`flex items-baseline gap-1 font-semibold ${childClass}`}>
                          <span>{childCounts.open}</span>
                          <span className="text-slate-500 dark:text-slate-400 font-normal">/ {childCounts.total}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-600 rounded-full h-1 mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              childCounts.total === 0
                                ? 'bg-slate-200 dark:bg-slate-500'
                                : isComplete
                                ? 'bg-emerald-500'
                                : isAllOpen
                                ? 'bg-amber-500'
                                : 'bg-indigo-400'
                            }`}
                            style={{ width: `${completion}%` }}
                          />
                        </div>
                      </button>
                    </td>
                    <td style={getColumnStyle('status')} className="px-6 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          epic.status === 'blocked'
                            ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                            : epic.status === 'closed'
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                            : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        }`}
                      >
                        {epic.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={getColumnStyle('priority')} className="px-6 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">
                        {PRIORITY_LABELS[epic.priority]}
                      </span>
                    </td>
                    <td style={getColumnStyle('assignee')} className="px-6 py-3 text-slate-600 dark:text-slate-400">
                      {epic.assignee || '—'}
                    </td>
                    <td style={getColumnStyle('created')} className="px-6 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {createdDisplay}
                    </td>
                    <td style={getColumnStyle('updated')} className="px-6 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {updatedDisplay}
                    </td>
                    <td className={`px-6 py-3 ${cycleTime === '-' ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-slate-100'}`} style={getColumnStyle('cycleTime')}>
                      {cycleTime}
                    </td>
                    <td className={`px-6 py-3 ${age !== '-' && ageInDays > 30 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-slate-900 dark:text-slate-100'}`} style={getColumnStyle('age')}>
                      {age}
                    </td>
                    <td className="px-6 py-3" style={getColumnStyle('actions')}>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {epic.status === 'blocked' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(epic.id, 'in_progress');
                            }}
                            disabled={updatingStatus === epic.id}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors disabled:opacity-50"
                            title="Resume Progress"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {epic.status !== 'in_progress' && epic.status !== 'closed' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(epic.id, 'in_progress');
                            }}
                            disabled={updatingStatus === epic.id}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors disabled:opacity-50"
                            title="Start Progress"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {epic.status !== 'closed' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(epic.id, 'closed');
                            }}
                            disabled={updatingStatus === epic.id}
                            className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors disabled:opacity-50"
                            title="Close Epic"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sortedEpics.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                    No epics found. Epics are larger initiatives containing multiple issues.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {activeDescription && (
        <IssueViewModal
          issue={activeDescription}
          onClose={closeDescription}
          onUpdate={() => {
            // Table will auto-refresh via Socket.IO when data changes
            // No manual refresh needed
          }}
          timeDisplayMode={timeDisplayMode}
          onShowDependencies={handleShowDependencies}
          sideBySideMode={!!dependenciesIssue}
        />
      )}

      {contextMenu && (
        <div
          className="fixed z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 min-w-48"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-4 py-2 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
            onClick={() => handleShowDependencies(contextMenu.issue)}
          >
            <span>Show Dependencies</span>
          </button>
        </div>
      )}

      {dependenciesIssue && (
        <DependenciesModal
          issueId={dependenciesIssue.id}
          issueTitle={dependenciesIssue.title}
          onClose={() => setDependenciesIssue(null)}
          onViewIssue={handleViewIssueFromDependencies}
          sideBySideMode={!!activeDescription}
        />
      )}
    </>
  );
}

export default EpicsTable;
