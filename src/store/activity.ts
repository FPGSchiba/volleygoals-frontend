import { IActivityEntry } from './types';
import { create } from 'zustand';
import VolleyGoalsAPI from '../services/backend.api';
import { useNotificationStore } from './notification';
import i18next from 'i18next';

type ActivityState = {
  activities: IActivityEntry[];
  loading: boolean;
};

type ActivityActions = {
  fetchActivity: (teamId: string, limit?: number) => Promise<IActivityEntry[]>;
};

const useActivityStore = create<ActivityState & ActivityActions>((set) => ({
  activities: [],
  loading: false,
  fetchActivity: async (teamId: string, limit: number = 20) => {
    set({ loading: true });
    try {
      const response = await VolleyGoalsAPI.getTeamActivity(teamId, limit);
      if (response.items) {
        set({ activities: response.items });
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
