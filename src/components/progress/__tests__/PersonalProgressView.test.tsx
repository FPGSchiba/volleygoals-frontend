import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PersonalProgressView } from '../PersonalProgressView';

// Stub child components to keep tests focused
jest.mock('../GoalActivityChart', () => ({
  GoalActivityChart: () => <div data-testid="goal-activity-chart" />,
}));
jest.mock('../EntryDrawer', () => ({
  EntryDrawer: () => null,
}));

// Mock the stores
jest.mock('../../../store/progressReports', () => ({
  useProgressReportStore: () => ({
    reportList: { reports: [], count: 0 },
    fetchReports: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../../../store/goals', () => ({
  useGoalStore: jest.fn(() => ({
    goalList: { goals: [] },
    fetchGoals: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('PersonalProgressView', () => {
  it('renders the goal activity chart', () => {
    render(
      <MemoryRouter>
        <PersonalProgressView teamId="team-1" seasonId="season-1" canParticipate={true} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('goal-activity-chart')).toBeInTheDocument();
  });

  it('shows the New Report button when canParticipate is true', () => {
    render(
      <MemoryRouter>
        <PersonalProgressView teamId="team-1" seasonId="season-1" canParticipate={true} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /new report/i })).toBeInTheDocument();
  });

  it('hides the New Report button when canParticipate is false', () => {
    render(
      <MemoryRouter>
        <PersonalProgressView teamId="team-1" seasonId="season-1" canParticipate={false} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button', { name: /new report/i })).not.toBeInTheDocument();
  });
});
