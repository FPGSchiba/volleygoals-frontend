import { useGoalStore } from '../../store/goals';
import { useNotificationStore } from '../../store/notification';
import { buildGoal } from '../mocks/factories';
import { GoalType, GoalStatus } from '../../store/types';

// Mock API
jest.mock('../../services/backend.api', () => ({
  __esModule: true,
  default: {
    listGoals: jest.fn(),
    createGoal: jest.fn(),
    updateGoal: jest.fn(),
    deleteGoal: jest.fn(),
    getGoal: jest.fn(),
    setToken: jest.fn(),
  },
}));

import VolleyGoalsAPI from '../../services/backend.api';
const api = jest.mocked(VolleyGoalsAPI);

beforeEach(() => {
  useGoalStore.setState({
    goalList: { goals: [], count: 0, hasMore: false, nextToken: '', filter: {} },
    currentGoal: undefined,
  });
  useNotificationStore.setState({ notifications: [] });
  jest.clearAllMocks();
});

describe('goal store', () => {
  describe('fetchGoals', () => {
    it('updates goalList from API response', async () => {
      const goals = [buildGoal(), buildGoal()];
      api.listGoals.mockResolvedValue({ items: goals, count: 2 });

      await useGoalStore.getState().fetchGoals('season-1', {});

      const { goalList } = useGoalStore.getState();
      expect(goalList.goals).toHaveLength(2);
      expect(goalList.count).toBe(2);
    });

    it('triggers notification on error', async () => {
      api.listGoals.mockResolvedValue({ error: 'fail', message: 'error.goals' });

      await useGoalStore.getState().fetchGoals('season-1', {});

      const { notifications } = useNotificationStore.getState();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].level).toBe('error');
    });
  });

  describe('createGoal', () => {
    it('adds goal to list on success', async () => {
      const existing = buildGoal();
      useGoalStore.setState({
        goalList: { goals: [existing], count: 1, hasMore: false, nextToken: '', filter: {} },
      });

      const newGoal = buildGoal({ title: 'New Goal' });
      api.createGoal.mockResolvedValue({ goal: newGoal });

      await useGoalStore.getState().createGoal('s1', GoalType.Team, 'New Goal', 'desc');

      const { goalList } = useGoalStore.getState();
      expect(goalList.goals).toHaveLength(2);
      expect(goalList.goals[0].title).toBe('New Goal');
      expect(goalList.count).toBe(2);
    });

    it('triggers notification on error', async () => {
      api.createGoal.mockResolvedValue({ error: 'fail', message: 'error.create' });

      await useGoalStore.getState().createGoal('s1', GoalType.Team, 'title', 'desc');

      expect(useNotificationStore.getState().notifications).toHaveLength(1);
    });
  });

  describe('updateGoal', () => {
    it('replaces the updated goal in the list', async () => {
      const goal = buildGoal({ id: 'g1', title: 'Old' });
      useGoalStore.setState({
        goalList: { goals: [goal], count: 1, hasMore: false, nextToken: '', filter: {} },
      });

      const updated = { ...goal, title: 'New Title' };
      api.updateGoal.mockResolvedValue({ goal: updated });

      await useGoalStore.getState().updateGoal('s1', 'g1', 'New Title');

      expect(useGoalStore.getState().goalList.goals[0].title).toBe('New Title');
    });
  });

  describe('deleteGoal', () => {
    it('removes goal from the list', async () => {
      const goal = buildGoal({ id: 'g1' });
      useGoalStore.setState({
        goalList: { goals: [goal], count: 1, hasMore: false, nextToken: '', filter: {} },
      });

      api.deleteGoal.mockResolvedValue({});

      await useGoalStore.getState().deleteGoal('s1', 'g1');

      const { goalList } = useGoalStore.getState();
      expect(goalList.goals).toHaveLength(0);
      expect(goalList.count).toBe(0);
    });

    it('triggers notification on error', async () => {
      api.deleteGoal.mockResolvedValue({ error: 'fail', message: 'error.delete' });

      await useGoalStore.getState().deleteGoal('s1', 'g1');

      expect(useNotificationStore.getState().notifications).toHaveLength(1);
    });
  });
});
