import {create} from "zustand";
import { fetchAuthSession, AuthSession, getCurrentUser, AuthUser, signOut } from 'aws-amplify/auth';
import {ITeamAssignment, UserType} from "./types";
import VolleyGoalsAPI from "../services/backend.api";

type UserState = {
  user: AuthUser | undefined;
  session: AuthSession | undefined;
  userType: UserType | undefined;
  availableTeams?: ITeamAssignment[];
  selectedTeam?: ITeamAssignment;
}

type UserActions = {
  setUser: () => Promise<void>
  logout: () => void
}

const loadUserStore = async (): Promise<{user: AuthUser | undefined, session: AuthSession | undefined, userType: UserType | undefined}> => {
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
        return { user: undefined, session: undefined, userType: undefined };
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
          return { user: undefined, session: undefined, userType: undefined };
        }
        // ignore other errors and continue retrying
      }
      const delay = 100 * Math.pow(2, attempt - 1); // 100ms, 200ms, 400ms
      await new Promise((res) => setTimeout(res, delay));
    }

    const payload = idToken?.payload as Record<string, any> | undefined;
    const groups = payload?.['cognito:groups'] ?? [];
    const userRoles: string[] = Array.isArray(groups) ? groups : [groups].filter(Boolean);
    VolleyGoalsAPI.setToken(idToken);

    return { user, session, userType: userRoles.map((role) => role as UserType)[0] };
  } catch (error) {
    return {user: undefined, session: undefined, userType: undefined};
  }
}

const useUserStore = create<UserState & UserActions>((set, get) => {
  loadUserStore().then(({ user, session, userType }) => set({ user, session, userType, availableTeams: [], selectedTeam: undefined }));

  return {
    user: undefined,
    session: undefined,
    userType: undefined,
    availableTeams: [],
    selectedTeam: undefined,
    setUser: async () => {
      try {
        const user = await getCurrentUser();
        const session = await fetchAuthSession();

        // @ts-ignore
        const idToken = session?.tokens.idToken;
        const payload = idToken?.payload as Record<string, any> | undefined;
        const groups = payload?.['cognito:groups'] ?? [];
        const userRoles: string[] = Array.isArray(groups) ? groups : [groups].filter(Boolean);

        VolleyGoalsAPI.setToken(idToken);

        set({ user, session, userType: userRoles.map((role) => role as UserType)[0] });
      } catch (error) {
        set({ user: undefined, session: undefined, userType: undefined });
      }
    },
    logout: () => {
      set({ user: undefined, session: undefined, userType: undefined });
      signOut();
    }
  };
});

export {useUserStore};
