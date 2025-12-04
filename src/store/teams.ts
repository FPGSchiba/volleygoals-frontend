import {ITeam, ITeamSettings, ITeamMember, IInvite, ITeamUser} from "./types";
import {create} from "zustand";
import {
  ITeamFilterOption,
  IFilterOption,
  ITeamInviteFilterOption,
  ITeamMemberFilterOption
} from "../services/types";
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
  teamMembers?: ITeamUser[];
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
  fetchTeamMembers: (teamId: string, filter?: ITeamMemberFilterOption) => Promise<{ items: ITeamUser[]; count: number }>;
  fetchTeamInvites: (teamId: string, filter?: ITeamInviteFilterOption) => Promise<{ items: IInvite[]; count: number }>;
  // Mock upload - reads the file locally and sets the team's picture to a data URL
  uploadTeamPicture: (teamId: string, file: File, onProgress?: (pct: number) => void) => Promise<string | null>;
}

const useTeamStore = create<TeamState & TeamActions>((set, get) => ({
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
     } else {
       await get().fetchTeams(get().teamList.filter);
     }
   }),
   updateTeam: (async (id: string, name?: string, status?: string) => {
     const response = await VolleyGoalsAPI.updateTeam(id, {name, status});
     if (response.team) {
       set(() => ({currentTeam: response.team}));
       await get().fetchTeams(get().teamList.filter);
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
     } else {
       await get().fetchTeams(get().teamList.filter);
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
  fetchTeamMembers: async (teamId: string, filter?: ITeamMemberFilterOption) => {
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
  uploadTeamPicture: async (teamId: string, file: File, onProgress?: (pct: number) => void) => {
    const result = await VolleyGoalsAPI.uploadTeamAvatar(teamId, file, onProgress);
    if (result.fileUrl) {
      // Update current team picture if applicable
      set((state) => {
        if (state.currentTeam && state.currentTeam.id === teamId) {
          return { currentTeam: { ...state.currentTeam, picture: result.fileUrl || '' } };
        }
        return {};
      });
      return result.fileUrl;
    } else {
      console.log('Upload team picture error:', result);
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${result.message}.message`, "Something went wrong while uploading the team picture."),
        title: i18next.t(`${result.message}.title`, "Something went wrong"),
        details: result.error
      });
      return null;
    }
  },
 }))

 export {useTeamStore}
