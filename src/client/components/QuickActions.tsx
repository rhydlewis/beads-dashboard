import { useState } from 'react';
import { Play, Check } from 'lucide-react';
import type { Issue, IssueStatus } from '@shared/types';

interface QuickActionsProps {
  issue: Issue;
}

export default function QuickActions({ issue }: QuickActionsProps) {
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleStatusUpdate = async (newStatus: IssueStatus) => {
    setUpdatingStatus(true);
    try {
      // Use different endpoint for closing vs status update
      const endpoint = newStatus === 'closed'
        ? `/api/issues/${issue.id}/close`
        : `/api/issues/${issue.id}/status`;

      const body = newStatus === 'closed'
        ? {} // bd close doesn't need a body
        : { status: newStatus };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update status');
      }
    } catch (err) {
      console.error(err);
      alert(`Failed to update status: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {issue.status !== 'closed' && issue.status !== 'in_progress' && (
        <button
          onClick={() => handleStatusUpdate('in_progress')}
          disabled={updatingStatus}
          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
          title="Start Progress"
        >
          <Play className="w-4 h-4" />
        </button>
      )}
      {issue.status !== 'closed' && (
        <button
          onClick={() => handleStatusUpdate('closed')}
          disabled={updatingStatus}
          className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
          title="Close Issue"
        >
          <Check className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
