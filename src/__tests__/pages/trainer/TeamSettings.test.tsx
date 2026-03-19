import React from 'react';
import { render, screen } from '../../test-utils';
import { setupMockStore, mockCognitoUserState, mockTeamState } from '../../mocks/stores';
import { buildTeam, buildTeamSettings, buildTeamUser } from '../../mocks/factories';
import { RoleType, TeamMemberStatus } from '../../../store/types';

jest.mock('../../../store/teams', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useTeamStore: m }; });
import { useTeamStore } from '../../../store/teams';
jest.mock('../../../store/cognitoUser', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useCognitoUserStore: m }; });
import { useCognitoUserStore } from '../../../store/cognitoUser';

let TeamSettings: any;
try { TeamSettings = require('../../../pages/trainer/TeamSettings').TeamSettings; } catch { TeamSettings = null; }
if (!TeamSettings) try { TeamSettings = require('../../../pages/trainer/TeamSettings').default; } catch { /* skip */ }

beforeEach(() => jest.clearAllMocks());

describe('TeamSettings (Trainer)', () => {
  if (!TeamSettings) {
    it('component exists', () => expect(TeamSettings).toBeTruthy());
    return;
  }

  it('renders team settings page', () => {
    const team = buildTeam({ name: 'My Team' });
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState({
      selectedTeam: { team, role: RoleType.Trainer, status: TeamMemberStatus.Active },
    }));
    setupMockStore(useTeamStore as any, mockTeamState({
      currentTeam: team,
      currentTeamSettings: buildTeamSettings({ teamId: team.id }),
      teamMembers: [buildTeamUser()],
    }));
    render(<TeamSettings />);
    expect(document.body.textContent).toBeTruthy();
  });
});
