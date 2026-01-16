import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import IssueViewModal from '../../src/client/components/IssueViewModal';
import { Issue } from '../../src/shared/types';
import '@testing-library/jest-dom';

// Mock fetch
global.fetch = vi.fn();
// Mock confirm
global.confirm = vi.fn(() => true);

const mockIssue: Issue = {
  id: 'TEST-123',
  title: 'Test Issue',
  description: '# Description Content',
  design: '# Design Content',
  acceptance_criteria: '# Acceptance Content',
  status: 'open',
  issue_type: 'feature',
  priority: 1,
  created_at: new Date().toISOString(),
};

describe('IssueViewModal', () => {
  const onClose = vi.fn();
  const onUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with three tabs visible', () => {
    render(<IssueViewModal issue={mockIssue} onClose={onClose} onUpdate={onUpdate} />);
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Design')).toBeInTheDocument();
    expect(screen.getByText('Acceptance')).toBeInTheDocument();
  });

  it('displays description tab by default', () => {
    render(<IssueViewModal issue={mockIssue} onClose={onClose} onUpdate={onUpdate} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Description Content' })).toBeInTheDocument();
  });

  it('switches tabs and displays correct content', () => {
    render(<IssueViewModal issue={mockIssue} onClose={onClose} onUpdate={onUpdate} />);
    
    fireEvent.click(screen.getByText('Design'));
    expect(screen.getByRole('heading', { level: 1, name: 'Design Content' })).toBeInTheDocument();

    fireEvent.click(screen.getByText('Acceptance'));
    expect(screen.getByRole('heading', { level: 1, name: 'Acceptance Content' })).toBeInTheDocument();
  });

  it('switches to edit mode', () => {
    render(<IssueViewModal issue={mockIssue} onClose={onClose} onUpdate={onUpdate} />);
    
    const editButton = screen.getByTitle('Edit');
    fireEvent.click(editButton);

    const textarea = screen.getByPlaceholderText('Enter description...');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue('# Description Content');
  });

  it('saves changes via API', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: true });
    render(<IssueViewModal issue={mockIssue} onClose={onClose} onUpdate={onUpdate} />);
    
    fireEvent.click(screen.getByTitle('Edit'));
    const textarea = screen.getByPlaceholderText('Enter description...');
    fireEvent.change(textarea, { target: { value: 'New Description' } });
    
    fireEvent.click(screen.getByText('Save Changes'));

    expect(fetch).toHaveBeenCalledWith(`/api/issues/${mockIssue.id}`, expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ description: 'New Description' }),
    }));
    
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
  });

  it('saves design changes via API', async () => {
    (fetch as any).mockResolvedValueOnce({ ok: true });
    render(<IssueViewModal issue={mockIssue} onClose={onClose} onUpdate={onUpdate} />);
    
    fireEvent.click(screen.getByText('Design'));
    fireEvent.click(screen.getByTitle('Edit'));
    
    const textarea = screen.getByPlaceholderText('Enter design...');
    fireEvent.change(textarea, { target: { value: 'New Design' } });
    
    fireEvent.click(screen.getByText('Save Changes'));

    expect(fetch).toHaveBeenCalledWith(`/api/issues/${mockIssue.id}/design`, expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ design: 'New Design' }),
    }));
  });

  it('cancels edit without saving', () => {
    render(<IssueViewModal issue={mockIssue} onClose={onClose} onUpdate={onUpdate} />);
    
    fireEvent.click(screen.getByTitle('Edit'));
    const textarea = screen.getByPlaceholderText('Enter description...');
    fireEvent.change(textarea, { target: { value: 'New Description' } });
    
    fireEvent.click(screen.getByText('Cancel'));
    
    expect(screen.queryByPlaceholderText('Enter description...')).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { level: 1, name: 'Description Content' })).toBeInTheDocument();
  });

  it('warns on unsaved changes when closing', () => {
    render(<IssueViewModal issue={mockIssue} onClose={onClose} onUpdate={onUpdate} />);
    
    fireEvent.click(screen.getByTitle('Edit'));
    const textarea = screen.getByPlaceholderText('Enter description...');
    fireEvent.change(textarea, { target: { value: 'New Description' } });
    
    fireEvent.click(screen.getByLabelText('Close modal'));
    
    expect(confirm).toHaveBeenCalledWith('You have unsaved changes. Discard?');
    expect(onClose).toHaveBeenCalled(); // Since we mocked confirm to return true
  });
});
