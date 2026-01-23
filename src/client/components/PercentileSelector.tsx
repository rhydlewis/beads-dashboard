interface PercentileSelectorProps {
  label: string;
  value: number;
  options: Array<{ value: number; label: string }>;
  onChange: (value: number) => void;
}

export function PercentileSelector({ label, value, options, onChange }: PercentileSelectorProps) {
  const id = label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
