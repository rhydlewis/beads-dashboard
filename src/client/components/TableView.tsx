import { useState } from 'react';
import type { Issue } from '@shared/types';
import type { TimeDisplayMode } from '@/utils/timeFormatting';
import AllIssuesTable from './AllIssuesTable';
import EpicsTable from './EpicsTable';

interface TableViewProps {
  issues: Issue[];
  timeDisplayMode: TimeDisplayMode;
  onTimeDisplayModeChange: (mode: TimeDisplayMode) => void;
}

function TableView({ issues, timeDisplayMode, onTimeDisplayModeChange }: TableViewProps) {
  const [activeView, setActiveView] = useState<'issues' | 'epics'>('issues');
  const [focusedEpicId, setFocusedEpicId] = useState<string | null>(null);

  const handleSelectChildren = (epicId: string) => {
    setFocusedEpicId(epicId);
    setActiveView('issues');
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-4 border-b border-slate-200 dark:border-slate-700">
        <button
          className={`pb-2 px-1 text-sm font-medium transition-colors ${
            activeView === 'issues'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          onClick={() => setActiveView('issues')}
        >
          Issues
        </button>
        <button
          className={`pb-2 px-1 text-sm font-medium transition-colors ${
            activeView === 'epics'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          onClick={() => setActiveView('epics')}
        >
          Epics
        </button>
      </div>

      {activeView === 'issues' ? (
        <AllIssuesTable
          issues={issues}
          focusedEpicId={focusedEpicId}
          onClearFocusedEpic={() => setFocusedEpicId(null)}
          timeDisplayMode={timeDisplayMode}
          onTimeDisplayModeChange={onTimeDisplayModeChange}
        />
      ) : (
        <EpicsTable
          issues={issues}
          onSelectChildren={handleSelectChildren}
        />
      )}
    </div>
  );
}

export default TableView;
