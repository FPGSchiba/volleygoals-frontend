import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Rating, TextField, Typography } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { useProgressReportStore } from '../../store/progressReports';
import { useGoalStore } from '../../store/goals';
import { useSeasonStore } from '../../store/seasons';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { useTeamStore } from '../../store/teams';
import { CommentType, GoalStatus } from '../../store/types';
import { CommentSection } from '../../components/CommentSection';
import i18next from 'i18next';

type EditForm = { summary: string; details: string; };

export function ProgressDetails() {
  const { progressId } = useParams<{ progressId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const currentReport = useProgressReportStore((s) => s.currentReport);
  const getReport = useProgressReportStore((s) => s.getReport);
  const updateReport = useProgressReportStore((s) => s.updateReport);
  const deleteReport = useProgressReportStore((s) => s.deleteReport);

  const fetchGoals = useGoalStore((s) => s.fetchGoals);
  const goals = useGoalStore((s) => s.goalList.goals);
  const seasons = useSeasonStore((s) => s.seasonList.seasons);
  const selectedTeam = useCognitoUserStore((s) => s.selectedTeam);
  const currentUser = useCognitoUserStore((s) => s.user);
  const currentTeamSettings = useTeamStore((s) => s.currentTeamSettings);
  const getTeam = useTeamStore((s) => s.getTeam);
  const fetchTeamMembers = useTeamStore((s) => s.fetchTeamMembers);
  const teamMembers = useTeamStore((s) => s.teamMembers) || [];

  const userRole = selectedTeam?.role as string | undefined;
  const canEdit = userRole === 'admin' || userRole === 'trainer';

  const seasonId = currentReport?.seasonId
    || location.state?.seasonId
    || (seasons && seasons.length > 0
      ? [...seasons].sort((a, b) =>
          new Date(b.startDate || b.createdAt).getTime() - new Date(a.startDate || a.createdAt).getTime()
        )[0]?.id
      : undefined);

  React.useEffect(() => {
    if (progressId && seasonId && (!currentReport || currentReport.id !== progressId)) {
      getReport(seasonId, progressId);
    }
  }, [progressId, seasonId]);

  React.useEffect(() => {
    if (seasonId) fetchGoals(seasonId, {});
  }, [seasonId]);

  React.useEffect(() => {
    if (selectedTeam?.team?.id) {
      getTeam(selectedTeam.team.id);
      fetchTeamMembers(selectedTeam.team.id);
    }
  }, [selectedTeam?.team?.id]);

  const resolveAuthor = (id: string): string => {
    const member = teamMembers.find(m => m.id === id);
    return member?.name || member?.preferredUsername || member?.email || id;
  };

  const isAuthor = currentReport?.authorId === currentUser?.id;
  const canModify = isAuthor || canEdit;

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editRatings, setEditRatings] = useState<Record<string, number>>({});
  const [actionLoading, setActionLoading] = useState(false);

  const { control, handleSubmit, reset } = useForm<EditForm>({ defaultValues: { summary: '', details: '' } });

  const openEdit = () => {
    if (!currentReport) return;
    reset({ summary: currentReport.summary, details: currentReport.details });
    const ratingMap: Record<string, number> = {};
    currentReport.progress?.forEach(p => { ratingMap[p.goalId] = p.rating; });
    setEditRatings(ratingMap);
    setEditOpen(true);
  };

  const onEdit = async (data: EditForm) => {
    if (!currentReport || !seasonId) return;
    setActionLoading(true);
    try {
      const progress = Object.entries(editRatings)
        .filter(([, r]) => r > 0)
        .map(([goalId, rating]) => ({ goalId, rating }));
      await updateReport(seasonId, currentReport.id, { summary: data.summary, details: data.details, progress });
      setEditOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const onDelete = async () => {
    if (!currentReport || !seasonId) return;
    setActionLoading(true);
    try {
      await deleteReport(seasonId, currentReport.id);
      navigate('/progress');
    } finally {
      setActionLoading(false);
    }
  };

  if (!currentReport) {
    return (
      <Paper>
        <Box p={2}>
          <Typography variant="h5">{i18next.t('progress.detailsTitle', 'Progress Report Details')}</Typography>
          <Typography>Loading...</Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper>
      <Box p={2}>
        <Typography variant="h5">{i18next.t('progress.detailsTitle', 'Progress Report Details')}</Typography>
        <Box mt={2}>
          <Typography variant="h6">{currentReport.summary}</Typography>
          <Typography variant="body2" mt={1}>{i18next.t('progress.author', 'Author')}: {resolveAuthor(currentReport.authorId)}</Typography>
          <Typography variant="body2">{new Date(currentReport.createdAt).toLocaleString()}</Typography>
          <Typography mt={2}>{currentReport.details}</Typography>
        </Box>

        {currentReport.progress && currentReport.progress.length > 0 && (
          <Box mt={2}>
            <Typography variant="subtitle1">{i18next.t('progress.goalRatings', 'Goal Ratings')}</Typography>
            {currentReport.progress.map((entry) => {
              const goal = goals.find(g => g.id === entry.goalId);
              return (
                <Box key={entry.id} display="flex" alignItems="center" gap={2} mt={1}>
                  <Typography style={{ minWidth: 200 }}>{goal?.title || entry.goalId}</Typography>
                  <Rating value={entry.rating} readOnly />
                </Box>
              );
            })}
          </Box>
        )}

        {canModify && (
          <Box mt={2} display="flex" gap={1}>
            <Button variant="outlined" onClick={openEdit} disabled={actionLoading}>{i18next.t('progress.edit', 'Edit')}</Button>
            <Button variant="contained" color="error" onClick={() => setDeleteOpen(true)} disabled={actionLoading}>{i18next.t('progress.delete', 'Delete')}</Button>
          </Box>
        )}

        <Box mt={4}>
          <CommentSection
            targetId={currentReport.id}
            commentType={CommentType.ProgressReport}
            enabled={true}
            allowFileUploads={currentTeamSettings?.allowFileUploads}
          />
        </Box>
      </Box>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{i18next.t('progress.detailsTitle', 'Edit Progress Report')}</DialogTitle>
        <DialogContent>
          <form id="progress-edit-form" onSubmit={handleSubmit(onEdit)}>
            <Box mt={1} display="flex" flexDirection="column" gap={2}>
              <Controller name="summary" control={control} rules={{ required: true }} render={({ field }) => (
                <TextField fullWidth label={i18next.t('progress.summary', 'Summary')} {...field} />
              )} />
              <Controller name="details" control={control} rules={{ required: true }} render={({ field }) => (
                <TextField fullWidth multiline rows={4} label={i18next.t('progress.details', 'Details')} {...field} />
              )} />
              {goals.length > 0 && (
                <Box>
                  <Typography variant="subtitle2">{i18next.t('progress.goalRatings', 'Goal Ratings')}</Typography>
                  {goals.filter(g => g.status === GoalStatus.Open || g.status === GoalStatus.InProgress).map((g) => (
                    <Box key={g.id} display="flex" alignItems="center" gap={2} mt={1}>
                      <Typography style={{ minWidth: 200 }}>{g.title}</Typography>
                      <Rating
                        max={5}
                        value={editRatings[g.id] || 0}
                        onChange={(_, v) => setEditRatings(prev => ({ ...prev, [g.id]: v || 0 }))}
                      />
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>{i18next.t('common.cancel', 'Cancel')}</Button>
          <Button type="submit" form="progress-edit-form" variant="contained" disabled={actionLoading}>{i18next.t('common.save', 'Save')}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>{i18next.t('progress.delete', 'Delete')}</DialogTitle>
        <DialogContent>
          <Typography>{i18next.t('progress.deleteConfirm', 'Are you sure you want to delete this progress report?')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>{i18next.t('common.cancel', 'Cancel')}</Button>
          <Button variant="contained" color="error" onClick={onDelete} disabled={actionLoading}>{i18next.t('progress.delete', 'Delete')}</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
