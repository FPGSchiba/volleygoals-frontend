import * as React from 'react';
import { useEffect, useState } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { useUsersStore } from '../../store/users';
import { useTeamStore } from '../../store/teams';
import { useLoading } from '../../hooks/useLoading';
import { ItemList, FetchResult } from '../../components/ItemList';
import i18next from 'i18next';

// MUI
import {
  Box,
  Typography,
  Card,
  CardContent,
  Paper,
  Chip,
  Avatar,
  Button,
  IconButton,
  TableCell,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Divider,
  Switch,
  FormControlLabel,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {ITeamMember, TeamMemberStatus, RoleType, UserType} from '../../store/types';
import { IFilterOption } from '../../services/types';
import { useForm, Controller } from 'react-hook-form';

export function UserDetails() {
  const { userId } = useParams<{ userId?: string }>();
  const getUser = useUsersStore(state => state.getUser);
  const updateUser = useUsersStore(state => state.updateUser);
  const deleteMembership = useUsersStore(state => state.deleteMembership);
  const updateMembership = useUsersStore(state => state.updateMembership);
  const createMembership = useUsersStore(state => state.createMembership);
  const currentUser = useUsersStore(state => state.currentUser);
  const memberships = useUsersStore(state => state.currentUserMemberships) || [];
  const navigate = useNavigate();
  const { loading, setLoading, Loading } = useLoading(true);

  const teamList = useTeamStore(state => state.teamList?.teams || []);
  const fetchTeams = useTeamStore(state => state.fetchTeams);

  // Dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<ITeamMember | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        if (userId) await getUser(userId);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false };
  }, [userId]);

  // Ensure teams are available for the add dialog
  useEffect(() => {
    if (teamList.length === 0) {
      fetchTeams({} as any).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onAddMembership = async () => {
    setAddOpen(true);
  };
  const onEditMembership = async (m: ITeamMember) => {
    setSelectedMembership(m);
    setEditOpen(true);
  };
  const onDeleteMembership = async (id: string) => {
    const m = memberships.find(x => x.id === id);
    setSelectedMembership(m || null);
    setDeleteOpen(true);
  };

  const fetchMemberships = async (_filter?: IFilterOption): Promise<FetchResult<ITeamMember>> => {
    // Fetches come from getUser (server-driven); ensure current store state is returned
    // Optionally refresh from server if userId provided
    if (userId) {
      await getUser(userId);
    }
    const items = useUsersStore.getState().currentUserMemberships || [];
    return { items, count: items.length };
  };

  const renderMembershipRow = (m: ITeamMember) => {
    const idKey = m.id || m.teamId || Math.random().toString(36).slice(2, 9);
    const roleColor = (() => {
      switch (m.role) {
        case 'admin':
          return 'primary';
        case 'trainer':
          return 'secondary';
        default:
          return 'default';
      }
    })();

    return [
      <TableCell key={`${idKey}-team`} component="td">
        <Link component={RouterLink} to={`/teams/${m.teamId}`}>{m.teamId}</Link>
      </TableCell>,
      <TableCell key={`${idKey}-role`} component="td">
        <Chip label={m.role} color={roleColor as any} size="small" />
      </TableCell>,
      <TableCell key={`${idKey}-status`} component="td">
        <Chip label={m.status} color={m.status === TeamMemberStatus.Active ? 'success' : 'default'} size="small" />
      </TableCell>,
      <TableCell key={`${idKey}-joined`} component="td">{m.joinedAt ? new Date(m.joinedAt).toLocaleString('de-CH') : '-'}</TableCell>,
      <TableCell key={`${idKey}-updated`} component="td">{m.updatedAt ? new Date(m.updatedAt).toLocaleString('de-CH') : '-'}</TableCell>,
    ];
  };

  const renderMembershipActions = (m: ITeamMember) => {
    return [
      <Button key="edit" variant="contained" size="small" onClick={() => onEditMembership(m)} style={{ marginRight: 8 }}>{i18next.t('common.edit','Edit')}</Button>,
      <Button key="delete" variant="contained" size="small" color="error" onClick={() => onDeleteMembership(m.id)}>{i18next.t('common.delete','Delete')}</Button>
    ];
  };

  // Add Dialog form
  type AddForm = { teamId: string; role: string };
  const { control: addControl, handleSubmit: handleAddSubmit, reset: resetAdd } = useForm<AddForm>({ defaultValues: { teamId: '', role: RoleType.Member } as any });
  const submitAdd = async (data: AddForm) => {
    if (!userId) return;
    await createMembership(data.teamId, userId, data.role);
    // Refresh memberships from server
    await getUser(userId);
    setAddOpen(false);
    resetAdd();
  };

  // Edit Dialog form
  type EditForm = { role: string; status: string };
  const { control: editControl, handleSubmit: handleEditSubmit, reset: resetEdit } = useForm<EditForm>({ defaultValues: { role: RoleType.Member, status: TeamMemberStatus.Active } as any });
  useEffect(() => {
    if (selectedMembership && editOpen) {
      resetEdit({ role: selectedMembership.role, status: selectedMembership.status });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMembership, editOpen]);

  const submitEdit = async (data: EditForm) => {
    if (!selectedMembership) return;
    await updateMembership(selectedMembership.id, selectedMembership.teamId, data.role, data.status);
    if (userId) await getUser(userId);
    setEditOpen(false);
    setSelectedMembership(null);
  };

  // Delete confirm
  const confirmDelete = async () => {
    if (!selectedMembership || !userId) return;
    await deleteMembership(selectedMembership.id, selectedMembership.teamId);
    await getUser(userId);
    setDeleteOpen(false);
    setSelectedMembership(null);
  };

  // user edit form (enabled + userType)
  type UserForm = { enabled: boolean; userType: UserType };
  const { control: userControl, handleSubmit: handleUserSubmit, reset: resetUser } = useForm<UserForm>({
    defaultValues: { enabled: currentUser?.enabled ?? false, userType: currentUser?.userType ?? UserType.User } as any
  });
  const [savingUser, setSavingUser] = useState(false);

  useEffect(() => {
    // reset form when currentUser loads
    resetUser({ enabled: currentUser?.enabled ?? false, userType: currentUser?.userType ?? UserType.User } as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const submitUser = async (data: UserForm) => {
    if (!userId) return;
    setSavingUser(true);
    try {
      // updateUser expects IUserUpdate type; cast to any to include enabled/userType
      await updateUser(userId, data as any);
      // refresh
      await getUser(userId);
    } finally {
      setSavingUser(false);
    }
  };

  return (
    <Box p={3} className="user-details-root">
      <Loading />

      {!loading && !currentUser && (
        <Card>
          <CardContent>
            <Typography variant="h6">{i18next.t('admin.userDetails.couldNotLoad', 'Could not load cognitoUser.')}</Typography>
            <Box mt={2}>
              <Button variant="outlined" onClick={() => navigate('/users')}>{i18next.t('admin.actions.goToUsers', 'Go to Users')}</Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {!loading && currentUser && (
        <Box className="user-details-inner">
          <Paper elevation={3} className="user-details-paper">
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={1}>
                <IconButton size="small" component={RouterLink} to="/users">
                  <ArrowBackIcon />
                </IconButton>
                <Typography variant="h5">{i18next.t('admin.userDetails.title', 'User Details')}</Typography>
              </Box>
            </Box>

            <Box className="user-details-row">
              {/* Left column: avatar */}
              <Box className="user-avatar-column">
                <Avatar src={currentUser.picture} alt={currentUser.name || currentUser.email} className="user-avatar" />
                <Box mt={1}>
                  <Typography variant="subtitle1">{currentUser.name ?? currentUser.preferredUsername ?? currentUser.email}</Typography>
                </Box>
              </Box>

              <Divider orientation="vertical" flexItem />

              {/* Middle column: information formatted as before (fixed size so the form sits adjacent) */}
              <Box className="user-info-column">
                <Box display="flex" gap={2} mb={1}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">{i18next.t('admin.cognitoUser.email', 'Email')}</Typography>
                    <Typography>{currentUser.email}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">{i18next.t('admin.cognitoUser.created', 'Created')}</Typography>
                    <Typography>{currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleString('de-CH') : '-'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">{i18next.t('admin.cognitoUser.updated', 'Updated')}</Typography>
                    <Typography>{currentUser.updatedAt ? new Date(currentUser.updatedAt).toLocaleString('de-CH') : '-'}</Typography>
                  </Box>
                </Box>

                <Box display="flex" gap={2} alignItems="center">
                  <Box>
                    <Typography variant="body2" color="text.secondary">{i18next.t('admin.cognitoUser.status', 'Status')}</Typography>
                    <Box mt={0.5}><Chip label={currentUser.enabled ? i18next.t('common.active','active') : i18next.t('common.inactive','inactive')} color={currentUser.enabled ? 'success' : 'default'} /></Box>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary">{i18next.t('admin.cognitoUser.type', 'Type')}</Typography>
                    <Box mt={0.5}><Chip label={currentUser.userType} color={currentUser.userType === 'ADMINS' ? 'primary' : 'default'} /></Box>
                  </Box>
                </Box>
              </Box>

              <Divider orientation="vertical" flexItem />

              {/* Right column: controls (form) - moved adjacent to information with a small left margin */}
              <Box className="user-form-column">
                <Box component="form" onSubmit={handleUserSubmit(submitUser)} className="user-form">
                  <Controller
                    name="enabled"
                    control={userControl}
                    render={({ field }) => (
                      <FormControlLabel
                        control={<Switch checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} color="primary" />}
                        label={i18next.t('admin.cognitoUser.status','Status')}
                      />
                    )}
                  />

                  <Controller
                    name="userType"
                    control={userControl}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel id="user-type-label">{i18next.t('admin.cognitoUser.type','Type')}</InputLabel>
                        <Select {...field} labelId="user-type-label" label={i18next.t('admin.cognitoUser.type','Type')}>
                          <MenuItem value={UserType.Admin}>{i18next.t('roles.admin','Admin')}</MenuItem>
                          <MenuItem value={UserType.User}>{i18next.t('roles.member','User')}</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />

                  <Box>
                    <Button type="submit" variant="contained" color="primary" disabled={savingUser} fullWidth>
                      {i18next.t('common.save','Save')}
                    </Button>
                  </Box>
                </Box>
              </Box>
             </Box>
          </Paper>

          <Paper elevation={1} className="memberships-paper">
            <Typography variant="h6">{i18next.t('admin.memberships.title', 'Memberships')}</Typography>
            <Typography color="text.secondary" mb={1}>{i18next.t('admin.memberships.subtitle', 'Manage memberships for this cognitoUser.')}</Typography>

            <ItemList<ITeamMember, IFilterOption>
              title={i18next.t('admin.memberships.title','Memberships')}
              columns={[i18next.t('admin.memberships.columns.team','Team'),i18next.t('admin.memberships.columns.role','Role'),i18next.t('admin.memberships.columns.status','Status'),i18next.t('admin.memberships.columns.joined','Joined'),i18next.t('admin.memberships.columns.updated','Updated')]}
              initialFilter={{} as IFilterOption}
              rowsPerPage={10}
              fetch={fetchMemberships}
              create={onAddMembership}
              createDisabled={currentUser?.userType === UserType.Admin}
              onEdit={onEditMembership}
              onDelete={onDeleteMembership}
              renderRow={(m) => renderMembershipRow(m)}
              renderActions={(m) => renderMembershipActions(m)}
              items={memberships}
              count={memberships.length}
            />
          </Paper>
        </Box>
      )}

      {/* Add Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{i18next.t('admin.memberships.createTitle', 'Add Membership')}</DialogTitle>
        <DialogContent>
          <Box mt={1}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="team-select-label">{i18next.t('admin.memberships.teamLabel','Team')}</InputLabel>
              <Controller
                name="teamId"
                control={addControl}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select {...field} labelId="team-select-label" label={i18next.t('admin.memberships.teamLabel','Team')}>
                    {teamList.map(t => (
                      <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                    ))}
                  </Select>
                )}
              />
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel id="role-select-label">{i18next.t('admin.memberships.roleLabel','Role')}</InputLabel>
              <Controller
                name="role"
                control={addControl}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select {...field} labelId="role-select-label" label={i18next.t('admin.memberships.roleLabel','Role')}>
                    <MenuItem value={RoleType.Member}>{i18next.t('roles.member','Member')}</MenuItem>
                    <MenuItem value={RoleType.Trainer}>{i18next.t('roles.trainer','Trainer')}</MenuItem>
                    <MenuItem value={RoleType.Admin}>{i18next.t('roles.admin','Admin')}</MenuItem>
                  </Select>
                )}
              />
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>{i18next.t('common.cancel','Cancel')}</Button>
          <Button onClick={handleAddSubmit(submitAdd)} variant="contained">{i18next.t('common.create','Create')}</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => { setEditOpen(false); setSelectedMembership(null); }} fullWidth maxWidth="sm">
        <DialogTitle>{i18next.t('admin.memberships.editTitle', 'Edit Membership')}</DialogTitle>
        <DialogContent>
          <Box mt={1}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="edit-role-select-label">{i18next.t('admin.memberships.roleLabel','Role')}</InputLabel>
              <Controller
                name="role"
                control={editControl}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select {...field} labelId="edit-role-select-label" label={i18next.t('admin.memberships.roleLabel','Role')}>
                    <MenuItem value={RoleType.Member}>{i18next.t('roles.member','Member')}</MenuItem>
                    <MenuItem value={RoleType.Trainer}>{i18next.t('roles.trainer','Trainer')}</MenuItem>
                    <MenuItem value={RoleType.Admin}>{i18next.t('roles.admin','Admin')}</MenuItem>
                  </Select>
                )}
              />
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel id="edit-status-select-label">{i18next.t('admin.memberships.statusLabel','Status')}</InputLabel>
              <Controller
                name="status"
                control={editControl}
                rules={{ required: true }}
                render={({ field }) => (
                  <Select {...field} labelId="edit-status-select-label" label={i18next.t('admin.memberships.statusLabel','Status')}>
                    <MenuItem value={TeamMemberStatus.Active}>{i18next.t('statuses.active','active')}</MenuItem>
                    <MenuItem value={TeamMemberStatus.Invited}>{i18next.t('statuses.invited','invited')}</MenuItem>
                    <MenuItem value={TeamMemberStatus.Left}>{i18next.t('statuses.left','left')}</MenuItem>
                    <MenuItem value={TeamMemberStatus.Removed}>{i18next.t('statuses.removed','removed')}</MenuItem>
                  </Select>
                )}
              />
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditOpen(false); setSelectedMembership(null); }}>{i18next.t('common.cancel','Cancel')}</Button>
          <Button onClick={handleEditSubmit(submitEdit)} variant="contained">{i18next.t('common.save','Save')}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteOpen} onClose={() => { setDeleteOpen(false); setSelectedMembership(null); }}>
        <DialogTitle>{i18next.t('admin.memberships.deleteTitle','Delete Membership')}</DialogTitle>
        <DialogContent>
          <Typography>{i18next.t('admin.memberships.deleteConfirm','Are you sure you want to remove this membership?')}</Typography>
          {selectedMembership && (
            <Typography mt={2}>{i18next.t('admin.memberships.teamLabel','Team')}: {selectedMembership.teamId}</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteOpen(false); setSelectedMembership(null); }}>{i18next.t('common.cancel','Cancel')}</Button>
          <Button onClick={confirmDelete} variant="contained" color="error">{i18next.t('common.delete','Delete')}</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
