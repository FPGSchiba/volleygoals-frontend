import React from 'react';
import { render, screen } from '../../test-utils';
import { NotFound } from '../../../pages/help/NotFound';
import { setupMockStore, mockCognitoUserState } from '../../mocks/stores';
import { UserType } from '../../../store/types';

jest.mock('../../../store/cognitoUser', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useCognitoUserStore: m }; });
import { useCognitoUserStore } from '../../../store/cognitoUser';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

beforeEach(() => jest.clearAllMocks());

describe('NotFound', () => {
  it('renders 404 message', () => {
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState({ cognitoUser: undefined, session: undefined }));
    render(<NotFound />);
    expect(screen.getByText('notFoundPage.title')).toBeInTheDocument();
  });

  it('shows login link for unauthenticated users', () => {
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState({ cognitoUser: undefined, session: undefined, userType: undefined }));
    render(<NotFound />);
    expect(screen.getByText('notFoundPage.actions.login')).toBeInTheDocument();
  });

  it('shows teams link for admin users', () => {
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState({ userType: UserType.Admin }));
    render(<NotFound />);
    expect(screen.getByText('notFoundPage.actions.teams')).toBeInTheDocument();
  });

  it('shows dashboard link for regular users', () => {
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState({ userType: UserType.User }));
    render(<NotFound />);
    expect(screen.getByText('notFoundPage.actions.dashboard')).toBeInTheDocument();
  });
});
