import { marked } from 'marked';
import { X, Edit2 } from 'lucide-react';
import type { Issue } from '@shared/types';

interface IssueDetailModalProps {
  issue: Issue;
  isEditing: boolean;
  editValue: string;
  saving: boolean;
  onClose: () => void;
  onToggleEditing: (editing: boolean) => void;
  onChangeEditValue: (value: string) => void;
  onSave: () => void;
}

function IssueDetailModal({
  issue,
  isEditing,
  editValue,
  saving,
  onClose,
  onToggleEditing,
  onChangeEditValue,
  onSave,
}: IssueDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start p-6 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-bold text-slate-900">{issue.title || 'Untitled'}</h3>
            <p className="text-sm text-slate-500 font-mono mt-1">{issue.id}</p>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <button
                onClick={() => onToggleEditing(true)}
                className="text-slate-400 hover:text-blue-600 transition-colors p-1"
                title="Edit Description"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {isEditing ? (
            <textarea
              className="w-full h-64 p-3 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
              value={editValue}
              onChange={(e) => onChangeEditValue(e.target.value)}
              placeholder="Enter issue description..."
            />
          ) : issue.description ? (
            <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: marked.parse(issue.description) as string }} />
          ) : (
            <div className="text-slate-400 italic text-center py-8">⚠️ No description provided for this issue.</div>
          )}
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-lg flex justify-end gap-3">
          {isEditing ? (
            <>
              <button
                onClick={() => onToggleEditing(false)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={onSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default IssueDetailModal;
