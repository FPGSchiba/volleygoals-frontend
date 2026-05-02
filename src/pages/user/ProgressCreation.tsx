import React, { useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useProgressReportStore } from '../../store/progressReports';
import { useGoalStore } from '../../store/goals';
import { useSeasonStore } from '../../store/seasons';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { GoalStatus, ISeason } from '../../store/types';
import { HEATMAP_RATING_COLORS } from '../../utils/chartUtils';
import i18next from 'i18next';

type ProgressForm = { summary: string; details: string };

export function ProgressCreation() {
  const navigate = useNavigate();
  const createReport = useProgressReportStore(s => s.createReport);
  const fetchGoals = useGoalStore(s => s.fetchGoals);
  const goals = useGoalStore(s => s.goalList.goals);
  const fetchSeasons = useSeasonStore(s => s.fetchSeasons);
  const seasons = useSeasonStore(s => s.seasonList.seasons) || [] as ISeason[];
  const selectedTeam = useCognitoUserStore(s => s.selectedTeam);
  const teamId = selectedTeam?.team?.id || '';

  const [selectedSeasonId, setSelectedSeasonId] = React.useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [goalNotes, setGoalNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (teamId) {
      fetchSeasons(teamId, { teamId });
      fetchGoals(teamId, {});
    }
  }, [teamId, fetchSeasons, fetchGoals]);

  React.useEffect(() => {
    if (!seasons || seasons.length === 0) { setSelectedSeasonId(null); return; }
    const sorted = [...seasons].sort((a, b) =>
      new Date(b.startDate || b.createdAt || '').getTime() - new Date(a.startDate || a.createdAt || '').getTime()
    );
    setSelectedSeasonId(prev => prev || sorted[0]?.id || null);
  }, [seasons]);

  const activeGoals = goals.filter(g => g.status === GoalStatus.Open || g.status === GoalStatus.InProgress);

  const { control, handleSubmit } = useForm<ProgressForm>({ defaultValues: { summary: '', details: '' } });

  const onSubmit = async (data: ProgressForm) => {
    if (!selectedSeasonId) return;
    setLoading(true);
    try {
      const progress = Object.entries(ratings)
        .filter(([, r]) => r > 0)
        .map(([goalId, rating]) => ({ goalId, rating, details: goalNotes[goalId] || undefined }));
      const report = await createReport(selectedSeasonId, data.summary, data.details, progress);
      if (report) navigate('/progress');
    } finally {
      setLoading(false);
    }
  };

  const setRating = (goalId: string, rating: number) =>
    setRatings(prev => ({ ...prev, [goalId]: prev[goalId] === rating ? 0 : rating }));

  return (
    <Box className="progress-creation-page" sx={{ p: { xs: 2, sm: 3 } }}>
      <div className="progress-creation-header">
        <div>
          <div className="vg-eyebrow">{i18next.t('progress.eyebrow', 'Progress')}</div>
          <div className="vg-page-title">{i18next.t('progress.createTitle', 'New Report')}</div>
        </div>
      </div>

      {seasons.length > 0 && (
        <div className="vg-chip-row" style={{ marginBottom: 16 }}>
          {seasons.map(s => (
            <button
              key={s.id}
              className={`vg-chip${selectedSeasonId === s.id ? ' vg-chip--active' : ''}`}
              onClick={() => setSelectedSeasonId(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="vg-panel" style={{ marginBottom: 12 }}>
          <div className="vg-panel-title">{i18next.t('progress.reportPanel', 'Report')}</div>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Controller name="summary" control={control} rules={{ required: true }} render={({ field, fieldState }) => (
              <TextField fullWidth size="small" label={i18next.t('progress.summary', 'Summary')}
                error={!!fieldState.error} {...field} />
            )} />
            <Controller name="details" control={control} render={({ field }) => (
              <TextField fullWidth multiline rows={3} size="small"
                label={i18next.t('progress.details', 'Session Notes')} {...field} />
            )} />
          </Box>
        </div>

        {activeGoals.length > 0 && (
          <div className="vg-panel" style={{ marginBottom: 12 }}>
            <div className="vg-panel-title">{i18next.t('progress.goalRatings', 'Goal Ratings')}</div>
            {activeGoals.map(g => (
              <div key={g.id} className="progress-creation-goal-row">
                <div className="progress-creation-goal-title">{g.title}</div>
                <div className="progress-creation-rating-row">
                  {([1, 2, 3, 4, 5] as const).map(r => {
                    const selected = ratings[g.id] === r;
                    const colors = HEATMAP_RATING_COLORS[r];
                    return (
                      <button
                        key={r}
                        type="button"
                        className="progress-creation-rating-cell"
                        aria-label={`rating cell ${r}`}
                        aria-pressed={selected}
                        onClick={() => setRating(g.id, r)}
                        style={selected ? { background: colors.bg, color: colors.text } : undefined}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
                <textarea
                  className="progress-creation-notes"
                  placeholder={i18next.t('progress.entryDetailsPlaceholder', 'Notes for this goal (optional)')}
                  value={goalNotes[g.id] || ''}
                  onChange={e => setGoalNotes(prev => ({ ...prev, [g.id]: e.target.value }))}
                  rows={1}
                />
              </div>
            ))}
          </div>
        )}

        {activeGoals.length === 0 && selectedSeasonId && (
          <Typography sx={{ fontSize: 12, color: 'var(--vg-text-muted)', py: 3 }}>
            {i18next.t('progress.noGoals', 'No active goals available.')}
          </Typography>
        )}

        <div className="progress-creation-actions">
          <button type="button" className="vg-chip" onClick={() => navigate('/progress')}>
            {i18next.t('common.cancel', 'Cancel')}
          </button>
          <button type="submit" className="vg-chip vg-chip--active" disabled={loading || !selectedSeasonId}
            style={{ height: 34, borderRadius: 8, padding: '0 18px' }}>
            {i18next.t('progress.submit', 'Submit Report')}
          </button>
        </div>
      </form>
    </Box>
  );
}
