import { Calculator, RefreshCw } from 'lucide-react';

interface AutoCalcButtonProps {
  isCalculating: boolean;
  onClick: () => void;
}

export function AutoCalcButton({ isCalculating, onClick }: AutoCalcButtonProps) {
  return (
    <button
      onClick={onClick}
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
  );
}
