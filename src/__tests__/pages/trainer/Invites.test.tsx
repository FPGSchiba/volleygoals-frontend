import React from 'react';
import { render, screen } from '../../test-utils';
import { setupMockStore, mockCognitoUserState, mockTeamState } from '../../mocks/stores';
import { buildInvite } from '../../mocks/factories';

jest.mock('../../../store/teams', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useTeamStore: m }; });
import { useTeamStore } from '../../../store/teams';
jest.mock('../../../store/cognitoUser', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useCognitoUserStore: m }; });
import { useCognitoUserStore } from '../../../store/cognitoUser';

let Invites: any;
try { Invites = require('../../../pages/trainer/Invites').Invites; } catch { Invites = null; }
if (!Invites) try { Invites = require('../../../pages/trainer/Invites').default; } catch { /* skip */ }

beforeEach(() => jest.clearAllMocks());

describe('Invites (Trainer)', () => {
  if (!Invites) {
    it('component exists', () => expect(Invites).toBeTruthy());
    return;
  }

  it('renders invites page', () => {
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState());
    setupMockStore(useTeamStore as any, mockTeamState({
      teamInvites: { invites: [buildInvite({ email: 'new@t.com' })], count: 1 },
    }));
    render(<Invites />);
    expect(screen.getByText(/new@t.com/)).toBeInTheDocument();
  });
});
