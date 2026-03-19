import React from 'react';
import { render, screen } from '../../test-utils';
import { Progress } from '../../../pages/user/Progress';
import { setupMockStore, mockCognitoUserState, mockProgressReportState, mockSeasonState, mockGoalState, mockTeamState } from '../../mocks/stores';
import { buildSeason, buildProgressReport } from '../../mocks/factories';
import { RoleType, TeamMemberStatus } from '../../../store/types';

jest.mock('../../../store/progressReports', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useProgressReportStore: m }; });
import { useProgressReportStore } from '../../../store/progressReports';
jest.mock('../../../store/seasons', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useSeasonStore: m }; });
import { useSeasonStore } from '../../../store/seasons';
jest.mock('../../../store/cognitoUser', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useCognitoUserStore: m }; });
import { useCognitoUserStore } from '../../../store/cognitoUser';
jest.mock('../../../store/goals', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useGoalStore: m }; });
import { useGoalStore } from '../../../store/goals';
jest.mock('../../../store/teams', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useTeamStore: m }; });
import { useTeamStore } from '../../../store/teams';
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: () => <div data-testid="line-chart" />,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

beforeEach(() => {
  jest.clearAllMocks();
});

function setup(overrides?: { reports?: any[] }) {
  setupMockStore(useCognitoUserStore as any, mockCognitoUserState());
  setupMockStore(useSeasonStore as any, mockSeasonState({
    seasonList: { seasons: [buildSeason({ id: 's1', name: 'S1' })], count: 1, hasMore: false, nextToken: '', filter: { teamId: 'team1' } },
  }));
  setupMockStore(useProgressReportStore as any, mockProgressReportState({
    reportList: { reports: overrides?.reports || [], count: overrides?.reports?.length || 0, hasMore: false, nextToken: '', filter: {} },
  }));
  setupMockStore(useGoalStore as any, mockGoalState());
  setupMockStore(useTeamStore as any, mockTeamState());
}

describe('Progress', () => {
  it('renders progress page title', () => {
    setup();
    render(<Progress />);
    expect(screen.getByText('Progress Reports')).toBeInTheDocument();
  });

  it('renders Create Report button', () => {
    setup();
    render(<Progress />);
    expect(screen.getByText('Create Progress Report')).toBeInTheDocument();
  });

  it('navigates to create page on button click', () => {
    setup();
    render(<Progress />);
    screen.getByText('Create Progress Report').click();
    expect(mockNavigate).toHaveBeenCalledWith('/progress/create');
  });

  it('renders season selector', () => {
    setup();
    render(<Progress />);
    expect(screen.getByLabelText('Season')).toBeInTheDocument();
  });
});
