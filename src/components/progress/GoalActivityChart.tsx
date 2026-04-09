import React from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import i18next from 'i18next';
import { ScatterPoint } from '../../utils/chartUtils';

interface GoalActivityChartProps {
  points: ScatterPoint[];
  goalNames: string[];
  onEntryClick: (progressId: string, reportId: string) => void;
}

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: ScatterPoint;
  onEntryClick: (progressId: string, reportId: string) => void;
}

function ActivityDot({ cx = 0, cy = 0, payload, onEntryClick }: DotProps) {
  if (!payload) return null;
  const color = payload.isOnTrack
    ? 'var(--palette-primary-main)'
    : 'var(--palette-warning-main)';
  return (
    <g
      className="progress-activity-dot"
      onClick={() => onEntryClick(payload.progressId, payload.reportId)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEntryClick(payload.progressId, payload.reportId);
        }
      }}
      tabIndex={0}
      style={{ cursor: 'pointer' }}
      role="button"
      aria-label={`${i18next.t('progress.graph.rating', 'Rating')} ${payload.rating} — ${payload.goalName}`}
    >
      <circle cx={cx} cy={cy} r={14} fill={color} opacity={0.85} />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize={12}
        fontWeight="bold"
        pointerEvents="none"
      >
        {payload.rating}
      </text>
    </g>
  );
}

export function GoalActivityChart({ points, goalNames, onEntryClick }: GoalActivityChartProps) {
  const theme = useTheme();

  if (points.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">
          {i18next.t('progress.graph.noData', 'No progress data available for this season.')}
        </Typography>
      </Box>
    );
  }

  const chartHeight = Math.max(goalNames.length * 64 + 60, 160);

  const formatXTick = (timestamp: number) =>
    new Intl.DateTimeFormat('de-CH', { month: 'short', day: 'numeric' }).format(new Date(timestamp));

  const formatYTick = (index: number) => goalNames[index] ?? '';

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <ScatterChart margin={{ top: 16, right: 24, bottom: 16, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
        <XAxis
          dataKey="x"
          type="number"
          domain={['dataMin - 86400000', 'dataMax + 86400000']}
          tickFormatter={formatXTick}
          name="Date"
          scale="time"
          tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
          tickLine={false}
          axisLine={{ stroke: theme.palette.divider }}
        />
        <YAxis
          dataKey="y"
          type="number"
          domain={[-0.5, goalNames.length - 0.5]}
          ticks={goalNames.map((_, i) => i)}
          tickFormatter={formatYTick}
          width={110}
          tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
          tickLine={false}
          axisLine={{ stroke: theme.palette.divider }}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as ScatterPoint;
            return (
              <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', p: 1, borderRadius: 1 }}>
                <Typography variant="caption" display="block" fontWeight="bold">{p.goalName}</Typography>
                <Typography variant="caption" display="block">{i18next.t('progress.graph.rating', 'Rating')}: {p.rating}/5</Typography>
                <Typography variant="caption" color="text.secondary">{i18next.t('progress.chart.clickToOpen', 'Click to open')}</Typography>
              </Box>
            );
          }}
        />
        <Scatter
          data={points}
          shape={(props: { cx?: number; cy?: number; payload?: ScatterPoint }) =>
            <ActivityDot {...props} onEntryClick={onEntryClick} />
          }
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
