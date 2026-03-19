import React from 'react';
import { render, screen, waitFor } from '../../test-utils';
import { ResetPassword } from '../../../pages/auth/ResetPassword';
import userEvent from '@testing-library/user-event';

// Mock SetupNewPassword since it's a child component with complex auth logic
jest.mock('../../../pages/auth/SetupNewPassword', () => ({
  SetupNewPassword: ({ username }: { username: string }) => (
    <div data-testid="setup-new-password">SetupNewPassword for {username}</div>
  ),
}));

describe('ResetPassword', () => {
  it('renders email input step first', () => {
    render(<ResetPassword />);
    expect(screen.getByText('Reset Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByText('Continue')).toBeInTheDocument();
  });

  it('renders back to login link', () => {
    render(<ResetPassword />);
    expect(screen.getByText('Back to login')).toBeInTheDocument();
  });

  it('validates email field', async () => {
    const user = userEvent.setup();
    render(<ResetPassword />);

    // Submit without entering email
    await user.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    render(<ResetPassword />);

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.tab(); // trigger onBlur validation

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('transitions to SetupNewPassword step on valid email', async () => {
    const user = userEvent.setup();
    render(<ResetPassword />);

    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.click(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByTestId('setup-new-password')).toBeInTheDocument();
      expect(screen.getByText('SetupNewPassword for test@example.com')).toBeInTheDocument();
    });
  });
});
