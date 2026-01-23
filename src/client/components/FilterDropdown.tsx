import { Filter, ChevronDown } from 'lucide-react';

interface FilterDropdownProps {
  column: string;
  values: (string | number)[];
  activeFilters: (string | number)[];
  openDropdown: string | null;
  setOpenDropdown: (value: string | null) => void;
  onToggle: (value: string | number) => void;
  onClear: () => void;
  formatValue?: (value: string | number) => string;
}

function FilterDropdown({
  column,
  values,
  activeFilters,
  openDropdown,
  setOpenDropdown,
  onToggle,
  onClear,
  formatValue,
}: FilterDropdownProps) {
  const isOpen = openDropdown === column;
  const hasFilters = activeFilters.length > 0;

  const displayValue = (value: string | number) => {
    if (formatValue) return formatValue(value);
    return String(value);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpenDropdown(isOpen ? null : column);
        }}
        className={`ml-2 p-1 rounded transition-colors ${
          hasFilters ? 'text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:text-blue-300' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
        }`}
        title={hasFilters ? `Filtered (${activeFilters.length})` : 'Filter'}
      >
        {hasFilters ? <Filter className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {isOpen && (
        <div
          className="absolute left-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg z-50 min-w-[160px]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-2 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase">Filter</span>
            {hasFilters && (
              <button onClick={onClear} className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                Clear
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {values.map((value) => {
              const isSelected = activeFilters.includes(value);
              return (
                <label
                  key={value}
                  className="flex items-center px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(value)}
                    className="mr-2 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:bg-slate-700"
                  />
                  <span className={`capitalize ${isSelected ? 'font-medium text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'}`}>
                    {displayValue(value)}
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

export default FilterDropdown;
