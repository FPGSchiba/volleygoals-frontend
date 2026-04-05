import React, { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  CircularProgress, TableCell, Chip, Avatar, Tooltip,
  Autocomplete
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenantStore } from '../../store/tenants';
import { useForm, Controller } from 'react-hook-form';
import { TenantLayout } from './TenantLayout';
import { ItemList } from '../../components/ItemList';
import { ITenantMember, ITeam, UserType, IUser } from '../../store/types';
import { ITeamFilterOption, IFilterOption } from '../../services/types';
import { useTeamStore } from '../../store/teams';
import { useCognitoUserStore } from '../../store/cognitoUser';
import VolleyGoalsAPI from '../../services/backend.api';

interface DummyMemberFilter extends IFilterOption { search?: string; }

export function TenantDetails() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();

  const currentTenant = useTenantStore(s => s.currentTenant);
  const tenantMembers = useTenantStore(s => s.tenantMembers);
  const loading = useTenantStore(s => s.loading);
  const getTenant = useTenantStore(s => s.getTenant);
  const addTenantMember = useTenantStore(s => s.addTenantMember);
  const removeTenantMember = useTenantStore(s => s.removeTenantMember);
  const createTenantedTeam = useTenantStore(s => s.createTenantedTeam);

  const fetchTeams = useTeamStore(s => s.fetchTeams);
  const teams = useTeamStore(s => s.teamList.teams);
  const teamsCount = useTeamStore(s => s.teamList.count);
  const updateTeam = useTeamStore(s => s.updateTeam);

  const currentUser = useCognitoUserStore(s => s.user);
  const isGlobalAdmin = currentUser?.userType === UserType.Admin;

  const [actionLoading, setActionLoading] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [associateTeamOpen, setAssociateTeamOpen] = useState(false);
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);

  // User search logic for Autocomplete
  const [userOptions, setUserOptions] = useState<IUser[]>([]);
  const [userSearchText, setUserSearchText] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (!addMemberOpen || userSearchText.length < 2) return;
    const timer = setTimeout(() => {
      setLoadingUsers(true);
      const isEmail = userSearchText.includes('@');
      const filterStr = isEmail ? `email ^= "${userSearchText}"` : `name ^= "${userSearchText}"`;
      const fetchParams = { filter: filterStr, limit: 10 };
      console.log('[TenantDetails] triggering fetchUsers with:', fetchParams);
      VolleyGoalsAPI.fetchUsers(fetchParams).then(res => {
        console.log('[TenantDetails] fetchUsers result:', res);
        setUserOptions(res.users || []);
      }).catch(err => {
        console.error('[TenantDetails] fetchUsers error:', err);
      }).finally(() => setLoadingUsers(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchText, addMemberOpen]);

  // Teams search logic for Association Autocomplete
  const [teamOptions, setTeamOptions] = useState<ITeam[]>([]);
  const [teamSearchText, setTeamSearchText] = useState('');
  const [loadingTeams, setLoadingTeams] = useState(false);

  useEffect(() => {
    if (!associateTeamOpen || teamSearchText.length < 2) return;
    const timer = setTimeout(() => {
      setLoadingTeams(true);
      VolleyGoalsAPI.listTeams({ name: teamSearchText, limit: 10 }).then(res => {
        // ideally filter by where tenantId is empty on the backend or filter here
        const unassociated = (res.items || []).filter(t => !t.tenantId);
        setTeamOptions(unassociated);
      }).finally(() => setLoadingTeams(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [teamSearchText, associateTeamOpen]);


  const { control: memberControl, handleSubmit: handleMemberSubmit, reset: resetMember } = useForm<{ userId: string; role: 'admin' | 'member' }>({ defaultValues: { userId: '', role: 'member' } });
  const { control: teamControl, handleSubmit: handleTeamSubmit, reset: resetTeam } = useForm<{ name: string }>({ defaultValues: { name: '' } });
  const { control: associateControl, handleSubmit: handleAssociateSubmit, reset: resetAssociate } = useForm<{ teamId: string }>({ defaultValues: { teamId: '' } });

  useEffect(() => {
    if (tenantId) getTenant(tenantId);
  }, [tenantId, getTenant]);

  const onAddMember = async (data: { userId: string; role: 'admin' | 'member' }) => {
    if (!tenantId) return;
    setActionLoading(true);
    try {
      await addTenantMember(tenantId, data.userId, data.role);
      setAddMemberOpen(false);
      resetMember({ userId: '', role: 'member' });
      setUserSearchText('');
    } finally {
      setActionLoading(false);
    }
  };

  const onRemoveMemberConfirm = async () => {
    if (!tenantId || !removeMemberId) return;
    setActionLoading(true);
    try {
      await removeTenantMember(tenantId, removeMemberId);
      setRemoveMemberId(null);
    } finally {
      setActionLoading(false);
    }
  };

  const onCreateTeam = async (data: { name: string }) => {
    if (!tenantId) return;
    setActionLoading(true);
    try {
      await createTenantedTeam(tenantId, data.name);
      setCreateTeamOpen(false);
      resetTeam({ name: '' });
      await fetchTeams({ tenantId });
    } finally {
      setActionLoading(false);
    }
  };

  const onAssociateTeam = async (data: { teamId: string }) => {
    if (!tenantId) return;
    setActionLoading(true);
    try {
      await updateTeam(data.teamId, undefined, undefined, tenantId);
      setAssociateTeamOpen(false);
      resetAssociate({ teamId: '' });
      setTeamSearchText('');
      await fetchTeams({ tenantId });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !currentTenant) return <Box p={3}><CircularProgress /></Box>;

  return (
    <TenantLayout currentTab={0}>
      <Box mb={4}>
        <ItemList<ITenantMember, DummyMemberFilter>
          title="Members"
          columns={['Member', 'Role', 'Status', 'Created At']}
          initialFilter={{}}
          rowsPerPage={10}
          create={() => { resetMember({ userId: '', role: 'member' }); setAddMemberOpen(true); }}
          createDisabled={!isGlobalAdmin}
          renderFilterFields={(draft, setDraft) => (
            <TextField size="small" label="Search User" value={draft.search ?? ''} onChange={e => setDraft({ ...draft, search: e.target.value })} />
          )}
          fetch={async (filter) => {
            let resItems = tenantMembers;
            if (filter?.search) {
              const q = filter.search.toLowerCase();
              resItems = resItems.filter(m =>
                m.userId.toLowerCase().includes(q) ||
                (m.user?.name && m.user.name.toLowerCase().includes(q)) ||
                (m.user?.email && m.user.email.toLowerCase().includes(q))
              );
            }
            return { items: resItems, count: resItems.length };
          }}
          renderRow={(m) => {
            const displayName = m.user?.name || m.user?.email || m.userId;
            const pictureSrc = m.user?.picture;
            const avatarLetter = displayName[0]?.toUpperCase() || 'U';

            return [
              <TableCell key="userId">
                <Box display="flex" alignItems="center" gap={1.5}>
                  <Avatar src={pictureSrc} alt={displayName} sx={{ width: 32, height: 32 }}>
                    {!pictureSrc && avatarLetter}
                  </Avatar>
                  <Box>
                    <Typography variant="body2">{displayName}</Typography>
                    {m.user?.email && m.user.name && m.user.email !== m.user.name && (
                      <Typography variant="caption" color="text.secondary">{m.user.email}</Typography>
                    )}
                    {(!m.user || (!m.user.name && !m.user.email)) && (
                      <Typography variant="caption" color="text.secondary">ID: {m.userId}</Typography>
                    )}
                  </Box>
                </Box>
              </TableCell>,
              <TableCell key="role">{m.role}</TableCell>,
              <TableCell key="status"><Chip size="small" label={m.status} color={m.status === 'active' ? 'success' : 'default'} /></TableCell>,
              <TableCell key="created">{m.createdAt ? new Date(m.createdAt).toLocaleString('de-CH') : '-'}</TableCell>,
            ]
          }}
          renderActions={(m) => (
            <Button key="remove" size="small" color="error" onClick={() => setRemoveMemberId(m.id)}>Remove</Button>
          )}
          items={tenantMembers}
          count={tenantMembers.length}
        />
      </Box>

      <Box>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6">Teams</Typography>
          <Box display="flex" gap={1}>
            <Tooltip title={!isGlobalAdmin ? 'Only admins can associate existing teams' : ''}>
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={!isGlobalAdmin}
                  onClick={() => { resetAssociate({ teamId: '' }); setAssociateTeamOpen(true); }}
                >
                  Associate Existing
                </Button>
              </span>
            </Tooltip>
            <Button variant="contained" size="small" onClick={() => { resetTeam({ name: '' }); setCreateTeamOpen(true); }}>
              Create New
            </Button>
          </Box>
        </Box>
        <ItemList<ITeam, ITeamFilterOption>
          title=""
          columns={['Name', 'Status', 'Created At']}
          initialFilter={{ tenantId: tenantId ?? '' }}
          rowsPerPage={10}
          createDisabled={true} // Replaced with custom buttons above for two options
          renderFilterFields={(draft, setDraft) => (
            <TextField size="small" label="Search Team Name" value={draft.name ?? ''} onChange={e => setDraft({ ...draft, name: e.target.value })} />
          )}
            fetch={async (filter) => {
              await fetchTeams({ ...filter, tenantId });
              return { items: [], count: 0 };
            }}
            renderRow={(t) => [
            <TableCell key="name">{t.name}</TableCell>,
            <TableCell key="status"><Chip size="small" label={t.status} color={t.status === 'active' ? 'success' : 'default'} /></TableCell>,
            <TableCell key="created">{t.createdAt ? new Date(t.createdAt).toLocaleString('de-CH') : '-'}</TableCell>,
          ]}
            renderActions={(t) => (
               <Button key="view" size="small" onClick={() => navigate(`/teams/${t.id}`)}>View</Button>
            )}
            items={teams || []}
            count={teamsCount || 0}
          />
        </Box>

      <Dialog open={addMemberOpen} onClose={() => setAddMemberOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleMemberSubmit(onAddMember)}>
          <DialogTitle>Add Member</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              <Controller
                name="userId"
                control={memberControl}
                rules={{
                  required: 'User is required',
                  validate: value => {
                    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    return uuidRegex.test(value) || 'Please select a valid user from the list';
                  }
                }}
                render={({ field, fieldState }) => (
                <Autocomplete
                  {...field}
                  freeSolo
                  options={userOptions}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    return option.name ? `${option.name} (${option.email})` : option.email;
                  }}
                  loading={loadingUsers}
                  onInputChange={(_, newInputValue) => setUserSearchText(newInputValue)}
                  onChange={(_, value) => {
                    const id = typeof value === 'string' ? value : value?.id;
                    field.onChange(id || '');
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Search User (by Name or Email)"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message || "Type at least 2 characters"}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <React.Fragment>
                            {loadingUsers ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </React.Fragment>
                        ),
                      }}
                    />
                  )}
                />
              )}
            />
            <Controller name="role" control={memberControl} render={({ field }) => (
                <TextField {...field} select fullWidth label="Role">
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="member">Member</MenuItem>
                </TextField>
              )} />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddMemberOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={actionLoading}>Add</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={!!removeMemberId} onClose={() => setRemoveMemberId(null)}>
        <DialogTitle>Remove Member</DialogTitle>
        <DialogContent><Typography>Remove this member from the tenant?</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveMemberId(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={onRemoveMemberConfirm} disabled={actionLoading}>Remove</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createTeamOpen} onClose={() => setCreateTeamOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleTeamSubmit(onCreateTeam)}>
          <DialogTitle>Create Team</DialogTitle>
          <DialogContent>
            <Controller
              name="name"
              control={teamControl}
              rules={{ required: 'Team name is required' }}
              render={({ field, fieldState }) => (
                <TextField {...field} autoFocus fullWidth label="Team Name" error={!!fieldState.error} helperText={fieldState.error?.message} sx={{ mt: 1 }} />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateTeamOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={actionLoading}>Create</Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={associateTeamOpen} onClose={() => setAssociateTeamOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleAssociateSubmit(onAssociateTeam)}>
          <DialogTitle>Associate Existing Team</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Controller
              name="teamId"
              control={associateControl}
              rules={{ required: 'Target team is required' }}
              render={({ field, fieldState }) => (
                <Autocomplete
                  {...field}
                  freeSolo
                  options={teamOptions}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option;
                    return option.name;
                  }}
                  loading={loadingTeams}
                  onInputChange={(_, newInputValue) => setTeamSearchText(newInputValue)}
                  onChange={(_, value) => {
                    const id = typeof value === 'string' ? value : value?.id;
                    field.onChange(id || '');
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Search unassociated team"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message || "Type at least 2 characters"}
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <React.Fragment>
                            {loadingTeams ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </React.Fragment>
                        ),
                      }}
                    />
                  )}
                />
              )}
            />
          </DialogContent>
          <DialogActions>
             <Button onClick={() => setAssociateTeamOpen(false)}>Cancel</Button>
             <Button type="submit" variant="contained" disabled={actionLoading}>Associate</Button>
          </DialogActions>
        </form>
      </Dialog>

    </TenantLayout>
  );
}
