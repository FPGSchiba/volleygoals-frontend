import React from 'react';
import { render, screen } from '../../test-utils';
import { setupMockStore, mockCognitoUserState, mockTeamState } from '../../mocks/stores';
import { buildTeamUser } from '../../mocks/factories';
import { RoleType, TeamMemberStatus } from '../../../store/types';

jest.mock('../../../store/teams', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useTeamStore: m }; });
import { useTeamStore } from '../../../store/teams';
jest.mock('../../../store/cognitoUser', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useCognitoUserStore: m }; });
import { useCognitoUserStore } from '../../../store/cognitoUser';

let Members: any;
try { Members = require('../../../pages/trainer/Members').Members; } catch { Members = null; }
if (!Members) try { Members = require('../../../pages/trainer/Members').default; } catch { /* skip */ }

beforeEach(() => jest.clearAllMocks());

describe('Members (Trainer)', () => {
  if (!Members) {
    it('component exists', () => expect(Members).toBeTruthy());
    return;
  }

  it('renders member list', () => {
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState());
    setupMockStore(useTeamStore as any, mockTeamState({
      teamMembers: [buildTeamUser({ name: 'Alice', email: 'alice@t.com' })],
    }));
    render(<Members />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });
});
