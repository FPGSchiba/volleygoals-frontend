import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { formatDateTime } from '../../utils/dateTime';
import { Avatar, Box, Button, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Paper, Rating, TextField, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { Controller, useForm } from 'react-hook-form';
import { useProgressReportStore } from '../../store/progressReports';
import { useGoalStore } from '../../store/goals';
import { useSeasonStore } from '../../store/seasons';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { usePermission } from '../../hooks/usePermission';
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
  const fetchSeasons = useSeasonStore((s) => s.fetchSeasons);
  const seasons = useSeasonStore((s) => s.seasonList.seasons);
  const selectedTeam = useCognitoUserStore((s) => s.selectedTeam);
  const currentUser = useCognitoUserStore((s) => s.user);
  const currentTeamSettings = useTeamStore((s) => s.currentTeamSettings);
  const getTeam = useTeamStore((s) => s.getTeam);
  const fetchTeamMembers = useTeamStore((s) => s.fetchTeamMembers);
  const teamMembers = useTeamStore((s) => s.teamMembers) || [];

  const canEdit = usePermission('progress_reports:write');
  const canDelete = usePermission('progress_reports:delete');

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

  const teamId = selectedTeam?.team?.id;

  React.useEffect(() => {
    if (teamId && (!seasons || seasons.length === 0)) {
      fetchSeasons(teamId, { teamId });
    }
  }, [teamId]);

  React.useEffect(() => {
    if (teamId) {
      getTeam(teamId).catch(() => {});
      fetchTeamMembers(teamId, { limit: 100 } as any).catch(() => {});
    }
  }, [teamId]);

  const resolveAuthor = (id: string): string => {
    if (currentUser?.id === id) return currentUser.name || currentUser.preferredUsername || currentUser.email || id;
    const member = teamMembers.find(m => m.id === id);
    return member?.name || member?.preferredUsername || member?.email || id;
  };

  const isAuthor = currentReport?.authorId === currentUser?.id;
  const canModify = isAuthor || canEdit;

  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editRatings, setEditRatings] = useState<Record<string, number>>({});
  const [editEntryDetails, setEditEntryDetails] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState(false);

  const toggleEntryExpand = (entryId: string) => {
    setExpandedEntries(prev => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  };

  const { control, handleSubmit, reset } = useForm<EditForm>({ defaultValues: { summary: '', details: '' } });

  const openEdit = () => {
    if (!currentReport) return;
    reset({ summary: currentReport.summary, details: currentReport.details });
    const ratingMap: Record<string, number> = {};
    const detailsMap: Record<string, string> = {};
    currentReport.progress?.forEach(p => {
      ratingMap[p.goalId] = p.rating;
      detailsMap[p.goalId] = p.details || '';
    });
    setEditRatings(ratingMap);
    setEditEntryDetails(detailsMap);
    setEditOpen(true);
  };

  const onEdit = async (data: EditForm) => {
    if (!currentReport || !seasonId) return;
    setActionLoading(true);
    try {
      const progress = Object.entries(editRatings)
        .filter(([, r]) => r > 0)
        .map(([goalId, rating]) => ({ goalId, rating, details: editEntryDetails[goalId] || '' }));
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
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/progress')}>
          {i18next.t('common.back', 'Back')}
        </Button>
        <Typography variant="h5" mt={1}>{i18next.t('progress.detailsTitle', 'Progress Report Details')}</Typography>

        <Box mt={2}>
          <Typography variant="h6">{currentReport.summary}</Typography>
          <Box display="flex" alignItems="center" gap={1} mt={1}>
            <Avatar src={(currentReport.authorPicture ?? undefined) || teamMembers.find(m => m.id === currentReport.authorId)?.picture || undefined} sx={{ width: 24, height: 24 }}>
              {(currentReport.authorName || resolveAuthor(currentReport.authorId))[0]}
            </Avatar>
            <Typography variant="body2">{currentReport.authorName || resolveAuthor(currentReport.authorId)}</Typography>
            <Typography variant="caption" color="text.secondary">{formatDateTime(currentReport.createdAt)}</Typography>
          </Box>
          {currentReport.details && (
            <Typography mt={1}>{currentReport.details}</Typography>
          )}
        </Box>

        {canModify && (
          <Box mt={2} display="flex" gap={1}>
            <Button variant="outlined" onClick={openEdit} disabled={actionLoading}>{i18next.t('progress.edit', 'Edit')}</Button>
            <Button variant="contained" color="error" onClick={() => setDeleteOpen(true)} disabled={actionLoading}>{i18next.t('progress.delete', 'Delete')}</Button>
          </Box>
        )}

        {/* Overall notes — visually distinct from per-goal entries */}
        {currentReport.overallDetails && (
          <Box mt={2} p={2} sx={{ borderLeft: 3, borderColor: 'primary.main', bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="subtitle2" color="primary" mb={0.5}>
              {i18next.t('progress.overallDetails', 'Overall Notes')}
            </Typography>
            <Typography variant="body2">{currentReport.overallDetails}</Typography>
          </Box>
        )}

        {/* Per-entry cards */}
        {(currentReport.progress ?? []).length > 0 && (
          <Box mt={3}>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>{i18next.t('progress.goalRatings', 'Goal Ratings')}</Typography>
            {(currentReport.progress ?? []).map((entry) => {
              const goal = goals.find(g => g.id === entry.goalId);
              const isExpanded = expandedEntries.has(entry.id);
              return (
                <Box key={entry.id} mb={1} border={1} borderColor="divider" borderRadius={1} overflow="hidden">
                  {/* Header row */}
                  <Box display="flex" alignItems="center" gap={1} px={2} py={1} sx={{ cursor: 'pointer' }} onClick={() => toggleEntryExpand(entry.id)}>
                    <Typography variant="body2" flex={1}>{goal?.title || entry.goalId}</Typography>
                    <Rating value={entry.rating} readOnly size="small" />
                    <Typography variant="caption" color="text.secondary">{entry.rating}/5</Typography>
                    <IconButton size="small">
                      {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                    </IconButton>
                  </Box>

                  {/* Collapsible body */}
                  <Collapse in={isExpanded}>
                    <Box px={2} pb={2}>
                      {entry.details && (
                        <Typography variant="body2" color="text.secondary" mb={1}>{entry.details}</Typography>
                      )}
                      <CommentSection
                        targetId={entry.id}
                        commentType={CommentType.ProgressEntry}
                        enabled={true}
                        allowFileUploads={currentTeamSettings?.allowFileUploads ?? false}
                        teamMembers={teamMembers as any}
                      />
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
          </Box>
        )}

        {/* Report-level comments */}
        <Box mt={4}>
          <CommentSection
            targetId={currentReport.id}
            commentType={CommentType.ProgressReport}
            enabled={true}
            allowFileUploads={currentTeamSettings?.allowFileUploads ?? false}
            teamMembers={teamMembers as any}
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
                    <Box key={g.id} display="flex" flexDirection="column" gap={0.5} mt={1.5}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Typography style={{ minWidth: 200 }}>{g.title}</Typography>
                        <Rating
                          max={5}
                          value={editRatings[g.id] || 0}
                          onChange={(_, v) => setEditRatings(prev => ({ ...prev, [g.id]: v || 0 }))}
                        />
                      </Box>
                      <TextField
                        size="small"
                        fullWidth
                        multiline
                        rows={2}
                        label={i18next.t('progress.entryDetails', 'Notes')}
                        value={editEntryDetails[g.id] || ''}
                        onChange={(e) => setEditEntryDetails(prev => ({ ...prev, [g.id]: e.target.value }))}
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
