import {GoalStatus, GoalType, IGoal} from "./types";
import {create} from "zustand";
import {IGoalFilterOption} from "../services/types";
import {useCognitoUserStore} from "./cognitoUser";
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
  }
}

type GoalActions = {
  createGoal: (seasonId: string, type: GoalType, title: string, description: string) => Promise<void>;
  updateGoal: (seasonId: string, id: string, title?: string, description?: string, status?: GoalStatus, ownerId?: string) => Promise<void>;
  deleteGoal: (seasonId: string, id: string) => Promise<void>;
  fetchGoals: (seasonId: string, filter: IGoalFilterOption) => Promise<void>;
  getGoal:    (seasonId: string, id: string) => Promise<IGoal | null>; // TODO: With Progress this needs to be updated
}

const useGoalStore = create<GoalState & GoalActions>((set) => ({
  goalList: {
    goals: [],
    count: 0,
    hasMore: false,
    nextToken: '',
    filter: {}
  },
  createGoal: async (seasonId: string, type: GoalType, title: string, description: string) => {
    const response = await VolleyGoalsAPI.createGoal(seasonId, {type, title, description});
    if (!response.goal) {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, "Something went wrong while creating the team."),
        title: i18next.t(`${response.message}.title`, "Something went wrong"),
        details: response.error
      });
    } else{
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
  updateGoal: async (seasonId: string, id: string, title?: string, description?: string, status?: GoalStatus, ownerId?: string) => {
    const response = await VolleyGoalsAPI.updateGoal(seasonId, id, {title, description, status, ownerId});
    if (!response.goal) {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, "Something went wrong while updating the season."),
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
        }
      }));
    }
  },
  deleteGoal: async (seasonId: string, id: string) => {
    const response = await VolleyGoalsAPI.deleteGoal(seasonId, id);
    if (response.error) {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, "Something went wrong while deleting the season."),
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
  fetchGoals: async (seasonId: string, filter: IGoalFilterOption) => {
    const response = await VolleyGoalsAPI.listGoals(seasonId, filter);
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
        message: i18next.t(`${response.message}.message`, "Something went wrong while fetching the seasons."),
        title: i18next.t(`${response.message}.title`, "Something went wrong"),
        details: response.error
      });
    }
  },
  getGoal: async (seasonId: string, id: string) => {
    const response = await VolleyGoalsAPI.getGoal(seasonId, id);
    if (response.goal) {
      return response.goal;
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

export {useGoalStore};
