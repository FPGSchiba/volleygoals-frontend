import React from 'react';
import { render, screen } from '../../test-utils';
import { AcceptInvite } from '../../../pages/auth/AcceptInvite';
import { setupMockStore, mockCognitoUserState, mockInvitesState } from '../../mocks/stores';

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
  setupMockStore(useCognitoUserStore as any, mockCognitoUserState());
  setupMockStore(useInvitesStore as any, mockInvitesState());
});

describe('AcceptInvite', () => {
  it('renders email field', () => {
    render(<AcceptInvite />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders accept and decline buttons', () => {
    render(<AcceptInvite />);
    expect(screen.getByText('invitePage.accept.button.accept')).toBeInTheDocument();
    expect(screen.getByText('invitePage.accept.button.decline')).toBeInTheDocument();
  });

  it('shows token label', () => {
    render(<AcceptInvite />);
    expect(screen.getByText('invitePage.accept.tokenLabel')).toBeInTheDocument();
  });

  it('redirects when no token is present', () => {
    // Override useSearchParams to return no token
    jest.spyOn(require('react-router-dom'), 'useSearchParams').mockReturnValue([
      new URLSearchParams(''),
    ]);

    render(<AcceptInvite />);

    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('invite-error'));
  });
});
