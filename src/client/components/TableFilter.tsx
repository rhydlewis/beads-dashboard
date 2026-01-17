import { useState, useEffect } from 'react';
import { Filter, ChevronDown } from 'lucide-react';
import type { Priority } from '@shared/types';
import { PRIORITY_LABELS } from '@shared/types';

interface TableFilterProps {
  column: string;
  values: (string | number)[];
  activeFilters: (string | number)[];
  onToggle: (value: string | number) => void;
  onClear: () => void;
}

export default function TableFilter({
  column,
  values,
  activeFilters,
  onToggle,
  onClear
}: TableFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasFilters = activeFilters.length > 0;

  const getDisplayValue = (value: string | number) => {
    if (column === 'priority') {
      return PRIORITY_LABELS[value as Priority] || value;
    }
    return value;
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setIsOpen(false);
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative inline-block">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
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
}
