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
    <div className="border-t border-slate-200 pt-4">
      <h4 className="text-sm font-bold text-slate-700 mb-3">Preview</h4>
      <p className="text-xs text-slate-500 mb-3">
        Based on current configuration, these items would be flagged:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-3 rounded-lg border ${warningCount > 0 ? 'border-yellow-200 bg-yellow-50' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${warningCount > 0 ? 'text-yellow-600' : 'text-yellow-400'}`} />
            <div>
              <div className="text-sm font-medium text-slate-700">Warning Items</div>
              <div className={`text-lg font-bold ${warningCount > 0 ? 'text-yellow-700' : 'text-slate-400'}`}>
                {warningCount}
              </div>
            </div>
          </div>
        </div>

        <div className={`p-3 rounded-lg border ${criticalCount > 0 ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center gap-2">
            <AlertOctagon className={`w-4 h-4 ${criticalCount > 0 ? 'text-red-600' : 'text-red-400'}`} />
            <div>
              <div className="text-sm font-medium text-slate-700">Critical Items</div>
              <div className={`text-lg font-bold ${criticalCount > 0 ? 'text-red-700' : 'text-slate-400'}`}>
                {criticalCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-slate-600">Effective Thresholds:</span>
        </div>
        <div className="text-slate-500">
          Warning: {warningThreshold} {warningUnit} ({warningHours} hours) •
          Critical: {criticalThreshold} {criticalUnit} ({criticalHours} hours)
        </div>
      </div>
    </div>
  );
}
