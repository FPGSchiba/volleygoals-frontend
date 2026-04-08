import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GoalActivityChart } from '../GoalActivityChart';

// Recharts renders SVG — suppress ResizeObserver errors in jsdom
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };

// Mock Recharts so jsdom renders the chart children (including custom shapes)
jest.mock('recharts', () => {
  const React = require('react');
  return {
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 800, height: 400 }}>{children}</div>
    ),
    ScatterChart: ({ children }: any) => <svg>{children}</svg>,
    Scatter: ({ data, shape }: any) => (
      <g>
        {(data ?? []).map((point: any, i: number) =>
          React.createElement('g', { key: i },
            shape({ cx: 50 + i * 100, cy: 50 + i * 40, payload: point })
          )
        )}
      </g>
    ),
    XAxis: ({ tickFormatter }: any) => <g className="x-axis" />,
    YAxis: ({ ticks, tickFormatter }: any) => (
      <g className="y-axis">
        {(ticks ?? []).map((tick: number) => (
          <text key={tick}>{tickFormatter(tick)}</text>
        ))}
      </g>
    ),
    CartesianGrid: () => <g />,
    Tooltip: () => null,
  };
});

const mockGoalNames = ['Serve accuracy', 'Jump height'];
const mockPoints = [
  {
    x: new Date('2025-03-01').getTime(),
    y: 0,
    rating: 4,
    progressId: 'entry-1',
    reportId: 'report-1',
    goalName: 'Serve accuracy',
    isOnTrack: true,
  },
  {
    x: new Date('2025-03-10').getTime(),
    y: 1,
    rating: 2,
    progressId: 'entry-2',
    reportId: 'report-2',
    goalName: 'Jump height',
    isOnTrack: false,
  },
];

describe('GoalActivityChart', () => {
  it('renders goal names as Y-axis labels', () => {
    render(
      <GoalActivityChart
        points={mockPoints}
        goalNames={mockGoalNames}
        onEntryClick={jest.fn()}
      />,
    );
    expect(screen.getByText('Serve accuracy')).toBeInTheDocument();
    expect(screen.getByText('Jump height')).toBeInTheDocument();
  });

  it('renders a dot for each scatter point', () => {
    render(
      <GoalActivityChart
        points={mockPoints}
        goalNames={mockGoalNames}
        onEntryClick={jest.fn()}
      />,
    );
    // Each dot renders its rating as text
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('calls onEntryClick with progressId and reportId when a dot is clicked', async () => {
    const onEntryClick = jest.fn();
    render(
      <GoalActivityChart
        points={mockPoints}
        goalNames={mockGoalNames}
        onEntryClick={onEntryClick}
      />,
    );
    await userEvent.click(screen.getByText('4'));
    expect(onEntryClick).toHaveBeenCalledWith('entry-1', 'report-1');
  });

  it('renders an empty state message when there are no points', () => {
    render(
      <GoalActivityChart
        points={[]}
        goalNames={mockGoalNames}
        onEntryClick={jest.fn()}
      />,
    );
    expect(screen.getByText(/no progress entries/i)).toBeInTheDocument();
  });
});
