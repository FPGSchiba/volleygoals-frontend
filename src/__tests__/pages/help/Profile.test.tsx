import React from 'react';
import { render, screen } from '../../test-utils';
import { Profile } from '../../../pages/help/Profile';
import { setupMockStore, mockCognitoUserState } from '../../mocks/stores';
import { buildUser, buildTeamAssignment, buildTeam } from '../../mocks/factories';
import { RoleType, TeamMemberStatus } from '../../../store/types';

jest.mock('../../../store/cognitoUser', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useCognitoUserStore: m }; });
import { useCognitoUserStore } from '../../../store/cognitoUser';

jest.mock('../../../utils/i18nHelpers', () => ({
  changeLanguage: jest.fn(),
  getSavedLanguage: jest.fn().mockReturnValue('en'),
}));

beforeEach(() => jest.clearAllMocks());

describe('Profile', () => {
  it('renders profile form with user data', () => {
    const user = buildUser({ name: 'John', preferredUsername: 'johnny', email: 'john@test.com' });
    const team = buildTeam({ name: 'My Team' });
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState({
      user,
      availableTeams: [buildTeamAssignment({ team, role: RoleType.Trainer, status: TeamMemberStatus.Active })],
    }));

    render(<Profile />);
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John')).toBeInTheDocument();
    expect(screen.getByDisplayValue('johnny')).toBeInTheDocument();
  });

  it('renders team list', () => {
    const team = buildTeam({ name: 'Alpha' });
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState({
      availableTeams: [buildTeamAssignment({ team, role: RoleType.Member, status: TeamMemberStatus.Active })],
    }));

    render(<Profile />);
    expect(screen.getByText('Teams')).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
  });

  it('renders save and cancel buttons', () => {
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState());
    render(<Profile />);
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders leave button for teams', () => {
    const team = buildTeam({ name: 'Leavable' });
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState({
      availableTeams: [buildTeamAssignment({ team })],
    }));
    render(<Profile />);
    expect(screen.getByText('Leave')).toBeInTheDocument();
  });
});
