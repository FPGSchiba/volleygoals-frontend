import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GoalHeatmap } from '../GoalHeatmap';
import { HeatmapData } from '../../../utils/chartUtils';

const data: HeatmapData = {
  rows: [
    {
      goalId: 'g1',
      goalName: 'Serve accuracy',
      cells: {
        '2025-03-01': { date: '2025-03-01', rating: 4, progressId: 'p1', reportId: 'r1' },
        '2025-03-08': { date: '2025-03-08', rating: 2, progressId: 'p2', reportId: 'r2' },
      },
    },
    {
      goalId: 'g2',
      goalName: 'Jump height',
      cells: {
        '2025-03-01': { date: '2025-03-01', rating: 5, progressId: 'p3', reportId: 'r1' },
      },
    },
  ],
  dateColumns: ['2025-03-01', '2025-03-08'],
};

describe('GoalHeatmap', () => {
  it('renders goal names', () => {
    render(<GoalHeatmap data={data} onCellClick={jest.fn()} />);
    expect(screen.getByTitle('Serve accuracy')).toBeInTheDocument();
    expect(screen.getByTitle('Jump height')).toBeInTheDocument();
  });

  it('renders rating numbers for filled cells', () => {
    render(<GoalHeatmap data={data} onCellClick={jest.fn()} />);
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onCellClick with progressId and reportId when a cell is clicked', async () => {
    const onCellClick = jest.fn();
    render(<GoalHeatmap data={data} onCellClick={onCellClick} />);
    await userEvent.click(screen.getByText('4'));
    expect(onCellClick).toHaveBeenCalledWith('p1', 'r1');
  });

  it('renders empty state when rows are empty', () => {
    render(<GoalHeatmap data={{ rows: [], dateColumns: [] }} onCellClick={jest.fn()} />);
    expect(screen.getByText(/no progress data/i)).toBeInTheDocument();
  });

  it('shows legend by default', () => {
    render(<GoalHeatmap data={data} onCellClick={jest.fn()} />);
    expect(screen.getByText(/rating/i)).toBeInTheDocument();
  });
});
