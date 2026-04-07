import React, { useMemo, useState } from 'react';
import {
  Box, Grid, TextField, MenuItem, TableCell, Button, Chip, Paper, Typography,
  Dialog, DialogTitle, DialogContent, DialogActions, InputAdornment, IconButton,
  ToggleButtonGroup, ToggleButton, Avatar
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { ItemList, FetchResult } from '../../components/ItemList';
import { IGoal, GoalType, GoalStatus } from '../../store/types';
import { IGoalFilterOption } from '../../services/types';
import { useGoalStore } from '../../store/goals';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { usePermission } from '../../hooks/usePermission';
import i18next from 'i18next';
import { useForm, Controller } from 'react-hook-form';
import { formatDateTime } from '../../utils/dateTime';
import { useNavigate } from 'react-router-dom';

type GoalForm = {
  title: string;
  description: string;
  goalType?: GoalType | '';
  ownerId?: string;
  status?: GoalStatus | '';
};

export function Goals() {
  const navigate = useNavigate();
  const fetchGoals = useGoalStore((s) => s.fetchGoals);
  const createGoal = useGoalStore((s) => s.createGoal);
  const deleteGoal = useGoalStore((s) => s.deleteGoal);
  const goals = useGoalStore((s) => s.goalList.goals) || [];
  const count = useGoalStore((s) => s.goalList.count) || 0;
  const selectedTeam = useCognitoUserStore((s) => s.selectedTeam);

  const teamId = selectedTeam?.team?.id || '';

  const [allowFetch, setAllowFetch] = useState<boolean>(!!selectedTeam);
  React.useEffect(() => setAllowFetch(!!selectedTeam), [selectedTeam]);

  const userRole = selectedTeam?.role as string | undefined;
  const canCreateTeam = usePermission('team_goals:write');
  const canCreateIndividual = usePermission('individual_goals:write');
  const canCreate = canCreateTeam || canCreateIndividual;

  const canDeleteTeam = usePermission('team_goals:delete');
  const canDeleteIndividual = usePermission('individual_goals:delete');
  const canDeleteGoal = (g: IGoal) => g.goalType === GoalType.Team ? canDeleteTeam : canDeleteIndividual;

  const initialFilter: IGoalFilterOption = useMemo(() => ({ }), []);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<GoalStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<GoalType | 'all'>('all');


  const filteredGoals = useMemo(() => goals.filter(g => {
    if (searchQuery && !g.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (statusFilter !== 'all' && g.status !== statusFilter) return false;
    if (typeFilter !== 'all' && g.goalType !== typeFilter) return false;
    return true;
  }), [goals, searchQuery, statusFilter, typeFilter]);

  const fetchAdapter = async (filter?: IGoalFilterOption): Promise<FetchResult<IGoal>> => {
    if (!teamId) return { items: [], count: 0 };
    await fetchGoals(teamId, filter || {}).catch(() => {});
    return { items: goals, count };
  };

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<IGoal | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { control: createControl, handleSubmit: handleCreateSubmit, reset: resetCreate } = useForm<GoalForm>({ defaultValues: { title: '', description: '', goalType: '' } });

  const resolveOwner = (g: IGoal) => {
    const name = g.owner?.name || g.owner?.preferredUsername;
    const picture = g.owner?.picture;
    if (!name && !picture) return g.ownerId || '-';
    return (
      <Box display="flex" alignItems="center" gap={1}>
        <Avatar src={picture} alt={name || g.ownerId} sx={{ width: 24, height: 24 }}>
          {!picture && (name || g.ownerId).charAt(0).toUpperCase()}
        </Avatar>
        <Typography variant="body2">{name || g.ownerId}</Typography>
      </Box>
    );
  };

  const openCreate = () => {
    if (!canCreate) return;
    let defaultType: GoalType | '' = '';
    if (userRole && userRole !== 'admin' && userRole !== 'trainer') defaultType = GoalType.Individual;
    else defaultType = GoalType.Team;
    resetCreate({ title: '', description: '', goalType: defaultType });
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

  const openDelete = (g: IGoal) => {
    if (!canDeleteGoal(g)) return;
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

  const statusLabel = (g: IGoal): string => {
    const pct = g.completionPercentage;
    switch (g.status) {
      case GoalStatus.Open: return i18next.t('goals.status.notStarted', 'Not Started') + ` (${pct ?? 0}%)`;
      case GoalStatus.InProgress: return i18next.t('goals.status.inProgress', 'In Progress') + (pct !== undefined ? ` (${pct}%)` : '');
      case GoalStatus.Completed: return i18next.t('goals.status.completed', 'Completed') + ' (100%)';
      case GoalStatus.Archived: return i18next.t('goals.status.archived', 'Archived');
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

  const renderRow = (g: IGoal) => [
    <TableCell key="title">{g.title}</TableCell>,
    <TableCell key="type"><Chip label={i18next.t(`user.goals.type.${g.goalType}`, g.goalType)} size="small" color={g.goalType === GoalType.Team ? 'info' : 'default'} variant="outlined" /></TableCell>,
    <TableCell key="owner">{resolveOwner(g) || '-'}</TableCell>,
    <TableCell key="status"><Chip label={statusLabel(g)} color={statusColor(g.status)} size="small" /></TableCell>,
    <TableCell key="created">{formatDateTime(g.createdAt)}</TableCell>,
    <TableCell key="updated">{g.updatedAt ? formatDateTime(g.updatedAt) : '-'}</TableCell>,
  ];

  const renderActions = (g: IGoal) => [
    <Button key="delete" variant="contained" size="small" color="error" onClick={(e) => { e.stopPropagation(); openDelete(g); }} disabled={actionLoading || !canDeleteGoal(g)}>
      {i18next.t('admin.actions.delete','Delete')}
    </Button>
  ];

  return (
    <Paper className="goals-page goals-page-paper" sx={{ borderRadius: 3 }}>
      <Box p={{ xs: 2, sm: 3 }}>
        <Typography variant="h5" fontWeight={600}>{i18next.t('user.goals.title','Goals')}</Typography>

        <Box mt={2} display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <TextField
            size="small"
            placeholder={i18next.t('user.goals.search', 'Search goals...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ flex: '1 1 180px', maxWidth: 320, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            InputProps={{
              startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment>),
              endAdornment: searchQuery ? (<InputAdornment position="end"><IconButton size="small" onClick={() => setSearchQuery('')}><ClearIcon fontSize="small" /></IconButton></InputAdornment>) : null,
            }}
          />
        </Box>

        <Box mt={1.5} display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={{ xs: 1.5, sm: 3 }} alignItems={{ xs: 'flex-start', sm: 'center' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 50 }}>{i18next.t('user.goals.filter.statusLabel', 'Status:')}</Typography>
            <ToggleButtonGroup size="small" value={statusFilter} exclusive onChange={(_, v) => { if (v !== null) setStatusFilter(v); }} sx={{ '& .MuiToggleButton-root': { borderRadius: 1.5, px: 1.5, py: 0.5, fontSize: 12 } }}>
              <ToggleButton value="all">{i18next.t('common.all', 'All')}</ToggleButton>
              <ToggleButton value={GoalStatus.Open}>{i18next.t('user.goals.status.open', 'Open')}</ToggleButton>
              <ToggleButton value={GoalStatus.InProgress}>{i18next.t('user.goals.status.inProgress', 'In Progress')}</ToggleButton>
              <ToggleButton value={GoalStatus.Completed}>{i18next.t('user.goals.status.completed', 'Completed')}</ToggleButton>
              <ToggleButton value={GoalStatus.Archived}>{i18next.t('user.goals.status.archived', 'Archived')}</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 50 }}>{i18next.t('user.goals.filter.typeLabel', 'Type:')}</Typography>
            <ToggleButtonGroup size="small" value={typeFilter} exclusive onChange={(_, v) => { if (v !== null) setTypeFilter(v); }} sx={{ '& .MuiToggleButton-root': { borderRadius: 1.5, px: 1.5, py: 0.5, fontSize: 12 } }}>
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
            initialFetchPaused={!allowFetch}
            create={openCreate}
            createDisabled={!canCreate}
            onEdit={(item) => navigate(`/goals/${item.id}`)}
            onRowClick={(item) => navigate(`/goals/${item.id}`)}
            renderFilterFields={(f, setF) => [
              <Grid key="title"><TextField fullWidth label={i18next.t('user.goals.filter.title','Title')} value={f.title ?? ''} onChange={(e) => setF({ ...f, title: e.target.value })} /></Grid>,
              <Grid key="status"><TextField select fullWidth label={i18next.t('user.goals.filter.status','Status')} value={f.status ?? ''} onChange={(e) => setF({ ...f, status: e.target.value as any })}><MenuItem value="">{i18next.t('admin.teams.filter.any','Any')}</MenuItem><MenuItem value={GoalStatus.Open}>{i18next.t('user.goals.status.open','Open')}</MenuItem><MenuItem value={GoalStatus.InProgress}>{i18next.t('user.goals.status.inProgress','In Progress')}</MenuItem><MenuItem value={GoalStatus.Completed}>{i18next.t('user.goals.status.completed','Completed')}</MenuItem></TextField></Grid>
            ]}
            renderRow={(item) => renderRow(item)}
            renderActions={(item) => renderActions(item as IGoal)}
            sortableFields={[{ field: 'title', label: i18next.t('user.goals.columns.title','Title') }, { field: 'status', label: i18next.t('user.goals.columns.status','Status') }]}
            items={filteredGoals}
            count={filteredGoals.length}
          />
        </Box>
      </Box>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{i18next.t('user.goals.dialog.createTitle','Create Goal')}</DialogTitle>
        <DialogContent>
          <Box mt={1}>
            <form id="create-goal-form" onSubmit={handleCreateSubmit(onCreate)}>
              <Box className="goals-create-container">
                <Box className="goals-create-top">
                  <Box className="goals-create-top-item">
                    <Controller name="title" control={createControl} rules={{ required: true }} render={({ field }) => (<TextField className="goals-create-title" fullWidth label={i18next.t('user.goals.form.title','Title')} {...field} />)} />
                    <Controller name="goalType" control={createControl} render={({ field }) => (
                      <TextField className="goals-create-type" select fullWidth label={i18next.t('user.goals.form.type','Type')} {...field} disabled={userRole !== 'trainer'}>
                        <MenuItem value={GoalType.Team}>{i18next.t('user.goals.type.team','Team')}</MenuItem>
                        <MenuItem value={GoalType.Individual}>{i18next.t('user.goals.type.individual','Individual')}</MenuItem>
                      </TextField>
                    )} />
                  </Box>
                </Box>

                <Box className="goals-create-desc">
                  <Controller name="description" control={createControl} render={({ field }) => (<TextField fullWidth multiline minRows={6} label={i18next.t('user.goals.form.description','Description')} {...field} />)} />
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

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{i18next.t('user.goals.dialog.deleteTitle','Delete Goal')}</DialogTitle>
        <DialogContent>
          <Typography>{i18next.t('user.goals.dialog.deleteConfirm','Are you sure you want to delete this goal?')}</Typography>
          <Box mt={2}><Typography variant="subtitle2">{currentGoal?.title}</Typography></Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>{i18next.t('common.cancel','Cancel')}</Button>
          <Button variant="contained" color="error" onClick={onDelete} disabled={actionLoading || !!(currentGoal && !canDeleteGoal(currentGoal))}>{i18next.t('common.delete','Delete')}</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
