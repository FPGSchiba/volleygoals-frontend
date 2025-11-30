import {ITeam, ITeamSettings, ITeamMember, IInvite} from "./types";
import {create} from "zustand";
import {ITeamFilterOption, IFilterOption, ITeamInviteFilterOption} from "../services/types";
import VolleyGoalsAPI from "../services/backend.api";
import {useNotificationStore} from "./notification";
import i18next from "i18next";
import {setSessionItem, getSessionItem} from "./util";
import {SELECTED_TEAM_KEY} from "./consts";

type TeamState = {
  teamList: {
    teams: ITeam[];
    count: number;
    hasMore: boolean;
    nextToken: string;
    filter?: ITeamFilterOption
  };
  currentTeam?: ITeam;
  teamMembers?: ITeamMember[];
  teamInvites?: { invites: IInvite[]; count: number; nextToken?: string; hasMore?: boolean; filter?: ITeamInviteFilterOption };
  currentTeamSettings?: ITeamSettings;
}

type TeamActions = {
  createTeam: (name: string) => Promise<void>;
  updateTeam: (id: string, name?: string, status?: string) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  fetchTeams: (filter?: ITeamFilterOption) => Promise<void>;
  getTeam: (id: string) => Promise<void>;
  updateTeamSettings: (teamId: string, settings: Partial<ITeamSettings>) => Promise<void>;
  fetchTeamMembers: (teamId: string, filter?: IFilterOption) => Promise<{ items: ITeamMember[]; count: number }>;
  fetchTeamInvites: (teamId: string, filter?: ITeamInviteFilterOption) => Promise<{ items: IInvite[]; count: number }>;
  // Mock upload - reads the file locally and sets the team's picture to a data URL
  uploadTeamPicture: (teamId: string, file: File, onProgress?: (pct: number) => void) => Promise<string | null>;
}

