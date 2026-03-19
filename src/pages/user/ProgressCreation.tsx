import React, { useState } from 'react';
import { Box, Button, MenuItem, Paper, Rating, TextField, Typography } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useProgressReportStore } from '../../store/progressReports';
import { useGoalStore } from '../../store/goals';
import { useSeasonStore } from '../../store/seasons';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { GoalStatus, ISeason } from '../../store/types';
import i18next from 'i18next';

type ProgressForm = { summary: string; details: string; };

export function ProgressCreation() {
  const navigate = useNavigate();
  const createReport = useProgressReportStore((s) => s.createReport);
  const fetchGoals = useGoalStore((s) => s.fetchGoals);
  const goals = useGoalStore((s) => s.goalList.goals);
  const fetchSeasons = useSeasonStore((s) => s.fetchSeasons);
  const seasons = useSeasonStore((s) => s.seasonList.seasons) || [] as ISeason[];
  const selectedTeam = useCognitoUserStore((s) => s.selectedTeam);
  const teamId = selectedTeam?.team?.id || '';

  const [selectedSeasonId, setSelectedSeasonId] = React.useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [goalDetails, setGoalDetails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (teamId) fetchSeasons(teamId, { teamId });
  }, [teamId]);

  React.useEffect(() => {
    if (!seasons || seasons.length === 0) { setSelectedSeasonId(null); return; }
    const sorted = [...seasons].sort((a, b) =>
      new Date(b.startDate || b.createdAt).getTime() - new Date(a.startDate || a.createdAt).getTime()
    );
    setSelectedSeasonId(prev => prev || sorted[0]?.id || null);
  }, [seasons]);

  React.useEffect(() => {
    if (selectedSeasonId) fetchGoals(selectedSeasonId, {});
  }, [selectedSeasonId]);

  const activeGoals = goals.filter(g => g.status === GoalStatus.Open || g.status === GoalStatus.InProgress);

  const { control, handleSubmit } = useForm<ProgressForm>({ defaultValues: { summary: '', details: '' } });

  const onSubmit = async (data: ProgressForm) => {
    if (!selectedSeasonId) return;
    setLoading(true);
    try {
      const progress = Object.entries(ratings)
        .filter(([, rating]) => rating > 0)
        .map(([goalId, rating]) => ({ goalId, rating, details: goalDetails[goalId] || undefined }));
      const report = await createReport(selectedSeasonId, data.summary, data.details, progress);
      if (report) navigate('/progress');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper>
      <Box p={2}>
        <Typography variant="h5">{i18next.t('progress.createTitle', 'Create Progress Report')}</Typography>
        <Box mt={2}>
          <TextField
            select size="small" value={selectedSeasonId ?? ''}
            label={i18next.t('user.goals.selectSeason', 'Season')}
            onChange={(e) => setSelectedSeasonId(e.target.value)}
            style={{ minWidth: 240 }}
          >
            {seasons.map((s) => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
          </TextField>
        </Box>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Box mt={2} display="flex" flexDirection="column" gap={2}>
            <Controller name="summary" control={control} rules={{ required: true }} render={({ field }) => (
              <TextField fullWidth label={i18next.t('progress.summary', 'Summary')} {...field} />
            )} />
            <Controller name="details" control={control} rules={{ required: true }} render={({ field }) => (
              <TextField fullWidth multiline rows={4} label={i18next.t('progress.details', 'Details')} {...field} />
            )} />
            {activeGoals.length > 0 && (
              <Box>
                <Typography variant="subtitle1">{i18next.t('progress.goalRatings', 'Goal Ratings')}</Typography>
                {activeGoals.map((g) => (
                  <Box key={g.id} display="flex" flexDirection="column" gap={1} mt={1} p={1} border={1} borderColor="divider" borderRadius={1}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Typography style={{ minWidth: 200 }}>{g.title}</Typography>
                      <Rating
                        max={5}
                        value={ratings[g.id] || 0}
                        onChange={(_, v) => setRatings(prev => ({ ...prev, [g.id]: v || 0 }))}
                      />
                    </Box>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder={i18next.t('progress.entryDetailsPlaceholder', 'Notes for this goal (optional)')}
                      value={goalDetails[g.id] || ''}
                      onChange={(e) => setGoalDetails(prev => ({ ...prev, [g.id]: e.target.value }))}
                    />
                  </Box>
                ))}
              </Box>
            )}
            {activeGoals.length === 0 && selectedSeasonId && (
              <Typography variant="body2" color="text.secondary">
                {i18next.t('progress.noGoals', 'No goals available for this season.')}
              </Typography>
            )}
            <Box display="flex" gap={1}>
              <Button type="submit" variant="contained" disabled={loading || !selectedSeasonId}>
                {i18next.t('common.create', 'Create')}
              </Button>
              <Button onClick={() => navigate('/progress')}>{i18next.t('common.cancel', 'Cancel')}</Button>
            </Box>
          </Box>
        </form>
      </Box>
    </Paper>
  );
}
