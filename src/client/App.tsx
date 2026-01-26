import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Plus, Sun, Moon, Clock, Calendar, PanelLeft, RectangleHorizontal, PanelRight } from 'lucide-react';
import type { Issue, TimeGranularity, CreateIssueRequest } from '@shared/types';
import { useMetrics } from '@/hooks/useMetrics';
import { useTheme } from '@/hooks/useTheme';
import { useTimeDisplayMode } from '@/hooks/useTimeDisplayMode';
import { useWidth } from '@/hooks/useWidth';
import DashboardView from '@/components/DashboardView';
import AllIssuesTable from '@/components/AllIssuesTable';
import EpicsTable from '@/components/EpicsTable';
import { AgingAlertBadge } from '@/components/AgingAlertBadge';
import { AgingAlertList } from '@/components/AgingAlertList';
import KanbanBoard from '@/components/KanbanBoard';
import { AgingThresholdConfig } from '@/components/AgingThresholdConfig';
import { AgingThresholdConfig as AgingThresholdConfigType, loadThresholdConfig } from '@/utils/agingAlerts';
import IssueCreationModal from '@/components/IssueCreationModal';

function App() {
  const [parsedIssues, setParsedIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'issues' | 'epics' | 'board' | 'dashboard' | 'aging'>(() => {
    const saved = localStorage.getItem('beads-active-tab');
    // Migrate old 'table' value to 'issues'
    if (saved === 'table') return 'issues';
    return (saved as 'issues' | 'epics' | 'board' | 'dashboard' | 'aging') || 'issues';
  });
  const [focusedEpicId, setFocusedEpicId] = useState<string | null>(null);
  const [granularity, setGranularity] = useState<TimeGranularity>(() => {
    const saved = localStorage.getItem('beads-granularity');
    return (saved as TimeGranularity) || 'daily';
  });
  const [thresholdConfig, setThresholdConfig] = useState<AgingThresholdConfigType>(() => loadThresholdConfig());
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showCreationModal, setShowCreationModal] = useState(false);

  const { isDark, toggle: toggleTheme } = useTheme();
  const [timeDisplayMode, setTimeDisplayMode] = useTimeDisplayMode();
  const [widthMode, setWidthMode, maxWidth] = useWidth();
  const metrics = useMetrics(parsedIssues, granularity);

  const fetchData = async () => {
    try {
      console.log('[App] Fetching data from /api/data');
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('Failed to fetch data');
      const data = await res.json();
      console.log(`[App] Fetched ${data.length} issues`);
      setParsedIssues(data);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  const handleCreateIssue = async (request: CreateIssueRequest) => {
    const res = await fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to create issue');
    }

    // Data will auto-refresh via Socket.IO
  };

  const handleSelectChildren = (epicId: string) => {
    setFocusedEpicId(epicId);
    setActiveTab('issues');
  };

  useEffect(() => {
    fetchData();

    const socketInstance = io();

    socketInstance.on('refresh', () => {
      console.log('[Socket] Received refresh event - reloading data');
      fetchData();
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Persist granularity to localStorage
  useEffect(() => {
    localStorage.setItem('beads-granularity', granularity);
  }, [granularity]);

  // Persist active tab to localStorage
  useEffect(() => {
    localStorage.setItem('beads-active-tab', activeTab);
  }, [activeTab]);

  // Extract project name from issue IDs
  const projectName = parsedIssues.length > 0
    ? parsedIssues[0].id.substring(0, parsedIssues[0].id.lastIndexOf('-'))
    : '';

  // Update page title with project name
  useEffect(() => {
    if (projectName) {
      document.title = `${projectName} - Beads Performance Dashboard`;
    } else {
      document.title = 'Beads Performance Dashboard';
    }
  }, [projectName]);

  // Filter out tombstones for display count
  const activeIssuesCount = parsedIssues.filter((i) => i.status !== 'tombstone').length;

  const cycleWidth = () => {
    const modes: Array<'narrow' | 'medium' | 'wide'> = ['narrow', 'medium', 'wide'];
    const currentIndex = modes.indexOf(widthMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setWidthMode(modes[nextIndex]);
  };

  const getWidthIcon = () => {
    switch (widthMode) {
      case 'narrow':
        return <PanelLeft className="w-4 h-4" />;
      case 'medium':
        return <RectangleHorizontal className="w-4 h-4" />;
      case 'wide':
        return <PanelRight className="w-4 h-4" />;
    }
  };

  const getWidthLabel = () => {
    switch (widthMode) {
      case 'narrow':
        return 'Narrow';
      case 'medium':
        return 'Medium';
      case 'wide':
        return 'Wide';
    }
  };

  return (
    <div className="mx-auto p-8" style={{ maxWidth }}>
      <header className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {projectName && (
                <span className="text-slate-500 dark:text-slate-400 font-normal">{projectName} / </span>
              )}
              Beads Performance Dashboard
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Live View • {activeIssuesCount} issues loaded
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-slate-400 dark:text-slate-500">
              {loading ? 'Connecting...' : 'Connected'}
            </div>
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setTimeDisplayMode(timeDisplayMode === 'day' ? 'hour' : 'day')}
              className="p-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
              title={timeDisplayMode === 'day' ? 'Switch to hours view' : 'Switch to days view'}
            >
              {timeDisplayMode === 'day' ? <Clock className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setShowCreationModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Issue
            </button>
            <AgingAlertBadge
              issues={parsedIssues}
              onConfigureClick={() => setShowConfigModal(true)}
              thresholdConfig={thresholdConfig}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 border-b border-slate-200 dark:border-slate-700">
          <button
            className={`pb-2 px-1 text-sm font-medium flex items-center gap-1 ${
              activeTab === 'issues'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            onClick={() => setActiveTab('issues')}
          >
            Issues
          </button>
          <button
            className={`pb-2 px-1 text-sm font-medium flex items-center gap-1 ${
              activeTab === 'epics'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            onClick={() => setActiveTab('epics')}
          >
            Epics
          </button>
          <button
            className={`pb-2 px-1 text-sm font-medium flex items-center gap-1 ${
              activeTab === 'board'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            onClick={() => setActiveTab('board')}
          >
            Board
          </button>
          <button
            className={`pb-2 px-1 text-sm font-medium ${
              activeTab === 'dashboard'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`pb-2 px-1 text-sm font-medium flex items-center gap-1 ${
              activeTab === 'aging'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
            onClick={() => setActiveTab('aging')}
          >
            Aging Items
          </button>
        </div>
      </header>

      {loading && !parsedIssues.length ? (
        <div className="card py-20 text-center text-slate-400 dark:text-slate-500">Loading data...</div>
      ) : error ? (
        <div className="card py-20 text-center text-red-500 dark:text-red-400">{error}</div>
      ) : !metrics ? (
        <div className="card border-dashed border-2 border-slate-300 dark:border-slate-600 py-20 text-center text-slate-400 dark:text-slate-500">
          No issues found in .beads directory.
        </div>
      ) : activeTab === 'issues' ? (
        <AllIssuesTable
          issues={parsedIssues}
          focusedEpicId={focusedEpicId}
          onClearFocusedEpic={() => setFocusedEpicId(null)}
          timeDisplayMode={timeDisplayMode}
        />
      ) : activeTab === 'epics' ? (
        <EpicsTable
          issues={parsedIssues}
          onSelectChildren={handleSelectChildren}
          timeDisplayMode={timeDisplayMode}
        />
      ) : activeTab === 'board' ? (
        <KanbanBoard issues={parsedIssues} onRefresh={fetchData} timeDisplayMode={timeDisplayMode} />
      ) : activeTab === 'dashboard' ? (
        <DashboardView
          metrics={metrics}
          granularity={granularity}
          onGranularityChange={setGranularity}
          timeDisplayMode={timeDisplayMode}
        />
      ) : (
        <AgingAlertList
          issues={parsedIssues}
          onConfigureClick={() => setShowConfigModal(true)}
          thresholdConfig={thresholdConfig}
          timeDisplayMode={timeDisplayMode}
        />
      )}

      {/* Configuration Modal */}
      {showConfigModal && (
        <AgingThresholdConfig
          issues={parsedIssues}
          onClose={() => setShowConfigModal(false)}
          onSave={(newConfig) => {
            setThresholdConfig(newConfig);
            // Force re-render of components that depend on config
            setShowConfigModal(false);
          }}
        />
      )}

      {/* Issue Creation Modal */}
      {showCreationModal && (
        <IssueCreationModal
          onClose={() => setShowCreationModal(false)}
          onSubmit={handleCreateIssue}
        />
      )}

      {/* Width Toggle Widget */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={cycleWidth}
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
          title={`Current width: ${getWidthLabel()}. Click to cycle.`}
        >
          {getWidthIcon()}
          <span>{getWidthLabel()}</span>
        </button>
      </div>
    </div>
  );
}

export default App;