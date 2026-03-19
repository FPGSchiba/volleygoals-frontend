import React from 'react';
import { render, screen } from '../../test-utils';
import { InviteError } from '../../../pages/help/InviteError';

// Mock useAuthRedirect hook
jest.mock('../../../hooks/useAuthRedirect', () => ({
  useAuthRedirect: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useSearchParams: () => [new URLSearchParams('type=expired_token')],
}));

describe('InviteError', () => {
  it('renders correct error message based on type URL param', () => {
    render(<InviteError />);
    expect(screen.getByText('invitePage.error.expired_token.title')).toBeInTheDocument();
    expect(screen.getByText('invitePage.error.expired_token.message')).toBeInTheDocument();
  });

  it('renders navigate link', () => {
    render(<InviteError />);
    expect(screen.getByText('invitePage.error.actions.home')).toBeInTheDocument();
  });
});
