import { useGoalStore } from '../../store/goals';
import { useNotificationStore } from '../../store/notification';
import { buildGoal } from '../mocks/factories';
import { GoalType, GoalStatus } from '../../store/types';

jest.mock('../../services/backend.api', () => ({
  __esModule: true,
  default: {
    listGoals: jest.fn(),
    createGoal: jest.fn(),
    updateGoal: jest.fn(),
    deleteGoal: jest.fn(),
    getGoal: jest.fn(),
    tagGoalToSeason: jest.fn(),
    untagGoalFromSeason: jest.fn(),
    listGoalSeasons: jest.fn(),
    setToken: jest.fn(),
  },
}));

import VolleyGoalsAPI from '../../services/backend.api';
const api = jest.mocked(VolleyGoalsAPI);

beforeEach(() => {
  useGoalStore.setState({
    goalList: { goals: [], count: 0, hasMore: false, nextToken: '', filter: {} },
    currentGoal: undefined,
    goalSeasons: [],
  });
  useNotificationStore.setState({ notifications: [] });
  jest.clearAllMocks();
});

describe('goal store', () => {
  describe('fetchGoals', () => {
    it('updates goalList from API response', async () => {
      const goals = [buildGoal(), buildGoal()];
      api.listGoals.mockResolvedValue({ message: 'ok', items: goals, count: 2 });

      await useGoalStore.getState().fetchGoals('team-1', {});

      const { goalList } = useGoalStore.getState();
      expect(goalList.goals).toHaveLength(2);
      expect(goalList.count).toBe(2);
    });

    it('triggers notification on error', async () => {
      api.listGoals.mockResolvedValue({ message: 'error.goals', error: 'fail' });

      await useGoalStore.getState().fetchGoals('team-1', {});

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
      api.createGoal.mockResolvedValue({ message: 'ok', goal: newGoal });

      await useGoalStore.getState().createGoal('t1', GoalType.Team, 'New Goal', 'desc');

      const { goalList } = useGoalStore.getState();
      expect(goalList.goals).toHaveLength(2);
      expect(goalList.goals[0].title).toBe('New Goal');
      expect(goalList.count).toBe(2);
    });

    it('triggers notification on error', async () => {
      api.createGoal.mockResolvedValue({ message: 'error.create', error: 'fail' });

      await useGoalStore.getState().createGoal('t1', GoalType.Team, 'title', 'desc');

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
      api.updateGoal.mockResolvedValue({ message: 'ok', goal: updated });

      await useGoalStore.getState().updateGoal('t1', 'g1', 'New Title');

      expect(useGoalStore.getState().goalList.goals[0].title).toBe('New Title');
    });
  });

  describe('deleteGoal', () => {
    it('removes goal from the list', async () => {
      const goal = buildGoal({ id: 'g1' });
      useGoalStore.setState({
        goalList: { goals: [goal], count: 1, hasMore: false, nextToken: '', filter: {} },
      });

      api.deleteGoal.mockResolvedValue({ message: 'ok' });

      await useGoalStore.getState().deleteGoal('t1', 'g1');

      const { goalList } = useGoalStore.getState();
      expect(goalList.goals).toHaveLength(0);
      expect(goalList.count).toBe(0);
    });

    it('triggers notification on error', async () => {
      api.deleteGoal.mockResolvedValue({ message: 'error.delete', error: 'fail' });

      await useGoalStore.getState().deleteGoal('t1', 'g1');

      expect(useNotificationStore.getState().notifications).toHaveLength(1);
    });
  });

  describe('tagGoalToSeason', () => {
    it('adds tag to goalSeasons on success', async () => {
      api.tagGoalToSeason.mockResolvedValue({ message: 'ok' });

      await useGoalStore.getState().tagGoalToSeason('t1', 'g1', 's1');

      expect(useGoalStore.getState().goalSeasons).toEqual([{ goalId: 'g1', seasonId: 's1' }]);
    });

    it('triggers notification on error', async () => {
      api.tagGoalToSeason.mockResolvedValue({ message: 'error.tag', error: 'fail' });

      await useGoalStore.getState().tagGoalToSeason('t1', 'g1', 's1');

      expect(useNotificationStore.getState().notifications).toHaveLength(1);
    });
  });

  describe('untagGoalFromSeason', () => {
    it('removes tag from goalSeasons on success', async () => {
      useGoalStore.setState({ goalSeasons: [{ goalId: 'g1', seasonId: 's1' }] });
      api.untagGoalFromSeason.mockResolvedValue({ message: 'ok' });

      await useGoalStore.getState().untagGoalFromSeason('t1', 'g1', 's1');

      expect(useGoalStore.getState().goalSeasons).toHaveLength(0);
    });
  });
});
