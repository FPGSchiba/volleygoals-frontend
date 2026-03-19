import React from 'react';
import { render, screen } from '../../test-utils';
import { SelectTeam } from '../../../pages/help/SelectTeam';
import { setupMockStore, mockCognitoUserState } from '../../mocks/stores';
import { buildTeam, buildTeamAssignment } from '../../mocks/factories';
import { RoleType, TeamMemberStatus } from '../../../store/types';

jest.mock('../../../store/cognitoUser', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useCognitoUserStore: m }; });
import { useCognitoUserStore } from '../../../store/cognitoUser';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

beforeEach(() => jest.clearAllMocks());

describe('SelectTeam', () => {
  it('renders team cards from availableTeams', () => {
    const team1 = buildTeam({ name: 'Team Alpha' });
    const team2 = buildTeam({ name: 'Team Beta' });
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState({
      selectedTeam: undefined,
      availableTeams: [
        buildTeamAssignment({ team: team1, role: RoleType.Trainer, status: TeamMemberStatus.Active }),
        buildTeamAssignment({ team: team2, role: RoleType.Member, status: TeamMemberStatus.Active }),
      ],
    }));

    render(<SelectTeam />);
    expect(screen.getByText('Select a Team')).toBeInTheDocument();
    expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    expect(screen.getByText('Team Beta')).toBeInTheDocument();
  });

  it('auto-redirects if team already selected', () => {
    const team = buildTeam({ name: 'Selected' });
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState({
      selectedTeam: buildTeamAssignment({ team }),
    }));

    render(<SelectTeam />);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('shows loading when no teams available', () => {
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState({
      selectedTeam: undefined,
      availableTeams: [],
    }));
    render(<SelectTeam />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
