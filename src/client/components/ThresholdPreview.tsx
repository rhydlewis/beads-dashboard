import { AlertTriangle, AlertOctagon } from 'lucide-react';

interface ThresholdPreviewProps {
  warningCount: number;
  criticalCount: number;
  warningThreshold: number;
  warningUnit: 'hours' | 'days';
  criticalThreshold: number;
  criticalUnit: 'hours' | 'days';
  warningHours: number;
  criticalHours: number;
}

export function ThresholdPreview({
  warningCount,
  criticalCount,
  warningThreshold,
  warningUnit,
  criticalThreshold,
  criticalUnit,
  warningHours,
  criticalHours,
}: ThresholdPreviewProps) {
  return (
    <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
      <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3">Preview</h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
        Based on current configuration, these items would be flagged:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-3 rounded-lg border ${warningCount > 0 ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20' : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700'}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${warningCount > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-yellow-400 dark:text-yellow-600'}`} />
            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Warning Items</div>
              <div className={`text-lg font-bold ${warningCount > 0 ? 'text-yellow-700 dark:text-yellow-400' : 'text-slate-400 dark:text-slate-500'}`}>
                {warningCount}
              </div>
            </div>
          </div>
        </div>

        <div className={`p-3 rounded-lg border ${criticalCount > 0 ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700'}`}>
          <div className="flex items-center gap-2">
            <AlertOctagon className={`w-4 h-4 ${criticalCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-red-400 dark:text-red-600'}`} />
            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Critical Items</div>
              <div className={`text-lg font-bold ${criticalCount > 0 ? 'text-red-700 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>
                {criticalCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg text-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-slate-600 dark:text-slate-300">Effective Thresholds:</span>
        </div>
        <div className="text-slate-500 dark:text-slate-400">
          Warning: {warningThreshold} {warningUnit} ({warningHours} hours) •
          Critical: {criticalThreshold} {criticalUnit} ({criticalHours} hours)
        </div>
      </div>
    </div>
  );
}
