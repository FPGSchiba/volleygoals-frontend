export const RATING_PALETTE = ['#e53935', '#ef6c00', '#f9a825', '#7cb342', '#2e7d32'];
export const ratingColor = (r: number): string =>
  RATING_PALETTE[Math.min(Math.max(Math.round(r) - 1, 0), 4)];

export const GOAL_COLORS = [
  '#1565C0', '#6A1B9A', '#00838F', '#AD1457',
  '#00695C', '#E65100', '#4527A0', '#558B2F',
  '#0277BD', '#C62828', '#F57F17', '#37474F',
];
export const goalColor = (goalIndex: number): string =>
  GOAL_COLORS[goalIndex % GOAL_COLORS.length];

/**
 * Transform progress reports + goals into Recharts-compatible data.
 * Returns an array of data points sorted by date (oldest first).
 * Each point has: { date, dateLabel, reportId, summary, [goalId]: rating, ... }
 */
export interface ProgressChartPoint {
  date: number; // timestamp ms
  dateLabel: string;
  reportId: string;
  summary: string;
  [goalId: string]: number | string;
}

export interface ProgressChartGoal {
  id: string;
  title: string;
  color: string;
}

export function buildProgressChartData(
  reports: Array<{ id: string; createdAt: string; summary: string; progress?: Array<{ goalId: string; rating: number }> }>,
  goals: Array<{ id: string; title: string }>,
  hiddenGoalIds: Set<string>
): { data: ProgressChartPoint[]; chartGoals: ProgressChartGoal[] } {
  // Goals that have at least one data point and are not hidden
  const goalIdsWithData = new Set<string>();
  reports.forEach(r => r.progress?.forEach(p => goalIdsWithData.add(p.goalId)));

  const chartGoals: ProgressChartGoal[] = goals
    .filter(g => goalIdsWithData.has(g.id) && !hiddenGoalIds.has(g.id))
    .map((g, idx) => ({ id: g.id, title: g.title, color: goalColor(idx) }));

  // Sort reports oldest → newest for chart x-axis
  const sorted = [...reports].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const data: ProgressChartPoint[] = sorted.map(r => {
    const point: ProgressChartPoint = {
      date: new Date(r.createdAt).getTime(),
      dateLabel: new Date(r.createdAt).toLocaleDateString(),
      reportId: r.id,
      summary: r.summary || '',
    };
    chartGoals.forEach(g => {
      const entry = r.progress?.find(p => p.goalId === g.id);
      if (entry) point[g.id] = entry.rating;
    });
    return point;
  });

  return { data, chartGoals };
}
