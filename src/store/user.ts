import {create} from "zustand";
import { fetchAuthSession, AuthSession, getCurrentUser, AuthUser, signOut } from 'aws-amplify/auth';

type UserState = {
  user: AuthUser | undefined;
  session: AuthSession | undefined;
}

type UserActions = {
  setUser: () => Promise<void>
  logout: () => void
  hasRole: (role: string) => Promise<boolean>
}

const loadUserStore = async (): Promise<{user: AuthUser | undefined, session: AuthSession | undefined}> => {
  try {
    const session = await fetchAuthSession();
    const user = await getCurrentUser();

    return {user, session};
  } catch (error) {
    return {user: undefined, session: undefined};
  }
}

const defaultValues = { user: undefined as AuthUser | undefined, session: undefined as AuthSession | undefined };

const useUserStore = create<UserState & UserActions>((set, get) => {
  loadUserStore().then(({ user, session }) => set({ user, session }));

  return {
    user: defaultValues.user,
    session: defaultValues.session,
    setUser: async () => {
      const user = await getCurrentUser();
      const session = await fetchAuthSession();
      set({ user, session });
    },
    logout: () => {
      set({ user: undefined, session: undefined});
      signOut();
    },
    hasRole: async (role): Promise<boolean> => {
      const session = await fetchAuthSession();
      // groups are typically on the id token under 'cognito:groups'
      // @ts-ignore
      const idToken = session?.tokens.idToken;
      const payload = idToken?.payload as Record<string, any> | undefined;
      const groups = payload?.['cognito:groups'] ?? [];
      const userRoles: string[] = Array.isArray(groups) ? groups : [groups].filter(Boolean);
      return userRoles.includes(role);
    }
  };
});

export {useUserStore};
