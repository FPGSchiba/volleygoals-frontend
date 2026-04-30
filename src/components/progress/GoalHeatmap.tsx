import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import i18next from 'i18next';
import { HeatmapData, HEATMAP_RATING_COLORS } from '../../utils/chartUtils';

interface GoalHeatmapProps {
  data: HeatmapData;
  onCellClick: (progressId: string, reportId: string) => void;
  showGoalLabels?: boolean;
  showDateHeaders?: boolean;
  showLegend?: boolean;
}

const LABEL_W = 90;
const CELL_SIZE = 26;
const GAP = 3;

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('de-CH', { month: 'short', day: 'numeric' }).format(new Date(date));

export function GoalHeatmap({
  data,
  onCellClick,
  showGoalLabels = true,
  showDateHeaders = true,
  showLegend = true,
}: GoalHeatmapProps) {
  if (data.rows.length === 0 || data.dateColumns.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 12, color: 'var(--vg-text-muted)' }}>
          {i18next.t('progress.graph.noData', 'No progress data available.')}
        </Typography>
      </Box>
    );
  }

  const labelW = showGoalLabels ? LABEL_W : 0;

  return (
    <Box sx={{ overflowX: 'auto' }}>
      {showDateHeaders && (
        <Box sx={{ display: 'flex', pl: `${labelW}px`, gap: `${GAP}px`, mb: '4px' }}>
          {data.dateColumns.map(date => (
            <Box
              key={date}
              sx={{
                width: CELL_SIZE,
                flexShrink: 0,
                fontSize: '9px',
                color: 'var(--vg-text-muted)',
                textAlign: 'center',
                overflow: 'hidden',
              }}
            >
              {formatDate(date)}
            </Box>
          ))}
        </Box>
      )}

      {data.rows.map(row => (
        <Box key={row.goalId} sx={{ display: 'flex', alignItems: 'center', gap: `${GAP}px`, mb: `${GAP}px` }}>
          {showGoalLabels && (
            <Box
              title={row.goalName}
              sx={{
                width: labelW,
                flexShrink: 0,
                fontSize: '10px',
                color: 'var(--vg-text-muted)',
                textAlign: 'right',
                pr: '8px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {row.goalName}
            </Box>
          )}
          {data.dateColumns.map(date => {
            const cell = row.cells[date];
            if (!cell) {
              return (
                <Box
                  key={date}
                  sx={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    flexShrink: 0,
                    borderRadius: '5px',
                    background: 'var(--vg-bg-subtle)',
                  }}
                />
              );
            }
            const { bg, text } = HEATMAP_RATING_COLORS[cell.rating];
            return (
              <Box
                key={date}
                className="vg-heatmap-cell--rated"
                role="button"
                tabIndex={0}
                aria-label={`${row.goalName}: ${i18next.t('progress.graph.rating', 'Rating')} ${cell.rating}`}
                onClick={() => onCellClick(cell.progressId, cell.reportId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onCellClick(cell.progressId, cell.reportId);
                  }
                }}
                sx={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  flexShrink: 0,
                  borderRadius: '5px',
                  background: bg,
                  color: text,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {cell.rating}
              </Box>
            );
          })}
        </Box>
      ))}

      {showLegend && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', mt: '12px', pl: `${labelW}px` }}>
          <Typography sx={{ fontSize: '9px', color: 'var(--vg-text-muted)' }}>
            {i18next.t('progress.heatmap.rating', 'Rating:')}
          </Typography>
          {([1, 2, 3, 4, 5] as const).map(r => {
            const { bg } = HEATMAP_RATING_COLORS[r];
            return (
              <Box
                key={r}
                aria-label={`${i18next.t('progress.heatmap.ratingLabel', 'Rating')} ${r}`}
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: '4px',
                  background: bg,
                }}
              />
            );
          })}
        </Box>
      )}
    </Box>
  );
}
