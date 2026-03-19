import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, Button, Paper, Rating, Typography } from '@mui/material';
import { useProgressReportStore } from '../../store/progressReports';
import { useGoalStore } from '../../store/goals';
import { useSeasonStore } from '../../store/seasons';
import { useTeamStore } from '../../store/teams';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { CommentType } from '../../store/types';
import { CommentSection } from '../../components/CommentSection';
import { formatDateTime } from '../../utils/dateTime';
import i18next from 'i18next';

export function ProgressEntryDetails() {
  const { progressId, entryId } = useParams<{ progressId: string; entryId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const currentReport = useProgressReportStore((s) => s.currentReport);
  const getReport = useProgressReportStore((s) => s.getReport);
  const fetchGoals = useGoalStore((s) => s.fetchGoals);
  const goals = useGoalStore((s) => s.goalList.goals);
  const fetchSeasons = useSeasonStore((s) => s.fetchSeasons);
  const seasons = useSeasonStore((s) => s.seasonList.seasons);
  const selectedTeam = useCognitoUserStore((s) => s.selectedTeam);
  const currentTeamSettings = useTeamStore((s) => s.currentTeamSettings);
  const getTeam = useTeamStore((s) => s.getTeam);

  const teamId = selectedTeam?.team?.id;

  const seasonId = currentReport?.seasonId
    || location.state?.seasonId
    || (seasons && seasons.length > 0
      ? [...seasons].sort((a, b) =>
          new Date(b.startDate || b.createdAt).getTime() - new Date(a.startDate || a.createdAt).getTime()
        )[0]?.id
      : undefined);

  React.useEffect(() => {
    if (teamId && (!seasons || seasons.length === 0)) {
      fetchSeasons(teamId, { teamId });
    }
  }, [teamId]);

  React.useEffect(() => {
    if (progressId && seasonId && (!currentReport || currentReport.id !== progressId)) {
      getReport(seasonId, progressId);
    }
  }, [progressId, seasonId]);

  React.useEffect(() => {
    if (seasonId) fetchGoals(seasonId, {});
  }, [seasonId]);

  React.useEffect(() => {
    if (teamId) {
      getTeam(teamId).catch(() => {});
    }
  }, [teamId]);

  const entry = currentReport?.progress?.find(p => p.id === entryId);
  const goal = goals.find(g => g.id === entry?.goalId);
  const goalTitle = location.state?.goalTitle || goal?.title || entry?.goalId || '';

  if (!currentReport || !entry) {
    return (
      <Paper>
        <Box p={2}>
          <Typography variant="h5">{i18next.t('progressEntry.title', 'Progress Entry Details')}</Typography>
          <Typography>{i18next.t('common.loading', 'Loading...')}</Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper>
      <Box p={2}>
        <Button variant="text" onClick={() => navigate(`/progress/${progressId}`, { state: { seasonId } })} sx={{ mb: 1 }}>
          ← {i18next.t('progressEntry.back', 'Back to Report')}
        </Button>

        <Typography variant="h5">{i18next.t('progressEntry.title', 'Progress Entry Details')}</Typography>

        <Box mt={2}>
          <Typography variant="subtitle2" color="text.secondary">{i18next.t('progressEntry.goalTitle', 'Goal')}</Typography>
          <Typography variant="h6">{goalTitle}</Typography>
        </Box>

        <Box mt={2} display="flex" alignItems="center" gap={2}>
          <Typography variant="subtitle2" color="text.secondary">{i18next.t('progressEntry.rating', 'Rating')}</Typography>
          <Rating value={entry.rating} readOnly max={5} />
          <Typography variant="body2">({entry.rating}/5)</Typography>
        </Box>

        {entry.details && (
          <Box mt={2}>
            <Typography variant="subtitle2" color="text.secondary">{i18next.t('progressEntry.details', 'Notes')}</Typography>
            <Typography variant="body1" sx={{ mt: 0.5 }}>{entry.details}</Typography>
          </Box>
        )}

        <Box mt={1}>
          <Typography variant="caption" color="text.secondary">
            {i18next.t('progress.author', 'Report')}: {formatDateTime(currentReport.createdAt)}
          </Typography>
        </Box>

        <Box mt={4}>
          <CommentSection
            targetId={entryId!}
            commentType={CommentType.ProgressEntry}
            enabled={true}
            allowFileUploads={currentTeamSettings?.allowFileUploads ?? false}
          />
        </Box>
      </Box>
    </Paper>
  );
}
