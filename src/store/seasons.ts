import {ISeason, SeasonStatus} from "./types";
import {create} from "zustand";
import {ISeasonFilterOption} from "../services/types";
import {useCognitoUserStore} from "./cognitoUser";
import VolleyGoalsAPI from "../services/backend.api";
import {useNotificationStore} from "./notification";
import i18next from "i18next";

type SeasonState = {
  seasonList: {
    seasons: ISeason[];
    count: number;
    hasMore: boolean;
    nextToken: string;
    filter: ISeasonFilterOption;
  }
}

type SeasonActions = {
  createSeason: (teamId: string, name: string, startDate: string, endDate: string) => Promise<void>;
  updateSeason: (id: string, name?: string, startDate?: string, endDate?: string, status?: SeasonStatus) => Promise<void>;
  deleteSeason: (id: string) => Promise<void>;
  fetchSeasons: (teamId: string, filter: ISeasonFilterOption) => Promise<void>;
  getSeason: (id: string) => Promise<ISeason | null>;
}

const useSeasonStore = create<SeasonState & SeasonActions>((set) => ({
  seasonList: {
    seasons: [],
    count: 0,
    hasMore: false,
    nextToken: '',
    filter: {
      teamId: useCognitoUserStore.getState().selectedTeam?.team.id || ''
    }
  },
  createSeason: async (teamId: string, name: string, startDate: string, endDate: string) => {
    const response = await VolleyGoalsAPI.createSeason({teamId, name, endDate, startDate});
    if (!response.season) {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, "Something went wrong while creating the team."),
        title: i18next.t(`${response.message}.title`, "Something went wrong"),
        details: response.error
      });
    } else{
      set((state) => ({
        seasonList: {
          seasons: [response.season!, ...state.seasonList.seasons],
          count: state.seasonList.count + 1,
          hasMore: state.seasonList.hasMore,
          nextToken: state.seasonList.nextToken,
          filter: state.seasonList.filter
        }
      }));
    }
  },
  updateSeason: async (id: string, name?: string, startDate?: string, endDate?: string, status?: SeasonStatus) => {
    const response = await VolleyGoalsAPI.updateSeason(id, {name, startDate, endDate, status});
    if (!response.season) {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, "Something went wrong while updating the season."),
        title: i18next.t(`${response.message}.title`, "Something went wrong"),
        details: response.error
      });
    } else {
      set((state) => ({
        seasonList: {
          seasons: state.seasonList.seasons.map(season => season.id === id ? response.season! : season),
          count: state.seasonList.count,
          hasMore: state.seasonList.hasMore,
          nextToken: state.seasonList.nextToken,
          filter: state.seasonList.filter
        }
      }));
    }
  },
  deleteSeason: async (id: string) => {
    const response = await VolleyGoalsAPI.deleteSeason(id);
    if (response.error) {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, "Something went wrong while deleting the season."),
        title: i18next.t(`${response.message}.title`, "Something went wrong"),
        details: response.error
      });
    } else {
      set((state) => ({
        seasonList: {
          seasons: state.seasonList.seasons.filter(season => season.id !== id),
          count: state.seasonList.count - 1,
          hasMore: state.seasonList.hasMore,
          nextToken: state.seasonList.nextToken,
          filter: state.seasonList.filter
        }
      }));
    }
  },
  fetchSeasons: async (teamId: string, filter: ISeasonFilterOption) => {
    const response = await VolleyGoalsAPI.listSeasons({...filter, teamId});
    if (response.items) {
      set(() => ({
        seasonList: {
          seasons: response.items || [],
          count: response.count || 0,
          hasMore: response.hasMore || false,
          nextToken: response.nextToken || '',
          filter: filter
        }
      }))
    } else {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, "Something went wrong while fetching the seasons."),
        title: i18next.t(`${response.message}.title`, "Something went wrong"),
        details: response.error
      });
    }
  },
  getSeason: async (id: string) => {
    const response = await VolleyGoalsAPI.getSeason(id);
    if (response.season) {
      return response.season;
    } else {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, "Something went wrong while fetching the season."),
        title: i18next.t(`${response.message}.title`, "Something went wrong"),
        details: response.error
      });
      return null;
    }
  }
}))

export {useSeasonStore};
