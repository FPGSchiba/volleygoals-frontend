import React from 'react';
import { render, screen } from '../../test-utils';
import { setupMockStore, mockCognitoUserState, mockUsersState } from '../../mocks/stores';
import { buildUser } from '../../mocks/factories';
import { UserType } from '../../../store/types';

jest.mock('../../../store/users', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useUsersStore: m }; });
import { useUsersStore } from '../../../store/users';
jest.mock('../../../store/cognitoUser', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useCognitoUserStore: m }; });
import { useCognitoUserStore } from '../../../store/cognitoUser';

let Users: any;
try { Users = require('../../../pages/admin/Users').Users; } catch { Users = null; }
if (!Users) try { Users = require('../../../pages/admin/Users').default; } catch { /* skip */ }

beforeEach(() => jest.clearAllMocks());

describe('Users (Admin)', () => {
  if (!Users) {
    it('component exists', () => expect(Users).toBeTruthy());
    return;
  }

  it('renders users list', () => {
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState({ userType: UserType.Admin }));
    setupMockStore(useUsersStore as any, mockUsersState({
      userList: { users: [buildUser({ name: 'Jane Doe', email: 'jane@test.com' })], paginationToken: undefined },
    }));
    render(<Users />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });
});
