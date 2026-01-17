import { useState, useEffect, useMemo, useRef } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  AlertCircle,
  ArrowDown,
  ArrowDownFromLine,
  ArrowUp,
  ArrowUpDown,
  Copy,
  PanelTopOpen,
  Bug,
  Box,
  ListCheck,
  FilterX,
  ChevronUp,
  Play,
  Check,
  Search,
  Settings,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { Issue, IssueStatus, Priority } from '@shared/types';
import { PRIORITY_LABELS } from '@shared/types';
import FilterDropdown from './FilterDropdown';
import IssueDetailModal from './IssueDetailModal';

interface AllIssuesTableProps {
  issues: Issue[];
  focusedEpicId: string | null;
  onClearFocusedEpic: () => void;
}

type SortColumn =
  | 'id'
  | 'title'
  | 'type'
  | 'priority'
  | 'status'
  | 'created'
  | 'updated'
  | 'cycleTime'
  | 'age';

interface ColumnConfig {
  key: SortColumn | 'actions';
  label: string;
  visible: boolean;
  width: number;
  minWidth: number;
  resizable: boolean;
}

const DEFAULT_COLUMN_CONFIGS: ColumnConfig[] = [
  { key: 'id', label: 'ID', visible: true, width: 120, minWidth: 80, resizable: true },
  { key: 'title', label: 'Title', visible: true, width: 300, minWidth: 150, resizable: true },
  { key: 'type', label: 'Type', visible: true, width: 120, minWidth: 100, resizable: true },
  { key: 'priority', label: 'Priority', visible: true, width: 140, minWidth: 120, resizable: true },
  { key: 'status', label: 'Status', visible: true, width: 120, minWidth: 100, resizable: true },
  { key: 'created', label: 'Created', visible: true, width: 120, minWidth: 100, resizable: true },
  { key: 'updated', label: 'Updated', visible: true, width: 120, minWidth: 100, resizable: true },
  { key: 'cycleTime', label: 'Cycle Time', visible: true, width: 100, minWidth: 80, resizable: true },
  { key: 'age', label: 'Age', visible: true, width: 80, minWidth: 60, resizable: true },
  { key: 'actions', label: 'Actions', visible: true, width: 120, minWidth: 100, resizable: false },
];

const DAY_IN_MS = 1000 * 60 * 60 * 24;

const getAgeInDays = (issue: Issue) => {
  const created = new Date(issue.created_at).getTime();
  return Math.floor((Date.now() - created) / DAY_IN_MS);
};

const getCycleTimeDays = (issue: Issue) => {
  if (issue.status !== 'closed' || !issue.updated_at) return null;
  const created = new Date(issue.created_at).getTime();
  const updated = new Date(issue.updated_at).getTime();
  return Math.ceil((updated - created) / DAY_IN_MS);
};

const doesIssueBelongToEpic = (issue: Issue, epicId: string) => {
  if (issue.parent_id && issue.parent_id === epicId) return true;
  return issue.dependencies?.some((dep) => dep === epicId) ?? false;
};

