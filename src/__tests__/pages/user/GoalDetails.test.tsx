import React from 'react';
import { render, screen } from '../../test-utils';
import { GoalDetails } from '../../../pages/user/GoalDetails';
import { setupMockStore, mockCognitoUserState, mockGoalState, mockSeasonState, mockTeamState } from '../../mocks/stores';
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

    render(<GoalDetails />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders goal title, type, status, and description', () => {
    const goal = buildGoal({ id: 'g1', teamId: 't1', title: 'Score More', description: 'Improve scoring', goalType: GoalType.Team, status: GoalStatus.InProgress });
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState());
    setupMockStore(useGoalStore as any, mockGoalState({ currentGoal: goal }));
    setupMockStore(useSeasonStore as any, mockSeasonState({ seasonList: { seasons: [buildSeason({ id: 's1' })], count: 1, hasMore: false, nextToken: '', filter: { teamId: '' } } }));
    setupMockStore(useTeamStore as any, mockTeamState({ currentTeamSettings: buildTeamSettings({ allowTeamGoalComments: true }) }));

    render(<GoalDetails />);
    // Title and description are rendered inside TextFields, so use getByDisplayValue
    expect(screen.getByDisplayValue('Score More')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Improve scoring')).toBeInTheDocument();
    // goalType is shown as a Chip label
    expect(screen.getByText('team')).toBeInTheDocument();
    // status is shown in a select TextField; the selected MenuItem label is rendered as visible text
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

    render(<GoalDetails />);
    // GoalDetails renders a Save (submit) button for editing inline, plus a Delete button
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });
});
