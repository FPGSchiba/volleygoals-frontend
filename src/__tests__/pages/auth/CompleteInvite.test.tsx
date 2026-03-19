import React from 'react';
import { render, screen } from '../../test-utils';
import { CompleteInvite } from '../../../pages/auth/CompleteInvite';
import { setupMockStore, mockCognitoUserState, mockInvitesState } from '../../mocks/stores';
import { buildInvite } from '../../mocks/factories';
import { RoleType } from '../../../store/types';

jest.mock('../../../store/cognitoUser', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useCognitoUserStore: m }; });
import { useCognitoUserStore } from '../../../store/cognitoUser';

jest.mock('../../../store/invites', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useInvitesStore: m }; });
import { useInvitesStore } from '../../../store/invites';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams('token=test-token')],
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('CompleteInvite', () => {
  it('shows loading when no currentInvite', () => {
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState({ cognitoUser: undefined, session: undefined }));
    setupMockStore(useInvitesStore as any, mockInvitesState({ currentInvite: undefined }));

    render(<CompleteInvite />);
    expect(screen.getByText('Loading invite...')).toBeInTheDocument();
  });

  it('shows invite details when currentInvite is loaded', () => {
    const invite = buildInvite({ email: 'test@example.com', role: RoleType.Member });
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState({ cognitoUser: undefined, session: undefined }));
    setupMockStore(useInvitesStore as any, mockInvitesState({
      currentInvite: { invite, member: {}, userCreated: false },
    }));

    render(<CompleteInvite />);
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('shows temporary password when userCreated', () => {
    const invite = buildInvite({ email: 'new@example.com' });
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState({ cognitoUser: undefined, session: undefined }));
    setupMockStore(useInvitesStore as any, mockInvitesState({
      currentInvite: {
        invite,
        member: {},
        userCreated: true,
        temporaryPassword: 'TempPass123!',
      },
    }));

    render(<CompleteInvite />);
    expect(screen.getByText('TempPass123!')).toBeInTheDocument();
  });

  it('shows login link when not authenticated', () => {
    const invite = buildInvite();
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState({ cognitoUser: undefined, session: undefined }));
    setupMockStore(useInvitesStore as any, mockInvitesState({
      currentInvite: { invite, member: {}, userCreated: false },
    }));

    render(<CompleteInvite />);
    expect(screen.getByText('invitePage.complete.actions.login')).toBeInTheDocument();
  });

  it('shows dashboard link when authenticated', () => {
    const invite = buildInvite();
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState());
    setupMockStore(useInvitesStore as any, mockInvitesState({
      currentInvite: { invite, member: {}, userCreated: false },
    }));

    render(<CompleteInvite />);
    expect(screen.getByText('invitePage.complete.actions.profile')).toBeInTheDocument();
  });
});
