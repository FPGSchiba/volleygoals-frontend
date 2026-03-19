import React from 'react';
import { render, screen } from '../../test-utils';
import { setupMockStore, mockCognitoUserState, mockTeamState } from '../../mocks/stores';
import { buildTeam } from '../../mocks/factories';
import { UserType } from '../../../store/types';

jest.mock('../../../store/teams', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useTeamStore: m }; });
import { useTeamStore } from '../../../store/teams';
jest.mock('../../../store/cognitoUser', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useCognitoUserStore: m }; });
import { useCognitoUserStore } from '../../../store/cognitoUser';

let Teams: any;
try { Teams = require('../../../pages/admin/Teams').Teams; } catch { Teams = null; }
if (!Teams) try { Teams = require('../../../pages/admin/Teams').default; } catch { /* skip */ }

beforeEach(() => jest.clearAllMocks());

describe('Teams (Admin)', () => {
  if (!Teams) {
    it('component exists', () => expect(Teams).toBeTruthy());
    return;
  }

  it('renders teams list page', () => {
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState({ userType: UserType.Admin }));
    setupMockStore(useTeamStore as any, mockTeamState({
      teamList: { teams: [buildTeam({ name: 'Alpha Team' })], count: 1, hasMore: false, nextToken: '' },
    }));
    render(<Teams />);
    expect(screen.getByText('Alpha Team')).toBeInTheDocument();
  });

  it('renders create button', () => {
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState({ userType: UserType.Admin }));
    setupMockStore(useTeamStore as any, mockTeamState());
    render(<Teams />);
    expect(screen.getByText('Create')).toBeInTheDocument();
  });
});
