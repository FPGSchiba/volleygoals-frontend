import React from 'react';
import { render, screen, waitFor } from '../../test-utils';
import Login from '../../../pages/auth/Login';
import { setupMockStore, mockCognitoUserState } from '../../mocks/stores';
import { UserType } from '../../../store/types';

jest.mock('../../../store/cognitoUser', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useCognitoUserStore: m }; });
import { useCognitoUserStore } from '../../../store/cognitoUser';

jest.mock('../../../store/notification', () => { const m: any = jest.fn((s?: any) => s ? s({ notifications: [], closeNotification: jest.fn(), notify: jest.fn() }) : {}); m.getState = () => ({ notifications: [], closeNotification: jest.fn(), notify: jest.fn() }); return { __esModule: true, useNotificationStore: m }; });
import { useNotificationStore } from '../../../store/notification';
import { mockNotificationState } from '../../mocks/stores';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

beforeEach(() => {
  jest.clearAllMocks();
  setupMockStore(useNotificationStore as any, mockNotificationState());
});

describe('Login', () => {
  it('renders LoginEmailPassword as the default step', () => {
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState({
      userType: undefined,
      cognitoUser: undefined,
      session: undefined,
    }));

    render(<Login />);
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByText('Welcome to Volley Goals')).toBeInTheDocument();
  });

  it('redirects Admin to /teams when userType is set', async () => {
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState({
      userType: UserType.Admin,
    }));

    render(<Login />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/teams');
    });
  });

  it('redirects User to /dashboard when userType is set', async () => {
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState({
      userType: UserType.User,
    }));

    render(<Login />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('does not redirect when userType is undefined', () => {
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState({
      userType: undefined,
    }));

    render(<Login />);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
