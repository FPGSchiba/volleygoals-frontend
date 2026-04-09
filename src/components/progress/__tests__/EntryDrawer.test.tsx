import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntryDrawer } from '../EntryDrawer';
import { MemoryRouter } from 'react-router-dom';

const mockEntry = {
  id: 'entry-1',
  goalId: 'goal-1',
  goalName: 'Serve accuracy',
  rating: 4,
  details: 'Really focused this week.',
  reportId: 'report-1',
  reportDate: '2025-03-01T00:00:00Z',
};

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('EntryDrawer', () => {
  it('renders nothing when entry is null', () => {
    renderWithRouter(
      <EntryDrawer entry={null} readonly={false} onClose={jest.fn()} />,
    );
    expect(screen.queryByText('Serve accuracy')).not.toBeInTheDocument();
  });

  it('shows goal name, rating, and details when entry is provided', () => {
    renderWithRouter(
      <EntryDrawer entry={mockEntry} readonly={false} onClose={jest.fn()} />,
    );
    expect(screen.getByText('Serve accuracy')).toBeInTheDocument();
    expect(screen.getByText('4 / 5')).toBeInTheDocument();
    expect(screen.getByText('Really focused this week.')).toBeInTheDocument();
  });

  it('hides the edit button in readonly mode but still shows open full report link', () => {
    renderWithRouter(
      <EntryDrawer entry={mockEntry} readonly={true} onClose={jest.fn()} />,
    );
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open full report/i })).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = jest.fn();
    renderWithRouter(
      <EntryDrawer entry={mockEntry} readonly={false} onClose={onClose} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
