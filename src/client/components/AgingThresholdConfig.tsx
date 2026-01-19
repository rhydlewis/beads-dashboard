import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import type { Issue } from '@shared/types';
import {
  AgingThresholdConfig as AgingThresholdConfigType,
  DEFAULT_THRESHOLDS,
  loadThresholdConfig,
  saveThresholdConfig,
  calculateThresholdsFromPercentiles,
  thresholdToHours,
} from '@/utils/agingAlerts';
import { ThresholdInput } from './ThresholdInput';
import { ThresholdPreview } from './ThresholdPreview';
import { AutoCalcButton } from './AutoCalcButton';
import { PercentileSelector } from './PercentileSelector';
import { QuickSelectButtons } from './QuickSelectButtons';

const GRANULARITY_OPTIONS = [
  { value: 1, label: '1 hour', unit: 'hours' as const },
  { value: 2, label: '2 hours', unit: 'hours' as const },
  { value: 4, label: '4 hours', unit: 'hours' as const },
  { value: 8, label: '8 hours', unit: 'hours' as const },
  { value: 12, label: '12 hours', unit: 'hours' as const },
  { value: 24, label: '1 day', unit: 'hours' as const },
  { value: 48, label: '2 days', unit: 'days' as const },
  { value: 72, label: '3 days', unit: 'days' as const },
  { value: 168, label: '7 days', unit: 'days' as const },
  { value: 336, label: '14 days', unit: 'days' as const },
  { value: 720, label: '30 days', unit: 'days' as const },
];

const WARNING_PERCENTILE_OPTIONS = [
  { value: 0.75, label: 'P75 (75th percentile)' },
  { value: 0.85, label: 'P85 (85th percentile)' },
  { value: 0.90, label: 'P90 (90th percentile)' },
  { value: 0.95, label: 'P95 (95th percentile)' },
  { value: 0.99, label: 'P99 (99th percentile)' },
];

const CRITICAL_PERCENTILE_OPTIONS = [
  { value: 0.85, label: 'P85 (85th percentile)' },
  { value: 0.90, label: 'P90 (90th percentile)' },
  { value: 0.95, label: 'P95 (95th percentile)' },
  { value: 0.99, label: 'P99 (99th percentile)' },
  { value: 0.999, label: 'P99.9 (99.9th percentile)' },
];

interface AgingThresholdConfigProps {
  issues: Issue[];
  onClose: () => void;
  onSave: (config: AgingThresholdConfigType) => void;
}

