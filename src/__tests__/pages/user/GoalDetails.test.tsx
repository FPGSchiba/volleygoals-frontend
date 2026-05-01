import React from 'react';
import { render, screen } from '../../test-utils';
import { GoalDetails } from '../../../pages/user/GoalDetails';
import { setupMockStore, mockCognitoUserState, mockGoalState, mockSeasonState, mockTeamState, mockProgressReportState } from '../../mocks/stores';
import { buildGoal, buildSeason, buildTeamSettings } from '../../mocks/factories';
import { GoalType, GoalStatus, RoleType, TeamMemberStatus, CommentType } from '../../../store/types';

jest.mock('../../../store/goals', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useGoalStore: m }; });
import { useGoalStore } from '../../../store/goals';
jest.mock('../../../store/seasons', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useSeasonStore: m }; });
import { useSeasonStore } from '../../../store/seasons';
jest.mock('../../../store/cognitoUser', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useCognitoUserStore: m }; });
import { useCognitoUserStore } from '../../../store/cognitoUser';
jest.mock('../../../store/teams', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useTeamStore: m }; });
import { useTeamStore } from '../../../store/teams';
jest.mock('../../../store/progressReports', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useProgressReportStore: m }; });
import { useProgressReportStore } from '../../../store/progressReports';
jest.mock('../../../services/backend.api', () => ({
  __esModule: true,
  default: { listComments: jest.fn().mockResolvedValue({ items: [] }), uploadGoalAvatar: jest.fn(), setToken: jest.fn(), getPresignedCommentFileUploadUrl: jest.fn(), createComment: jest.fn(), updateComment: jest.fn(), deleteComment: jest.fn() },
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ goalId: 'g1' }),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ state: { seasonId: 's1' } }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GoalDetails', () => {
  it('shows loading when no current goal', () => {
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState());
    setupMockStore(useGoalStore as any, mockGoalState({ currentGoal: undefined }));
    setupMockStore(useSeasonStore as any, mockSeasonState({ seasonList: { seasons: [buildSeason({ id: 's1' })], count: 1, hasMore: false, nextToken: '', filter: { teamId: '' } } }));
    setupMockStore(useTeamStore as any, mockTeamState());
    setupMockStore(useProgressReportStore as any, mockProgressReportState());

    render(<GoalDetails />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders goal title, type, status, and description', () => {
    const goal = buildGoal({ id: 'g1', teamId: 't1', title: 'Score More', description: 'Improve scoring', goalType: GoalType.Team, status: GoalStatus.InProgress });
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState());
    setupMockStore(useGoalStore as any, mockGoalState({ currentGoal: goal }));
    setupMockStore(useSeasonStore as any, mockSeasonState({ seasonList: { seasons: [buildSeason({ id: 's1' })], count: 1, hasMore: false, nextToken: '', filter: { teamId: '' } } }));
    setupMockStore(useTeamStore as any, mockTeamState({ currentTeamSettings: buildTeamSettings({ allowTeamGoalComments: true }) }));
    setupMockStore(useProgressReportStore as any, mockProgressReportState());

    render(<GoalDetails />);
    // Title is shown as page heading
    expect(screen.getByText('Score More')).toBeInTheDocument();
    // description is rendered as text
    expect(screen.getByText('Improve scoring')).toBeInTheDocument();
    // goalType is shown in meta row
    expect(screen.getByText('team')).toBeInTheDocument();
    // status is shown in meta row
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('shows save/delete buttons when having permissions', () => {
    const userId = 'user-1';
    const goal = buildGoal({ id: 'g1', teamId: 't1', ownerId: userId, goalType: GoalType.Team });
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState({
      user: { id: userId, email: 'u@t.com', name: 'U', enabled: true, userStatus: 'CONFIRMED', userType: 'USERS', updatedAt: '', createdAt: '' },
      currentPermissions: ['team_goals:write', 'team_goals:delete'],
    }));
    setupMockStore(useGoalStore as any, mockGoalState({ currentGoal: goal }));
    setupMockStore(useSeasonStore as any, mockSeasonState({ seasonList: { seasons: [buildSeason({ id: 's1' })], count: 1, hasMore: false, nextToken: '', filter: { teamId: '' } } }));
    setupMockStore(useTeamStore as any, mockTeamState());
    setupMockStore(useProgressReportStore as any, mockProgressReportState());

    render(<GoalDetails />);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('renders back nav link', () => {
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState());
    setupMockStore(useGoalStore as any, mockGoalState({ currentGoal: buildGoal({ title: 'My Goal' }) }));
    setupMockStore(useSeasonStore as any, mockSeasonState());
    setupMockStore(useTeamStore as any, mockTeamState());
    setupMockStore(useProgressReportStore as any, mockProgressReportState());

    render(<GoalDetails />);
    expect(screen.getByText(/back to goals/i)).toBeInTheDocument();
  });

  it('renders goal title as page heading', () => {
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState());
    setupMockStore(useGoalStore as any, mockGoalState({ currentGoal: buildGoal({ title: 'Serve accuracy' }) }));
    setupMockStore(useSeasonStore as any, mockSeasonState());
    setupMockStore(useTeamStore as any, mockTeamState());
    setupMockStore(useProgressReportStore as any, mockProgressReportState());

    render(<GoalDetails />);
    expect(screen.getByText('Serve accuracy')).toBeInTheDocument();
  });

  it('renders Seasons meta row', () => {
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState());
    setupMockStore(useGoalStore as any, mockGoalState({ currentGoal: buildGoal({ title: 'Goal' }) }));
    setupMockStore(useSeasonStore as any, mockSeasonState());
    setupMockStore(useTeamStore as any, mockTeamState());
    setupMockStore(useProgressReportStore as any, mockProgressReportState());

    render(<GoalDetails />);
    expect(screen.getByText(/seasons/i)).toBeInTheDocument();
  });
});
