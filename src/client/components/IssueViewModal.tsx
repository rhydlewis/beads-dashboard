import { useState, useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { X, Edit2, FileText, Palette, CheckSquare } from 'lucide-react';
import type { Issue } from '@shared/types';

interface IssueViewModalProps {
  issue: Issue;
  onClose: () => void;
  onUpdate: () => void; // Trigger data refresh
}

type Tab = 'description' | 'design' | 'acceptance';

export default function IssueViewModal({ issue, onClose, onUpdate }: IssueViewModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200" onClick={handleClose}>
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start p-6 pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{issue.title}</h3>
            <p className="text-sm text-slate-500 font-mono mt-1">{issue.id}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center px-6 border-b border-slate-200 bg-slate-50/50">
          <button
            onClick={() => handleTabChange('description')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'description'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            Description
          </button>
          <button
            onClick={() => handleTabChange('design')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'design'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Palette className="w-4 h-4" />
            Design
          </button>
          <button
            onClick={() => handleTabChange('acceptance')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'acceptance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
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
              className="w-full h-full min-h-[300px] p-4 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none resize-none"
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
                  className="absolute top-0 right-0 p-2 text-slate-400 hover:text-blue-600 bg-white/50 hover:bg-white rounded-md transition-colors opacity-0 group-hover:opacity-100"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              {getFieldValue(activeTab) ? (
                <div
                  className="prose prose-sm max-w-none text-slate-700"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(marked.parse(getFieldValue(activeTab)) as string)
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <p className="italic mb-4">No {activeTab.replace('_', ' ')} provided.</p>
                  <button 
                    onClick={startEditing}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-md text-sm font-medium transition-colors border border-slate-200"
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
          <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-lg flex justify-end gap-3">
             <div className="flex-1 flex items-center text-xs text-amber-600 font-medium">
                {hasUnsavedChanges && <span>● Unsaved changes</span>}
             </div>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
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
