import { IActivityEntry } from './types';
import { create } from 'zustand';
import VolleyGoalsAPI from '../services/backend.api';
import { useNotificationStore } from './notification';
import i18next from 'i18next';

type ActivityState = {
  activities: IActivityEntry[];
  nextToken: string | null;
  hasMore: boolean;
  loading: boolean;
};

type ActivityActions = {
  fetchActivity: (teamId: string, filter?: { limit?: number; nextToken?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }) => Promise<IActivityEntry[]>;
};

const useActivityStore = create<ActivityState & ActivityActions>((set) => ({
  activities: [],
  nextToken: null,
  hasMore: false,
  loading: false,
  fetchActivity: async (teamId: string, filter?) => {
    set({ loading: true });
    try {
      const response = await VolleyGoalsAPI.getTeamActivity(teamId, filter);
      if (response.items) {
        set({ activities: response.items, nextToken: response.nextToken ?? null, hasMore: !!response.hasMore });
        return response.items;
      } else {
        useNotificationStore.getState().notify({
          level: 'error',
          message: i18next.t(`${response.message}.message`, 'Something went wrong while fetching activity.'),
          title: i18next.t(`${response.message}.title`, 'Something went wrong'),
          details: response.error
        });
        return [];
      }
    } finally {
      set({ loading: false });
    }
  },
}));

export { useActivityStore };
