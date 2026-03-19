import {
  ratingColor, RATING_PALETTE,
  goalColor, GOAL_COLORS,
  buildProgressChartData,
} from '../../utils/chartUtils';

describe('ratingColor', () => {
  it.each([
    [1, RATING_PALETTE[0]],
    [2, RATING_PALETTE[1]],
    [3, RATING_PALETTE[2]],
    [4, RATING_PALETTE[3]],
    [5, RATING_PALETTE[4]],
  ])('returns correct color for rating %d', (rating, expected) => {
    expect(ratingColor(rating)).toBe(expected);
  });

  it('clamps rating below 1', () => {
    expect(ratingColor(0)).toBe(RATING_PALETTE[0]);
    expect(ratingColor(-5)).toBe(RATING_PALETTE[0]);
  });

  it('clamps rating above 5', () => {
    expect(ratingColor(6)).toBe(RATING_PALETTE[4]);
    expect(ratingColor(100)).toBe(RATING_PALETTE[4]);
  });

  it('rounds fractional ratings', () => {
    expect(ratingColor(2.4)).toBe(RATING_PALETTE[1]);
    expect(ratingColor(2.6)).toBe(RATING_PALETTE[2]);
  });
});

describe('goalColor', () => {
  it('returns correct color for indices within range', () => {
    GOAL_COLORS.forEach((color, i) => {
      expect(goalColor(i)).toBe(color);
    });
  });

  it('cycles through palette for indices beyond range', () => {
    expect(goalColor(GOAL_COLORS.length)).toBe(GOAL_COLORS[0]);
    expect(goalColor(GOAL_COLORS.length + 1)).toBe(GOAL_COLORS[1]);
  });
});

describe('buildProgressChartData', () => {
  const goals = [
    { id: 'g1', title: 'Goal 1' },
    { id: 'g2', title: 'Goal 2' },
  ];

  const reports = [
    {
      id: 'r1', createdAt: '2026-03-01T10:00:00Z', summary: 'Report 1',
      progress: [
        { goalId: 'g1', rating: 3 },
        { goalId: 'g2', rating: 4 },
      ],
    },
    {
      id: 'r2', createdAt: '2026-02-01T10:00:00Z', summary: 'Report 2',
      progress: [
        { goalId: 'g1', rating: 2 },
      ],
    },
  ];

  it('returns data points sorted by date ascending', () => {
    const { data } = buildProgressChartData(reports, goals, new Set());
    expect(data).toHaveLength(2);
    expect(data[0].reportId).toBe('r2'); // Feb before Mar
    expect(data[1].reportId).toBe('r1');
  });

  it('includes goal ratings in data points', () => {
    const { data, chartGoals } = buildProgressChartData(reports, goals, new Set());
    expect(chartGoals).toHaveLength(2);
    expect(data[1].g1).toBe(3);
    expect(data[1].g2).toBe(4);
  });

  it('respects hiddenGoalIds', () => {
    const { chartGoals } = buildProgressChartData(reports, goals, new Set(['g2']));
    expect(chartGoals).toHaveLength(1);
    expect(chartGoals[0].id).toBe('g1');
  });

  it('handles empty reports', () => {
    const { data, chartGoals } = buildProgressChartData([], goals, new Set());
    expect(data).toHaveLength(0);
    expect(chartGoals).toHaveLength(0);
  });

  it('excludes goals with no data points', () => {
    const reportsOnlyG1 = [
      { id: 'r1', createdAt: '2026-03-01T10:00:00Z', summary: 'R', progress: [{ goalId: 'g1', rating: 5 }] },
    ];
    const { chartGoals } = buildProgressChartData(reportsOnlyG1, goals, new Set());
    expect(chartGoals).toHaveLength(1);
    expect(chartGoals[0].id).toBe('g1');
  });
});
