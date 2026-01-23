interface GranularityOption {
  value: number;
  label: string;
  unit: 'hours' | 'days';
}

interface QuickSelectButtonsProps {
  options: GranularityOption[];
  selectedValue: number;
  selectedUnit: 'hours' | 'days';
  onSelect: (value: number, unit: 'hours' | 'days') => void;
}

export function QuickSelectButtons({ options, selectedValue, selectedUnit, onSelect }: QuickSelectButtonsProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Quick Select</label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={`${option.value}-${option.unit}`}
            onClick={() => onSelect(option.value, option.unit)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              selectedValue === option.value && selectedUnit === option.unit
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
