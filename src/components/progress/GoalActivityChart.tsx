import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import i18next from 'i18next';
import { GoalHeatmap } from './GoalHeatmap';
import { buildHeatmapData, HeatmapData } from '../../utils/chartUtils';

interface GoalActivityChartProps {
  points: Array<{
    x: number;
    y: number;
    rating: number;
    progressId: string;
    reportId: string;
    goalName: string;
    isOnTrack: boolean;
  }>;
  goalNames: string[];
  onEntryClick: (progressId: string, reportId: string) => void;
  reports?: Array<{
    id: string;
    createdAt: string;
    progress?: Array<{ id: string; goalId: string; rating: number }>;
  }>;
  goals?: Array<{ id: string; title: string }>;
}

export function GoalActivityChart({
  points,
  goalNames,
  onEntryClick,
  reports,
  goals,
}: GoalActivityChartProps) {
  const heatmapData: HeatmapData = React.useMemo(() => {
    if (reports && goals) {
      return buildHeatmapData(reports, goals);
    }
    const fakeGoals = goalNames.map((name, i) => ({ id: String(i), title: name }));
    const fakeReports = points.reduce<
      Map<string, { id: string; createdAt: string; progress: Array<{ id: string; goalId: string; rating: number }> }>
    >((acc, pt) => {
      const key = pt.reportId;
      if (!acc.has(key)) {
        acc.set(key, { id: key, createdAt: new Date(pt.x).toISOString(), progress: [] });
      }
      acc.get(key)!.progress.push({ id: pt.progressId, goalId: String(pt.y), rating: pt.rating });
      return acc;
    }, new Map());
    return buildHeatmapData(Array.from(fakeReports.values()), fakeGoals);
  }, [points, goalNames, reports, goals]);

  return (
    <GoalHeatmap
      data={heatmapData}
      onCellClick={onEntryClick}
      showGoalLabels={true}
      showDateHeaders={true}
      showLegend={true}
    />
  );
}
