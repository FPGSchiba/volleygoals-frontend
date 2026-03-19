export const signIn = jest.fn().mockResolvedValue({ isSignedIn: true, nextStep: { signInStep: 'DONE' } });
export const signOut = jest.fn().mockResolvedValue(undefined);
export const fetchAuthSession = jest.fn().mockResolvedValue({
  tokens: {
    idToken: {
      payload: { 'cognito:groups': ['USERS'] },
    },
  },
});
export const getCurrentUser = jest.fn().mockResolvedValue({ username: 'test-user', userId: 'test-user-id' });
export const confirmSignIn = jest.fn().mockResolvedValue({ isSignedIn: true, nextStep: { signInStep: 'DONE' } });
export const resetPassword = jest.fn().mockResolvedValue({ nextStep: { resetPasswordStep: 'CONFIRM_RESET_PASSWORD_WITH_CODE' } });
export const confirmResetPassword = jest.fn().mockResolvedValue(undefined);
export const setUpTOTP = jest.fn().mockResolvedValue({ getSetupUri: () => new URL('otpauth://test') });
