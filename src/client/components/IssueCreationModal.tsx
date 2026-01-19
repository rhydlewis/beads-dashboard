import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import type { IssueType, Priority, CreateIssueRequest } from '@shared/types';
import { PRIORITY_LABELS } from '@shared/types';

interface IssueCreationModalProps {
  onClose: () => void;
  onSubmit: (request: CreateIssueRequest) => Promise<void>;
}

function IssueCreationModal({ onClose, onSubmit }: IssueCreationModalProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<IssueType>('task');
  const [priority, setPriority] = useState<Priority>(2); // Default to Medium
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation states
  const [titleError, setTitleError] = useState<string | null>(null);
  const [typeError, setTypeError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);

  // Constants
  const MAX_DESCRIPTION_LENGTH = 100 * 1024; // 100KB

  // Check description length
  useEffect(() => {
    if (description) {
      const byteLength = new Blob([description]).size;
      if (byteLength > MAX_DESCRIPTION_LENGTH) {
        setDescriptionError(`Description exceeds 100KB limit (current: ${Math.round(byteLength / 1024)}KB)`);
      } else {
        setDescriptionError(null);
      }
    } else {
      setDescriptionError(null);
    }
  }, [description]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset errors
    setTitleError(null);
    setTypeError(null);
    setError(null);

    // Validate required fields
    let hasError = false;
    if (!title.trim()) {
      setTitleError('Title is required');
      hasError = true;
    }
    if (!type) {
      setTypeError('Type is required');
      hasError = true;
    }
    if (descriptionError) {
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setIsSubmitting(true);

    try {
      const request: CreateIssueRequest = {
        title: title.trim(),
        type,
        priority,
        description: description.trim() || undefined,
      };

      await onSubmit(request);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create issue';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-start p-6 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Create New Issue</h3>
            <p className="text-sm text-slate-500 mt-1">Fill in the details to create a new issue</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1" disabled={isSubmitting}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            {/* Title field */}
            <div>
              <label htmlFor="issue-title" className="block text-sm font-medium text-slate-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="issue-title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (titleError) setTitleError(null);
                }}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none ${
                  titleError ? 'border-red-500' : 'border-slate-300'
                }`}
                placeholder="Enter issue title..."
                disabled={isSubmitting}
              />
              {titleError && <p className="text-red-500 text-xs mt-1">{titleError}</p>}
            </div>

            {/* Type field */}
            <div>
              <label htmlFor="issue-type" className="block text-sm font-medium text-slate-700 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                id="issue-type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value as IssueType);
                  if (typeError) setTypeError(null);
                }}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none ${
                  typeError ? 'border-red-500' : 'border-slate-300'
                }`}
                disabled={isSubmitting}
              >
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="feature">Feature</option>
                <option value="epic">Epic</option>
              </select>
              {typeError && <p className="text-red-500 text-xs mt-1">{typeError}</p>}
            </div>

            {/* Priority field */}
            <div>
              <label htmlFor="issue-priority" className="block text-sm font-medium text-slate-700 mb-1">
                Priority
              </label>
              <select
                id="issue-priority"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value) as Priority)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none"
                disabled={isSubmitting}
              >
                <option value="0">{PRIORITY_LABELS[0]} (P0)</option>
                <option value="1">{PRIORITY_LABELS[1]} (P1)</option>
                <option value="2">{PRIORITY_LABELS[2]} (P2)</option>
                <option value="3">{PRIORITY_LABELS[3]} (P3)</option>
                <option value="4">{PRIORITY_LABELS[4]} (P4)</option>
              </select>
            </div>

            {/* Description field */}
            <div>
              <label htmlFor="issue-description" className="block text-sm font-medium text-slate-700 mb-2">
                Description <span className="text-slate-400 text-xs">(optional, supports Markdown)</span>
              </label>
              <div data-color-mode="light">
                <MDEditor
                  value={description}
                  onChange={(val) => setDescription(val || '')}
                  preview="live"
                  height={300}
                  visibleDragbar={false}
                  textareaProps={{
                    placeholder: 'Enter issue description with Markdown support...',
                    disabled: isSubmitting,
                  }}
                />
              </div>
              {descriptionError && (
                <p className="text-red-500 text-xs mt-1">{descriptionError}</p>
              )}
              {description && !descriptionError && (
                <p className="text-slate-500 text-xs mt-1">
                  {Math.round(new Blob([description]).size / 1024)}KB / 100KB
                </p>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-lg flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default IssueCreationModal;
