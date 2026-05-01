import React from 'react';
import { render, screen } from '../../test-utils';
import { Dashboard } from '../../../pages/user/Dashboard';
import { setupMockStore, mockCognitoUserState, mockSeasonState, mockGoalState, mockActivityState, mockProgressReportState } from '../../mocks/stores';
import { buildSeason, buildGoal, buildActivityEntry, buildSeasonStats, buildUser } from '../../mocks/factories';
import { SeasonStatus, GoalStatus } from '../../../store/types';

jest.mock('../../../store/seasons', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useSeasonStore: m }; });
import { useSeasonStore } from '../../../store/seasons';
jest.mock('../../../store/goals', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useGoalStore: m }; });
import { useGoalStore } from '../../../store/goals';
jest.mock('../../../store/cognitoUser', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useCognitoUserStore: m }; });
import { useCognitoUserStore } from '../../../store/cognitoUser';
jest.mock('../../../store/activity', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useActivityStore: m }; });
import { useActivityStore } from '../../../store/activity';
jest.mock('../../../store/progressReports', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useProgressReportStore: m }; });
import { useProgressReportStore } from '../../../store/progressReports';
jest.mock('../../../services/backend.api', () => ({
  __esModule: true,
  default: { getSeasonStats: jest.fn().mockResolvedValue({}), setToken: jest.fn() },
}));
jest.mock('../../../components/progress/GoalHeatmap', () => ({
  GoalHeatmap: () => <div data-testid="goal-heatmap" />,
}));
jest.mock('../../../components/progress/EntryDrawer', () => ({
  EntryDrawer: () => null,
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

beforeEach(() => {
  jest.clearAllMocks();
});

function setup(opts: { hasActiveSeason?: boolean; seasonName?: string } = {}) {
  const { hasActiveSeason = false, seasonName = 'Spring 2025' } = opts;
  const seasons = hasActiveSeason
    ? [buildSeason({ status: SeasonStatus.Active, name: seasonName })]
    : [];
  setupMockStore(useCognitoUserStore as any, mockCognitoUserState());
  setupMockStore(useSeasonStore as any, mockSeasonState({ seasonList: { seasons, count: seasons.length, hasMore: false, nextToken: '', filter: { teamId: '' } } }));
  setupMockStore(useGoalStore as any, mockGoalState());
  setupMockStore(useActivityStore as any, mockActivityState());
  setupMockStore(useProgressReportStore as any, mockProgressReportState());
}

describe('Dashboard', () => {
  it('renders dashboard title', () => {
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState());
    setupMockStore(useSeasonStore as any, mockSeasonState());
    setupMockStore(useGoalStore as any, mockGoalState());
    setupMockStore(useActivityStore as any, mockActivityState());
    setupMockStore(useProgressReportStore as any, mockProgressReportState());

    render(<Dashboard />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('shows stat cards with data when active season exists', () => {
    const season = buildSeason({ status: SeasonStatus.Active, name: 'Spring 2026' });
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState());
    setupMockStore(useSeasonStore as any, mockSeasonState({ seasonList: { seasons: [season], count: 1, hasMore: false, nextToken: '', filter: { teamId: '' } } }));
    setupMockStore(useGoalStore as any, mockGoalState({ goalList: { goals: [buildGoal({ status: GoalStatus.Open })], count: 1, hasMore: false, nextToken: '', filter: {} } }));
    setupMockStore(useActivityStore as any, mockActivityState());
    setupMockStore(useProgressReportStore as any, mockProgressReportState());

    render(<Dashboard />);
    expect(screen.getByText('Open Goals')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Progress Reports')).toBeInTheDocument();
    expect(screen.getByText('Team Members')).toBeInTheDocument();
  });

  it('shows "No active season" empty state', () => {
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState());
    setupMockStore(useSeasonStore as any, mockSeasonState());
    setupMockStore(useGoalStore as any, mockGoalState());
    setupMockStore(useActivityStore as any, mockActivityState());
    setupMockStore(useProgressReportStore as any, mockProgressReportState());

    render(<Dashboard />);
    expect(screen.getByText('No active season.')).toBeInTheDocument();
  });

  it('shows activity feed or empty message', () => {
    const activities = [buildActivityEntry({ description: 'Created a goal' })];
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState());
    setupMockStore(useSeasonStore as any, mockSeasonState());
    setupMockStore(useGoalStore as any, mockGoalState());
    setupMockStore(useActivityStore as any, mockActivityState({ activities }));
    setupMockStore(useProgressReportStore as any, mockProgressReportState());

    render(<Dashboard />);
    expect(screen.getByText('Created a goal')).toBeInTheDocument();
  });

  it('shows no activity message when empty', () => {
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState());
    setupMockStore(useSeasonStore as any, mockSeasonState());
    setupMockStore(useGoalStore as any, mockGoalState());
    setupMockStore(useActivityStore as any, mockActivityState({ activities: [] }));
    setupMockStore(useProgressReportStore as any, mockProgressReportState());

    render(<Dashboard />);
    expect(screen.getByText('No recent activity.')).toBeInTheDocument();
  });

  it('renders five stat cards', () => {
    setup({ hasActiveSeason: true });
    render(<Dashboard />);
    expect(screen.getByText(/open goals/i)).toBeInTheDocument();
    expect(screen.getByText(/in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/completed/i)).toBeInTheDocument();
    expect(screen.getByText(/progress reports/i)).toBeInTheDocument();
    expect(screen.getByText(/team members/i)).toBeInTheDocument();
  });

  it('renders eyebrow with active season name', () => {
    setup({ hasActiveSeason: true, seasonName: 'Spring 2025' });
    render(<Dashboard />);
    expect(screen.getByText(/spring 2025/i)).toBeInTheDocument();
  });
});
