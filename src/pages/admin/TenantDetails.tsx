import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableBody, TableRow, TableCell,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  IconButton, Tabs, Tab, CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenantStore } from '../../store/tenants';
import { useForm, Controller } from 'react-hook-form';

export function TenantDetails() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();

  const currentTenant = useTenantStore(s => s.currentTenant);
  const tenantMembers = useTenantStore(s => s.tenantMembers);
  const loading = useTenantStore(s => s.loading);
  const getTenant = useTenantStore(s => s.getTenant);
  const updateTenant = useTenantStore(s => s.updateTenant);
  const addTenantMember = useTenantStore(s => s.addTenantMember);
  const removeTenantMember = useTenantStore(s => s.removeTenantMember);
  const createTenantedTeam = useTenantStore(s => s.createTenantedTeam);

  const [editingName, setEditingName] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);

  const { control: nameControl, handleSubmit: handleNameSubmit, reset: resetName } = useForm<{ name: string }>({ defaultValues: { name: '' } });
  const { control: memberControl, handleSubmit: handleMemberSubmit, reset: resetMember } = useForm<{ userId: string; role: 'admin' | 'member' }>({ defaultValues: { userId: '', role: 'member' } });
  const { control: teamControl, handleSubmit: handleTeamSubmit, reset: resetTeam } = useForm<{ name: string }>({ defaultValues: { name: '' } });

  useEffect(() => {
    if (tenantId) {
      getTenant(tenantId);
    }
  }, [tenantId]);

  useEffect(() => {
    if (currentTenant) {
      resetName({ name: currentTenant.name });
    }
  }, [currentTenant]);

  const onNameSave = async (data: { name: string }) => {
    if (!tenantId) return;
    setActionLoading(true);
    try {
      await updateTenant(tenantId, data.name);
      setEditingName(false);
    } finally {
      setActionLoading(false);
    }
  };

  const onAddMember = async (data: { userId: string; role: 'admin' | 'member' }) => {
    if (!tenantId) return;
    setActionLoading(true);
    try {
      await addTenantMember(tenantId, data.userId, data.role);
      setAddMemberOpen(false);
      resetMember({ userId: '', role: 'member' });
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
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !currentTenant) {
    return <Box p={3}><CircularProgress /></Box>;
  }

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        {editingName ? (
          <form onSubmit={handleNameSubmit(onNameSave)} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Controller
              name="name"
              control={nameControl}
              rules={{ required: true }}
              render={({ field }) => <TextField {...field} size="small" label="Name" autoFocus />}
            />
            <Button type="submit" variant="contained" size="small" disabled={actionLoading}>Save</Button>
            <Button size="small" onClick={() => setEditingName(false)}>Cancel</Button>
          </form>
        ) : (
          <>
            <Typography variant="h5">{currentTenant?.name ?? 'Tenant'}</Typography>
            <IconButton size="small" onClick={() => setEditingName(true)}><EditIcon fontSize="small" /></IconButton>
          </>
        )}
      </Box>

      <Tabs value={0} sx={{ mb: 2 }}>
        <Tab label="Members & Teams" />
        <Tab label="Role Definitions" onClick={() => navigate(`/tenants/${tenantId}/roles`)} />
        <Tab label="Ownership Policies" onClick={() => navigate(`/tenants/${tenantId}/policies`)} />
      </Tabs>

      <Box mb={3}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="h6">Members</Typography>
          <Button variant="outlined" size="small" onClick={() => { resetMember({ userId: '', role: 'member' }); setAddMemberOpen(true); }}>
            Add Member
          </Button>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>User ID</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tenantMembers.length === 0 && (
              <TableRow><TableCell colSpan={4} align="center"><Typography variant="body2" color="text.secondary">No members.</Typography></TableCell></TableRow>
            )}
            {tenantMembers.map(m => (
              <TableRow key={m.id}>
                <TableCell>{m.userId}</TableCell>
                <TableCell>{m.role}</TableCell>
                <TableCell>{m.status}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" color="error" onClick={() => setRemoveMemberId(m.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      <Box>
        <Button variant="outlined" onClick={() => { resetTeam({ name: '' }); setCreateTeamOpen(true); }}>
          Create Team under this Tenant
        </Button>
      </Box>

      <Dialog open={addMemberOpen} onClose={() => setAddMemberOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleMemberSubmit(onAddMember)}>
          <DialogTitle>Add Member</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <Controller
              name="userId"
              control={memberControl}
              rules={{ required: 'User ID is required' }}
              render={({ field, fieldState }) => (
                <TextField {...field} fullWidth label="User ID" error={!!fieldState.error} helperText={fieldState.error?.message} />
              )}
            />
            <Controller
              name="role"
              control={memberControl}
              render={({ field }) => (
                <TextField {...field} select fullWidth label="Role">
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="member">Member</MenuItem>
                </TextField>
              )}
            />
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
    </Box>
  );
}
