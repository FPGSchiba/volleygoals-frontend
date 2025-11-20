import {ITeam, ITeamSettings} from "./types";
import {create} from "zustand";
import {ITeamFilterOption} from "../services/types";
import VolleyGoalsAPI from "../services/backend.api";
import {useNotificationStore} from "./notification";
import i18next from "i18next";

type TeamState = {
  teamList: {
    teams: ITeam[];
    count: number;
    hasMore: boolean;
    nextToken: string;
    filter?: ITeamFilterOption
  };
  currentTeam?: ITeam;
  currentTeamSettings?: ITeamSettings;
}

type TeamActions = {
  createTeam: (name: string) => Promise<void>;
  updateTeam: (id: string, name?: string, status?: string) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  fetchTeams: (filter?: ITeamFilterOption) => Promise<void>;
  getTeam: (id: string) => Promise<void>;
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
    if (response.error) {
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
  })
}))

export {useTeamStore}
