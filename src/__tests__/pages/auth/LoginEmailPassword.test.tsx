import React from 'react';
import { render, screen, waitFor } from '../../test-utils';
import { LoginEmailPassword } from '../../../pages/auth/LoginEmailPassword';
import userEvent from '@testing-library/user-event';
import { signIn } from 'aws-amplify/auth';
import { setupMockStore, mockNotificationState } from '../../mocks/stores';

jest.mock('../../../store/notification', () => { const m: any = jest.fn((s?: any) => s ? s({ notifications: [], closeNotification: jest.fn(), notify: jest.fn() }) : {}); m.getState = () => ({ notifications: [], closeNotification: jest.fn(), notify: jest.fn() }); return { __esModule: true, useNotificationStore: m }; });
import { useNotificationStore } from '../../../store/notification';

const mockOnSignInFinished = jest.fn();
const mockedSignIn = jest.mocked(signIn);

beforeEach(() => {
  jest.clearAllMocks();
  setupMockStore(useNotificationStore as any, mockNotificationState());
});

function renderComponent() {
  return render(<LoginEmailPassword onSignInFinished={mockOnSignInFinished} />);
}

describe('LoginEmailPassword', () => {
  it('renders email and password fields', () => {
    renderComponent();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('renders sign in button', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('renders forgot password link', () => {
    renderComponent();
    expect(screen.getByText('Forgot your password?')).toBeInTheDocument();
  });

  it('shows validation error on empty email submit', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  it('shows validation error on empty password submit', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Type email but not password
    await user.type(screen.getByLabelText('Email'), 'test@test.com');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
  });

  it('shows email format validation', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.type(screen.getByLabelText('Email'), 'invalid-email');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('Enter a valid email')).toBeInTheDocument();
    });
  });

  it('calls signIn on valid submission', async () => {
    const user = userEvent.setup();
    mockedSignIn.mockResolvedValue({ isSignedIn: true, nextStep: { signInStep: 'DONE' } } as any);

    renderComponent();

    await user.type(screen.getByLabelText('Email'), 'test@test.com');
    await user.type(screen.getByLabelText('Password'), 'Password123!');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(mockedSignIn).toHaveBeenCalledWith({
        username: 'test@test.com',
        password: 'Password123!',
      });
      expect(mockOnSignInFinished).toHaveBeenCalled();
    });
  });

  it('shows error notification on Cognito error', async () => {
    const user = userEvent.setup();
    const notifyMock = jest.fn();
    setupMockStore(useNotificationStore as any, mockNotificationState({ notify: notifyMock }));

    mockedSignIn.mockRejectedValue({ name: 'NotAuthorizedException', message: 'Wrong creds' });

    renderComponent();

    await user.type(screen.getByLabelText('Email'), 'test@test.com');
    await user.type(screen.getByLabelText('Password'), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(notifyMock).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'error' }),
      );
    });
  });
});