const useTeamStore = create<TeamState & TeamActions>((set) => ({
  teamList: {
    teams: [],
    count: 0,
    hasMore: false,
    nextToken: '',
    filter: undefined
  },
  currentTeam: undefined,
  teamMembers: [],
  teamInvites: { invites: [], count: 0, nextToken: undefined, hasMore: false, filter: {} },
  currentTeamSettings: undefined,
   createTeam: (async (name: string) => {
     const response = await VolleyGoalsAPI.createTeam(name);
     if (!response.team) {
       useNotificationStore.getState().notify({
         level: 'error',
         message: i18next.t(`${response.message}.message`, "Something went wrong while creating the team."),
         title: i18next.t(`${response.message}.title`, "Something went wrong"),
         details: response.error
       });
     }
   }),
   updateTeam: (async (id: string, name?: string, status?: string) => {
     const response = await VolleyGoalsAPI.updateTeam(id, {name, status});
     if (response.team) {
       set(() => ({currentTeam: response.team}));
     }
     else {
       useNotificationStore.getState().notify({
         level: 'error',
         message: i18next.t(`${response.message}.message`, "Something went wrong while updating the team."),
         title: i18next.t(`${response.message}.title`, "Something went wrong"),
         details: response.error
       });
     }
   }),
   deleteTeam: (async (id: string) => {
     const response = await VolleyGoalsAPI.deleteTeam(id);
     if (response.error) {
       useNotificationStore.getState().notify({
         level: 'error',
         message: i18next.t(`${response.message}.message`, "Something went wrong while deleting the team."),
         title: i18next.t(`${response.message}.title`, "Something went wrong"),
         details: response.error
       });
     }
   }),
   fetchTeams: (async (filter?: ITeamFilterOption) => {
     const response = await VolleyGoalsAPI.listTeams(filter || {});
     if (response.items) {
       set(() => ({
         teamList: {
           teams: response.items || [],
           count: response.count || 0,
           hasMore: response.hasMore || false,
           nextToken: response.nextToken || '',
           filter: filter
         }
       }))
     } else {
       useNotificationStore.getState().notify({
         level: 'error',
         message: i18next.t(`${response.message}.message`, "Something went wrong while fetching the teams."),
         title: i18next.t(`${response.message}.title`, "Something went wrong"),
         details: response.error
       });
     }
   }),
   getTeam: (async (id: string) => {
     const response = await VolleyGoalsAPI.getTeam(id);
     if (response.team) {
       set(() => ({
         currentTeam: response.team,
         currentTeamSettings: response.teamSettings
       }))
     } else {
       useNotificationStore.getState().notify({
         level: 'error',
         message: i18next.t(`${response.message}.message`, "Something went wrong while fetching the team."),
         title: i18next.t(`${response.message}.title`, "Something went wrong"),
         details: response.error
       });
     }
   }),
  updateTeamSettings: (async (teamId: string, settings: Partial<ITeamSettings>) => {
    const response = await VolleyGoalsAPI.updateTeamSettings(teamId, settings);
    if (response.teamSettings) {
      set(() => ({
        currentTeamSettings: response.teamSettings,
      }))
    } else {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, "Something went wrong while updating the team settings."),
        title: i18next.t(`${response.message}.title`, "Something went wrong"),
        details: response.error
      });
    }
  }),
  fetchTeamMembers: async (teamId: string, filter?: IFilterOption) => {
    const normFilter = { ...(filter || {}), limit: filter?.limit ?? 10, sortOrder: filter?.sortOrder ?? 'asc', sortBy: filter?.sortBy };
    const response = await VolleyGoalsAPI.listTeamMembers(teamId, normFilter);
    if (response.items) {
      set({ teamMembers: response.items });
      return { items: response.items, count: response.count || response.items.length };
    }
    useNotificationStore.getState().notify({ level: 'error', message: i18next.t(`${response.message}.message`, 'Something went wrong while fetching team members.'), title: i18next.t(`${response.message}.title`, 'Something went wrong'), details: response.error });
    return { items: [], count: 0 };
  },
  fetchTeamInvites: async (teamId: string, filter?: ITeamInviteFilterOption) => {
    const normFilter = { ...(filter || {}), limit: filter?.limit ?? 10, sortOrder: filter?.sortOrder ?? 'asc', sortBy: filter?.sortBy } as ITeamInviteFilterOption;
    const response = await VolleyGoalsAPI.listTeamInvites(teamId, normFilter);
    if (response.items) {
      const invites = response.items || [];
      set({ teamInvites: { invites, count: response.count || invites.length, nextToken: (response as any).nextToken, hasMore: (response as any).hasMore, filter: normFilter } });
      return { items: invites, count: response.count || invites.length };
    }
    useNotificationStore.getState().notify({ level: 'error', message: i18next.t(`${response.message}.message`, 'Something went wrong while fetching team invites.'), title: i18next.t(`${response.message}.title`, 'Something went wrong'), details: response.error });
    return { items: [], count: 0 };
  },
  // Mock uploadTeamPicture implementation: read file to data URL and update local state
  uploadTeamPicture: async (teamId: string, file: File, onProgress?: (pct: number) => void) => {
    // Read file as data URL
    const readFileAsDataUrl = (f: File) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsDataURL(f);
    });

    try {
      // Optionally simulate progress
      if (onProgress) onProgress(10);
      const url = await readFileAsDataUrl(file);
      if (onProgress) onProgress(90);

      // Update teamList and currentTeam if present
      set((state) => {
        const teams = (state.teamList && state.teamList.teams) ? state.teamList.teams.map(t => t.id === teamId ? ({ ...t, picture: url }) : t) : [];
        const currentTeam = state.currentTeam && state.currentTeam.id === teamId ? ({ ...state.currentTeam, picture: url } as ITeam) : state.currentTeam;
        return {
          teamList: { ...(state.teamList || { teams: [], count: 0, hasMore: false, nextToken: '' }), teams },
          currentTeam
        } as any;
      });

      if (onProgress) onProgress(100);
      return url;
    } catch (err) {
      console.error('uploadTeamPicture mock failed', err);
      return null;
    }
  },
 }))

 export {useTeamStore}
