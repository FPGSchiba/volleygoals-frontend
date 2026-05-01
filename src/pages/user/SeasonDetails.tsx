import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Controller, useForm } from 'react-hook-form';
import { useSeasonStore } from '../../store/seasons';
import { useGoalStore } from '../../store/goals';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { ISeason, SeasonStatus, RoleType } from '../../store/types';
import i18next from 'i18next';

type SeasonEditForm = { name: string; startDate: string; endDate: string; status: SeasonStatus | '' };

function statusBadgeClass(s: SeasonStatus) {
  if (s === SeasonStatus.Active) return 'vg-badge vg-badge--done';
  if (s === SeasonStatus.Planned) return 'vg-badge vg-badge--progress';
  return 'vg-badge vg-badge--muted';
}

export function SeasonDetails() {
  const { seasonId } = useParams<{ seasonId: string }>();
  const navigate = useNavigate();

  const getSeason = useSeasonStore(s => s.getSeason);
  const updateSeason = useSeasonStore(s => s.updateSeason);
  const seasons = useSeasonStore(s => s.seasonList.seasons);

  // Initialize from store list immediately (sync) so tests and fast renders work,
  // then refresh via getSeason in the background for fresh data.
  const [season, setSeason] = useState<ISeason | null>(
    () => seasons.find(s => s.id === seasonId) ?? null,
  );

  const selectedTeam = useCognitoUserStore(s => s.selectedTeam);
  const teamId = selectedTeam?.team?.id || '';
  const userRole = selectedTeam?.role;
  const canEdit = userRole === RoleType.Admin || userRole === RoleType.Trainer;

  const fetchGoals = useGoalStore(s => s.fetchGoals);
  const goals = useGoalStore(s => s.goalList.goals);
  const fetchSeasonGoals = useGoalStore(s => s.fetchSeasonGoals);
  const seasonGoals = useGoalStore(s => s.seasonGoals);
  const tagGoalToSeason = useGoalStore(s => s.tagGoalToSeason);
  const untagGoalFromSeason = useGoalStore(s => s.untagGoalFromSeason);

  useEffect(() => {
    if (seasonId) {
      getSeason(seasonId).then(res => { if (res) setSeason(res); });
    }
  }, [seasonId, getSeason]);

  useEffect(() => {
    if (teamId) fetchGoals(teamId, {});
  }, [teamId, fetchGoals]);

  useEffect(() => {
    if (teamId && seasonId) fetchSeasonGoals(teamId, seasonId);
  }, [teamId, seasonId, fetchSeasonGoals]);

  const handleUntag = async (goalId: string) => {
    if (!teamId || !seasonId) return;
    await untagGoalFromSeason(teamId, goalId, seasonId);
    fetchSeasonGoals(teamId, seasonId);
  };

  const [addGoalId, setAddGoalId] = useState('');
  const handleTag = async () => {
    if (!addGoalId || !teamId || !seasonId) return;
    await tagGoalToSeason(teamId, addGoalId, seasonId);
    fetchSeasonGoals(teamId, seasonId);
    setAddGoalId('');
  };

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { control, handleSubmit, reset } = useForm<SeasonEditForm>({
    defaultValues: { name: '', startDate: '', endDate: '', status: '' },
  });

  useEffect(() => {
    if (!season) return;
    reset({
      name: season.name || '',
      startDate: season.startDate?.substring(0, 10) ?? '',
      endDate: season.endDate?.substring(0, 10) ?? '',
      status: season.status || '',
    });
  }, [season, reset]);

  const onEdit = async (data: SeasonEditForm) => {
    if (!season || !canEdit) return;
    setSaving(true);
    try {
      await updateSeason(
        season.id,
        data.name,
        data.startDate ? new Date(data.startDate).toISOString() : undefined,
        data.endDate ? new Date(data.endDate).toISOString() : undefined,
        (data.status as SeasonStatus) || undefined,
      );
      const refreshed = await getSeason(season.id);
      if (refreshed) setSeason(refreshed);
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const untaggedGoals = goals.filter(g => !seasonGoals.some(sg => sg.id === g.id));

  if (!season) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>{i18next.t('common.loading', 'Loading…')}</Typography>
      </Box>
    );
  }

  return (
    <Box className="season-details-page" sx={{ p: { xs: 2, sm: 3 } }}>
      <button className="vg-back-nav" onClick={() => navigate('/seasons')}>
        ← {i18next.t('seasonDetails.backToSeasons', 'Back to Seasons')}
      </button>

      <div className="season-details-header">
        <div>
          <div className="vg-eyebrow">{i18next.t('seasonDetails.eyebrow', 'Season')}</div>
          <div className="vg-page-title">{season.name}</div>
        </div>
        {canEdit && (
          <button className="season-details-edit-btn" onClick={() => setEditOpen(true)}>
            {i18next.t('common.edit', 'Edit Season')}
          </button>
        )}
      </div>

      <div className="vg-two-col">
        {/* Left — goals panel */}
        <div>
          <div className="vg-panel">
            <div className="vg-panel-title">{i18next.t('seasonDetails.associatedGoals', 'Goals in this Season')}</div>

            {seasonGoals.map(g => (
              <div key={g.id} className="season-details-goal-row">
                <div>
                  <div className="season-details-goal-name">{g.title}</div>
                  <div className="season-details-goal-meta">{g.goalType} · {g.status}</div>
                </div>
                {canEdit && (
                  <button
                    className="season-details-remove-btn"
                    onClick={() => handleUntag(g.id)}
                    title={i18next.t('seasonDetails.removeGoal', 'Remove')}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}

            {seasonGoals.length === 0 && (
              <Typography sx={{ fontSize: 12, color: 'var(--vg-text-muted)', py: 2 }}>
                {i18next.t('seasonDetails.noGoals', 'No goals tagged to this season yet.')}
              </Typography>
            )}

            {canEdit && (
              <div className="season-details-add-row">
                <select
                  className="season-details-add-select"
                  value={addGoalId}
                  onChange={e => setAddGoalId(e.target.value)}
                  disabled={untaggedGoals.length === 0}
                >
                  <option value="">{i18next.t('seasonDetails.addGoalPlaceholder', 'Add a goal to this season…')}</option>
                  {untaggedGoals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
                <button className="season-details-add-btn" onClick={handleTag} disabled={!addGoalId}>
                  + {i18next.t('common.add', 'Add')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right — meta panel */}
        <div>
          <div className="vg-panel">
            <div className="vg-panel-title">{i18next.t('seasonDetails.info', 'Season Info')}</div>
            <div className="vg-meta-row">
              <span className="vg-meta-label">{i18next.t('user.seasons.form.status', 'Status')}</span>
              <span className="vg-meta-value">
                <span className={statusBadgeClass(season.status)}>{season.status}</span>
              </span>
            </div>
            <div className="vg-meta-row">
              <span className="vg-meta-label">{i18next.t('user.seasons.form.startDate', 'Start')}</span>
              <span className="vg-meta-value">
                {season.startDate
                  ? new Date(season.startDate).toLocaleDateString(i18next.language || undefined)
                  : '—'}
              </span>
            </div>
            <div className="vg-meta-row">
              <span className="vg-meta-label">{i18next.t('user.seasons.form.endDate', 'End')}</span>
              <span className="vg-meta-value">
                {season.endDate
                  ? new Date(season.endDate).toLocaleDateString(i18next.language || undefined)
                  : '—'}
              </span>
            </div>
            <div className="vg-meta-row">
              <span className="vg-meta-label">{i18next.t('seasonDetails.goalCount', 'Goals')}</span>
              <span className="vg-meta-value">{seasonGoals.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ className: 'vg-dialog-paper' }}
      >
        <DialogTitle sx={{ fontSize: 15, fontWeight: 800, borderBottom: '1px solid var(--vg-border)', pb: 1.5 }}>
          {i18next.t('seasonDetails.editTitle', 'Edit Season')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Controller
              name="name"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <TextField
                  fullWidth
                  size="small"
                  label={i18next.t('user.seasons.form.name', 'Name')}
                  {...field}
                />
              )}
            />
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <TextField
                  select
                  fullWidth
                  size="small"
                  label={i18next.t('user.seasons.form.status', 'Status')}
                  {...field}
                >
                  <MenuItem value={SeasonStatus.Planned}>{i18next.t('user.seasons.status.planned', 'Planned')}</MenuItem>
                  <MenuItem value={SeasonStatus.Active}>{i18next.t('user.seasons.status.active', 'Active')}</MenuItem>
                  <MenuItem value={SeasonStatus.Completed}>{i18next.t('user.seasons.status.completed', 'Completed')}</MenuItem>
                  <MenuItem value={SeasonStatus.Archived}>{i18next.t('user.seasons.status.archived', 'Archived')}</MenuItem>
                </TextField>
              )}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Controller
                name="startDate"
                control={control}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    type="date"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    label={i18next.t('user.seasons.form.startDate', 'Start Date')}
                    {...field}
                  />
                )}
              />
              <Controller
                name="endDate"
                control={control}
                render={({ field }) => (
                  <TextField
                    fullWidth
                    type="date"
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    label={i18next.t('user.seasons.form.endDate', 'End Date')}
                    {...field}
                  />
                )}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid var(--vg-border)', px: 2.5, py: 1.5 }}>
          <button className="vg-chip" onClick={() => setEditOpen(false)}>
            {i18next.t('common.cancel', 'Cancel')}
          </button>
          <button
            className="vg-chip vg-chip--active"
            onClick={handleSubmit(onEdit)}
            disabled={saving}
            style={{ height: 30, borderRadius: 7, padding: '0 14px' }}
          >
            {i18next.t('common.save', 'Save')}
          </button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
