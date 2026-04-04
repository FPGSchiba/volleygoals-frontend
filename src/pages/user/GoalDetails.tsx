import React, { useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Paper, TextField, Typography } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import { Controller, useForm } from 'react-hook-form';
import { useGoalStore } from '../../store/goals';
import { useSeasonStore } from '../../store/seasons';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { usePermission } from '../../hooks/usePermission';
import { useTeamStore } from '../../store/teams';
import { CommentType, GoalStatus, GoalType } from '../../store/types';
import { CommentSection } from '../../components/CommentSection';
import i18next from 'i18next';

type EditForm = { title: string; description: string; status: GoalStatus | ''; ownerId: string; };

export function GoalDetails() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const currentGoal = useGoalStore((s) => s.currentGoal);
  const getGoal = useGoalStore((s) => s.getGoal);
  const updateGoal = useGoalStore((s) => s.updateGoal);
  const deleteGoal = useGoalStore((s) => s.deleteGoal);
  const fetchGoalSeasons = useGoalStore((s) => s.fetchGoalSeasons);
  const goalSeasons = useGoalStore((s) => s.goalSeasons);
  const tagGoalToSeason = useGoalStore((s) => s.tagGoalToSeason);
  const untagGoalFromSeason = useGoalStore((s) => s.untagGoalFromSeason);

  const seasons = useSeasonStore((s) => s.seasonList.seasons);
  const fetchSeasons = useSeasonStore((s) => s.fetchSeasons);
  const selectedTeam = useCognitoUserStore((s) => s.selectedTeam);
  const currentUser = useCognitoUserStore((s) => s.user);
  const getTeam = useTeamStore((s) => s.getTeam);
  const currentTeamSettings = useTeamStore((s) => s.currentTeamSettings);

  const teamId = selectedTeam?.team?.id || '';
  const canWrite = usePermission('goals:write');
  const canDelete = usePermission('goals:delete');

  React.useEffect(() => {
    if (teamId) fetchSeasons(teamId, { teamId });
  }, [teamId]);

  React.useEffect(() => {
    if (goalId && teamId) {
      getGoal(teamId, goalId);
      fetchGoalSeasons(teamId, goalId);
    }
  }, [goalId, teamId]);

  React.useEffect(() => {
    if (teamId) getTeam(teamId).catch(() => {});
  }, [teamId]);

  const isOwner = currentGoal?.ownerId === currentUser?.id;
  const canModify = isOwner || canWrite;

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const { control, handleSubmit, reset } = useForm<EditForm>({
    defaultValues: { title: '', description: '', status: '', ownerId: '' }
  });

  const openEdit = () => {
    if (!currentGoal) return;
    reset({ title: currentGoal.title, description: currentGoal.description, status: currentGoal.status, ownerId: currentGoal.ownerId });
    setEditOpen(true);
  };

  const onEdit = async (data: EditForm) => {
    if (!currentGoal || !teamId) return;
    setActionLoading(true);
    try {
      await updateGoal(teamId, currentGoal.id, data.title || undefined, data.description || undefined, (data.status as GoalStatus) || undefined, data.ownerId || undefined);
      setEditOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const onDelete = async () => {
    if (!currentGoal || !teamId) return;
    setActionLoading(true);
    try {
      await deleteGoal(teamId, currentGoal.id);
      navigate('/goals');
    } finally {
      setActionLoading(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handlePictureUpload = async (_file: File) => {
    // NOTE: uploadGoalAvatar API method not yet available; picture upload is a no-op
    setActionLoading(false);
  };

  if (!currentGoal) {
    return (
      <Paper>
        <Box p={2}>
          <Typography variant="h5">{i18next.t('goalDetails.title', 'Goal Details')}</Typography>
          <Typography>Loading...</Typography>
        </Box>
      </Paper>
    );
  }

  const settings = currentTeamSettings;
  const commentsEnabled = currentGoal.goalType === GoalType.Team
    ? (settings?.allowTeamGoalComments ?? false)
    : (settings?.allowIndividualGoalComments ?? false);

  return (
    <Paper>
      <Box p={2}>
        <Typography variant="h5">{i18next.t('goalDetails.title', 'Goal Details')}</Typography>
        <Box mt={2}>
          <Typography variant="h6">{currentGoal.title}</Typography>
          <Box display="flex" gap={1} mt={1}>
            <Chip label={currentGoal.goalType} />
            <Chip
              label={currentGoal.status}
              color={currentGoal.status === GoalStatus.Completed ? 'success' : currentGoal.status === GoalStatus.InProgress ? 'primary' : 'default'}
            />
          </Box>
          <Typography mt={1}>{currentGoal.description}</Typography>
          <Typography variant="body2" mt={1}>{i18next.t('goalDetails.owner', 'Owner')}: {currentGoal.ownerId}</Typography>
          {currentGoal.picture && (
            <Box mt={1}>
              <img src={currentGoal.picture} alt="goal" style={{ maxWidth: 200, maxHeight: 200 }} />
            </Box>
          )}
        </Box>

        {canModify && (
          <Box mt={2} display="flex" gap={1} flexWrap="wrap">
            <Button variant="outlined" onClick={() => fileInputRef.current?.click()} disabled={actionLoading}>
              {i18next.t('goalDetails.uploadPicture', 'Upload Picture')}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePictureUpload(f); }}
            />
            <Button variant="outlined" onClick={openEdit} disabled={actionLoading}>
              {i18next.t('goalDetails.editGoal', 'Edit Goal')}
            </Button>
            <Button variant="contained" color="error" onClick={() => setDeleteOpen(true)} disabled={actionLoading}>
              {i18next.t('goalDetails.deleteGoal', 'Delete Goal')}
            </Button>
          </Box>
        )}

        <Box mt={2}>
          <Typography variant="subtitle1">Seasons</Typography>
          {goalSeasons.map(tag => {
            const season = seasons.find(s => s.id === tag.seasonId);
            return (
              <Box key={tag.seasonId} display="flex" alignItems="center" gap={1}>
                <Typography variant="body2">{season?.name ?? tag.seasonId}</Typography>
                {canWrite && (
                  <IconButton size="small" onClick={() => untagGoalFromSeason(teamId, goalId!, tag.seasonId)}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            );
          })}
          {canWrite && (
            <Box mt={1}>
              <TextField
                select
                size="small"
                label="Tag to season"
                value=""
                onChange={(e) => { if (e.target.value) tagGoalToSeason(teamId, goalId!, e.target.value); }}
              >
                {seasons
                  .filter(s => !goalSeasons.some(t => t.seasonId === s.id))
                  .map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)
                }
              </TextField>
            </Box>
          )}
        </Box>

        <Box mt={4}>
          <CommentSection
            targetId={currentGoal.id}
            commentType={CommentType.Goal}
            enabled={commentsEnabled}
            allowFileUploads={settings?.allowFileUploads}
          />
        </Box>
      </Box>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{i18next.t('goalDetails.editGoal', 'Edit Goal')}</DialogTitle>
        <DialogContent>
          <form id="goal-edit-form" onSubmit={handleSubmit(onEdit)}>
            <Box mt={1} display="flex" flexDirection="column" gap={2}>
              <Controller name="title" control={control} rules={{ required: true }} render={({ field }) => (
                <TextField fullWidth label={i18next.t('user.goals.form.title', 'Title')} {...field} />
              )} />
              <Controller name="description" control={control} render={({ field }) => (
                <TextField fullWidth multiline rows={4} label={i18next.t('user.goals.form.description', 'Description')} {...field} />
              )} />
              <Controller name="status" control={control} render={({ field }) => (
                <TextField select fullWidth label={i18next.t('goalDetails.status', 'Status')} {...field}>
                  <MenuItem value={GoalStatus.Open}>{i18next.t('user.goals.status.open', 'Open')}</MenuItem>
                  <MenuItem value={GoalStatus.InProgress}>{i18next.t('user.goals.status.inProgress', 'In Progress')}</MenuItem>
                  <MenuItem value={GoalStatus.Completed}>{i18next.t('user.goals.status.completed', 'Completed')}</MenuItem>
                  <MenuItem value={GoalStatus.Archived}>{i18next.t('user.goals.status.archived', 'Archived')}</MenuItem>
                </TextField>
              )} />
              <Controller name="ownerId" control={control} render={({ field }) => (
                <TextField fullWidth label={i18next.t('goalDetails.owner', 'Owner')} {...field} />
              )} />
            </Box>
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>{i18next.t('common.cancel', 'Cancel')}</Button>
          <Button type="submit" form="goal-edit-form" variant="contained" disabled={actionLoading}>
            {i18next.t('goalDetails.saveGoal', 'Save')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>{i18next.t('goalDetails.deleteGoal', 'Delete Goal')}</DialogTitle>
        <DialogContent>
          <Typography>{i18next.t('goalDetails.deleteConfirm', 'Are you sure you want to delete this goal?')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>{i18next.t('common.cancel', 'Cancel')}</Button>
          <Button variant="contained" color="error" onClick={onDelete} disabled={actionLoading}>
            {i18next.t('common.delete', 'Delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
