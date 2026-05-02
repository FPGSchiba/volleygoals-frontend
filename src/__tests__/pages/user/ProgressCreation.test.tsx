import React from 'react';
import { render, screen } from '../../test-utils';
import { ProgressCreation } from '../../../pages/user/ProgressCreation';
import { setupMockStore, mockCognitoUserState, mockProgressReportState, mockSeasonState, mockGoalState } from '../../mocks/stores';
import { buildSeason, buildGoal } from '../../mocks/factories';
import { GoalStatus } from '../../../store/types';

jest.mock('../../../store/progressReports', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useProgressReportStore: m }; });
import { useProgressReportStore } from '../../../store/progressReports';
jest.mock('../../../store/seasons', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useSeasonStore: m }; });
import { useSeasonStore } from '../../../store/seasons';
jest.mock('../../../store/cognitoUser', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useCognitoUserStore: m }; });
import { useCognitoUserStore } from '../../../store/cognitoUser';
jest.mock('../../../store/goals', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useGoalStore: m }; });
import { useGoalStore } from '../../../store/goals';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

beforeEach(() => {
  jest.clearAllMocks();
});

const setup = ({ hasGoals = false }: { hasGoals?: boolean } = {}) => {
  const goals = hasGoals
    ? [buildGoal({ id: 'g1', title: 'Goal A', status: GoalStatus.Open })]
    : [];
  setupMockStore(useCognitoUserStore as any, mockCognitoUserState());
  setupMockStore(useSeasonStore as any, mockSeasonState({ seasonList: { seasons: [buildSeason({ id: 's1' })], count: 1, hasMore: false, nextToken: '', filter: { teamId: '' } } }));
  setupMockStore(useProgressReportStore as any, mockProgressReportState());
  setupMockStore(useGoalStore as any, mockGoalState({ goalList: { goals, count: goals.length, hasMore: false, nextToken: '', filter: {} } }));
};

describe('ProgressCreation', () => {
  it('renders form fields', () => {
    setup();
    render(<ProgressCreation />);
    expect(screen.getByText('New Report')).toBeInTheDocument();
    expect(screen.getByLabelText('Summary')).toBeInTheDocument();
    expect(screen.getByLabelText('Session Notes')).toBeInTheDocument();
  });

  it('renders goal ratings when goals exist', () => {
    setup({ hasGoals: true });
    render(<ProgressCreation />);
    expect(screen.getByText('Goal Ratings')).toBeInTheDocument();
    expect(screen.getByText('Goal A')).toBeInTheDocument();
  });

  it('shows no goals message when no active goals', () => {
    setup();
    render(<ProgressCreation />);
    expect(screen.getByText('No active goals available.')).toBeInTheDocument();
  });

  it('renders submit and cancel buttons', () => {
    setup();
    render(<ProgressCreation />);
    expect(screen.getByText('Submit Report')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders numbered rating cells 1-5 instead of MUI Rating stars', () => {
    setup({ hasGoals: true });
    render(<ProgressCreation />);
    const cells = screen.getAllByRole('button', { name: /rating cell/i });
    expect(cells.length).toBeGreaterThanOrEqual(5);
  });
});
