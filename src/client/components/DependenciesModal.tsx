import { useEffect, useState } from 'react';
import { X, GitBranch, GitMerge, Copy, ExternalLink } from 'lucide-react';
import type { DependencyInfo, DependenciesResponse } from '@shared/types';

interface DependenciesModalProps {
  issueId: string;
  issueTitle: string;
  onClose: () => void;
  onViewIssue: (issueId: string) => void;
  sideBySideMode?: boolean; // Whether to position for side-by-side with issue modal
}

export default function DependenciesModal({ issueId, issueTitle, onClose, onViewIssue, sideBySideMode = false }: DependenciesModalProps) {
  const [data, setData] = useState<DependenciesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDependencies = async () => {
      try {
        const response = await fetch(`/api/issues/${issueId}/dependencies`);
        if (!response.ok) {
          throw new Error('Failed to fetch dependencies');
        }
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchDependencies();
  }, [issueId]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Don't close on backdrop click in side-by-side mode
    if (sideBySideMode) return;
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getShortId = (id: string) => {
    return id.includes('-') ? id.split('-').pop() : id;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'closed':
        return 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
      case 'blocked':
        return 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300';
      case 'in_progress':
        return 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      default:
        return 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300';
    }
  };

  const renderDependencyList = (items: DependencyInfo[], title: string) => {
    if (items.length === 0) {
      return (
        <div className="text-sm text-slate-500 dark:text-slate-400 italic">
          No {title.toLowerCase()}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {items.map((dep) => (
          <div
            key={dep.id}
            className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  {getShortId(dep.id)}
                </span>
                <button
                  onClick={() => handleCopy(dep.id)}
                  className="text-slate-300 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-300 transition-colors opacity-0 group-hover:opacity-100"
                  title="Copy full ID"
                >
                  <Copy className="w-3 h-3" />
                </button>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(dep.status)}`}
                >
                  {dep.status.replace('_', ' ')}
                </span>
              </div>
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {dep.title}
              </div>
            </div>
            <button
              onClick={() => onViewIssue(dep.id)}
              className="flex-shrink-0 p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              title="View issue details"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      className={`fixed inset-0 flex items-center p-4 animate-in fade-in duration-200 ${
        sideBySideMode ? 'z-[70] justify-start bg-transparent' : 'z-50 justify-center bg-black/50'
      }`}
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-white dark:bg-slate-900 rounded-lg shadow-xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200 ${
          sideBySideMode ? 'w-full max-w-2xl ml-2' : 'w-full max-w-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-1">
              Dependencies
            </h2>
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <span className="font-mono">{getShortId(issueId)}</span>
              <span>•</span>
              <span className="truncate">{issueTitle}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors ml-4"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              Loading dependencies...
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-red-600 dark:text-red-400">
              Error: {error}
            </div>
          )}

          {data && !loading && !error && (
            <>
              {/* Depends On Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <GitBranch className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Depends On
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    ({data.dependencies.length})
                  </span>
                </div>
                {renderDependencyList(data.dependencies, 'Dependencies')}
              </div>

              {/* Related Issues Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <GitMerge className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Related Issues
                  </h3>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    ({data.dependents.length})
                  </span>
                </div>
                {renderDependencyList(data.dependents, 'Related Issues')}
              </div>

              {/* Empty state */}
              {data.dependencies.length === 0 && data.dependents.length === 0 && (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                  <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">This issue has no dependencies or dependents</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
