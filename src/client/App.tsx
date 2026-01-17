import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import type { Issue, TimeGranularity } from '@shared/types';
import { useMetrics } from '@/hooks/useMetrics';
import DashboardView from '@/components/DashboardView';
import TableView from '@/components/TableView';
import { AgingAlertBadge } from '@/components/AgingAlertBadge';
import { AgingAlertList } from '@/components/AgingAlertList';
import KanbanBoard from '@/components/KanbanBoard';
import { AgingThresholdConfig } from '@/components/AgingThresholdConfig';
import { AgingThresholdConfig as AgingThresholdConfigType, loadThresholdConfig } from '@/utils/agingAlerts';

function App() {
  const [parsedIssues, setParsedIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'table' | 'board' | 'dashboard' | 'aging'>(() => {
    const saved = localStorage.getItem('beads-active-tab');
    return (saved as 'table' | 'board' | 'dashboard' | 'aging') || 'table';
  });
  const [granularity, setGranularity] = useState<TimeGranularity>(() => {
    const saved = localStorage.getItem('beads-granularity');
    return (saved as TimeGranularity) || 'daily';
  });
  const [thresholdConfig, setThresholdConfig] = useState<AgingThresholdConfigType>(() => loadThresholdConfig());
  const [showConfigModal, setShowConfigModal] = useState(false);

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

  return (
    <div className="max-w-6xl mx-auto p-8">
      <header className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {projectName && (
                <span className="text-slate-500 font-normal">{projectName} / </span>
              )}
              Beads Performance Dashboard
            </h1>
            <p className="text-slate-500 text-sm">
              Live View • {activeIssuesCount} issues loaded
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-slate-400">
              {loading ? 'Connecting...' : 'Connected'}
            </div>
            <AgingAlertBadge
              issues={parsedIssues}
              onConfigureClick={() => setShowConfigModal(true)}
              thresholdConfig={thresholdConfig}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 border-b border-slate-200">
          <button
            className={`pb-2 px-1 text-sm font-medium flex items-center gap-1 ${
              activeTab === 'table'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setActiveTab('table')}
          >
            All Issues
          </button>
          <button
            className={`pb-2 px-1 text-sm font-medium flex items-center gap-1 ${
              activeTab === 'board'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setActiveTab('board')}
          >
            Board
          </button>
          <button
            className={`pb-2 px-1 text-sm font-medium ${
              activeTab === 'dashboard'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`pb-2 px-1 text-sm font-medium flex items-center gap-1 ${
              activeTab === 'aging'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setActiveTab('aging')}
          >
            Aging Items
          </button>
        </div>
      </header>

      {loading && !parsedIssues.length ? (
        <div className="card py-20 text-center text-slate-400">Loading data...</div>
      ) : error ? (
        <div className="card py-20 text-center text-red-500">{error}</div>
      ) : !metrics ? (
        <div className="card border-dashed border-2 py-20 text-center text-slate-400">
          No issues found in .beads directory.
        </div>
      ) : activeTab === 'table' ? (
        <TableView
          issues={parsedIssues}
        />
      ) : activeTab === 'board' ? (
        <KanbanBoard issues={parsedIssues} onRefresh={fetchData} />
      ) : activeTab === 'dashboard' ? (
        <DashboardView
          metrics={metrics}
          granularity={granularity}
          onGranularityChange={setGranularity}
        />
      ) : (
        <AgingAlertList
          issues={parsedIssues}
          onConfigureClick={() => setShowConfigModal(true)}
          thresholdConfig={thresholdConfig}
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
    </div>
  );
}

export default App;