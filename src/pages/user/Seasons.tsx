import React, { useMemo, useState } from 'react';
import { Box, Grid, TextField, MenuItem, TableCell, Button, Chip, Paper, Typography, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { ItemList, FetchResult } from '../../components/ItemList';
import { ISeason, SeasonStatus } from '../../store/types';
import { ISeasonFilterOption } from '../../services/types';
import { useSeasonStore } from '../../store/seasons';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { RoleType } from '../../store/types';
import i18next from 'i18next';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import '../../resources/styles/pages/seasons.scss';

// Helpers to convert between date-only (YYYY-MM-DD) and ISO datetimes
const isoToDateOnly = (iso?: string) => {
  if (!iso) return '';
  const idx = iso.indexOf('T');
  if (idx === -1) return iso;
  return iso.substring(0, idx);
};

const dateOnlyToISO = (dateStr?: string) => {
  if (!dateStr) return '';
  // If already ISO-like, return as-is
  if (dateStr.includes('T')) return dateStr;
  try {
    // Create date from YYYY-MM-DD and return ISO string (UTC)
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toISOString();
  } catch (err) {
    return dateStr;
  }
};

type SeasonForm = {
  name: string;
  startDate: string;
  endDate: string;
  status?: SeasonStatus | '';
};

export function Seasons() {
  const fetchSeasons = useSeasonStore((s) => s.fetchSeasons);
  const createSeason = useSeasonStore((s) => s.createSeason);
  const updateSeason = useSeasonStore((s) => s.updateSeason);
  const deleteSeason = useSeasonStore((s) => s.deleteSeason);
  const seasons = useSeasonStore((s) => s.seasonList.seasons) || [];
  const count = useSeasonStore((s) => s.seasonList.count) || 0;
  const selectedTeam = useCognitoUserStore((s) => s.selectedTeam);

  const navigate = useNavigate();
  const teamId = selectedTeam?.team?.id || '';

  // Control whether the ItemList should perform its initial fetch. We only allow
  // fetching after the selectedTeam is available to avoid calling the list API
  // without a teamId (the backend requires a teamId).
  const [allowFetch, setAllowFetch] = useState<boolean>(!!selectedTeam);
  React.useEffect(() => {
    setAllowFetch(!!selectedTeam);
  }, [selectedTeam]);

  // Determine permissions based on the current user's role for the selected team
  const userRole = selectedTeam?.role;
  const canEdit = userRole === RoleType.Admin || userRole === RoleType.Trainer;

  const initialFilter: ISeasonFilterOption = useMemo(() => ({ teamId }), [teamId]);

  const fetchAdapter = async (filter?: ISeasonFilterOption): Promise<FetchResult<ISeason>> => {
    const usedFilter: ISeasonFilterOption = { ...(filter || {} as any), teamId: filter?.teamId || teamId } as ISeasonFilterOption;
    // Guard: ensure we have a teamId before calling the API
    if (!usedFilter.teamId) return { items: [], count: 0 };
    await fetchSeasons(usedFilter.teamId || teamId, usedFilter);
    return { items: seasons, count };
  };

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [currentSeason, setCurrentSeason] = useState<ISeason | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Create form
  const { control: createControl, handleSubmit: handleCreateSubmit, reset: resetCreate } = useForm<SeasonForm>({ defaultValues: { name: '', startDate: '', endDate: '' } });

  const openCreate = () => {
    if (!canEdit) return;
    resetCreate({ name: '', startDate: '', endDate: '' });
    setCreateOpen(true);
  };

  const onCreate = async (data: SeasonForm) => {
    if (!teamId || !canEdit) return;
    setActionLoading(true);
    try {
      if (createSeason) await createSeason(teamId, data.name, dateOnlyToISO(data.startDate), dateOnlyToISO(data.endDate));
      setCreateOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  // Edit form
  const { control: editControl, handleSubmit: handleEditSubmit, reset: resetEdit } = useForm<SeasonForm>({ defaultValues: { name: '', startDate: '', endDate: '', status: '' } });

  const openEdit = (season: ISeason) => {
    if (!canEdit) return;
    setCurrentSeason(season);
    // pre-fill date inputs with YYYY-MM-DD
    resetEdit({ name: season.name, startDate: isoToDateOnly(season.startDate), endDate: isoToDateOnly(season.endDate), status: season.status });
    setEditOpen(true);
  };

  const onEdit = async (data: SeasonForm) => {
    if (!currentSeason || !canEdit) return;
    setActionLoading(true);
    try {
      if (updateSeason) await updateSeason(currentSeason.id, data.name, dateOnlyToISO(data.startDate) || undefined, dateOnlyToISO(data.endDate) || undefined, (data.status as SeasonStatus) || undefined);
      setEditOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const openDelete = (season: ISeason) => {
    if (!canEdit) return;
    setCurrentSeason(season);
    setDeleteOpen(true);
  };

  const onDelete = async () => {
    if (!currentSeason || !deleteSeason || !canEdit) return;
    setActionLoading(true);
    try {
      await deleteSeason(currentSeason.id);
      setDeleteOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async (id: string) => {
    if (!canEdit || !updateSeason) return;
    setActionLoading(true);
    try {
      await updateSeason(id, undefined, undefined, undefined, SeasonStatus.Active);
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (id: string) => {
    if (!canEdit || !updateSeason) return;
    setActionLoading(true);
    try {
      await updateSeason(id, undefined, undefined, undefined, SeasonStatus.Completed);
    } finally {
      setActionLoading(false);
    }
  };

  const renderFilterFields = (filter: ISeasonFilterOption, setFilter: (f: ISeasonFilterOption) => void) => {
    return [
      <Grid key="name">
        <TextField
          fullWidth
          label={i18next.t('user.seasons.filter.name', 'Name')}
          value={filter.name ?? ''}
          onChange={(e) => setFilter({ ...filter, name: e.target.value })}
        />
      </Grid>,
      <Grid key="status">
        <TextField
          fullWidth
          select
          label={i18next.t('user.seasons.filter.status', 'Status')}
          value={filter.status ?? ''}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
        >
          <MenuItem value="">{i18next.t('admin.teams.filter.any','Any')}</MenuItem>
          <MenuItem value={SeasonStatus.Planned}>{i18next.t('user.seasons.status.planned','Planned')}</MenuItem>
          <MenuItem value={SeasonStatus.Active}>{i18next.t('user.seasons.status.active','Active')}</MenuItem>
          <MenuItem value={SeasonStatus.Completed}>{i18next.t('user.seasons.status.completed','Completed')}</MenuItem>
          <MenuItem value={SeasonStatus.Archived}>{i18next.t('user.seasons.status.archived','Archived')}</MenuItem>
        </TextField>
      </Grid>,
    ];
  };

  const renderRow = (season: ISeason) => {
    return [
      <TableCell key="name">{season.name}</TableCell>,
      <TableCell key="start">{season.startDate ? new Date(season.startDate).toLocaleDateString('de-CH') : '-'}</TableCell>,
      <TableCell key="end">{season.endDate ? new Date(season.endDate).toLocaleDateString('de-CH') : '-'}</TableCell>,
      <TableCell key="status"><Chip label={season.status} color={season.status === SeasonStatus.Active ? 'success' : season.status === SeasonStatus.Completed ? 'default' : 'warning'} /></TableCell>,
      <TableCell key="created">{new Date(season.createdAt).toLocaleString('de-CH')}</TableCell>,
      <TableCell key="updated">{season.updatedAt ? new Date(season.updatedAt).toLocaleString('de-CH') : '-'}</TableCell>,
    ];
  };

  const renderActions = (season: ISeason) => {
    const editBtn = (
      <Button key="edit" variant="contained" size="small" onClick={() => openEdit(season)} style={{ marginRight: 8 }} disabled={actionLoading || !canEdit}>
        {i18next.t('common.edit','Edit')}
      </Button>
    );

    const deleteBtn = (
      <Button key="delete" variant="contained" size="small" color="error" onClick={() => openDelete(season)} disabled={actionLoading || !canEdit}>
        {i18next.t('admin.actions.delete','Delete')}
      </Button>
    );

    const activateBtn = (
      <Button key="activate" variant="contained" size="small" color="success" onClick={() => handleActivate(season.id)} style={{ marginRight: 8 }} disabled={actionLoading || !canEdit}>
        {i18next.t('user.seasons.actions.activate','Activate')}
      </Button>
    );

    const completeBtn = (
      <Button key="complete" variant="contained" size="small" color="warning" onClick={() => handleComplete(season.id)} disabled={actionLoading || !canEdit}>
        {i18next.t('user.seasons.actions.complete','Complete')}
      </Button>
    );

    // Show activate for planned, complete for active. Always allow edit and delete.
    if (season.status === SeasonStatus.Planned) {
      return [editBtn, activateBtn, deleteBtn];
    }

    if (season.status === SeasonStatus.Active) {
      return [editBtn, completeBtn];
    }

    return [editBtn, deleteBtn];
  };

  return (
    <Paper className="seasons-page seasons-page-paper">
      <Box p={2}>
        <Typography variant="h5">{i18next.t('user.seasons.title','Seasons')}</Typography>
        <Box mt={2}>
          <ItemList<ISeason, ISeasonFilterOption>
            title={i18next.t('user.seasons.listTitle','Seasons')}
            columns={[i18next.t('user.seasons.columns.name','Name'), i18next.t('user.seasons.columns.start','Start'), i18next.t('user.seasons.columns.end','End'), i18next.t('user.seasons.columns.status','Status'), i18next.t('user.seasons.columns.created','Created'), i18next.t('user.seasons.columns.updated','Updated')]}
            initialFilter={initialFilter}
            rowsPerPage={10}
            fetch={fetchAdapter}
            initialFetchPaused={!allowFetch}
            create={openCreate}
            createDisabled={!canEdit}
            onEdit={(item) => openEdit(item)}
            renderFilterFields={renderFilterFields}
            renderRow={(item) => renderRow(item)}
            renderActions={(item) => renderActions(item as ISeason)}
            sortableFields={[{ field: 'name', label: i18next.t('user.seasons.columns.name','Name') }, { field: 'startDate', label: i18next.t('user.seasons.columns.start','Start') }, { field: 'endDate', label: i18next.t('user.seasons.columns.end','End') }]}
            items={seasons}
            count={count}
          />
        </Box>
      </Box>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{i18next.t('user.seasons.dialog.createTitle','Create Season')}</DialogTitle>
        <DialogContent>
          <Box mt={1}>
            <form id="create-season-form" onSubmit={handleCreateSubmit(onCreate)}>
              <Grid container spacing={2}>
                <Grid className="seasons-field-full">
                  <Controller name="name" control={createControl} rules={{ required: true }} render={({ field }) => (
                    <TextField fullWidth label={i18next.t('user.seasons.form.name','Name')} {...field} />
                  )} />
                </Grid>
                <Grid className="seasons-field-half">
                  <Controller name="startDate" control={createControl} render={({ field }) => (
                    <TextField fullWidth type="date" label={i18next.t('user.seasons.form.startDate','Start Date')} InputLabelProps={{ shrink: true }} {...field} />
                  )} />
                </Grid>
                <Grid className="seasons-field-half">
                  <Controller name="endDate" control={createControl} render={({ field }) => (
                    <TextField fullWidth type="date" label={i18next.t('user.seasons.form.endDate','End Date')} InputLabelProps={{ shrink: true }} {...field} />
                  )} />
                </Grid>
              </Grid>
            </form>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>{i18next.t('common.cancel','Cancel')}</Button>
          <Button type="submit" form="create-season-form" variant="contained" color="primary" disabled={actionLoading || !canEdit}>{i18next.t('common.create','Create')}</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{i18next.t('user.seasons.dialog.editTitle','Edit Season')}</DialogTitle>
        <DialogContent>
          <Box mt={1}>
            <form id="edit-season-form" onSubmit={handleEditSubmit(onEdit)}>
              <Grid container spacing={2}>
                <Grid className="seasons-field-full">
                  <Controller name="name" control={editControl} rules={{ required: true }} render={({ field }) => (
                    <TextField fullWidth label={i18next.t('user.seasons.form.name','Name')} {...field} />
                  )} />
                </Grid>
                <Grid className="seasons-field-half">
                  <Controller name="startDate" control={editControl} render={({ field }) => (
                    <TextField fullWidth type="date" label={i18next.t('user.seasons.form.startDate','Start Date')} InputLabelProps={{ shrink: true }} {...field} />
                  )} />
                </Grid>
                <Grid className="seasons-field-half">
                  <Controller name="endDate" control={editControl} render={({ field }) => (
                    <TextField fullWidth type="date" label={i18next.t('user.seasons.form.endDate','End Date')} InputLabelProps={{ shrink: true }} {...field} />
                  )} />
                </Grid>
                <Grid className="seasons-field-full">
                  <Controller name="status" control={editControl} render={({ field }) => (
                    <TextField select fullWidth label={i18next.t('user.seasons.form.status','Status')} {...field}>
                      <MenuItem value="">{i18next.t('admin.teams.filter.any','Any')}</MenuItem>
                      <MenuItem value={SeasonStatus.Planned}>{i18next.t('user.seasons.status.planned','Planned')}</MenuItem>
                      <MenuItem value={SeasonStatus.Active}>{i18next.t('user.seasons.status.active','Active')}</MenuItem>
                      <MenuItem value={SeasonStatus.Completed}>{i18next.t('user.seasons.status.completed','Completed')}</MenuItem>
                      <MenuItem value={SeasonStatus.Archived}>{i18next.t('user.seasons.status.archived','Archived')}</MenuItem>
                    </TextField>
                  )} />
                </Grid>
              </Grid>
            </form>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>{i18next.t('common.cancel','Cancel')}</Button>
          <Button type="submit" form="edit-season-form" variant="contained" color="primary" disabled={actionLoading || !canEdit}>{i18next.t('common.save','Save')}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{i18next.t('user.seasons.dialog.deleteTitle','Delete Season')}</DialogTitle>
        <DialogContent>
          <Typography>{i18next.t('user.seasons.dialog.deleteConfirm','Are you sure you want to delete this season?')}</Typography>
          <Box mt={2}>
            <Typography variant="subtitle2">{currentSeason?.name}</Typography>
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
