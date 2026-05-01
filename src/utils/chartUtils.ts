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

export interface ScatterPoint {
  x: number;         // report date as Unix timestamp (ms)
  y: number;         // index into goalNames array
  rating: number;    // 1–5
  progressId: string;
  reportId: string;
  goalName: string;
  isOnTrack: boolean; // rating >= 3
}

export function buildGoalActivityScatterData(
  reports: Array<{
    id: string;
    createdAt: string;
    progress?: Array<{ id: string; goalId: string; rating: number; details?: string }>;
  }>,
  goals: Array<{ id: string; title: string }>,
): { points: ScatterPoint[]; goalNames: string[] } {
  const goalIndexMap = new Map(goals.map((g, i) => [g.id, i]));
  const goalNames = goals.map((g) => g.title);
  const points: ScatterPoint[] = [];

  for (const report of reports) {
    const x = new Date(report.createdAt).getTime();
    for (const entry of report.progress ?? []) {
      const y = goalIndexMap.get(entry.goalId);
      if (y === undefined) continue;
      points.push({
        x,
        y,
        rating: entry.rating,
        progressId: entry.id,
        reportId: report.id,
        goalName: goalNames[y],
        isOnTrack: entry.rating >= 3,
      });
    }
  }

  return { points, goalNames };
}

export const HEATMAP_RATING_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: '#fce4e9', text: '#6b1323' },
  2: { bg: '#f4a0b0', text: '#5a0e1c' },
  3: { bg: '#e05575', text: '#ffffff' },
  4: { bg: '#c4283e', text: '#ffffff' },
  5: { bg: '#8b0000', text: '#ffffff' },
};

export interface HeatmapCell {
  date: string;
  rating: 1 | 2 | 3 | 4 | 5;
  progressId: string;
  reportId: string;
}

export interface HeatmapRow {
  goalId: string;
  goalName: string;
  cells: Record<string, HeatmapCell>;
}

export interface HeatmapData {
  rows: HeatmapRow[];
  dateColumns: string[];
}

export function buildHeatmapData(
  reports: Array<{
    id: string;
    createdAt: string;
    progress?: Array<{ id: string; goalId: string; rating: number }>;
  }>,
  goals: Array<{ id: string; title: string }>,
  maxColumns?: number,
): HeatmapData {
  const goalMap = new Map(goals.map(g => [g.id, g.title]));
  const rowMap = new Map<string, HeatmapRow>();
  const dateSet = new Set<string>();

  for (const report of reports) {
    const date = report.createdAt.substring(0, 10);
    for (const entry of report.progress ?? []) {
      if (!goalMap.has(entry.goalId)) continue;
      dateSet.add(date);
      if (!rowMap.has(entry.goalId)) {
        rowMap.set(entry.goalId, {
          goalId: entry.goalId,
          goalName: goalMap.get(entry.goalId)!,
          cells: {},
        });
      }
      const r = Math.min(5, Math.max(1, Math.round(entry.rating))) as 1 | 2 | 3 | 4 | 5;
      const existing = rowMap.get(entry.goalId)!.cells[date];
      if (!existing || r >= existing.rating) {
        rowMap.get(entry.goalId)!.cells[date] = {
          date,
          rating: r,
          progressId: entry.id,
          reportId: report.id,
        };
      }
    }
  }

  let dateColumns = Array.from(dateSet).sort();
  if (maxColumns !== undefined && dateColumns.length > maxColumns) {
    dateColumns = dateColumns.slice(dateColumns.length - maxColumns);
  }

  const rows = goals.filter(g => rowMap.has(g.id)).map(g => rowMap.get(g.id)!);
  return { rows, dateColumns };
}