function AllIssuesTable({ issues, focusedEpicId, onClearFocusedEpic }: AllIssuesTableProps) {
  const [filterText, setFilterText] = useState('');
  const [activeDescription, setActiveDescription] = useState<Issue | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [childFilter, setChildFilter] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<IssueStatus[]>(() => {
    const saved = localStorage.getItem('beads-filter-status');
    return saved ? JSON.parse(saved) : [];
  });
  const [typeFilter, setTypeFilter] = useState<string[]>(() => {
    const saved = localStorage.getItem('beads-filter-type');
    if (!saved) return [];
    return (JSON.parse(saved) as string[]).filter((type) => type !== 'epic');
  });
  const [priorityFilter, setPriorityFilter] = useState<Priority[]>(() => {
    const saved = localStorage.getItem('beads-filter-priority');
    return saved ? JSON.parse(saved) : [];
  });

  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [updatingPriority, setUpdatingPriority] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ column: SortColumn; direction: 'asc' | 'desc' }>(() => ({
    column: 'created',
    direction: 'desc',
  }));

  // Column configuration state
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>(() => {
    const saved = localStorage.getItem('beads-issues-column-config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ColumnConfig[];
        // Merge with defaults to handle new columns
        return DEFAULT_COLUMN_CONFIGS.map(defaultCol => {
          const savedCol = parsed.find(c => c.key === defaultCol.key);
          return savedCol ? { ...defaultCol, ...savedCol } : defaultCol;
        });
      } catch {
        return DEFAULT_COLUMN_CONFIGS;
      }
    }
    return DEFAULT_COLUMN_CONFIGS;
  });
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  useEffect(() => {
    if (focusedEpicId) {
      setChildFilter(focusedEpicId);
    } else {
      setChildFilter(null);
    }
  }, [focusedEpicId]);

  useEffect(() => {
    localStorage.setItem('beads-filter-status', JSON.stringify(statusFilter));
  }, [statusFilter]);

  useEffect(() => {
    localStorage.setItem('beads-filter-type', JSON.stringify(typeFilter));
  }, [typeFilter]);

  useEffect(() => {
    localStorage.setItem('beads-filter-priority', JSON.stringify(priorityFilter));
  }, [priorityFilter]);

  useEffect(() => {
    const handleClickOutside = () => {
      setOpenDropdown(null);
      setShowColumnMenu(false);
    };
    if (openDropdown || showColumnMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openDropdown, showColumnMenu]);

  // Persist column configuration
  useEffect(() => {
    localStorage.setItem('beads-issues-column-config', JSON.stringify(columnConfigs));
  }, [columnConfigs]);

  // Column resize handlers
  const handleResizeStart = (columnKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const column = columnConfigs.find(c => c.key === columnKey);
    if (!column) return;

    setResizingColumn(columnKey);
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = column.width;
  };

  useEffect(() => {
    if (!resizingColumn) return;

    const handleMouseMove = (e: MouseEvent) => {
      const column = columnConfigs.find(c => c.key === resizingColumn);
      if (!column) return;

      const delta = e.clientX - resizeStartX.current;
      const newWidth = Math.max(column.minWidth, resizeStartWidth.current + delta);

      setColumnConfigs(prev =>
        prev.map(col =>
          col.key === resizingColumn ? { ...col, width: newWidth } : col
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
  }, [resizingColumn, columnConfigs]);

  const toggleColumnVisibility = (columnKey: string) => {
    setColumnConfigs(prev =>
      prev.map(col =>
        col.key === columnKey ? { ...col, visible: !col.visible } : col
      )
    );
  };

  const visibleColumns = columnConfigs.filter(c => c.visible);

  const nonEpicIssues = useMemo(() => issues.filter((issue) => issue.issue_type !== 'epic'), [issues]);

  const uniqueStatuses = useMemo(
    () =>
      Array.from(new Set(nonEpicIssues.filter((i) => i.status !== 'tombstone').map((i) => i.status))).sort(),
    [nonEpicIssues]
  );

  const uniqueTypes = useMemo(
    () =>
      Array.from(
        new Set(
          nonEpicIssues
            .filter((i) => i.status !== 'tombstone' && i.issue_type)
            .map((i) => i.issue_type)
        )
      ).sort(),
    [nonEpicIssues]
  );

  const uniquePriorities = useMemo(
    () =>
      Array.from(
        new Set(
          nonEpicIssues
            .filter((i) => i.status !== 'tombstone' && i.priority !== undefined)
            .map((i) => i.priority)
        )
      ).sort((a, b) => a - b),
    [nonEpicIssues]
  );

  const filteredIssues = nonEpicIssues.filter((issue) => {
    if (issue.status === 'tombstone') return false;
    if (statusFilter.length > 0 && !statusFilter.includes(issue.status)) return false;
    if (typeFilter.length > 0 && !typeFilter.includes(issue.issue_type)) return false;
    if (priorityFilter.length > 0 && !priorityFilter.includes(issue.priority)) return false;
    if (childFilter && !doesIssueBelongToEpic(issue, childFilter)) return false;

    if (!filterText) return true;
    const searchLower = filterText.toLowerCase();
    return (
      issue.id.toLowerCase().includes(searchLower) ||
      (issue.title || '').toLowerCase().includes(searchLower) ||
      issue.status.toLowerCase().includes(searchLower) ||
      (issue.issue_type || '').toLowerCase().includes(searchLower) ||
      (PRIORITY_LABELS[issue.priority] || '').toLowerCase().includes(searchLower)
    );
  });

  const sortedIssues = [...filteredIssues].sort((a, b) => {
    const direction = sortConfig.direction === 'asc' ? 1 : -1;

    const compareStrings = (strA: string, strB: string) => direction * strA.localeCompare(strB, undefined, { sensitivity: 'base' });
    const compareNumbers = (numA: number | null, numB: number | null, nullFallback: number) => {
      const safeA = typeof numA === 'number' ? numA : nullFallback;
      const safeB = typeof numB === 'number' ? numB : nullFallback;
      return direction * (safeA - safeB);
    };

    switch (sortConfig.column) {
      case 'id':
        return compareStrings(a.id, b.id);
      case 'title':
        return compareStrings(a.title || '', b.title || '');
      case 'type':
        return compareStrings(a.issue_type || '', b.issue_type || '');
      case 'priority':
        return compareNumbers(a.priority ?? 99, b.priority ?? 99, 99);
      case 'status':
        return compareStrings(a.status, b.status);
      case 'created':
        return compareNumbers(new Date(a.created_at).getTime(), new Date(b.created_at).getTime(), 0);
      case 'updated':
        return compareNumbers(
          a.updated_at ? new Date(a.updated_at).getTime() : null,
          b.updated_at ? new Date(b.updated_at).getTime() : null,
          0
        );
      case 'cycleTime':
        return compareNumbers(getCycleTimeDays(a), getCycleTimeDays(b), Number.POSITIVE_INFINITY);
      case 'age':
        return compareNumbers(getAgeInDays(a), getAgeInDays(b), Number.POSITIVE_INFINITY);
      default:
        return 0;
    }
  });

  const getPriorityIcon = (priority: Priority) => {
    switch (priority) {
      case 0:
        return <AlertOctagon className="w-3.5 h-3.5" />;
      case 1:
        return <AlertTriangle className="w-3.5 h-3.5" />;
      case 2:
        return <ArrowUp className="w-3.5 h-3.5" />;
      case 3:
        return <ArrowDown className="w-3.5 h-3.5" />;
      case 4:
        return <ArrowDownFromLine className="w-3.5 h-3.5" />;
      default:
        return <AlertCircle className="w-3.5 h-3.5" />;
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
    return {
      class: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10',
      icon: <ListCheck className="w-3 h-3" />,
    };
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleFilterValue = (filterType: string, value: string | number) => {
    if (filterType === 'status') {
      setStatusFilter((prev) =>
        prev.includes(value as IssueStatus)
          ? prev.filter((v) => v !== value)
          : [...prev, value as IssueStatus]
      );
    } else if (filterType === 'type') {
      setTypeFilter((prev) =>
        prev.includes(value as string)
          ? prev.filter((v) => v !== value)
          : [...prev, value as string]
      );
    } else if (filterType === 'priority') {
      setPriorityFilter((prev) =>
        prev.includes(value as Priority)
          ? prev.filter((v) => v !== value)
          : [...prev, value as Priority]
      );
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

  const handleSort = (column: SortColumn) => {
    setSortConfig((prev) => {
      if (prev.column === column) {
        return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { column, direction: 'asc' };
    });
  };

  const renderSortIndicator = (column: SortColumn) => {
    if (sortConfig.column !== column) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-slate-500" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-slate-500" />
    );
  };

  const openDescription = (issue: Issue) => {
    setActiveDescription(issue);
    setEditValue(issue.description || '');
    setIsEditing(false);
  };

  const closeDescription = () => {
    setActiveDescription(null);
    setIsEditing(false);
    setSaving(false);
  };

  const handleSave = async () => {
    if (!activeDescription) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/issues/${activeDescription.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: editValue }),
      });
      if (!res.ok) throw new Error('Failed to update');
      closeDescription();
    } catch (err) {
      console.error(err);
      alert('Failed to save description');
      setSaving(false);
    }
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

  const focusedEpic = childFilter ? issues.find((issue) => issue.id === childFilter) : null;

  // Get column style for td elements (only handles visibility, widths come from th)
  const getColumnStyle = (key: SortColumn | 'actions') => {
    const col = columnConfigs.find(c => c.key === key);
    if (!col || !col.visible) return { display: 'none' };
    return {};
  };

  // Render column header with resize handle
  const renderColumnHeader = (col: ColumnConfig) => {
    const isSortable = col.key !== 'actions';
    const content = (() => {
      switch (col.key) {
        case 'id':
        case 'title':
        case 'created':
        case 'updated':
        case 'cycleTime':
        case 'age':
          return (
            <button className="flex items-center gap-1" onClick={() => isSortable && handleSort(col.key as SortColumn)}>
              {col.label}
              {isSortable && renderSortIndicator(col.key as SortColumn)}
            </button>
          );
        case 'type':
          return (
            <div className="flex items-center">
              <button className="flex items-center gap-1" onClick={() => handleSort('type')}>
                {col.label}
                {renderSortIndicator('type')}
              </button>
              <FilterDropdown
                column="type"
                values={uniqueTypes}
                activeFilters={typeFilter}
                openDropdown={openDropdown}
                setOpenDropdown={setOpenDropdown}
                onToggle={(value) => toggleFilterValue('type', value)}
                onClear={() => clearFilter('type')}
              />
            </div>
          );
        case 'priority':
          return (
            <div className="flex items-center">
              <button className="flex items-center gap-1" onClick={() => handleSort('priority')}>
                {col.label}
                {renderSortIndicator('priority')}
              </button>
              <FilterDropdown
                column="priority"
                values={uniquePriorities}
                activeFilters={priorityFilter}
                openDropdown={openDropdown}
                setOpenDropdown={setOpenDropdown}
                onToggle={(value) => toggleFilterValue('priority', value)}
                onClear={() => clearFilter('priority')}
                formatValue={(value) => PRIORITY_LABELS[value as Priority] || String(value)}
              />
            </div>
          );
        case 'status':
          return (
            <div className="flex items-center">
              <button className="flex items-center gap-1" onClick={() => handleSort('status')}>
                {col.label}
                {renderSortIndicator('status')}
              </button>
              <FilterDropdown
                column="status"
                values={uniqueStatuses}
                activeFilters={statusFilter}
                openDropdown={openDropdown}
                setOpenDropdown={setOpenDropdown}
                onToggle={(value) => toggleFilterValue('status', value)}
                onClear={() => clearFilter('status')}
              />
            </div>
          );
        case 'actions':
          return col.label;
        default:
          return col.label;
      }
    })();

    return (
      <th
        key={col.key}
        className="px-6 py-3 relative group"
        style={{ width: `${col.width}px`, minWidth: `${col.minWidth}px` }}
      >
        {content}
        {col.resizable && (
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 group-hover:bg-blue-200 transition-colors"
            onMouseDown={(e) => handleResizeStart(col.key, e)}
            title="Drag to resize column"
            style={{ marginRight: '-4px' }}
          />
        )}
      </th>
    );
  };

  return (
    <>
      <div className="card overflow-hidden">
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

        {childFilter && (
          <div className="px-4 py-2 border-b border-slate-200 bg-indigo-50 flex items-center justify-between">
            <div className="text-xs text-indigo-800">
              Showing issues linked to <span className="font-semibold">{focusedEpic?.title || childFilter}</span>
            </div>
            <button
              onClick={() => {
                setChildFilter(null);
                onClearFocusedEpic();
              }}
              className="text-xs text-indigo-700 hover:text-indigo-900 font-medium"
            >
              Clear child filter
            </button>
          </div>
        )}

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

        <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-end relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowColumnMenu(!showColumnMenu);
            }}
            className="text-xs text-slate-600 hover:text-slate-800 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            Columns
          </button>
          {showColumnMenu && (
            <div className="absolute right-4 top-10 z-50 bg-white border border-slate-200 rounded-lg shadow-lg min-w-48 py-1">
              {columnConfigs.map((col) => (
                <button
                  key={col.key}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleColumnVisibility(col.key);
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                >
                  {col.visible ? (
                    <Eye className="w-4 h-4 text-blue-500" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-slate-300" />
                  )}
                  <span className={col.visible ? 'text-slate-700' : 'text-slate-400'}>
                    {col.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left" style={{ tableLayout: 'fixed' }}>
            <thead className="bg-slate-50 text-slate-600 font-medium border-b">
              <tr>
                {visibleColumns.map(renderColumnHeader)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedIssues.map((issue) => {
                const created = new Date(issue.created_at);
                const updated = issue.updated_at ? new Date(issue.updated_at) : null;
                const isClosed = issue.status === 'closed';
                const ageInDays = getAgeInDays(issue);
                const isStale = !isClosed && ageInDays > 30;

                const cycleTimeDays = getCycleTimeDays(issue);
                const cycleTime = cycleTimeDays !== null ? `${cycleTimeDays}d` : '-';
                const age = !isClosed ? `${ageInDays}d` : '-';

                const priorityLabel = PRIORITY_LABELS[issue.priority] || issue.priority;
                const PriorityIcon = getPriorityIcon(issue.priority);

                const shortId = issue.id.includes('-') ? issue.id.split('-').pop() : issue.id;
                const typeInfo = getTypeInfo(issue.issue_type);

                return (
                  <tr key={issue.id} className="hover:bg-slate-50 group">
                    <td className="px-6 py-3 font-mono text-slate-500 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{shortId}</span>
                        <button
                          onClick={() => handleCopy(issue.id)}
                          style={getColumnStyle("title")} className="text-slate-300 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
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
                          style={getColumnStyle("type")} className="ml-auto text-slate-300 hover:text-blue-600 transition-colors"
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
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-white border ${issue.priority <= 1 ? 'border-red-200' : 'border-slate-200'}`}>
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
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          issue.status === 'blocked'
                            ? 'bg-amber-50 text-amber-800'
                            : issue.status === 'closed'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {issue.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-slate-500">
                      {created.toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-slate-500">
                      {updated ? updated.toLocaleDateString() : '—'}
                    </td>
                    <td className={`px-6 py-3 ${cycleTime === '-' ? 'text-slate-400' : 'text-slate-900'}`}>
                      {cycleTime}
                    </td>
                    <td className={`px-6 py-3 ${isStale ? 'text-amber-600 font-medium' : 'text-slate-900'}`}>
                      {age}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        {issue.status === 'blocked' && (
                          <button
                            onClick={() => handleStatusUpdate(issue.id, 'in_progress')}
                            disabled={updatingStatus === issue.id}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                            title="Resume Progress"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {issue.status !== 'in_progress' && issue.status !== 'closed' && (
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
              {sortedIssues.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.length} className="px-6 py-8 text-center text-slate-400">
                    No issues found{filterText ? ` matching "${filterText}"` : ''}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {activeDescription && (
        <IssueDetailModal
          issue={activeDescription}
          isEditing={isEditing}
          editValue={editValue}
          saving={saving}
          onClose={closeDescription}
          onToggleEditing={setIsEditing}
          onChangeEditValue={setEditValue}
          onSave={handleSave}
        />
      )}
    </>
  );
}

export default AllIssuesTable;
