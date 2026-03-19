import React from 'react';
import { render, screen, waitFor } from '../../test-utils';
import { setupMockStore, mockCognitoUserState, mockTeamState, mockSeasonState } from '../../mocks/stores';
import { buildTeam, buildTeamSettings, buildTeamUser } from '../../mocks/factories';
import { UserType } from '../../../store/types';

jest.mock('../../../store/teams', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useTeamStore: m }; });
import { useTeamStore } from '../../../store/teams';
jest.mock('../../../store/cognitoUser', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useCognitoUserStore: m }; });
import { useCognitoUserStore } from '../../../store/cognitoUser';
jest.mock('../../../store/seasons', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useSeasonStore: m }; });
import { useSeasonStore } from '../../../store/seasons';
jest.mock('../../../services/backend.api', () => ({
  __esModule: true,
  default: { setToken: jest.fn() },
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ teamId: 'team-1' }),
  useNavigate: () => jest.fn(),
}));

let TeamDetails: any;
try { TeamDetails = require('../../../pages/admin/TeamDetails').TeamDetails; } catch { TeamDetails = null; }
if (!TeamDetails) try { TeamDetails = require('../../../pages/admin/TeamDetails').default; } catch { /* skip */ }

beforeEach(() => jest.clearAllMocks());

describe('TeamDetails (Admin)', () => {
  if (!TeamDetails) {
    it('component exists', () => expect(TeamDetails).toBeTruthy());
    return;
  }

  it('renders team info when loaded', async () => {
    const team = buildTeam({ id: 'team-1', name: 'Alpha Team' });
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState({ userType: UserType.Admin }));
    setupMockStore(useTeamStore as any, mockTeamState({
      currentTeam: team,
      currentTeamSettings: buildTeamSettings({ teamId: 'team-1' }),
      teamMembers: [buildTeamUser()],
    }));
    setupMockStore(useSeasonStore as any, mockSeasonState());

    render(<TeamDetails />);
    expect(await screen.findByText('Alpha Team')).toBeInTheDocument();
  });
});
