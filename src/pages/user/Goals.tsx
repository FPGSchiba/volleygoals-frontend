import React, { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useGoalStore } from '../../store/goals';
import { useSeasonStore } from '../../store/seasons';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { usePermission } from '../../hooks/usePermission';
import { IGoal, GoalType, GoalStatus } from '../../store/types';
import i18next from 'i18next';

type GoalForm = { title: string; description: string; goalType: GoalType | '' };

const STATUS_LABELS: Record<GoalStatus, string> = {
  [GoalStatus.Open]: 'Open',
  [GoalStatus.InProgress]: 'In Progress',
  [GoalStatus.Completed]: 'Completed',
  [GoalStatus.Archived]: 'Archived',
};

function statusBadgeClass(s: GoalStatus): string {
  if (s === GoalStatus.Open) return 'vg-badge vg-badge--open';
  if (s === GoalStatus.InProgress) return 'vg-badge vg-badge--progress';
  if (s === GoalStatus.Completed) return 'vg-badge vg-badge--done';
  return 'vg-badge vg-badge--muted';
}

export function Goals() {
  const navigate = useNavigate();
  const fetchGoals = useGoalStore(s => s.fetchGoals);
  const createGoal = useGoalStore(s => s.createGoal);
  const deleteGoal = useGoalStore(s => s.deleteGoal);
  const goals = useGoalStore(s => s.goalList.goals) || [];
  const fetchSeasons = useSeasonStore(s => s.fetchSeasons);
  const seasons = useSeasonStore(s => s.seasonList.seasons) || [];
  const selectedTeam = useCognitoUserStore(s => s.selectedTeam);
  const teamId = selectedTeam?.team?.id || '';
  const userRole = selectedTeam?.role as string | undefined;

  const canCreateTeam = usePermission('team_goals:write');
  const canCreateIndividual = usePermission('individual_goals:write');
  const canCreate = canCreateTeam || canCreateIndividual || userRole === 'trainer' || userRole === 'admin';
  const canDeleteTeam = usePermission('team_goals:delete');
  const canDeleteIndividual = usePermission('individual_goals:delete');
  const canDeleteGoal = (g: IGoal) => g.goalType === GoalType.Team ? canDeleteTeam : canDeleteIndividual;

  React.useEffect(() => {
    if (teamId) {
      fetchGoals(teamId, {}).catch(() => {});
      fetchSeasons(teamId, { teamId }).catch(() => {});
    }
  }, [teamId, fetchGoals, fetchSeasons]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<GoalStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<GoalType | 'all'>('all');
  const [selectedSeasonIds, setSelectedSeasonIds] = useState<Set<string>>(new Set());

  const filteredGoals = useMemo(() => goals.filter(g => {
    if (searchQuery && !g.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (statusFilter !== 'all' && g.status !== statusFilter) return false;
    if (typeFilter !== 'all' && g.goalType !== typeFilter) return false;
    if (selectedSeasonIds.size > 0) {
      const goalSeasons: string[] = (g as any).seasons?.map((t: any) => t.seasonId || t) ?? [];
      if (!goalSeasons.some(sid => selectedSeasonIds.has(sid))) return false;
    }
    return true;
  }), [goals, searchQuery, statusFilter, typeFilter, selectedSeasonIds]);

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<IGoal | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { control, handleSubmit, reset } = useForm<GoalForm>({
    defaultValues: { title: '', description: '', goalType: '' },
  });

  const openCreate = () => {
    if (!canCreate) return;
    const defaultType: GoalType = userRole === 'trainer' ? GoalType.Team : GoalType.Individual;
    reset({ title: '', description: '', goalType: defaultType });
    setCreateOpen(true);
  };

  const onCreate = async (data: GoalForm) => {
    if (!canCreate || !teamId) return;
    setActionLoading(true);
    try {
      await createGoal(teamId, (data.goalType as GoalType) || GoalType.Team, data.title, data.description);
      setCreateOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const openDelete = (g: IGoal, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentGoal(g);
    setDeleteOpen(true);
  };

  const onDelete = async () => {
    if (!currentGoal || !canDeleteGoal(currentGoal)) return;
    setActionLoading(true);
    try {
      await deleteGoal(teamId, currentGoal.id);
      setDeleteOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSeason = (id: string) =>
    setSelectedSeasonIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const statusChips: Array<{ label: string; value: GoalStatus | 'all' }> = [
    { label: i18next.t('common.all', 'All'), value: 'all' },
    { label: i18next.t('user.goals.status.open', 'Open'), value: GoalStatus.Open },
    { label: i18next.t('user.goals.status.inProgress', 'In Progress'), value: GoalStatus.InProgress },
    { label: i18next.t('user.goals.status.completed', 'Completed'), value: GoalStatus.Completed },
  ];

  const typeChips: Array<{ label: string; value: GoalType | 'all' }> = [
    { label: i18next.t('common.all', 'All'), value: 'all' },
    { label: i18next.t('user.goals.type.team', 'Team'), value: GoalType.Team },
    { label: i18next.t('user.goals.type.individual', 'Individual'), value: GoalType.Individual },
  ];

  return (
    <Box className="goals-page" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1200 }}>
      <div className="goals-header">
        <div>
          <div className="vg-eyebrow">{filteredGoals.length} {i18next.t('user.goals.eyebrow', 'Goals across all seasons')}</div>
          <div className="vg-page-title">{i18next.t('user.goals.title', 'Goals')}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="goals-toolbar">
        <input
          className="goals-search"
          placeholder={i18next.t('user.goals.search', 'Search goals...')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {canCreate && (
          <button className="vg-chip vg-chip--active" onClick={openCreate} style={{ height: 34, borderRadius: 8 }}>
            {i18next.t('user.goals.newGoal', 'New Goal')}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="vg-chip-row">
        {statusChips.map(c => (
          <button
            key={c.value}
            className={`vg-chip${statusFilter === c.value ? ' vg-chip--active' : ''}`}
            onClick={() => setStatusFilter(c.value)}
          >
            {c.label}
          </button>
        ))}
        <span style={{ width: 1, height: 20, background: 'var(--vg-border)', margin: '0 4px' }} />
        {typeChips.map(c => (
          <button
            key={c.value}
            className={`vg-chip${typeFilter === c.value ? ' vg-chip--active' : ''}`}
            onClick={() => setTypeFilter(c.value)}
          >
            {c.label}
          </button>
        ))}
        {seasons.length > 0 && (
          <>
            <span style={{ width: 1, height: 20, background: 'var(--vg-border)', margin: '0 4px' }} />
            <Box sx={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {seasons.map(s => (
                <button
                  key={s.id}
                  className={`vg-chip${selectedSeasonIds.has(s.id) ? ' vg-chip--active' : ''}`}
                  onClick={() => toggleSeason(s.id)}
                  style={{ height: 24, fontSize: 10 }}
                >
                  {s.name}
                </button>
              ))}
            </Box>
          </>
        )}
      </div>

      {/* Goal list */}
      <div className="goals-list">
        {filteredGoals.map(g => (
          <div
            key={g.id}
            className="vg-row-item"
            onClick={() => navigate(`/goals/${g.id}`)}
          >
            <div className="goals-row-left">
              <div className="goals-row-title">{g.title}</div>
              <div className="goals-row-meta">
                <span>{g.goalType}</span>
                {g.updatedAt && <span>· {new Date(g.updatedAt).toLocaleDateString()}</span>}
              </div>
            </div>
            <div className="goals-row-right">
              <span className={statusBadgeClass(g.status)}>{STATUS_LABELS[g.status] ?? g.status}</span>
              <button
                className="vg-chip"
                disabled={actionLoading || !canDeleteGoal(g)}
                onClick={e => openDelete(g, e)}
                style={{ fontSize: 10, height: 24, padding: '0 8px' }}
              >
                {i18next.t('admin.actions.delete', 'Delete')}
              </button>
              <span className="vg-chevron">›</span>
            </div>
          </div>
        ))}
        {filteredGoals.length === 0 && (
          <Typography sx={{ fontSize: 12, color: 'var(--vg-text-muted)', py: 4, textAlign: 'center' }}>
            {i18next.t('user.goals.empty', 'No goals match the current filters.')}
          </Typography>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm"
        PaperProps={{ className: 'vg-dialog-paper' }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.4, borderBottom: '1px solid var(--vg-border)', pb: 1.5 }}>
          {i18next.t('user.goals.dialog.createTitle', 'Create Goal')}
        </DialogTitle>
        <DialogContent>
          <div className="goals-dialog-form">
            <Controller name="title" control={control} rules={{ required: true }} render={({ field, fieldState }) => (
              <TextField fullWidth size="small" label={i18next.t('user.goals.form.title', 'Title')}
                error={!!fieldState.error} {...field} />
            )} />
            <Controller name="goalType" control={control} render={({ field }) => (
              <TextField select fullWidth size="small" label={i18next.t('user.goals.form.type', 'Type')}
                disabled={userRole !== 'trainer'} {...field}>
                <MenuItem value={GoalType.Team}>{i18next.t('user.goals.type.team', 'Team')}</MenuItem>
                <MenuItem value={GoalType.Individual}>{i18next.t('user.goals.type.individual', 'Individual')}</MenuItem>
              </TextField>
            )} />
            <Controller name="description" control={control} render={({ field }) => (
              <TextField fullWidth multiline minRows={4} size="small"
                label={i18next.t('user.goals.form.description', 'Description')} {...field} />
            )} />
          </div>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid var(--vg-border)', px: 2.5, py: 1.5 }}>
          <button className="vg-chip" onClick={() => setCreateOpen(false)}>
            {i18next.t('common.cancel', 'Cancel')}
          </button>
          <button className="vg-chip vg-chip--active" onClick={handleSubmit(onCreate)} disabled={actionLoading}
            style={{ height: 30, borderRadius: 7, padding: '0 14px' }}>
            {i18next.t('common.create', 'Create')}
          </button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs"
        PaperProps={{ className: 'vg-dialog-paper' }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 800, borderBottom: '1px solid var(--vg-border)', pb: 1.5 }}>
          {i18next.t('user.goals.dialog.deleteTitle', 'Delete Goal')}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 1, fontSize: 12 }}>
            {i18next.t('user.goals.dialog.deleteConfirm', 'Are you sure you want to delete this goal?')}
          </Typography>
          <Typography sx={{ mt: 1, fontSize: 12, fontWeight: 700 }}>{currentGoal?.title}</Typography>
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
