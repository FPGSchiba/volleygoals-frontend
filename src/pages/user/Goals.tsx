import React, { useMemo, useState } from 'react';
import {
  Box, Grid, TextField, MenuItem, TableCell, Button, Chip, Paper, Typography,
  Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment, IconButton,
  ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { ItemList, FetchResult } from '../../components/ItemList';
import { IGoal, GoalType, GoalStatus, ISeason } from '../../store/types';
import { IGoalFilterOption } from '../../services/types';
import { useGoalStore } from '../../store/goals';
import { useSeasonStore } from '../../store/seasons';
import { useCognitoUserStore } from '../../store/cognitoUser';
import i18next from 'i18next';
import { useForm, Controller } from 'react-hook-form';
import { formatDateTime } from '../../utils/dateTime';
import '../../resources/styles/pages/goals.scss';

type GoalForm = {
  title: string;
  description: string;
  goalType?: GoalType | '';
  ownerId?: string;
  status?: GoalStatus | '';
};

export function Goals() {
  const fetchGoals = useGoalStore((s) => s.fetchGoals);
  const createGoal = useGoalStore((s) => s.createGoal);
  const updateGoal = useGoalStore((s) => s.updateGoal);
  const deleteGoal = useGoalStore((s) => s.deleteGoal);
  const goals = useGoalStore((s) => s.goalList.goals) || [];
  const count = useGoalStore((s) => s.goalList.count) || 0;
  const fetchSeasons = useSeasonStore((s) => s.fetchSeasons);
  const seasons = useSeasonStore((s) => s.seasonList.seasons) || [] as ISeason[];
  const selectedTeam = useCognitoUserStore((s) => s.selectedTeam);

  const teamId = selectedTeam?.team?.id || '';

  // Allow initial fetch only when team selected
  const [allowFetch, setAllowFetch] = useState<boolean>(!!selectedTeam);
  React.useEffect(() => setAllowFetch(!!selectedTeam), [selectedTeam]);

  const userRole = selectedTeam?.role as string | undefined;
  const canEdit = userRole === 'admin' || userRole === 'trainer';
  const canCreate = canEdit || userRole === 'member';

  const initialFilter: IGoalFilterOption = useMemo(() => ({ }), []);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<GoalStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<GoalType | 'all'>('all');

  // Seasons: fetch and select newest season by default
  const [selectedSeasonId, setSelectedSeasonId] = React.useState<string | null>(null);

  React.useEffect(() => {
    // When team changes, fetch seasons and team members for that team
    if (teamId) {
      fetchSeasons(teamId, { teamId });
    }
  }, [teamId]);

  // When seasons list changes, pick newest season by startDate or createdAt
  React.useEffect(() => {
    if (!seasons || seasons.length === 0) {
      setSelectedSeasonId(null);
      return;
    }
    // Choose season with latest startDate (fallback to createdAt)
    const sorted = [...seasons].sort((a, b) => {
      const aDate = a.startDate || a.createdAt || '';
      const bDate = b.startDate || b.createdAt || '';
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
    setSelectedSeasonId(prev => prev || (sorted[0] && sorted[0].id) || null);
  }, [seasons]);

  // Client-side filtered goals for search/filter toolbar
  const filteredGoals = useMemo(() => {
    return goals.filter(g => {
      if (searchQuery && !g.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (statusFilter !== 'all' && g.status !== statusFilter) return false;
      if (typeFilter !== 'all' && g.goalType !== typeFilter) return false;
      return true;
    });
  }, [goals, searchQuery, statusFilter, typeFilter]);

  const fetchAdapter = async (filter?: IGoalFilterOption): Promise<FetchResult<IGoal>> => {
    // Require a selected season to fetch goals
    if (!selectedSeasonId) return { items: [], count: 0 };
    const usedFilter: IGoalFilterOption = { ...(filter || {}), } as IGoalFilterOption;
    await fetchGoals(selectedSeasonId, usedFilter).catch(() => {});
    return { items: goals, count };
  };

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<IGoal | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { control: createControl, handleSubmit: handleCreateSubmit, reset: resetCreate } = useForm<GoalForm>({ defaultValues: { title: '', description: '', goalType: '' } });

  const resolveOwner = (g: IGoal): string =>
    g.owner?.name || g.owner?.preferredUsername || g.ownerId;

  const openCreate = () => {
    if (!canCreate || !selectedSeasonId) return;
    // Auto-select goalType based on user role: member -> individual, trainer -> default team (selectable), admin -> team
    let defaultType: GoalType | '' = '';
    if (userRole && userRole !== 'admin' && userRole !== 'trainer') defaultType = GoalType.Individual;
    else if (userRole === 'admin') defaultType = GoalType.Team;
    else if (userRole === 'trainer') defaultType = GoalType.Team; // default for trainer

    resetCreate({ title: '', description: '', goalType: defaultType });
    setCreateOpen(true);
  };

  const onCreate = async (data: GoalForm) => {
    if (!canCreate || !createGoal || !selectedSeasonId) return;
    setActionLoading(true);
    try {
      await createGoal(selectedSeasonId, (data.goalType as GoalType) || GoalType.Team, data.title, data.description);
      setCreateOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const { control: editControl, handleSubmit: handleEditSubmit, reset: resetEdit } = useForm<GoalForm>({ defaultValues: { title: '', description: '', goalType: '', status: '' } });

  const openEdit = (g: IGoal) => {
    if (!canEdit) return;
    setCurrentGoal(g);
    resetEdit({ title: g.title, description: g.description, goalType: g.goalType as GoalType, status: g.status as GoalStatus });
    setEditOpen(true);
  };

  const onEdit = async (data: GoalForm) => {
    if (!currentGoal || !updateGoal || !canEdit) return;
    setActionLoading(true);
    try {
      await updateGoal(currentGoal.seasonId, currentGoal.id, data.title || undefined, data.description || undefined, (data.status as GoalStatus) || undefined);
      setEditOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const openDelete = (g: IGoal) => {
    if (!canEdit) return;
    setCurrentGoal(g);
    setDeleteOpen(true);
  };

  const onDelete = async () => {
    if (!currentGoal || !deleteGoal || !canEdit) return;
    setActionLoading(true);
    try {
      await deleteGoal(currentGoal.seasonId, currentGoal.id);
      setDeleteOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const onSeasonChange = (seasonId: string) => {
    setSelectedSeasonId(seasonId);
  };

  const statusLabel = (g: IGoal): string => {
    const pct = g.completionPercentage;
    switch (g.status) {
      case GoalStatus.Open:
        return i18next.t('goals.status.notStarted', 'Not Started') + ` (${pct ?? 0}%)`;
      case GoalStatus.InProgress:
        return i18next.t('goals.status.inProgress', 'In Progress') + (pct !== undefined ? ` (${pct}%)` : '');
      case GoalStatus.Completed:
        return i18next.t('goals.status.completed', 'Completed') + ' (100%)';
      case GoalStatus.Archived:
        return i18next.t('goals.status.archived', 'Archived');
      default: return g.status;
    }
  };

  const statusColor = (s: GoalStatus): 'warning' | 'info' | 'success' | 'default' => {
    switch (s) {
      case GoalStatus.Open: return 'warning';
      case GoalStatus.InProgress: return 'info';
      case GoalStatus.Completed: return 'success';
      default: return 'default';
    }
  };

  const renderRow = (g: IGoal) => {
    return [
      <TableCell key="title">{g.title}</TableCell>,
      <TableCell key="type">
        <Chip
          label={i18next.t(`user.goals.type.${g.goalType}`, g.goalType)}
          size="small"
          color={g.goalType === GoalType.Team ? 'info' : 'default'}
          variant="outlined"
        />
      </TableCell>,
      <TableCell key="owner">{resolveOwner(g) || '-'}</TableCell>,
      <TableCell key="status">
        <Chip label={statusLabel(g)} color={statusColor(g.status)} size="small" />
      </TableCell>,
      <TableCell key="created">{formatDateTime(g.createdAt)}</TableCell>,
      <TableCell key="updated">{g.updatedAt ? formatDateTime(g.updatedAt) : '-'}</TableCell>,
    ];
  };

  const renderActions = (g: IGoal) => {
    const editBtn = (
      <Button key="edit" variant="contained" size="small" onClick={() => openEdit(g)} style={{ marginRight: 8 }} disabled={actionLoading || !canEdit}>
        {i18next.t('common.edit','Edit')}
      </Button>
    );

    const deleteBtn = (
      <Button key="delete" variant="contained" size="small" color="error" onClick={() => openDelete(g)} disabled={actionLoading || !canEdit}>
        {i18next.t('admin.actions.delete','Delete')}
      </Button>
    );

    return [editBtn, deleteBtn];
  };

  return (
    <Paper className="goals-page goals-page-paper" sx={{ borderRadius: 3 }}>
      <Box p={{ xs: 2, sm: 3 }}>
        <Typography variant="h5" fontWeight={600}>{i18next.t('user.goals.title','Goals')}</Typography>

        {/* Season selector + search row */}
        <Box mt={2} display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <TextField
            select
            size="small"
            value={selectedSeasonId ?? ''}
            label={i18next.t('user.goals.selectSeason', 'Season')}
            onChange={(e) => onSeasonChange(e.target.value)}
            sx={{ minWidth: 220 }}
          >
            {seasons.map((s) => (
              <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
            ))}
          </TextField>

          <TextField
            size="small"
            placeholder={i18next.t('user.goals.search', 'Search goals...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flex: '1 1 180px', maxWidth: 320, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}><ClearIcon fontSize="small" /></IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
        </Box>

        {/* Filter row */}
        <Box mt={1.5} display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={{ xs: 1.5, sm: 3 }} alignItems={{ xs: 'flex-start', sm: 'center' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 50 }}>
              {i18next.t('user.goals.filter.statusLabel', 'Status:')}
            </Typography>
            <ToggleButtonGroup
              size="small"
              value={statusFilter}
              exclusive
              onChange={(_, v) => { if (v !== null) setStatusFilter(v); }}
              sx={{ '& .MuiToggleButton-root': { borderRadius: 1.5, px: 1.5, py: 0.5, fontSize: 12 } }}
            >
              <ToggleButton value="all">{i18next.t('common.all', 'All')}</ToggleButton>
              <ToggleButton value={GoalStatus.Open}>{i18next.t('user.goals.status.open', 'Open')}</ToggleButton>
              <ToggleButton value={GoalStatus.InProgress}>{i18next.t('user.goals.status.inProgress', 'In Progress')}</ToggleButton>
              <ToggleButton value={GoalStatus.Completed}>{i18next.t('user.goals.status.completed', 'Completed')}</ToggleButton>
              <ToggleButton value={GoalStatus.Archived}>{i18next.t('user.goals.status.archived', 'Archived')}</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 50 }}>
              {i18next.t('user.goals.filter.typeLabel', 'Type:')}
            </Typography>
            <ToggleButtonGroup
              size="small"
              value={typeFilter}
              exclusive
              onChange={(_, v) => { if (v !== null) setTypeFilter(v); }}
              sx={{ '& .MuiToggleButton-root': { borderRadius: 1.5, px: 1.5, py: 0.5, fontSize: 12 } }}
            >
              <ToggleButton value="all">{i18next.t('common.all', 'All')}</ToggleButton>
              <ToggleButton value={GoalType.Team}>{i18next.t('user.goals.type.team', 'Team')}</ToggleButton>
              <ToggleButton value={GoalType.Individual}>{i18next.t('user.goals.type.individual', 'Individual')}</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        <Box mt={2}>
          <ItemList<IGoal, IGoalFilterOption>
            title={i18next.t('user.goals.listTitle','Goals')}
            columns={[i18next.t('user.goals.columns.title','Title'), i18next.t('user.goals.columns.type','Type'), i18next.t('user.goals.columns.owner','Owner'), i18next.t('user.goals.columns.status','Status'), i18next.t('user.goals.columns.created','Created'), i18next.t('user.goals.columns.updated','Updated')]}
            initialFilter={initialFilter}
            rowsPerPage={10}
            fetch={fetchAdapter}
            initialFetchPaused={!allowFetch || !selectedSeasonId}
            create={openCreate}
            createDisabled={!canCreate}
            onEdit={(item) => openEdit(item)}
            renderFilterFields={(f, setF) => [
              <Grid key="title">
                <TextField fullWidth label={i18next.t('user.goals.filter.title','Title')} value={f.title ?? ''} onChange={(e) => setF({ ...f, title: e.target.value })} />
              </Grid>,
              <Grid key="status">
                <TextField select fullWidth label={i18next.t('user.goals.filter.status','Status')} value={f.status ?? ''} onChange={(e) => setF({ ...f, status: e.target.value as any })}>
                  <MenuItem value="">{i18next.t('admin.teams.filter.any','Any')}</MenuItem>
                  <MenuItem value={GoalStatus.Open}>{i18next.t('user.goals.status.open','Open')}</MenuItem>
                  <MenuItem value={GoalStatus.InProgress}>{i18next.t('user.goals.status.inProgress','In Progress')}</MenuItem>
                  <MenuItem value={GoalStatus.Completed}>{i18next.t('user.goals.status.completed','Completed')}</MenuItem>
                </TextField>
              </Grid>
            ]}
            renderRow={(item) => renderRow(item)}
            renderActions={(item) => renderActions(item as IGoal)}
            sortableFields={[{ field: 'title', label: i18next.t('user.goals.columns.title','Title') }, { field: 'status', label: i18next.t('user.goals.columns.status','Status') }]}
            items={filteredGoals}
            count={filteredGoals.length}
          />
        </Box>
      </Box>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{i18next.t('user.goals.dialog.createTitle','Create Goal')}</DialogTitle>
        <DialogContent>
          <Box mt={1}>
            <form id="create-goal-form" onSubmit={handleCreateSubmit(onCreate)}>
              <Box className="goals-create-container">
                <Box className="goals-create-top">
                  <Box className="goals-create-top-item">
                    <Controller name="title" control={createControl} rules={{ required: true }} render={({ field }) => (
                      <TextField className="goals-create-title" fullWidth label={i18next.t('user.goals.form.title','Title')} {...field} />
                    )} />
                    <Controller name="goalType" control={createControl} render={({ field }) => (
                      <TextField className="goals-create-type" select fullWidth label={i18next.t('user.goals.form.type','Type')} {...field} disabled={userRole !== 'trainer'}>
                        <MenuItem value={GoalType.Team}>{i18next.t('user.goals.type.team','Team')}</MenuItem>
                        <MenuItem value={GoalType.Individual}>{i18next.t('user.goals.type.individual','Individual')}</MenuItem>
                      </TextField>
                    )} />
                  </Box>
                </Box>

                <Box className="goals-create-desc">
                  <Controller name="description" control={createControl} render={({ field }) => (
                    <TextField fullWidth multiline minRows={6} label={i18next.t('user.goals.form.description','Description')} {...field} />
                  )} />
                </Box>
              </Box>
            </form>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>{i18next.t('common.cancel','Cancel')}</Button>
          <Button type="submit" form="create-goal-form" variant="contained" color="primary" disabled={actionLoading || !canCreate}>{i18next.t('common.create','Create')}</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog (styled like Create Dialog) */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{i18next.t('user.goals.dialog.editTitle','Edit Goal')}</DialogTitle>
        <DialogContent>
          <Box mt={1}>
            <form id="edit-goal-form" onSubmit={handleEditSubmit(onEdit)}>
              <Box className="goals-create-container">
                <Box className="goals-create-top">
                  <Box className="goals-create-top-item">
                    <Controller name="title" control={editControl} rules={{ required: true }} render={({ field }) => (
                      <TextField className="goals-create-title" fullWidth label={i18next.t('user.goals.form.title','Title')} {...field} />
                    )} />
                    {/* For editing, show goalType select similar to create (trainer can change, others see fixed) */}
                    <Controller name="goalType" control={editControl} render={({ field }) => (
                      <TextField className="goals-create-type" select fullWidth label={i18next.t('user.goals.form.type','Type')} {...field} disabled={userRole !== 'trainer'}>
                        <MenuItem value={GoalType.Team}>{i18next.t('user.goals.type.team','Team')}</MenuItem>
                        <MenuItem value={GoalType.Individual}>{i18next.t('user.goals.type.individual','Individual')}</MenuItem>
                      </TextField>
                    )} />
                  </Box>
                </Box>

                <Box className="goals-create-desc">
                  <Controller name="description" control={editControl} render={({ field }) => (
                    <TextField fullWidth multiline minRows={6} label={i18next.t('user.goals.form.description','Description')} {...field} />
                  )} />
                </Box>

                {/* Status below description */}
                <Box>
                  <Controller name="status" control={editControl} render={({ field }) => (
                    <TextField select fullWidth label={i18next.t('user.goals.form.status','Status')} {...field}>
                      <MenuItem value="">{i18next.t('admin.teams.filter.any','Any')}</MenuItem>
                      <MenuItem value={GoalStatus.Open}>{i18next.t('user.goals.status.open','Open')}</MenuItem>
                      <MenuItem value={GoalStatus.InProgress}>{i18next.t('user.goals.status.inProgress','In Progress')}</MenuItem>
                      <MenuItem value={GoalStatus.Completed}>{i18next.t('user.goals.status.completed','Completed')}</MenuItem>
                      <MenuItem value={GoalStatus.Archived}>{i18next.t('user.goals.status.archived','Archived')}</MenuItem>
                    </TextField>
                  )} />
                </Box>
              </Box>
            </form>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>{i18next.t('common.cancel','Cancel')}</Button>
          <Button type="submit" form="edit-goal-form" variant="contained" color="primary" disabled={actionLoading || !canEdit}>{i18next.t('common.save','Save')}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{i18next.t('user.goals.dialog.deleteTitle','Delete Goal')}</DialogTitle>
        <DialogContent>
          <Typography>{i18next.t('user.goals.dialog.deleteConfirm','Are you sure you want to delete this goal?')}</Typography>
          <Box mt={2}>
            <Typography variant="subtitle2">{currentGoal?.title}</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>{i18next.t('common.cancel','Cancel')}</Button>
          <Button variant="contained" color="error" onClick={onDelete} disabled={actionLoading || !canEdit}>{i18next.t('common.delete','Delete')}</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
