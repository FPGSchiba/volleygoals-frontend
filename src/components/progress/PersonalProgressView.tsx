import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import { GoalActivityChart } from './GoalActivityChart';
import { EntryDrawer, EntryDrawerEntry } from './EntryDrawer';
import { buildGoalActivityScatterData } from '../../utils/chartUtils';
import { useProgressReportStore } from '../../store/progressReports';
import { useGoalStore } from '../../store/goals';

interface PersonalProgressViewProps {
  teamId: string;
  seasonId: string;
  canParticipate: boolean;
  /** When provided, renders this member's data read-only instead of current user's */
  authorId?: string;
}

export function PersonalProgressView({
  teamId,
  seasonId,
  canParticipate,
  authorId,
}: PersonalProgressViewProps) {
  const navigate = useNavigate();
  const [selectedEntry, setSelectedEntry] = React.useState<EntryDrawerEntry | null>(null);

  const { reportList, fetchReports } = useProgressReportStore();
  const { goalList, fetchGoals } = useGoalStore();
  const goals = goalList.goals;

  React.useEffect(() => {
    fetchReports(seasonId, authorId ? { authorId } : ({} as any)).catch(() => {});
    fetchGoals(teamId, { limit: 100 } as any).catch(() => {});
  }, [seasonId, teamId, authorId]);

  const { points, goalNames } = buildGoalActivityScatterData(reportList.reports, goals);

  const handleEntryClick = (progressId: string, reportId: string) => {
    const report = reportList.reports.find((r) => r.id === reportId);
    if (!report) return;
    const entry = report.progress?.find((p) => p.id === progressId);
    if (!entry) return;
    const goal = goals.find((g) => g.id === entry.goalId);
    setSelectedEntry({
      id: entry.id,
      goalId: entry.goalId,
      goalName: goal?.title ?? entry.goalId,
      rating: entry.rating,
      details: entry.details,
      reportId: report.id,
      reportDate: report.createdAt,
    });
  };

  const readonly = !!authorId;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          {authorId ? 'Progress' : 'My Progress'}
        </Typography>
        {canParticipate && !authorId && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/progress/create')}
          >
            New Report
          </Button>
        )}
      </Box>

      <GoalActivityChart
        points={points}
        goalNames={goalNames}
        onEntryClick={handleEntryClick}
      />

      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Reports
        </Typography>
        {reportList.reports.map((report) => (
          <Box
            key={report.id}
            sx={{
              p: 1.5,
              mb: 1,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
            }}
            onClick={() => navigate(`/progress/${report.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate(`/progress/${report.id}`)}
          >
            <Typography variant="body2" fontWeight="medium">{report.summary}</Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(report.createdAt).toLocaleDateString()}
            </Typography>
          </Box>
        ))}
      </Box>

      <EntryDrawer
        entry={selectedEntry}
        readonly={readonly}
        onClose={() => setSelectedEntry(null)}
      />
    </Box>
  );
}
