import {GoalStatus, GoalType, IGoal, IGoalSeasonTag} from "./types";
import {create} from "zustand";
import {IGoalFilterOption} from "../services/types";
import VolleyGoalsAPI from "../services/backend.api";
import {useNotificationStore} from "./notification";
import i18next from "i18next";

type GoalState = {
  goalList: {
    goals: IGoal[];
    count: number;
    hasMore: boolean;
    nextToken: string;
    filter: IGoalFilterOption;
  };
  currentGoal?: IGoal;
  goalSeasons: IGoalSeasonTag[];
  seasonGoals: IGoal[];
}

type GoalActions = {
  createGoal: (teamId: string, type: GoalType, title: string, description: string) => Promise<void>;
  updateGoal: (teamId: string, id: string, title?: string, description?: string, status?: GoalStatus, ownerId?: string) => Promise<void>;
  deleteGoal: (teamId: string, id: string) => Promise<void>;
  fetchGoals: (teamId: string, filter: IGoalFilterOption) => Promise<void>;
  getGoal:    (teamId: string, id: string) => Promise<IGoal | null>;
  tagGoalToSeason: (teamId: string, goalId: string, seasonId: string) => Promise<void>;
  untagGoalFromSeason: (teamId: string, goalId: string, seasonId: string) => Promise<void>;
  fetchGoalSeasons: (teamId: string, goalId: string) => Promise<void>;
  fetchSeasonGoals: (teamId: string, seasonId: string) => Promise<void>;
}

const useGoalStore = create<GoalState & GoalActions>((set) => ({
  goalList: {
    goals: [],
    count: 0,
    hasMore: false,
    nextToken: '',
    filter: {}
  },
  currentGoal: undefined,
  goalSeasons: [],
  seasonGoals: [],
  createGoal: async (teamId: string, type: GoalType, title: string, description: string) => {
    const response = await VolleyGoalsAPI.createGoal(teamId, {type, title, description});
    if (!response.goal) {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, "Something went wrong while creating the goal."),
        title: i18next.t(`${response.message}.title`, "Something went wrong"),
        details: response.error
      });
    } else {
      set((state) => ({
        goalList: {
          goals: [response.goal!, ...state.goalList.goals],
          count: state.goalList.count + 1,
          hasMore: state.goalList.hasMore,
          nextToken: state.goalList.nextToken,
          filter: state.goalList.filter
        }
      }));
    }
  },
  updateGoal: async (teamId: string, id: string, title?: string, description?: string, status?: GoalStatus, ownerId?: string) => {
    const response = await VolleyGoalsAPI.updateGoal(teamId, id, {title, description, status, ownerId});
    if (!response.goal) {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, "Something went wrong while updating the goal."),
        title: i18next.t(`${response.message}.title`, "Something went wrong"),
        details: response.error
      });
    } else {
      set((state) => ({
        goalList: {
          goals: state.goalList.goals.map(goal => goal.id === id ? response.goal! : goal),
          count: state.goalList.count,
          hasMore: state.goalList.hasMore,
          nextToken: state.goalList.nextToken,
          filter: state.goalList.filter
        },
        currentGoal: state.currentGoal?.id === id ? response.goal! : state.currentGoal
      }));
    }
  },
  deleteGoal: async (teamId: string, id: string) => {
    const response = await VolleyGoalsAPI.deleteGoal(teamId, id);
    if (response.error) {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, "Something went wrong while deleting the goal."),
        title: i18next.t(`${response.message}.title`, "Something went wrong"),
        details: response.error
      });
    } else {
      set((state) => ({
        goalList: {
          goals: state.goalList.goals.filter(goal => goal.id !== id),
          count: state.goalList.count - 1,
          hasMore: state.goalList.hasMore,
          nextToken: state.goalList.nextToken,
          filter: state.goalList.filter
        }
      }));
    }
  },
  fetchGoals: async (teamId: string, filter: IGoalFilterOption) => {
    const response = await VolleyGoalsAPI.listGoals(teamId, filter);
    if (response.items) {
      set(() => ({
        goalList: {
          goals: response.items!,
          count: response.count || response.items!.length,
          hasMore: !!response.nextToken,
          nextToken: response.nextToken || '',
          filter: filter
        }
      }))
    } else {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, "Something went wrong while fetching goals."),
        title: i18next.t(`${response.message}.title`, "Something went wrong"),
        details: response.error
      });
    }
  },
  getGoal: async (teamId: string, id: string) => {
    const response = await VolleyGoalsAPI.getGoal(teamId, id);
    if (response.goal) {
      set(() => ({ currentGoal: response.goal }));
      return response.goal;
    } else {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, "Something went wrong while fetching the goal."),
        title: i18next.t(`${response.message}.title`, "Something went wrong"),
        details: response.error
      });
      return null;
    }
  },
  tagGoalToSeason: async (teamId: string, goalId: string, seasonId: string) => {
    const response = await VolleyGoalsAPI.tagGoalToSeason(teamId, goalId, seasonId);
    if (response.error) {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, "Something went wrong while tagging the goal."),
        title: i18next.t(`${response.message}.title`, "Something went wrong"),
        details: response.error
      });
    } else {
      set((state) => ({
        goalSeasons: [...state.goalSeasons, { goalId, seasonId }]
      }));
    }
  },
  untagGoalFromSeason: async (teamId: string, goalId: string, seasonId: string) => {
    const response = await VolleyGoalsAPI.untagGoalFromSeason(teamId, goalId, seasonId);
    if (response.error) {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, "Something went wrong while untagging the goal."),
        title: i18next.t(`${response.message}.title`, "Something went wrong"),
        details: response.error
      });
    } else {
      set((state) => ({
        goalSeasons: state.goalSeasons.filter((t: any) => {
          const sId = typeof t === 'string' ? t : (t.seasonId || t.id);
          return sId !== seasonId;
        })
      }));
    }
  },
  fetchGoalSeasons: async (teamId: string, goalId: string) => {
    const response = await VolleyGoalsAPI.listGoalSeasons(teamId, goalId);
    if (response.items) {
      set(() => ({ goalSeasons: response.items! }));
    } else {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, "Something went wrong while fetching goal seasons."),
        title: i18next.t(`${response.message}.title`, "Something went wrong"),
        details: response.error
      });
    }
  },
  fetchSeasonGoals: async (teamId: string, seasonId: string) => {
    const response = await VolleyGoalsAPI.listGoals(teamId, { seasonId });
    if (response.items) {
      set(() => ({ seasonGoals: response.items! }));
    } else {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, "Something went wrong while fetching season goals."),
        title: i18next.t(`${response.message}.title`, "Something went wrong"),
        details: response.error
      });
    }
  },
}))

export {useGoalStore};
