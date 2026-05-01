import React, { useMemo, useState } from 'react';
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
import { useGoalStore } from '../../store/goals';
import { useSeasonStore } from '../../store/seasons';
import { useProgressReportStore } from '../../store/progressReports';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { usePermission } from '../../hooks/usePermission';
import { useTeamStore } from '../../store/teams';
import { CommentType, GoalStatus, GoalType, IGoal } from '../../store/types';
import { CommentSection } from '../../components/CommentSection';
import { GoalHeatmap } from '../../components/progress/GoalHeatmap';
import { EntryDrawer, EntryDrawerEntry } from '../../components/progress/EntryDrawer';
import { buildHeatmapData } from '../../utils/chartUtils';
import i18next from 'i18next';

type EditForm = { title: string; description: string; status: GoalStatus | '' };

const STATUS_LABELS: Record<GoalStatus, string> = {
  [GoalStatus.Open]: 'Open',
  [GoalStatus.InProgress]: 'In Progress',
  [GoalStatus.Completed]: 'Completed',
  [GoalStatus.Archived]: 'Archived',
};

export function GoalDetails() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();

  const currentGoal = useGoalStore(s => s.currentGoal);
  const getGoal = useGoalStore(s => s.getGoal);
  const updateGoal = useGoalStore(s => s.updateGoal);
  const deleteGoal = useGoalStore(s => s.deleteGoal);
  const fetchGoalSeasons = useGoalStore(s => s.fetchGoalSeasons);
  const goalSeasons = useGoalStore(s => s.goalSeasons);
  const tagGoalToSeason = useGoalStore(s => s.tagGoalToSeason);
  const untagGoalFromSeason = useGoalStore(s => s.untagGoalFromSeason);

  const seasons = useSeasonStore(s => s.seasonList.seasons);
  const fetchSeasons = useSeasonStore(s => s.fetchSeasons);
  const fetchReports = useProgressReportStore(s => s.fetchReports);
  const reports = useProgressReportStore(s => s.reportList.reports) || [];
  const selectedTeam = useCognitoUserStore(s => s.selectedTeam);
  const teamId = selectedTeam?.team?.id || '';
  const getTeam = useTeamStore(s => s.getTeam);
  const currentTeamSettings = useTeamStore(s => s.currentTeamSettings);

  const canWriteTeam = usePermission('team_goals:write');
  const canWriteIndividual = usePermission('individual_goals:write');
  const canDeleteTeam = usePermission('team_goals:delete');
  const canDeleteIndividual = usePermission('individual_goals:delete');

  const canEditGoal = (g: IGoal) => g.goalType === GoalType.Team ? canWriteTeam : canWriteIndividual;
  const canDeleteGoal = (g: IGoal) => g.goalType === GoalType.Team ? canDeleteTeam : canDeleteIndividual;

  const canModify = currentGoal ? canEditGoal(currentGoal) : false;
  const canDelete = currentGoal ? canDeleteGoal(currentGoal) : false;

  React.useEffect(() => {
    if (teamId) {
      fetchSeasons(teamId, { teamId });
      getTeam(teamId).catch(() => {});
    }
  }, [teamId, fetchSeasons, getTeam]);

  React.useEffect(() => {
    if (goalId && teamId) {
      getGoal(teamId, goalId);
      fetchGoalSeasons(teamId, goalId);
      const activeSeason = seasons.find(s => s.status === 'active');
      if (activeSeason) {
        fetchReports(activeSeason.id, { limit: 100 } as any).catch(() => {});
      }
    }
  }, [goalId, teamId, seasons, getGoal, fetchGoalSeasons, fetchReports]);

  const heatmapData = useMemo(() => {
    if (!currentGoal) return { rows: [], dateColumns: [] };
    return buildHeatmapData(reports, [{ id: currentGoal.id, title: currentGoal.title }]);
  }, [reports, currentGoal]);

  const entries = heatmapData.rows[0]?.cells ? Object.values(heatmapData.rows[0].cells) : [];
  const avgRating = entries.length > 0
    ? (entries.reduce((s, e) => s + e.rating, 0) / entries.length).toFixed(1)
    : '—';
  const latestRating = entries.length > 0
    ? [...entries].sort((a, b) => b.date.localeCompare(a.date))[0].rating
    : '—';

  const [selectedEntry, setSelectedEntry] = useState<EntryDrawerEntry | null>(null);
  const handleCellClick = (progressId: string, reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;
    const entry = report.progress?.find(p => p.id === progressId);
    if (!entry) return;
    setSelectedEntry({
      id: entry.id,
      goalId: entry.goalId,
      goalName: currentGoal?.title ?? '',
      rating: entry.rating,
      details: entry.details,
      reportId: report.id,
      reportDate: report.createdAt,
    });
  };

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [tagSeasonId, setTagSeasonId] = useState('');

  const { control, handleSubmit, reset } = useForm<EditForm>({
    defaultValues: { title: '', description: '', status: '' },
  });

  React.useEffect(() => {
    if (!currentGoal) return;
    reset({ title: currentGoal.title, description: currentGoal.description, status: currentGoal.status });
  }, [currentGoal, reset]);

  const onEdit = async (data: EditForm) => {
    if (!currentGoal || !teamId || !canModify) return;
    setActionLoading(true);
    try {
      await updateGoal(teamId, currentGoal.id, data.title || undefined, data.description || undefined, (data.status as GoalStatus) || undefined);
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

  const handleTag = async () => {
    if (!tagSeasonId || !goalId || !teamId) return;
    await tagGoalToSeason(teamId, goalId, tagSeasonId);
    fetchGoalSeasons(teamId, goalId);
    setTagSeasonId('');
  };

  const handleUntag = async (seasonId: string) => {
    if (!goalId || !teamId) return;
    await untagGoalFromSeason(teamId, goalId, seasonId);
    fetchGoalSeasons(teamId, goalId);
  };

  const taggedSeasonIds = new Set(goalSeasons.map((t: any) => t.seasonId || t));
  const untaggedSeasons = seasons.filter(s => !taggedSeasonIds.has(s.id));
  const taggedSeasonNames = seasons.filter(s => taggedSeasonIds.has(s.id));

  const settings = currentTeamSettings;
  const commentsEnabled = currentGoal
    ? (currentGoal.goalType === GoalType.Team
        ? (settings?.allowTeamGoalComments ?? false)
        : (settings?.allowIndividualGoalComments ?? false))
    : false;

  if (!currentGoal) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <Box className="goal-details-page" sx={{ p: { xs: 2, sm: 3 } }}>
      <button className="vg-back-nav" onClick={() => navigate('/goals')}>
        ← {i18next.t('goalDetails.backToGoals', 'Back to Goals')}
      </button>

      {/* Header */}
      <div className="goal-details-header">
        <div>
          <div className="vg-eyebrow">{i18next.t('goalDetails.eyebrow', 'Goal')}</div>
          <div className="vg-page-title">{currentGoal.title}</div>
        </div>
        <div className="goal-details-actions">
          {canModify && (
            <button className="vg-chip" onClick={() => setEditOpen(true)}>
              {i18next.t('common.edit', 'Edit')}
            </button>
          )}
          {canModify && (
            <button
              className="vg-chip vg-chip--active"
              onClick={handleSubmit(onEdit)}
              disabled={actionLoading}
            >
              {i18next.t('common.save', 'Save')}
            </button>
          )}
          {canDelete && (
            <button
              className="vg-chip"
              onClick={() => setDeleteOpen(true)}
              disabled={actionLoading}
              style={{ color: 'var(--palette-error-main)', borderColor: 'var(--palette-error-main)' }}
            >
              {i18next.t('goalDetails.delete', 'Delete')}
            </button>
          )}
          <button className="vg-chip vg-chip--active" onClick={() => navigate('/progress/create')}>
            + {i18next.t('goalDetails.addEntry', 'Entry')}
          </button>
        </div>
      </div>

      <div className="vg-two-col">
        {/* Left column */}
        <div>
          <div className="vg-panel" style={{ marginBottom: 12 }}>
            <div className="vg-panel-title">{i18next.t('goalDetails.description', 'Description')}</div>
            <div className="goal-details-description">{currentGoal.description || '—'}</div>
          </div>

          <div className="vg-panel" style={{ marginBottom: 12 }}>
            <div className="vg-panel-title">{i18next.t('goalDetails.progressHistory', 'Progress History')}</div>
            <GoalHeatmap
              data={heatmapData}
              onCellClick={handleCellClick}
              showGoalLabels={false}
              showDateHeaders={true}
              showLegend={true}
            />
            <div className="goal-details-heatmap-stats">
              {[
                { label: i18next.t('goalDetails.entries', 'Entries'), value: entries.length },
                { label: i18next.t('goalDetails.avgRating', 'Avg Rating'), value: avgRating },
                { label: i18next.t('goalDetails.latest', 'Latest'), value: latestRating },
              ].map(s => (
                <div key={s.label} className="goal-details-heatmap-stat">
                  <span className="goal-details-heatmap-stat-num">{s.value}</span>
                  <span className="goal-details-heatmap-stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="vg-panel">
            <div className="vg-panel-title">{i18next.t('goalDetails.comments', 'Comments')}</div>
            <CommentSection
              targetId={currentGoal.id}
              commentType={CommentType.Goal}
              enabled={commentsEnabled}
              allowFileUploads={settings?.allowFileUploads}
            />
          </div>
        </div>

        {/* Right column — meta panel */}
        <div>
          <div className="vg-panel">
            <div className="vg-panel-title">{i18next.t('goalDetails.details', 'Details')}</div>
            <div className="vg-meta-row">
              <span className="vg-meta-label">{i18next.t('goalDetails.status', 'Status')}</span>
              <span className="vg-meta-value">{STATUS_LABELS[currentGoal.status] ?? currentGoal.status}</span>
            </div>
            <div className="vg-meta-row">
              <span className="vg-meta-label">{i18next.t('goalDetails.type', 'Type')}</span>
              <span className="vg-meta-value">{currentGoal.goalType}</span>
            </div>
            <div className="vg-meta-row">
              <span className="vg-meta-label">{i18next.t('goalDetails.created', 'Created')}</span>
              <span className="vg-meta-value">{new Date(currentGoal.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="vg-meta-row" style={{ alignItems: 'flex-start' }}>
              <span className="vg-meta-label">{i18next.t('goalDetails.seasons', 'Seasons')}</span>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, marginLeft: 8 }}>
                <div className="goal-details-season-pills">
                  {taggedSeasonNames.map(s => (
                    <span key={s.id} className="vg-season-pill">
                      {s.name}
                      {canModify && (
                        <button
                          onClick={() => handleUntag(s.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, fontSize: 10, marginLeft: 2 }}
                          aria-label={`Remove ${s.name}`}
                        >✕</button>
                      )}
                    </span>
                  ))}
                  {taggedSeasonNames.length === 0 && (
                    <span style={{ fontSize: 11, color: 'var(--vg-text-muted)' }}>—</span>
                  )}
                </div>
                {canModify && untaggedSeasons.length > 0 && (
                  <div className="goal-details-tag-row">
                    <select
                      className="goal-details-tag-select"
                      value={tagSeasonId}
                      onChange={e => setTagSeasonId(e.target.value)}
                    >
                      <option value="">{i18next.t('goalDetails.addToSeason', 'Add to season...')}</option>
                      {untaggedSeasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button className="goal-details-tag-btn" onClick={handleTag} disabled={!tagSeasonId}>
                      + {i18next.t('common.add', 'Add')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Goal Dialog */}
      {canModify && (
        <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm"
          keepMounted
          PaperProps={{ className: 'vg-dialog-paper' }}>
          <DialogTitle sx={{ fontSize: 15, fontWeight: 800, borderBottom: '1px solid var(--vg-border)', pb: 1.5 }}>
            {i18next.t('goalDetails.editGoal', 'Edit Goal')}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Controller name="title" control={control} rules={{ required: true }} render={({ field }) => (
                <TextField fullWidth size="small" label={i18next.t('user.goals.form.title', 'Title')} {...field} />
              )} />
              <Controller name="status" control={control} render={({ field }) => (
                <TextField select fullWidth size="small" label={i18next.t('goalDetails.status', 'Status')} {...field}>
                  {Object.entries(STATUS_LABELS).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                </TextField>
              )} />
              <Controller name="description" control={control} render={({ field }) => (
                <TextField fullWidth multiline minRows={4} size="small"
                  label={i18next.t('user.goals.form.description', 'Description')} {...field} />
              )} />
            </Box>
          </DialogContent>
          <DialogActions sx={{ borderTop: '1px solid var(--vg-border)', px: 2.5, py: 1.5, justifyContent: 'space-between' }}>
            {canDelete && (
              <button className="vg-chip" onClick={() => { setEditOpen(false); setDeleteOpen(true); }}
                style={{ color: 'var(--palette-error-main)', borderColor: 'var(--palette-error-main)' }}>
                {i18next.t('goalDetails.delete', 'Delete')}
              </button>
            )}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <button className="vg-chip" onClick={() => setEditOpen(false)}>{i18next.t('common.cancel', 'Cancel')}</button>
            </Box>
          </DialogActions>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        maxWidth="xs"
        PaperProps={{ className: 'vg-dialog-paper' }}
      >
        <DialogTitle sx={{ fontSize: 15, fontWeight: 800, borderBottom: '1px solid var(--vg-border)', pb: 1.5 }}>
          {i18next.t('goalDetails.deleteGoal', 'Delete Goal')}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 1, fontSize: 12 }}>
            {i18next.t('goalDetails.deleteConfirm', 'Are you sure you want to delete this goal?')}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid var(--vg-border)', px: 2.5, py: 1.5 }}>
          <button className="vg-chip" onClick={() => setDeleteOpen(false)}>
            {i18next.t('common.cancel', 'Cancel')}
          </button>
          <button
            className="vg-chip"
            onClick={onDelete}
            disabled={actionLoading}
            style={{ background: 'var(--palette-error-main)', color: '#fff', borderColor: 'var(--palette-error-main)', height: 30, borderRadius: 7, padding: '0 14px' }}
          >
            {i18next.t('common.delete', 'Delete')}
          </button>
        </DialogActions>
      </Dialog>

      <EntryDrawer entry={selectedEntry} onClose={() => setSelectedEntry(null)} readonly={true} />
    </Box>
  );
}
