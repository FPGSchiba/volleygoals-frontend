import {create} from "zustand";
import { fetchAuthSession, AuthSession, getCurrentUser, AuthUser, signOut } from 'aws-amplify/auth';
import {UserRole} from "./types";
import Auth from "aws-amplify/auth";

type UserState = {
  user: AuthUser | undefined;
  session: AuthSession | undefined;
  roles: UserRole[];
}

type UserActions = {
  setUser: () => Promise<void>
  logout: () => void
}

const loadUserStore = async (): Promise<{user: AuthUser | undefined, session: AuthSession | undefined, roles: UserRole[]}> => {
  try {
    const maxAttempts = 3;
    const isSessionError = (err: any) => {
      const msg = String(err?.message ?? err ?? '').toLowerCase();
      return /no current user|no user|no session|not authenticated|not signed in/.test(msg);
    };

    let session: AuthSession | undefined;
    try {
      session = await fetchAuthSession();
    } catch (err) {
      if (isSessionError(err)) {
        return { user: undefined, session: undefined, roles: [] };
      }
      throw err;
    }

    const user = await getCurrentUser();

    // @ts-ignore
    let idToken = session?.tokens?.idToken;
    // Retry only when idToken is missing on tokens
    for (let attempt = 1; !idToken && attempt < maxAttempts; attempt++) {
      try {
        const refreshed = await fetchAuthSession();
        session = refreshed;
        // @ts-ignore
        idToken = refreshed?.tokens?.idToken;
        if (idToken) break;
      } catch (err) {
        if (isSessionError(err)) {
          return { user: undefined, session: undefined, roles: [] };
        }
        // ignore other errors and continue retrying
      }
      const delay = 100 * Math.pow(2, attempt - 1); // 100ms, 200ms, 400ms
      await new Promise((res) => setTimeout(res, delay));
    }

    const payload = idToken?.payload as Record<string, any> | undefined;
    const groups = payload?.['cognito:groups'] ?? [];
    const userRoles: string[] = Array.isArray(groups) ? groups : [groups].filter(Boolean);

    return { user, session, roles: userRoles.map((role) => role as UserRole) };
  } catch (error) {
    return {user: undefined, session: undefined, roles: []};
  }
}

const useUserStore = create<UserState & UserActions>((set, get) => {
  loadUserStore().then(({ user, session, roles }) => set({ user, session, roles }));

  return {
    user: undefined,
    session: undefined,
    roles: [],
    setUser: async () => {
      try {
        const user = await getCurrentUser();
        const session = await fetchAuthSession();

        // @ts-ignore
        const idToken = session?.tokens.idToken;
        const payload = idToken?.payload as Record<string, any> | undefined;
        const groups = payload?.['cognito:groups'] ?? [];
        const userRoles: string[] = Array.isArray(groups) ? groups : [groups].filter(Boolean);

        set({ user, session, roles: userRoles.map((role) => role as UserRole) });
      } catch (error) {
        set({ user: undefined, session: undefined, roles: [] });
      }
    },
    logout: () => {
      set({ user: undefined, session: undefined, roles: [] });
      signOut();
    }
  };
});

export {useUserStore};
