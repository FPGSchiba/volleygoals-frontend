import React from 'react';
import { render, screen } from '../../test-utils';
import { setupMockStore, mockCognitoUserState, mockUsersState, mockTeamState } from '../../mocks/stores';
import { buildUser } from '../../mocks/factories';
import { UserType } from '../../../store/types';

jest.mock('../../../store/users', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useUsersStore: m }; });
import { useUsersStore } from '../../../store/users';
jest.mock('../../../store/cognitoUser', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useCognitoUserStore: m }; });
import { useCognitoUserStore } from '../../../store/cognitoUser';
jest.mock('../../../store/teams', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useTeamStore: m }; });
import { useTeamStore } from '../../../store/teams';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ userId: 'u1' }),
  useNavigate: () => jest.fn(),
}));

let UserDetails: any;
try { UserDetails = require('../../../pages/admin/UserDetails').UserDetails; } catch { UserDetails = null; }
if (!UserDetails) try { UserDetails = require('../../../pages/admin/UserDetails').default; } catch { /* skip */ }

beforeEach(() => jest.clearAllMocks());

describe('UserDetails (Admin)', () => {
  if (!UserDetails) {
    it('component exists', () => expect(UserDetails).toBeTruthy());
    return;
  }

  it('renders user info when loaded', async () => {
    const user = buildUser({ id: 'u1', name: 'John Doe', email: 'john@test.com' });
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState({ userType: UserType.Admin }));
    setupMockStore(useTeamStore as any, mockTeamState());
    setupMockStore(useUsersStore as any, mockUsersState({ currentUser: user, currentUserMemberships: [] }));
    render(<UserDetails />);
    expect(await screen.findByText(/John Doe/)).toBeInTheDocument();
  });
});
