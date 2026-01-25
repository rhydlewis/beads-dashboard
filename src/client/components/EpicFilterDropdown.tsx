import { useState, useEffect, useRef } from 'react';
import { Filter, ChevronDown, Search } from 'lucide-react';
import type { Issue } from '@shared/types';

interface EpicFilterDropdownProps {
  epics: Issue[];
  selectedEpicId: string | null;
  openDropdown: string | null;
  setOpenDropdown: (value: string | null) => void;
  onSelect: (epicId: string | null) => void;
  onClear: () => void;
}

function EpicFilterDropdown({
  epics,
  selectedEpicId,
  openDropdown,
  setOpenDropdown,
  onSelect,
  onClear,
}: EpicFilterDropdownProps) {
  const [searchText, setSearchText] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isOpen = openDropdown === 'epic';
  const hasFilter = selectedEpicId !== null;

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSearchText('');
    }
  }, [isOpen]);

  const getShortId = (id: string) => {
    return id.includes('-') ? id.split('-').pop() : id;
  };

  const filteredEpics = epics.filter((epic) => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      (epic.title || '').toLowerCase().includes(searchLower) ||
      epic.id.toLowerCase().includes(searchLower) ||
      getShortId(epic.id)?.toLowerCase().includes(searchLower)
    );
  });

  const handleSelect = (epicId: string | null) => {
    onSelect(epicId);
    setOpenDropdown(null);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpenDropdown(isOpen ? null : 'epic');
        }}
        className={`ml-2 p-1 rounded transition-colors ${
          hasFilter
            ? 'text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:text-blue-300'
            : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
        }`}
        title={hasFilter ? 'Epic filter active' : 'Filter by epic'}
        aria-label="Filter by epic"
      >
        {hasFilter ? <Filter className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {isOpen && (
        <div
          className="absolute left-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg z-50 min-w-[280px]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-2 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">
              Filter by Epic
            </span>
            {hasFilter && (
              <button
                onClick={() => {
                  onClear();
                  setOpenDropdown(null);
                }}
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Clear
              </button>
            )}
          </div>

          <div className="p-2 border-b border-slate-100 dark:border-slate-700">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search epics..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Search epics"
              />
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            <button
              onClick={() => handleSelect('(no-epic)')}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between ${
                selectedEpicId === '(no-epic)'
                  ? 'bg-blue-50 dark:bg-blue-900/30 font-medium text-slate-900 dark:text-slate-100'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="italic">(No Epic)</span>
              {selectedEpicId === '(no-epic)' && (
                <span className="text-blue-600 dark:text-blue-400 text-xs">✓</span>
              )}
            </button>

            {filteredEpics.length === 0 && searchText && (
              <div className="px-3 py-4 text-center text-sm text-slate-400 dark:text-slate-500">
                No epics match "{searchText}"
              </div>
            )}

            {filteredEpics.map((epic) => {
              const shortId = getShortId(epic.id);
              const isSelected = selectedEpicId === epic.id;
              return (
                <button
                  key={epic.id}
                  onClick={() => handleSelect(epic.id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/30 font-medium'
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className={`truncate ${isSelected ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                        {epic.title || 'Untitled'}
                      </div>
                      <div className="text-xs font-mono text-slate-400 dark:text-slate-500">
                        {shortId}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-blue-600 dark:text-blue-400 text-xs flex-shrink-0">✓</span>
                    )}
                  </div>
                </button>
              );
            })}

            {filteredEpics.length === 0 && !searchText && (
              <div className="px-3 py-4 text-center text-sm text-slate-400 dark:text-slate-500">
                No epics found in this project
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default EpicFilterDropdown;
