import React from 'react';
import { render, screen, waitFor } from '../test-utils';
import { PrivateRoute } from '../../components/PrivateRoute';
import { Routes, Route } from 'react-router-dom';
import { fetchAuthSession } from 'aws-amplify/auth';
import { UserType } from '../../store/types';

const mockedFetchAuth = jest.mocked(fetchAuthSession);

function renderWithRoute(userTypes: UserType[] = [], entry = '/protected') {
  return render(
    <Routes>
      <Route element={<PrivateRoute userTypes={userTypes} />}>
        <Route path="/protected" element={<div>Protected Content</div>} />
      </Route>
      <Route path="/login" element={<div>Login Page</div>} />
      <Route path="/no-access" element={<div>No Access Page</div>} />
    </Routes>,
    { initialEntries: [entry] },
  );
}

describe('PrivateRoute', () => {
  afterEach(() => jest.restoreAllMocks());

  it('renders outlet when authenticated with correct role', async () => {
    mockedFetchAuth.mockResolvedValue({
      tokens: { idToken: { payload: { 'cognito:groups': ['USERS'] } } },
    } as any);

    renderWithRoute([UserType.User]);
    await waitFor(() => expect(screen.getByText('Protected Content')).toBeInTheDocument());
  });

  it('redirects to /login when unauthenticated', async () => {
    mockedFetchAuth.mockRejectedValue(new Error('No session'));

    renderWithRoute([UserType.User]);
    await waitFor(() => expect(screen.getByText('Login Page')).toBeInTheDocument());
  });

  it('redirects to /no-access when wrong role', async () => {
    mockedFetchAuth.mockResolvedValue({
      tokens: { idToken: { payload: { 'cognito:groups': ['USERS'] } } },
    } as any);

    renderWithRoute([UserType.Admin]); // user has USERS but ADMINS required
    await waitFor(() => expect(screen.getByText('No Access Page')).toBeInTheDocument());
  });

  it('renders outlet when no roles are required', async () => {
    mockedFetchAuth.mockResolvedValue({
      tokens: { idToken: { payload: { 'cognito:groups': ['USERS'] } } },
    } as any);

    renderWithRoute([]); // empty = any authenticated user
    await waitFor(() => expect(screen.getByText('Protected Content')).toBeInTheDocument());
  });
});
