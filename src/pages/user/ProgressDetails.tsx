import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Controller, useForm } from 'react-hook-form';
import { useProgressReportStore } from '../../store/progressReports';
import { useGoalStore } from '../../store/goals';
import { useSeasonStore } from '../../store/seasons';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { usePermission } from '../../hooks/usePermission';
import { useTeamStore } from '../../store/teams';
import { CommentType } from '../../store/types';
import { CommentSection } from '../../components/CommentSection';
import { UserDisplay } from '../../components/UserDisplay';
import { HEATMAP_RATING_COLORS } from '../../utils/chartUtils';
import { formatDateTime } from '../../utils/dateTime';
import i18next from 'i18next';

type EditForm = { summary: string; details: string };

export function ProgressDetails() {
  const { progressId } = useParams<{ progressId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const currentReport = useProgressReportStore(s => s.currentReport);
  const getReport = useProgressReportStore(s => s.getReport);
  const updateReport = useProgressReportStore(s => s.updateReport);
  const deleteReport = useProgressReportStore(s => s.deleteReport);

  const fetchGoals = useGoalStore(s => s.fetchGoals);
  const goals = useGoalStore(s => s.goalList.goals);
  const fetchSeasons = useSeasonStore(s => s.fetchSeasons);
  const seasons = useSeasonStore(s => s.seasonList.seasons);
  const selectedTeam = useCognitoUserStore(s => s.selectedTeam);
  const currentUser = useCognitoUserStore(s => s.user);
  const currentTeamSettings = useTeamStore(s => s.currentTeamSettings);
  const getTeam = useTeamStore(s => s.getTeam);
  const fetchTeamMembers = useTeamStore(s => s.fetchTeamMembers);
  const teamMembers = useTeamStore(s => s.teamMembers) || [];
  const canEdit = usePermission('progress_reports:write');

  const teamId = selectedTeam?.team?.id || '';

  const seasonId = currentReport?.seasonId
    || location.state?.seasonId
    || (seasons && seasons.length > 0
        ? [...seasons].sort((a, b) => new Date(b.startDate || b.createdAt).getTime() - new Date(a.startDate || a.createdAt).getTime())[0]?.id
        : undefined);

  React.useEffect(() => {
    if (progressId && seasonId && (!currentReport || currentReport.id !== progressId)) {
      getReport(seasonId, progressId);
    }
  }, [progressId, seasonId, getReport, currentReport]);

  React.useEffect(() => {
    if (teamId) {
      fetchGoals(teamId, {});
      getTeam(teamId).catch(() => {});
      fetchTeamMembers(teamId, { limit: 100 }).catch(() => {});
    }
  }, [teamId, fetchGoals, getTeam, fetchTeamMembers]);

  React.useEffect(() => {
    if (teamId && (!seasons || seasons.length === 0)) fetchSeasons(teamId, { teamId });
  }, [teamId, seasons, fetchSeasons]);

  const isAuthor = currentReport?.authorId === currentUser?.id;
  const canModify = isAuthor || canEdit;

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  const { control, handleSubmit, reset } = useForm<EditForm>({ defaultValues: { summary: '', details: '' } });

  React.useEffect(() => {
    if (currentReport) reset({ summary: currentReport.summary || '', details: currentReport.details || '' });
  }, [currentReport, reset]);

  const onEdit = async (data: EditForm) => {
    if (!currentReport || !seasonId) return;
    setActionLoading(true);
    try {
      await updateReport(seasonId, currentReport.id, { summary: data.summary, details: data.details });
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

  const season = seasons?.find(s => s.id === currentReport?.seasonId);
  const authorMember = teamMembers.find(m => m.id === currentReport?.authorId);
  const authorInitials = (authorMember?.name || authorMember?.preferredUsername || '?').substring(0, 2).toUpperCase();

  if (!currentReport) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>{i18next.t('common.loading', 'Loading...')}</Typography>
      </Box>
    );
  }

  return (
    <Box className="progress-details-page" sx={{ p: { xs: 2, sm: 3 } }}>
      <button className="vg-back-nav" onClick={() => navigate('/progress')}>
        ← {i18next.t('progressDetails.backToProgress', 'Back to Progress')}
      </button>

      {/* Header */}
      <div className="progress-details-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="vg-eyebrow">{i18next.t('progress.eyebrow', 'Progress Report')}</div>
          <div className="vg-page-title" style={{ fontSize: 22, marginBottom: 0 }}>{currentReport.summary}</div>
          <div className="progress-details-meta-row">
            <div className="progress-details-author-chip">
              <div className="progress-details-author-avatar">{authorInitials}</div>
              <UserDisplay user={authorMember} fallbackId={currentReport.authorId} />
            </div>
            <span>{formatDateTime(currentReport.createdAt)}</span>
            {season && <span>· {season.name}</span>}
          </div>
        </div>
        {canModify && (
          <div className="progress-details-actions">
            <button className="vg-chip" onClick={() => setEditOpen(true)}>{i18next.t('common.edit', 'Edit')}</button>
          </div>
        )}
      </div>

      {/* Session notes */}
      {currentReport.details && (
        <div className="vg-panel" style={{ marginBottom: 12 }}>
          <div className="vg-panel-title">{i18next.t('progress.details', 'Session Notes')}</div>
          <Typography sx={{ fontSize: 12, color: 'var(--palette-text-secondary)', lineHeight: 1.7 }}>
            {currentReport.details}
          </Typography>
        </div>
      )}

      {/* Goal ratings */}
      {(currentReport.progress?.length ?? 0) > 0 && (
        <div className="vg-panel" style={{ marginBottom: 12 }}>
          <div className="vg-panel-title">{i18next.t('progress.goalRatings', 'Goal Ratings')}</div>
          {currentReport.progress?.map(entry => {
            const goal = goals.find(g => g.id === entry.goalId);
            const colors = HEATMAP_RATING_COLORS[entry.rating] ?? { bg: '#eee', text: '#333' };
            const expanded = expandedEntry === entry.id;
            return (
              <div key={entry.id}>
                <div
                  className="progress-details-entry-row"
                  onClick={() => setExpandedEntry(expanded ? null : entry.id)}
                >
                  <div
                    className="progress-details-rating-cell"
                    style={{ background: colors.bg, color: colors.text }}
                  >
                    {entry.rating}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="progress-details-entry-goal">{goal?.title ?? entry.goalId}</div>
                    {entry.details && (
                      <div className="progress-details-entry-notes">{entry.details}</div>
                    )}
                  </div>
                  <div className="progress-details-entry-expand">{expanded ? '▲' : '▼'}</div>
                </div>
                <Collapse in={expanded}>
                  <Box sx={{ pl: '38px', pb: 1 }}>
                    <CommentSection
                      targetId={entry.id}
                      commentType={CommentType.ProgressEntry}
                      enabled={true}
                      allowFileUploads={currentTeamSettings?.allowFileUploads}
                      teamMembers={teamMembers}
                    />
                  </Box>
                </Collapse>
              </div>
            );
          })}
        </div>
      )}

      {/* Report-level comments */}
      <div className="vg-panel">
        <div className="vg-panel-title">{i18next.t('progressDetails.comments', 'Comments')}</div>
        <CommentSection
          targetId={currentReport.id}
          commentType={CommentType.ProgressReport}
          enabled={true}
          allowFileUploads={currentTeamSettings?.allowFileUploads}
          teamMembers={teamMembers}
        />
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm"
        PaperProps={{ className: 'vg-dialog-paper' }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 800, borderBottom: '1px solid var(--vg-border)', pb: 1.5 }}>
          {i18next.t('progressDetails.editReport', 'Edit Report')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Controller name="summary" control={control} rules={{ required: true }} render={({ field }) => (
              <TextField fullWidth size="small" label={i18next.t('progress.summary', 'Summary')} {...field} />
            )} />
            <Controller name="details" control={control} render={({ field }) => (
              <TextField fullWidth multiline rows={4} size="small"
                label={i18next.t('progress.details', 'Session Notes')} {...field} />
            )} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid var(--vg-border)', px: 2.5, py: 1.5, justifyContent: 'space-between' }}>
          <button className="vg-chip" onClick={() => { setEditOpen(false); setDeleteOpen(true); }}
            style={{ color: 'var(--palette-error-main)', borderColor: 'var(--palette-error-main)' }}>
            {i18next.t('common.delete', 'Delete')}
          </button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <button className="vg-chip" onClick={() => setEditOpen(false)}>{i18next.t('common.cancel', 'Cancel')}</button>
            <button className="vg-chip vg-chip--active" onClick={handleSubmit(onEdit)} disabled={actionLoading}
              style={{ height: 30, borderRadius: 7, padding: '0 14px' }}>
              {i18next.t('common.save', 'Save')}
            </button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs"
        PaperProps={{ className: 'vg-dialog-paper' }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 800, borderBottom: '1px solid var(--vg-border)', pb: 1.5 }}>
          {i18next.t('progressDetails.deleteReport', 'Delete Report')}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 1, fontSize: 12 }}>
            {i18next.t('progressDetails.deleteConfirm', 'Are you sure you want to delete this report?')}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid var(--vg-border)', px: 2.5, py: 1.5 }}>
          <button className="vg-chip" onClick={() => setDeleteOpen(false)}>{i18next.t('common.cancel', 'Cancel')}</button>
          <button className="vg-chip" onClick={onDelete} disabled={actionLoading}
            style={{ background: 'var(--palette-error-main)', color: '#fff', borderColor: 'var(--palette-error-main)', height: 30, borderRadius: 7, padding: '0 14px' }}>
            {i18next.t('common.delete', 'Delete')}
          </button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
