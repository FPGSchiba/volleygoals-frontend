import React, { useMemo, useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Grid, MenuItem, Paper, TableCell, TextField, Typography,
  InputAdornment, IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { Controller, useForm } from 'react-hook-form';
import { ItemList, FetchResult } from '../../components/ItemList';
import { ITeamUser } from '../../store/types';
import { ITeamMemberFilterOption } from '../../services/types';
import { useTeamStore } from '../../store/teams';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { usePermission } from '../../hooks/usePermission';
import VolleyGoalsAPI from '../../services/backend.api';
import i18next from 'i18next';

type MemberEditForm = { role: string; status: string; };

export function Members() {
  const fetchTeamMembers = useTeamStore((s) => s.fetchTeamMembers);
  const teamMembers = useTeamStore((s) => s.teamMembers) || [];
  const selectedTeam = useCognitoUserStore((s) => s.selectedTeam);
  const currentUser = useCognitoUserStore((s) => s.user);
  const teamId = selectedTeam?.team?.id || '';
  const userRole = selectedTeam?.role as string | undefined;
  const canWrite = usePermission('members:write');
  const canManage = canWrite;

  const [allowFetch, setAllowFetch] = React.useState<boolean>(!!selectedTeam);
  React.useEffect(() => setAllowFetch(!!selectedTeam), [selectedTeam]);

  const [membersCount, setMembersCount] = React.useState(0);
  const [memberSearch, setMemberSearch] = useState('');
  const initialFilter: ITeamMemberFilterOption = useMemo(() => ({}), []);

  // Client-side filtered members
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return teamMembers;
    const lower = memberSearch.toLowerCase();
    return teamMembers.filter(m =>
      (m.name || '').toLowerCase().includes(lower) ||
      (m.preferredUsername || '').toLowerCase().includes(lower) ||
      m.email.toLowerCase().includes(lower)
    );
  }, [teamMembers, memberSearch]);

  const fetchAdapter = async (filter?: ITeamMemberFilterOption): Promise<FetchResult<ITeamUser>> => {
    if (!teamId) return { items: [], count: 0 };
    const result = await fetchTeamMembers(teamId, filter || {});
    setMembersCount(result.count);
    return { items: result.items, count: result.count };
  };

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [currentMember, setCurrentMember] = useState<ITeamUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { control, handleSubmit, reset } = useForm<MemberEditForm>({ defaultValues: { role: '', status: '' } });

  const openEdit = (m: ITeamUser) => {
    setCurrentMember(m);
    reset({ role: m.role, status: m.status });
    setEditOpen(true);
  };

  const onEdit = async (data: MemberEditForm) => {
    if (!currentMember || !teamId) return;
    setActionLoading(true);
    try {
      await VolleyGoalsAPI.updateMembership(currentMember.id, teamId, data.role, data.status);
      setEditOpen(false);
      await fetchTeamMembers(teamId, {});
    } finally {
      setActionLoading(false);
    }
  };

  const onRemove = async () => {
    if (!currentMember || !teamId) return;
    setActionLoading(true);
    try {
      await VolleyGoalsAPI.deleteMembership(currentMember.id, teamId);
      setDeleteOpen(false);
      await fetchTeamMembers(teamId, {});
    } finally {
      setActionLoading(false);
    }
  };

  const renderRow = (m: ITeamUser) => [
    <TableCell key="name">{m.name || m.preferredUsername || m.email}</TableCell>,
    <TableCell key="email">{m.email}</TableCell>,
    <TableCell key="role"><Chip label={m.role} size="small" /></TableCell>,
    <TableCell key="status"><Chip label={m.status} size="small" color={m.status === 'active' ? 'success' : 'default'} /></TableCell>,
    <TableCell key="joined">{m.joinedAt ? new Intl.DateTimeFormat('de-CH', { dateStyle: 'short' }).format(new Date(m.joinedAt)) : '-'}</TableCell>,
  ];

  const renderActions = (m: ITeamUser): React.ReactElement[] => {
    if (!canManage) return [];
    const isSelf = currentUser?.id === m.id;
    return [
      <Button key="edit" size="small" variant="contained" onClick={() => openEdit(m)} style={{ marginRight: 8 }} disabled={isSelf || actionLoading}>
        {i18next.t('common.edit', 'Edit')}
      </Button>,
      m.status !== 'removed' ? (
        <Button key="remove" size="small" variant="contained" color="error" onClick={() => { setCurrentMember(m); setDeleteOpen(true); }}>
          {i18next.t('members.remove', 'Remove')}
        </Button>
      ) : null,
    ].filter((x): x is React.ReactElement => x !== null);
  };

  return (
    <Paper sx={{ borderRadius: 3 }}>
      <Box p={{ xs: 2, sm: 3 }}>
        <Typography variant="h5" fontWeight={600}>{i18next.t('members.title', 'Team Members')}</Typography>

        {/* Search bar */}
        <Box mt={2}>
          <TextField
            size="small"
            fullWidth
            placeholder={i18next.t('members.search', 'Search by name or email...')}
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            sx={{ maxWidth: 400, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              endAdornment: memberSearch ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setMemberSearch('')}><ClearIcon fontSize="small" /></IconButton>
                </InputAdornment>
              ) : null,
            }}
          />
        </Box>

        <Box mt={2}>
          <ItemList<ITeamUser, ITeamMemberFilterOption>
            title={i18next.t('members.title', 'Team Members')}
            columns={[
              i18next.t('profile.name', 'Name'),
              i18next.t('admin.user.email', 'Email'),
              i18next.t('members.role', 'Role'),
              i18next.t('members.status', 'Status'),
              i18next.t('members.joinedAt', 'Joined'),
            ]}
            initialFilter={initialFilter}
            rowsPerPage={10}
            fetch={fetchAdapter}
            initialFetchPaused={!allowFetch}
            renderFilterFields={(f, setF) => [
              <Grid key="role">
                <TextField select fullWidth label={i18next.t('members.role', 'Role')} value={f.role ?? ''} onChange={(e) => setF({ ...f, role: e.target.value })}>
                  <MenuItem value="">{i18next.t('admin.teams.filter.any', 'Any')}</MenuItem>
                  <MenuItem value="admin">admin</MenuItem>
                  <MenuItem value="trainer">trainer</MenuItem>
                  <MenuItem value="member">member</MenuItem>
                </TextField>
              </Grid>,
              <Grid key="status">
                <TextField select fullWidth label={i18next.t('members.status', 'Status')} value={f.status ?? ''} onChange={(e) => setF({ ...f, status: e.target.value })}>
                  <MenuItem value="">{i18next.t('admin.teams.filter.any', 'Any')}</MenuItem>
                  <MenuItem value="active">active</MenuItem>
                  <MenuItem value="removed">removed</MenuItem>
                </TextField>
              </Grid>,
            ]}
            renderRow={(item) => renderRow(item)}
            renderActions={(item) => renderActions(item as ITeamUser)}
            sortableFields={[]}
            items={filteredMembers}
            count={filteredMembers.length}
          />
        </Box>
      </Box>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{i18next.t('members.editMember', 'Edit Member')}</DialogTitle>
        <DialogContent>
          <form id="member-edit-form" onSubmit={handleSubmit(onEdit)}>
            <Box mt={1} display="flex" flexDirection="column" gap={2}>
              <Controller name="role" control={control} render={({ field }) => (
                <TextField select fullWidth label={i18next.t('members.role', 'Role')} {...field}>
                  {userRole === 'admin' && <MenuItem value="admin">admin</MenuItem>}
                  <MenuItem value="trainer">trainer</MenuItem>
                  <MenuItem value="member">member</MenuItem>
                </TextField>
              )} />
              <Controller name="status" control={control} render={({ field }) => (
                <TextField select fullWidth label={i18next.t('members.status', 'Status')} {...field}>
                  <MenuItem value="active">active</MenuItem>
                  <MenuItem value="removed">removed</MenuItem>
                </TextField>
              )} />
            </Box>
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>{i18next.t('common.cancel', 'Cancel')}</Button>
          <Button type="submit" form="member-edit-form" variant="contained" disabled={actionLoading}>{i18next.t('common.save', 'Save')}</Button>
        </DialogActions>
      </Dialog>

      {/* Remove Confirm Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>{i18next.t('members.remove', 'Remove')}</DialogTitle>
        <DialogContent>
          <Typography>{i18next.t('members.removeConfirm', 'Remove this member from the team?')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>{i18next.t('common.cancel', 'Cancel')}</Button>
          <Button variant="contained" color="error" onClick={onRemove} disabled={actionLoading}>{i18next.t('members.remove', 'Remove')}</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
