/**
 * Zustand store mocking helpers.
 *
 * Usage in tests:
 *   jest.mock('../../store/cognitoUser');
 *   import { useCognitoUserStore } from '../../store/cognitoUser';
 *   const mocked = jest.mocked(useCognitoUserStore);
 *   mocked.mockImplementation((selector: any) => selector(mockCognitoUserState()));
 */

import { buildUser, buildTeam, buildTeamAssignment } from './factories';
import {
  UserType, RoleType, TeamMemberStatus,
} from '../../store/types';

// ---- CognitoUser Store ----
export function mockCognitoUserState(overrides?: Record<string, any>) {
  const team = buildTeam();
  return {
    cognitoUser: { username: 'test-user', userId: 'test-user-id' },
    user: buildUser(),
    session: { tokens: { idToken: { payload: { 'cognito:groups': ['USERS'] } } } },
    userType: UserType.User,
    availableTeams: [buildTeamAssignment({ team, role: RoleType.Trainer, status: TeamMemberStatus.Active })],
    selectedTeam: buildTeamAssignment({ team, role: RoleType.Trainer, status: TeamMemberStatus.Active }),
    currentPermissions: [] as string[],
    setUser: jest.fn(),
    logout: jest.fn(),
    setSelectedTeam: jest.fn(),
    fetchSelf: jest.fn().mockResolvedValue(undefined),
    updateSelf: jest.fn().mockResolvedValue(undefined),
    uploadSelfPicture: jest.fn().mockResolvedValue(undefined),
    leaveTeam: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

// ---- Notification Store ----
export function mockNotificationState(overrides?: Record<string, any>) {
  return {
    notifications: [],
    closeNotification: jest.fn(),
    notify: jest.fn(),
    ...overrides,
  };
}

// ---- Team Store ----
export function mockTeamState(overrides?: Record<string, any>) {
  return {
    teamList: { teams: [], count: 0, hasMore: false, nextToken: '', filter: undefined },
    currentTeam: undefined,
    teamMembers: [],
    teamInvites: { invites: [], count: 0 },
    currentTeamSettings: undefined,
    createTeam: jest.fn().mockResolvedValue(undefined),
    updateTeam: jest.fn().mockResolvedValue(undefined),
    deleteTeam: jest.fn().mockResolvedValue(undefined),
    fetchTeams: jest.fn().mockResolvedValue(undefined),
    getTeam: jest.fn().mockResolvedValue(undefined),
    updateTeamSettings: jest.fn().mockResolvedValue(undefined),
    fetchTeamMembers: jest.fn().mockResolvedValue({ items: [], count: 0 }),
    fetchTeamInvites: jest.fn().mockResolvedValue({ items: [], count: 0 }),
    uploadTeamPicture: jest.fn().mockResolvedValue(null),
    createInvite: jest.fn().mockResolvedValue(undefined),
    revokeInvite: jest.fn().mockResolvedValue(undefined),
    resendInvite: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ---- Users Store ----
export function mockUsersState(overrides?: Record<string, any>) {
  return {
    userList: { users: [], paginationToken: undefined, filter: undefined },
    currentUser: undefined,
    currentUserMemberships: [],
    fetchUsers: jest.fn().mockResolvedValue(undefined),
    getUser: jest.fn().mockResolvedValue(undefined),
    deleteUser: jest.fn().mockResolvedValue(undefined),
    updateUser: jest.fn().mockResolvedValue(undefined),
    deleteMembership: jest.fn().mockResolvedValue(undefined),
    updateMembership: jest.fn().mockResolvedValue(undefined),
    createMembership: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ---- Season Store ----
export function mockSeasonState(overrides?: Record<string, any>) {
  return {
    seasonList: { seasons: [], count: 0, hasMore: false, nextToken: '', filter: { teamId: '' } },
    createSeason: jest.fn().mockResolvedValue(undefined),
    updateSeason: jest.fn().mockResolvedValue(undefined),
    deleteSeason: jest.fn().mockResolvedValue(undefined),
    fetchSeasons: jest.fn().mockResolvedValue(undefined),
    getSeason: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

// ---- Goal Store ----
export function mockGoalState(overrides?: Record<string, any>) {
  return {
    goalList: { goals: [], count: 0, hasMore: false, nextToken: '', filter: {} },
    currentGoal: undefined,
    goalSeasons: [] as any[],
    createGoal: jest.fn().mockResolvedValue(undefined),
    updateGoal: jest.fn().mockResolvedValue(undefined),
    deleteGoal: jest.fn().mockResolvedValue(undefined),
    fetchGoals: jest.fn().mockResolvedValue(undefined),
    getGoal: jest.fn().mockResolvedValue(null),
    fetchGoalSeasons: jest.fn().mockResolvedValue(undefined),
    tagGoalToSeason: jest.fn().mockResolvedValue(undefined),
    untagGoalFromSeason: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ---- Progress Report Store ----
export function mockProgressReportState(overrides?: Record<string, any>) {
  return {
    reportList: { reports: [], count: 0, hasMore: false, nextToken: '', filter: {} },
    currentReport: undefined,
    fetchReports: jest.fn().mockResolvedValue(undefined),
    getReport: jest.fn().mockResolvedValue(null),
    createReport: jest.fn().mockResolvedValue(null),
    updateReport: jest.fn().mockResolvedValue(undefined),
    deleteReport: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ---- Comments Store ----
export function mockCommentsState(overrides?: Record<string, any>) {
  return {
    comments: [],
    loading: false,
    fetchComments: jest.fn().mockResolvedValue(undefined),
    createComment: jest.fn().mockResolvedValue(undefined),
    updateComment: jest.fn().mockResolvedValue(undefined),
    deleteComment: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn(),
    ...overrides,
  };
}

// ---- Activity Store ----
export function mockActivityState(overrides?: Record<string, any>) {
  return {
    activities: [],
    nextToken: null,
    hasMore: false,
    loading: false,
    fetchActivity: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

// ---- Invites Store ----
export function mockInvitesState(overrides?: Record<string, any>) {
  return {
    currentInvite: undefined,
    completeInvite: jest.fn().mockResolvedValue({ success: true }),
    getInvite: jest.fn().mockResolvedValue(undefined),
    resendInvite: jest.fn().mockResolvedValue(undefined),
    revokeInvite: jest.fn().mockResolvedValue(undefined),
    createInvite: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ---- Settings Store ----
export function mockSettingsState(overrides?: Record<string, any>) {
  return {
    theme: 'dark' as 'dark' | 'light',
    language: 'en' as 'en' | 'de',
    setTheme: jest.fn(),
    setLanguage: jest.fn(),
    ...overrides,
  };
}

/**
 * Helper to mock a zustand store hook.
 * Call this in your test after jest.mock('../../store/someStore').
 *
 * @example
 *   jest.mock('../../store/cognitoUser');
 *   import { useCognitoUserStore } from '../../store/cognitoUser';
 *   setupMockStore(useCognitoUserStore as any, mockCognitoUserState());
 */
export function setupMockStore(hook: jest.Mock, state: Record<string, any>) {
  hook.mockImplementation((selector?: (s: any) => any) => {
    if (typeof selector === 'function') return selector(state);
    return state;
  });
  // Support .getState() for stores accessed outside React components
  (hook as any).getState = () => state;
}
