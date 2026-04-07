import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, TextField, MenuItem, IconButton, Chip, Button } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useSeasonStore } from '../../store/seasons';
import { useGoalStore } from '../../store/goals';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { ISeason, SeasonStatus, RoleType } from '../../store/types';
import i18next from 'i18next';

export function SeasonDetails() {
  const { seasonId } = useParams<{ seasonId: string }>();
  const navigate = useNavigate();

  const getSeason = useSeasonStore((s) => s.getSeason);
  const updateSeason = useSeasonStore((s) => s.updateSeason);
  const [season, setSeason] = useState<ISeason | null>(null);

  const selectedTeam = useCognitoUserStore((s) => s.selectedTeam);
  const teamId = selectedTeam?.team?.id || '';

  const fetchGoals = useGoalStore((s) => s.fetchGoals);
  const goals = useGoalStore((s) => s.goalList.goals);

  const tagGoalToSeason = useGoalStore((s) => s.tagGoalToSeason);
  const untagGoalFromSeason = useGoalStore((s) => s.untagGoalFromSeason);

  const userRole = selectedTeam?.role;
  const canEdit = userRole === RoleType.Admin || userRole === RoleType.Trainer;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftStartDate, setDraftStartDate] = useState('');
  const [draftEndDate, setDraftEndDate] = useState('');
  const [draftStatus, setDraftStatus] = useState<SeasonStatus | ''>('');

  useEffect(() => {
    if (seasonId) {
      setLoading(true);
      getSeason(seasonId).then((res) => {
        setSeason(res);
        setLoading(false);
      });
    }
  }, [seasonId]);

  useEffect(() => {
    if (teamId) {
      fetchGoals(teamId, {});
    }
  }, [teamId]);

  const fetchSeasonGoals = useGoalStore((s) => s.fetchSeasonGoals);
  const seasonGoals = useGoalStore((s) => s.seasonGoals);

  useEffect(() => {
    if (teamId && seasonId) {
      fetchSeasonGoals(teamId, seasonId);
    }
  }, [teamId, seasonId, goals]);

  const handleTag = async (goalId: string) => {
    if (!teamId || !seasonId || !goalId) return;
    await tagGoalToSeason(teamId, goalId, seasonId);
    fetchSeasonGoals(teamId, seasonId);
  };

  const handleUntag = async (goalId: string) => {
    if (!teamId || !seasonId) return;
    await untagGoalFromSeason(teamId, goalId, seasonId);
    fetchSeasonGoals(teamId, seasonId);
  };

  const handleSaveSeason = async () => {
    if (!season || !canEdit) return;
    setSaving(true);
    try {
      await updateSeason(
        season.id,
        draftName,
        draftStartDate ? new Date(draftStartDate).toISOString() : undefined,
        draftEndDate ? new Date(draftEndDate).toISOString() : undefined,
        (draftStatus as SeasonStatus) || undefined,
      );
      const refreshed = await getSeason(season.id);
      if (refreshed) setSeason(refreshed);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!season) return;
    setDraftName(season.name || '');
    setDraftStartDate(season.startDate ? season.startDate.substring(0, 10) : '');
    setDraftEndDate(season.endDate ? season.endDate.substring(0, 10) : '');
    setDraftStatus(season.status || '');
  }, [season]);

  if (loading || !season) {
    return (
      <Paper>
        <Box p={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton onClick={() => navigate('/seasons')} size="small">
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h5">{i18next.t('seasonDetails.title', 'Season Details')}</Typography>
          </Box>
          <Typography mt={2}>Loading...</Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper>
      <Box p={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <IconButton onClick={() => navigate('/seasons')} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5">{i18next.t('seasonDetails.title', 'Season Details')}</Typography>
        </Box>
        <Box mt={2} display="flex" flexDirection="column" gap={2}>
          <TextField
            fullWidth
            label={i18next.t('user.seasons.form.name', 'Name')}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            disabled={!canEdit || saving}
          />
          <Box display="flex" gap={1}>
            <TextField
              select
              size="small"
              label={i18next.t('user.seasons.form.status', 'Status')}
              value={draftStatus}
              onChange={(e) => setDraftStatus(e.target.value as SeasonStatus)}
              disabled={!canEdit || saving}
            >
              <MenuItem value={SeasonStatus.Planned}>{i18next.t('user.seasons.status.planned','Planned')}</MenuItem>
              <MenuItem value={SeasonStatus.Active}>{i18next.t('user.seasons.status.active','Active')}</MenuItem>
              <MenuItem value={SeasonStatus.Completed}>{i18next.t('user.seasons.status.completed','Completed')}</MenuItem>
              <MenuItem value={SeasonStatus.Archived}>{i18next.t('user.seasons.status.archived','Archived')}</MenuItem>
            </TextField>
            <Chip
              label={season.status}
              color={
                season.status === SeasonStatus.Active
                  ? 'success'
                  : season.status === SeasonStatus.Planned
                    ? 'primary'
                    : 'default'
              }
            />
          </Box>
          <Box display="flex" gap={2}>
            <TextField
              fullWidth
              type="date"
              label={i18next.t('user.seasons.form.startDate', 'Start Date')}
              InputLabelProps={{ shrink: true }}
              value={draftStartDate}
              onChange={(e) => setDraftStartDate(e.target.value)}
              disabled={!canEdit || saving}
            />
            <TextField
              fullWidth
              type="date"
              label={i18next.t('user.seasons.form.endDate', 'End Date')}
              InputLabelProps={{ shrink: true }}
              value={draftEndDate}
              onChange={(e) => setDraftEndDate(e.target.value)}
              disabled={!canEdit || saving}
            />
          </Box>
        </Box>

        {canEdit && (
          <Box mt={2}>
            <Button variant="contained" onClick={handleSaveSeason} disabled={saving}>
              {i18next.t('common.save', 'Save')}
            </Button>
          </Box>
        )}

        <Box mt={4}>
          <Typography variant="subtitle1">Associated Goals</Typography>
          {seasonGoals.map(g => (
            <Box key={g.id} display="flex" alignItems="center" gap={1} mt={0.5}>
              <Typography variant="body2">{g.title}</Typography>
              {canEdit && (
                <IconButton size="small" onClick={() => handleUntag(g.id)}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          ))}
          {canEdit && (
            <Box mt={2} maxWidth={300}>
              <TextField
                select
                size="small"
                fullWidth
                label="Tag goal to this season"
                value=""
                onChange={(e) => { if (e.target.value) handleTag(e.target.value); }}
              >
                {goals
                  .filter(g => !seasonGoals.some(sg => sg.id === g.id))
                  .map(g => <MenuItem key={g.id} value={g.id}>{g.title}</MenuItem>)}
              </TextField>
            </Box>
          )}
        </Box>
      </Box>
    </Paper>
  );
}
