import { useState } from 'react';
import type { Issue } from '@shared/types';
import AllIssuesTable from './AllIssuesTable';
import EpicsTable from './EpicsTable';

interface TableViewProps {
  issues: Issue[];
}

function TableView({ issues }: TableViewProps) {
  const [activeView, setActiveView] = useState<'issues' | 'epics'>('issues');
  const [focusedEpicId, setFocusedEpicId] = useState<string | null>(null);

  const handleSelectChildren = (epicId: string) => {
    setFocusedEpicId(epicId);
    setActiveView('issues');
  };

  return (
    <div className="space-y-4">
      <div className="flex space-x-4 border-b border-slate-200">
        <button
          className={`pb-2 px-1 text-sm font-medium transition-colors ${
            activeView === 'issues'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
          onClick={() => setActiveView('issues')}
        >
          Issues
        </button>
        <button
          className={`pb-2 px-1 text-sm font-medium transition-colors ${
            activeView === 'epics'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-slate-500 hover:text-slate-700'
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
        />
      ) : (
        <EpicsTable issues={issues} onSelectChildren={handleSelectChildren} />
      )}
    </div>
  );
}

export default TableView;
