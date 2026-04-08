import { buildGoalActivityScatterData } from '../chartUtils';

const mockGoals = [
  { id: 'goal-1', title: 'Serve accuracy' },
  { id: 'goal-2', title: 'Jump height' },
];

const mockReports = [
  {
    id: 'report-1',
    authorId: 'user-1',
    reportDate: '2025-03-01T00:00:00Z',
    summary: 'Good week',
    progress: [
      { id: 'entry-1', goalId: 'goal-1', rating: 4, details: 'Improved' },
      { id: 'entry-2', goalId: 'goal-2', rating: 2, details: 'Struggling' },
    ],
  },
];

describe('buildGoalActivityScatterData', () => {
  it('maps each progress entry to a scatter point', () => {
    const { points, goalNames } = buildGoalActivityScatterData(mockReports as any, mockGoals as any);

    expect(points).toHaveLength(2);
    expect(goalNames).toEqual(['Serve accuracy', 'Jump height']);

    expect(points[0]).toMatchObject({
      x: new Date('2025-03-01T00:00:00Z').getTime(),
      y: 0,
      rating: 4,
      progressId: 'entry-1',
      reportId: 'report-1',
      goalName: 'Serve accuracy',
      isOnTrack: true,
    });

    expect(points[1]).toMatchObject({
      y: 1,
      rating: 2,
      isOnTrack: false,
    });
  });

  it('skips progress entries whose goalId is not in the goals list', () => {
    const reportsWithUnknownGoal = [
      {
        id: 'report-2',
        reportDate: '2025-03-05T00:00:00Z',
        progress: [{ id: 'e-1', goalId: 'unknown-goal', rating: 3 }],
      },
    ];
    const { points } = buildGoalActivityScatterData(reportsWithUnknownGoal as any, mockGoals as any);
    expect(points).toHaveLength(0);
  });

  it('returns empty arrays when there are no reports', () => {
    const { points, goalNames } = buildGoalActivityScatterData([], mockGoals as any);
    expect(points).toHaveLength(0);
    expect(goalNames).toEqual(['Serve accuracy', 'Jump height']);
  });
});
