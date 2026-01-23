interface ThresholdInputProps {
  label: string;
  value: number;
  unit: 'hours' | 'days';
  onValueChange: (value: number) => void;
  onUnitChange: (unit: 'hours' | 'days') => void;
}

export function ThresholdInput({ label, value, unit, onValueChange, onUnitChange }: ThresholdInputProps) {
  return (
    <div>
      <label htmlFor={label.toLowerCase().replace(/\s+/g, '-')} className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="number"
          id={label.toLowerCase().replace(/\s+/g, '-')}
          min="0.5"
          step="0.5"
          value={value}
          onChange={(e) => onValueChange(parseFloat(e.target.value))}
          className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          value={unit}
          onChange={(e) => onUnitChange(e.target.value as 'hours' | 'days')}
          className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="hours">hours</option>
          <option value="days">days</option>
        </select>
      </div>
    </div>
  );
}
