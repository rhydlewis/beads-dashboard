import { useState, useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { X, Edit2, FileText, Palette, CheckSquare, GitBranch } from 'lucide-react';
import type { Issue } from '@shared/types';
import { formatTimestamp, type TimeDisplayMode } from '@/utils/timeFormatting';

interface IssueViewModalProps {
  issue: Issue;
  onClose: () => void;
  onUpdate: () => void; // Trigger data refresh
  timeDisplayMode?: TimeDisplayMode;
  onShowDependencies?: (issue: Issue) => void; // Optional handler to show dependencies
  sideBySideMode?: boolean; // Whether to position for side-by-side with dependencies modal
}

type Tab = 'description' | 'design' | 'acceptance';

export default function IssueViewModal({ issue, onClose, onUpdate, timeDisplayMode = 'day', onShowDependencies, sideBySideMode = false }: IssueViewModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('description');
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  // Track if we have unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Track optimistic updates (saved values that haven't been confirmed by server yet)
  const [optimisticValues, setOptimisticValues] = useState<Partial<Record<Tab, string>>>({});

  // Update optimistic values when the real issue data changes and matches
  useEffect(() => {
    setOptimisticValues(prev => {
      const next = { ...prev };

      // Clear optimistic value if real data matches
      if (next.description !== undefined && issue.description === next.description) {
        delete next.description;
      }
      if (next.design !== undefined && issue.design === next.design) {
        delete next.design;
      }
      if (next.acceptance !== undefined && issue.acceptance_criteria === next.acceptance) {
        delete next.acceptance;
      }

      return next;
    });
  }, [issue]);

  const getFieldValue = (tab: Tab) => {
    // First check if we have an optimistic update for this field
    if (optimisticValues[tab] !== undefined) {
      return optimisticValues[tab];
    }

    // Otherwise return the real data
    switch (tab) {
      case 'description': return issue.description || '';
      case 'design': return issue.design || '';
      case 'acceptance': return issue.acceptance_criteria || '';
    }
  };

  const startEditing = () => {
    setEditValue(getFieldValue(activeTab));
    setIsEditing(true);
    setHasUnsavedChanges(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setHasUnsavedChanges(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let endpoint = '';
      let body = {};

      switch (activeTab) {
        case 'description':
          endpoint = `/api/issues/${issue.id}`;
          body = { description: editValue };
          break;
        case 'design':
          endpoint = `/api/issues/${issue.id}/design`;
          body = { design: editValue };
          break;
        case 'acceptance':
          endpoint = `/api/issues/${issue.id}/acceptance`;
          body = { acceptance_criteria: editValue };
          break;
      }

      // Optimistically update the UI immediately
      setOptimisticValues(prev => ({ ...prev, [activeTab]: editValue }));
      setIsEditing(false);
      setHasUnsavedChanges(false);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to update');

      onUpdate(); // Refresh data - optimistic value will be cleared when real data arrives

    } catch (err) {
      console.error(err);
      alert('Failed to save');
      // Revert optimistic update on error
      setOptimisticValues(prev => {
        const next = { ...prev };
        delete next[activeTab];
        return next;
      });
      // Go back to editing mode so user can retry
      setIsEditing(true);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Discard?')) {
        return;
      }
    }
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Don't close on backdrop click in side-by-side mode
    if (sideBySideMode) return;
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };
  
  const handleTabChange = (tab: Tab) => {
    if (isEditing && hasUnsavedChanges) {
        if (!confirm('You have unsaved changes. Discard?')) {
            return;
        }
    }
    setActiveTab(tab);
    setIsEditing(false);
    setHasUnsavedChanges(false);
    // Don't clear optimistic values - they should persist across tabs
  };

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [hasUnsavedChanges]);

  return (
    <div
      className={`fixed inset-0 flex items-center p-4 animate-in fade-in duration-200 ${
        sideBySideMode ? 'z-[60] justify-end bg-transparent pointer-events-none' : 'z-50 justify-center bg-black/50'
      }`}
      onClick={handleBackdropClick}
    >
      <div
        className={`bg-white dark:bg-slate-900 rounded-lg shadow-xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200 ${
          sideBySideMode ? 'w-full max-w-2xl mr-2 pointer-events-auto' : 'w-full max-w-3xl'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start p-6 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{issue.title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-mono mt-1">{issue.id}</p>
            <div className="flex gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Created: {formatTimestamp(issue.created_at, timeDisplayMode)}</span>
              <span>Updated: {formatTimestamp(issue.updated_at, timeDisplayMode)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onShowDependencies && (
              <button
                onClick={() => onShowDependencies(issue)}
                className="text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400 transition-colors p-1"
                aria-label="Show dependencies"
                title="Show dependencies"
              >
                <GitBranch className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-1"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center px-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <button
            onClick={() => handleTabChange('description')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'description'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-500'
            }`}
          >
            <FileText className="w-4 h-4" />
            Description
          </button>
          <button
            onClick={() => handleTabChange('design')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'design'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-500'
            }`}
          >
            <Palette className="w-4 h-4" />
            Design
          </button>
          <button
            onClick={() => handleTabChange('acceptance')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'acceptance'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-500'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            Acceptance
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 min-h-[300px]">
          {isEditing ? (
            <textarea
              className="w-full h-full min-h-[300px] p-4 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-mono bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none resize-none"
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder={`Enter ${activeTab.replace('_', ' ')}...`}
            />
          ) : (
            <div className="relative group">
               <button
                  onClick={startEditing}
                  className="absolute top-0 right-0 p-2 text-slate-400 hover:text-blue-600 bg-white/50 hover:bg-white dark:bg-slate-800/50 dark:hover:bg-slate-800 dark:text-slate-500 dark:hover:text-blue-400 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              {getFieldValue(activeTab) ? (
                <div
                  className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300 dark:prose-invert"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(marked.parse(getFieldValue(activeTab)) as string)
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
                  <p className="italic mb-4">No {activeTab.replace('_', ' ')} provided.</p>
                  <button
                    onClick={startEditing}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-md text-sm font-medium transition-colors border border-slate-200 dark:border-slate-600 dark:text-slate-300"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Add Content
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {isEditing && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 rounded-b-lg flex justify-end gap-3">
             <div className="flex-1 flex items-center text-xs text-amber-600 dark:text-amber-400 font-medium">
                {hasUnsavedChanges && <span>● Unsaved changes</span>}
             </div>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-md text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
