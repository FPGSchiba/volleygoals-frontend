import {create} from "zustand";
import { fetchAuthSession, AuthSession, getCurrentUser, AuthUser, signOut } from 'aws-amplify/auth';
import {ITeamAssignment, IUser, IProfileUpdate, UserType} from "./types";
import VolleyGoalsAPI from "../services/backend.api";
import {getSessionItem, setSessionItem} from "./util";
import {SELECTED_TEAM_KEY} from "./consts";
import {useNotificationStore} from "./notification";
import i18next from "i18next";

type UserState = {
  cognitoUser: AuthUser | undefined;
  user?: IUser;
  session: AuthSession | undefined;
  userType: UserType | undefined;
  availableTeams: ITeamAssignment[];
  selectedTeam?: ITeamAssignment;
}

type UserActions = {
  setUser: () => Promise<void>
  logout: () => void
  setSelectedTeam: (teamId: string) => void
  fetchSelf: () => Promise<void>
  updateSelf: (userData: IProfileUpdate) => Promise<void>
  uploadSelfPicture: (file: File, onProgress?: (pct: number) => void) => Promise<string | undefined>
}

const loadSelf = async (): Promise<{user?: IUser, assignments: ITeamAssignment[]}> => {
  const response = await VolleyGoalsAPI.getSelf();
  return { user: response.user, assignments: response.assignments || [] };
}

const loadUserStore = async (): Promise<{cognitoUser?: AuthUser, session?: AuthSession, userType?: UserType, user?: IUser, availableTeams: ITeamAssignment[], selectedTeam?: ITeamAssignment}> => {
  try {
    const maxAttempts = 3;
    const isSessionError = (err: any) => {
      const msg = String(err?.message ?? err ?? '').toLowerCase();
      return /no current cognitoUser|no cognitoUser|no session|not authenticated|not signed in/.test(msg);
    };

    let session: AuthSession | undefined;
    try {
      session = await fetchAuthSession();
    } catch (err) {
      if (isSessionError(err)) {
        return { availableTeams: [] };
      }
      throw err;
    }

    const cognitoUser = await getCurrentUser();

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
          return {availableTeams: []};
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
    const { user, assignments } = await loadSelf();
    const selectedTeamId = getSessionItem(SELECTED_TEAM_KEY);
    const selectedTeam = assignments?.find(t => t.team.id === selectedTeamId);
    return { cognitoUser, session, userType: userRoles.map((role) => role as UserType)[0], user, availableTeams: assignments, selectedTeam };
  } catch (error) {
    return {availableTeams: []};
  }
}

const useCognitoUserStore = create<UserState & UserActions>((set, get) => {
  loadUserStore().then(({ cognitoUser, session, userType, user, availableTeams, selectedTeam }) => set({ cognitoUser, session, userType, availableTeams, user, selectedTeam }));

  return {
    cognitoUser: undefined,
    session: undefined,
    userType: undefined,
    availableTeams: [],
    selectedTeam: undefined,
    setUser: async () => {
      try {
        const cognitoUser = await getCurrentUser();
        const session = await fetchAuthSession();

        // @ts-ignore
        const idToken = session?.tokens.idToken;
        const payload = idToken?.payload as Record<string, any> | undefined;
        const groups = payload?.['cognito:groups'] ?? [];
        const userRoles: string[] = Array.isArray(groups) ? groups : [groups].filter(Boolean);

        VolleyGoalsAPI.setToken(idToken);

        set({ cognitoUser, session, userType: userRoles.map((role) => role as UserType)[0] });
      } catch (error) {
        set({ cognitoUser: undefined, session: undefined, userType: undefined });
      }
    },
    logout: () => {
      set({ cognitoUser: undefined, session: undefined, userType: undefined, selectedTeam: undefined, availableTeams: [] });
      signOut();
    },
    setSelectedTeam: (teamId: string) => {
      const { availableTeams } = get();
      const selected = availableTeams?.find(t => t.team.id === teamId);
      setSessionItem(SELECTED_TEAM_KEY, teamId);
      set({ selectedTeam: selected });
    },
    fetchSelf: async () => {
      const { user, assignments } = await loadSelf();
      const selectedTeamId = getSessionItem(SELECTED_TEAM_KEY);
      const selectedTeam = assignments?.find(t => t.team.id === selectedTeamId);
      set({ user, availableTeams: assignments, selectedTeam });
    },
    updateSelf: async (userData: IProfileUpdate) => {
      const response = await VolleyGoalsAPI.updateSelf(userData);
      if (response.user) {
        set({ user: response.user });
      } else{
        useNotificationStore.getState().notify({ level: 'error', message: i18next.t(`${response.message}.message`, 'Something went wrong while fetching team invites.'), title: i18next.t(`${response.message}.title`, 'Something went wrong'), details: response.error });
      }
    },
    uploadSelfPicture: async (file: File, onProgress?: (pct: number) => void): Promise<string | undefined> => {
      const response = await VolleyGoalsAPI.uploadSelfAvatar(file, onProgress);
      if (response.fileUrl) {
        // update user store
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, picture: response.fileUrl } });
        }
        return response.fileUrl;
      } else {
        useNotificationStore.getState().notify({ level: 'error', message: i18next.t(`${response.message}.message`, 'Something went wrong while uploading the profile picture.'), title: i18next.t(`${response.message}.title`, 'Something went wrong'), details: response.error });
        return undefined;
      }
    }
  };
});

export {useCognitoUserStore};
