import { useState, useEffect } from 'react';
import { AlertTriangle, AlertOctagon, Settings, X } from 'lucide-react';
import type { Issue } from '@shared/types';
import {
  AgingThresholdConfig,
  countIssuesByAgingStatus,
  getAgingIssues,
} from '@/utils/agingAlerts';
import { extractShortId } from '@/utils/commonUtils';

interface AgingAlertBadgeProps {
  issues: Issue[];
  onConfigureClick: () => void;
  thresholdConfig: AgingThresholdConfig;
}

export function AgingAlertBadge({ issues, onConfigureClick, thresholdConfig }: AgingAlertBadgeProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [today] = useState(() => new Date());

  // Recalculate counts when issues change
  const { warningCount, criticalCount } = countIssuesByAgingStatus(issues, thresholdConfig, today);
  const totalAging = warningCount + criticalCount;

  // Get aging issues for dropdown
  const agingIssues = getAgingIssues(issues, thresholdConfig, today);

  // Determine badge color based on severity
  const getBadgeColor = () => {
    if (criticalCount > 0) {
      return 'bg-red-500 hover:bg-red-600';
    } else if (warningCount > 0) {
      return 'bg-yellow-500 hover:bg-yellow-600';
    }
    return 'bg-slate-500 hover:bg-slate-600';
  };

  // Determine badge text
  const getBadgeText = () => {
    if (criticalCount > 0 && warningCount > 0) {
      return `${criticalCount} critical, ${warningCount} warning`;
    } else if (criticalCount > 0) {
      return `${criticalCount} critical`;
    } else if (warningCount > 0) {
      return `${warningCount} warning`;
    }
    return 'No alerts';
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.aging-alert-badge')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDropdown]);

  if (totalAging === 0) {
    return null; // Don't show badge if no aging items
  }

  return (
    <div className="relative aging-alert-badge">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-medium transition-colors ${getBadgeColor()}`}
        title="Aging work items"
      >
        {criticalCount > 0 ? (
          <AlertOctagon className="w-4 h-4" />
        ) : (
          <AlertTriangle className="w-4 h-4" />
        )}
        <span>{getBadgeText()}</span>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-xl z-50">
          <div className="p-3 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-800">Aging Work Items</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onConfigureClick();
                  setShowDropdown(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
                title="Configure thresholds"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropdown(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {agingIssues.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-sm">
              No aging items found
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 font-medium sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">Issue</th>
                    <th className="px-3 py-2 text-left">Age</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agingIssues.slice(0, 10).map(({ issue, ageDisplay, status }) => {
                    const shortId = extractShortId(issue.id);

                    return (
                      <tr key={issue.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-500 text-xs">{shortId}</span>
                            <span className="font-medium text-slate-900 truncate max-w-[120px]">
                              {issue.title || 'Untitled'}
                            </span>
                          </div>
                        </td>
                        <td className={`px-3 py-2 font-medium ${status === 'critical' ? 'text-red-600' : 'text-yellow-600'}`}>
                          {ageDisplay}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            status === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {status === 'critical' ? 'Critical' : 'Warning'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {agingIssues.length > 10 && (
                <div className="p-2 text-center text-xs text-slate-500">
                  Showing 10 of {agingIssues.length} aging items
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}