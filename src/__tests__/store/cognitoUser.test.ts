import { useCognitoUserStore } from '../../store/cognitoUser';
import { signOut } from 'aws-amplify/auth';
import { buildUser, buildTeamAssignment, buildTeam } from '../mocks/factories';
import { RoleType, TeamMemberStatus } from '../../store/types';

describe('cognitoUser store - currentPermissions', () => {
  it('populates currentPermissions when a team is selected with a known role', () => {
    useCognitoUserStore.setState({
      availableTeams: [
        buildTeamAssignment({
          team: buildTeam({ id: 'team-1', name: 'Test Team' }),
          role: RoleType.Admin,
          status: TeamMemberStatus.Active,
        }),
      ],
    });

    useCognitoUserStore.getState().setSelectedTeam('team-1');

    const { currentPermissions } = useCognitoUserStore.getState();
    expect(currentPermissions).toContain('team_goals:read');
    expect(currentPermissions).toContain('team_goals:write');
  });

  it('sets currentPermissions to [] when no team is selected', () => {
    useCognitoUserStore.setState({ availableTeams: [] });
    useCognitoUserStore.getState().setSelectedTeam('nonexistent');
    expect(useCognitoUserStore.getState().currentPermissions).toEqual([]);
  });
});

// The store auto-loads on import; set initial state for tests
beforeEach(() => {
  localStorage.clear();
  const team1 = buildTeam({ id: 'team-1', name: 'Team 1' });
  const team2 = buildTeam({ id: 'team-2', name: 'Team 2' });
  useCognitoUserStore.setState({
    cognitoUser: undefined,
    user: buildUser(),
    session: undefined,
    userType: undefined,
    availableTeams: [
      buildTeamAssignment({ team: team1, role: RoleType.Trainer, status: TeamMemberStatus.Active }),
      buildTeamAssignment({ team: team2, role: RoleType.Member, status: TeamMemberStatus.Active }),
    ],
    selectedTeam: undefined,
  });
});

describe('cognitoUser store', () => {
  describe('setSelectedTeam', () => {
    it('persists selection to localStorage and updates state', () => {
      const { setSelectedTeam } = useCognitoUserStore.getState();
      setSelectedTeam('team-1');

      const { selectedTeam } = useCognitoUserStore.getState();
      expect(selectedTeam?.team.id).toBe('team-1');
      expect(localStorage.getItem('vg:selectedTeamId')).toBe('team-1');
    });

    it('selects the correct team from available teams', () => {
      const { setSelectedTeam } = useCognitoUserStore.getState();
      setSelectedTeam('team-2');

      const { selectedTeam } = useCognitoUserStore.getState();
      expect(selectedTeam?.team.name).toBe('Team 2');
      expect(selectedTeam?.role).toBe(RoleType.Member);
    });
  });

  describe('logout', () => {
    it('clears state and calls signOut', () => {
      // Set some state first
      useCognitoUserStore.setState({
        cognitoUser: { username: 'test', userId: 'test' } as any,
        session: {} as any,
      });

      useCognitoUserStore.getState().logout();

      const state = useCognitoUserStore.getState();
      expect(state.cognitoUser).toBeUndefined();
      expect(state.session).toBeUndefined();
      expect(state.userType).toBeUndefined();
      expect(state.selectedTeam).toBeUndefined();
      expect(state.availableTeams).toEqual([]);
      expect(state.user).toBeUndefined();
      expect(signOut).toHaveBeenCalled();
    });
  });
});
