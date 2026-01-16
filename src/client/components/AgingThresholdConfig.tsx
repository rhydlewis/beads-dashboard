import { useState, useEffect } from 'react';
import { X, Save, Calculator, RefreshCw, AlertTriangle, AlertOctagon } from 'lucide-react';
import type { Issue } from '@shared/types';
import {
  AgingThresholdConfig as AgingThresholdConfigType,
  DEFAULT_THRESHOLDS,
  loadThresholdConfig,
  saveThresholdConfig,
  calculateThresholdsFromPercentiles,
  thresholdToHours,
} from '@/utils/agingAlerts';

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

  // Granularity options for thresholds
  const granularityOptions = [
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
                  <div>
                    <label htmlFor="percentileWarning" className="block text-xs font-medium text-slate-600 mb-1">
                      Warning Percentile
                    </label>
                    <select
                      id="percentileWarning"
                      value={config.autoCalcPercentileWarning}
                      onChange={(e) => handleInputChange('autoCalcPercentileWarning', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={0.75}>P75 (75th percentile)</option>
                      <option value={0.85}>P85 (85th percentile)</option>
                      <option value={0.90}>P90 (90th percentile)</option>
                      <option value={0.95}>P95 (95th percentile)</option>
                      <option value={0.99}>P99 (99th percentile)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="percentileCritical" className="block text-xs font-medium text-slate-600 mb-1">
                      Critical Percentile
                    </label>
                    <select
                      id="percentileCritical"
                      value={config.autoCalcPercentileCritical}
                      onChange={(e) => handleInputChange('autoCalcPercentileCritical', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={0.85}>P85 (85th percentile)</option>
                      <option value={0.90}>P90 (90th percentile)</option>
                      <option value={0.95}>P95 (95th percentile)</option>
                      <option value={0.99}>P99 (99th percentile)</option>
                      <option value={0.999}>P99.9 (99.9th percentile)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleAutoCalculate}
                  disabled={isCalculating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:bg-blue-400"
                >
                  {isCalculating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Calculator className="w-4 h-4" />
                  )}
                  {isCalculating ? 'Calculating...' : 'Calculate Thresholds'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Manual threshold configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Warning Threshold */}
                  <div>
                    <label htmlFor="warningThreshold" className="block text-xs font-medium text-slate-600 mb-1">
                      Warning Threshold
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        id="warningThreshold"
                        min="0.5"
                        step="0.5"
                        value={config.warningThreshold}
                        onChange={(e) => handleInputChange('warningThreshold', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <select
                        value={config.warningUnit}
                        onChange={(e) => handleInputChange('warningUnit', e.target.value as 'hours' | 'days')}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="hours">hours</option>
                        <option value="days">days</option>
                      </select>
                    </div>
                  </div>

                  {/* Critical Threshold */}
                  <div>
                    <label htmlFor="criticalThreshold" className="block text-xs font-medium text-slate-600 mb-1">
                      Critical Threshold
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        id="criticalThreshold"
                        min="0.5"
                        step="0.5"
                        value={config.criticalThreshold}
                        onChange={(e) => handleInputChange('criticalThreshold', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <select
                        value={config.criticalUnit}
                        onChange={(e) => handleInputChange('criticalUnit', e.target.value as 'hours' | 'days')}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="hours">hours</option>
                        <option value="days">days</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Quick selection buttons */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">Quick Select</label>
                  <div className="flex flex-wrap gap-2">
                    {granularityOptions.map((option) => (
                      <button
                        key={`${option.value}-${option.unit}`}
                        onClick={() => {
                          handleInputChange('warningThreshold', option.value);
                          handleInputChange('warningUnit', option.unit);
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          config.warningThreshold === option.value && config.warningUnit === option.unit
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Preview section */}
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
                  Warning: {previewConfig.warningThreshold} {previewConfig.warningUnit} ({thresholdToHours(previewConfig.warningThreshold, previewConfig.warningUnit)} hours) • 
                  Critical: {previewConfig.criticalThreshold} {previewConfig.criticalUnit} ({thresholdToHours(previewConfig.criticalThreshold, previewConfig.criticalUnit)} hours)
                </div>
              </div>
            </div>
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