export function AgingThresholdConfig({ issues, onClose, onSave }: AgingThresholdConfigProps) {
  const [config, setConfig] = useState<AgingThresholdConfigType>({ ...loadThresholdConfig() });
  const [originalConfig] = useState<AgingThresholdConfigType>({ ...loadThresholdConfig() });
  const [today] = useState(() => new Date());
  const [isChanged, setIsChanged] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  // Check if config has changed
  useEffect(() => {
    const hasChanged = (
      config.warningThreshold !== originalConfig.warningThreshold ||
      config.warningUnit !== originalConfig.warningUnit ||
      config.criticalThreshold !== originalConfig.criticalThreshold ||
      config.criticalUnit !== originalConfig.criticalUnit ||
      config.useAutoCalculation !== originalConfig.useAutoCalculation ||
      config.autoCalcPercentileWarning !== originalConfig.autoCalcPercentileWarning ||
      config.autoCalcPercentileCritical !== originalConfig.autoCalcPercentileCritical
    );
    setIsChanged(hasChanged);
  }, [config, originalConfig]);

  // Calculate preview counts
  const calculatePreview = () => {
    if (config.useAutoCalculation) {
      const { warningHours, criticalHours } = calculateThresholdsFromPercentiles(
        issues,
        config.autoCalcPercentileWarning,
        config.autoCalcPercentileCritical,
        today
      );
      
      return {
        warningThreshold: warningHours,
        warningUnit: 'hours' as const,
        criticalThreshold: criticalHours,
        criticalUnit: 'hours' as const,
      };
    }
    return config;
  };

  const previewConfig = calculatePreview();

  // Count issues that would be flagged with current settings
  const countPreviewIssues = () => {
    const openIssues = issues.filter((i) => i.status !== 'closed' && i.status !== 'tombstone');
    let warningCount = 0;
    let criticalCount = 0;

    openIssues.forEach((issue) => {
      const createdDate = new Date(issue.created_at);
      const ageHours = (today.getTime() - createdDate.getTime()) / (1000 * 60 * 60);

      const warningHours = thresholdToHours(previewConfig.warningThreshold, previewConfig.warningUnit);
      const criticalHours = thresholdToHours(previewConfig.criticalThreshold, previewConfig.criticalUnit);

      if (ageHours >= criticalHours) {
        criticalCount++;
      } else if (ageHours >= warningHours) {
        warningCount++;
      }
    });

    return { warningCount, criticalCount };
  };

  const { warningCount, criticalCount } = countPreviewIssues();

  const handleInputChange = (field: keyof AgingThresholdConfigType, value: string | number | boolean) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveThresholdConfig(config);
    onSave(config);
    onClose();
  };

  const handleAutoCalculate = () => {
    setIsCalculating(true);
    setTimeout(() => {
      const { warningHours, criticalHours } = calculateThresholdsFromPercentiles(
        issues,
        config.autoCalcPercentileWarning,
        config.autoCalcPercentileCritical,
        today
      );

      // Convert hours to appropriate units for display
      const newConfig = { ...config };
      
      if (warningHours < 24) {
        newConfig.warningThreshold = Math.round(warningHours);
        newConfig.warningUnit = 'hours';
      } else {
        newConfig.warningThreshold = parseFloat((warningHours / 24).toFixed(1));
        newConfig.warningUnit = 'days';
      }

      if (criticalHours < 24) {
        newConfig.criticalThreshold = Math.round(criticalHours);
        newConfig.criticalUnit = 'hours';
      } else {
        newConfig.criticalThreshold = parseFloat((criticalHours / 24).toFixed(1));
        newConfig.criticalUnit = 'days';
      }

      setConfig(newConfig);
      setIsCalculating(false);
    }, 100); // Small delay for visual feedback
  };

  const handleReset = () => {
    setConfig({ ...DEFAULT_THRESHOLDS });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start p-6 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Aging Threshold Configuration</h3>
            <p className="text-sm text-slate-500 mt-1">
              Set when work items should be flagged as aging
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-6">
            {/* Auto-calculation toggle */}
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="autoCalculate"
                checked={config.useAutoCalculation}
                onChange={(e) => handleInputChange('useAutoCalculation', e.target.checked)}
                className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <label htmlFor="autoCalculate" className="text-sm font-medium text-slate-700">
                  Auto-calculate from historical data
                </label>
                <p className="text-xs text-slate-500 mt-1">
                  Automatically determine thresholds based on percentiles of historical cycle times
                </p>
              </div>
            </div>

            {config.useAutoCalculation ? (
              <div className="space-y-4">
                {/* Percentile selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <PercentileSelector
                    label="Warning Percentile"
                    value={config.autoCalcPercentileWarning}
                    options={WARNING_PERCENTILE_OPTIONS}
                    onChange={(value) => handleInputChange('autoCalcPercentileWarning', value)}
                  />
                  <PercentileSelector
                    label="Critical Percentile"
                    value={config.autoCalcPercentileCritical}
                    options={CRITICAL_PERCENTILE_OPTIONS}
                    onChange={(value) => handleInputChange('autoCalcPercentileCritical', value)}
                  />
                </div>

                <AutoCalcButton
                  isCalculating={isCalculating}
                  onClick={handleAutoCalculate}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Manual threshold configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ThresholdInput
                    label="Warning Threshold"
                    value={config.warningThreshold}
                    unit={config.warningUnit}
                    onValueChange={(value) => handleInputChange('warningThreshold', value)}
                    onUnitChange={(unit) => handleInputChange('warningUnit', unit)}
                  />
                  <ThresholdInput
                    label="Critical Threshold"
                    value={config.criticalThreshold}
                    unit={config.criticalUnit}
                    onValueChange={(value) => handleInputChange('criticalThreshold', value)}
                    onUnitChange={(unit) => handleInputChange('criticalUnit', unit)}
                  />
                </div>

                {/* Quick selection buttons */}
                <QuickSelectButtons
                  options={GRANULARITY_OPTIONS}
                  selectedValue={config.warningThreshold}
                  selectedUnit={config.warningUnit}
                  onSelect={(value, unit) => {
                    handleInputChange('warningThreshold', value);
                    handleInputChange('warningUnit', unit);
                  }}
                />
              </div>
            )}

            {/* Preview section */}
            <ThresholdPreview
              warningCount={warningCount}
              criticalCount={criticalCount}
              warningThreshold={previewConfig.warningThreshold}
              warningUnit={previewConfig.warningUnit}
              criticalThreshold={previewConfig.criticalThreshold}
              criticalUnit={previewConfig.criticalUnit}
              warningHours={thresholdToHours(previewConfig.warningThreshold, previewConfig.warningUnit)}
              criticalHours={thresholdToHours(previewConfig.criticalThreshold, previewConfig.criticalUnit)}
            />
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-lg flex justify-end gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
            disabled={isCalculating}
          >
            Reset to Defaults
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
            disabled={isCalculating}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={`px-4 py-2 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              isChanged
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-slate-400 cursor-not-allowed'
            }`}
            disabled={!isChanged || isCalculating}
          >
            <Save className="w-4 h-4" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}