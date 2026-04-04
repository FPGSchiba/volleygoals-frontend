import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Paper, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, IconButton, Tabs, Tab,
  FormGroup, FormControlLabel, Checkbox, CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenantStore } from '../../store/tenants';
import { ALL_PERMISSIONS, Permission } from '../../utils/permissions';
import { useForm, Controller } from 'react-hook-form';

type RoleForm = { name: string; permissions: Permission[] };

export function TenantRoles() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();

  const roleDefinitions = useTenantStore(s => s.roleDefinitions);
  const fetchRoleDefinitions = useTenantStore(s => s.fetchRoleDefinitions);
  const createRoleDefinition = useTenantStore(s => s.createRoleDefinition);
  const updateRoleDefinition = useTenantStore(s => s.updateRoleDefinition);
  const deleteRoleDefinition = useTenantStore(s => s.deleteRoleDefinition);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([]);

  const { control, handleSubmit, reset, setValue } = useForm<RoleForm>({
    defaultValues: { name: '', permissions: [] },
  });

  useEffect(() => {
    if (tenantId) fetchRoleDefinitions(tenantId);
  }, [tenantId]);

  const openCreate = () => {
    setEditingId(null);
    setSelectedPermissions([]);
    reset({ name: '', permissions: [] });
    setDialogOpen(true);
  };

  const openEdit = (roleId: string) => {
    const roleResult = roleDefinitions.find(r => r.id === roleId);
    if (!roleResult) return;
    setEditingId(roleId);
    const perms = roleResult.permissions.filter((p): p is Permission => ALL_PERMISSIONS.includes(p as Permission));
    setSelectedPermissions(perms);
    reset({ name: roleResult.name, permissions: perms });
    setDialogOpen(true);
  };

  const togglePermission = (p: Permission) => {
    const next = selectedPermissions.includes(p)
      ? selectedPermissions.filter(x => x !== p)
      : [...selectedPermissions, p];
    setSelectedPermissions(next);
    setValue('permissions', next);
  };

  const onSubmit = async (data: RoleForm) => {
    if (!tenantId) return;
    setActionLoading(true);
    try {
      if (editingId) {
        await updateRoleDefinition(tenantId, editingId, selectedPermissions);
      } else {
        await createRoleDefinition(tenantId, data.name, selectedPermissions);
      }
      setDialogOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const onDeleteConfirm = async () => {
    if (!tenantId || !deleteId) return;
    setActionLoading(true);
    try {
      await deleteRoleDefinition(tenantId, deleteId);
      setDeleteId(null);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Box p={3}>
      <Tabs value={1} sx={{ mb: 2 }}>
        <Tab label="Members & Teams" onClick={() => navigate(`/tenants/${tenantId}`)} />
        <Tab label="Role Definitions" />
        <Tab label="Ownership Policies" onClick={() => navigate(`/tenants/${tenantId}/policies`)} />
      </Tabs>

      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6">Role Definitions</Typography>
        <Button variant="contained" onClick={openCreate}>Add Role</Button>
      </Box>

      {roleDefinitions.map(roleResult => (
        <Paper key={roleResult.id} variant="outlined" sx={{ p: 2, mb: 1 }}>
          <Box display="flex" alignItems="flex-start" justifyContent="space-between">
            <Box>
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <Typography variant="subtitle1">{roleResult.name}</Typography>
                {roleResult.isDefault && <Chip label="default" size="small" color="primary" />}
              </Box>
              <Box display="flex" flexWrap="wrap" gap={0.5}>
                {roleResult.permissions.map(p => (
                  <Chip key={p} label={p} size="small" variant="outlined" />
                ))}
                {roleResult.permissions.length === 0 && (
                  <Typography variant="caption" color="text.secondary">No permissions</Typography>
                )}
              </Box>
            </Box>
            <Box display="flex" gap={0.5}>
              <IconButton size="small" onClick={() => openEdit(roleResult.id)} disabled={roleResult.isDefault}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" color="error" onClick={() => setDeleteId(roleResult.id)} disabled={roleResult.isDefault}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Paper>
      ))}

      {roleDefinitions.length === 0 && (
        <Typography variant="body2" color="text.secondary">No custom roles defined.</Typography>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{editingId ? 'Edit Role' : 'Add Role'}</DialogTitle>
          <DialogContent>
            {!editingId && (
              <Controller
                name="name"
                control={control}
                rules={{ required: 'Role name is required' }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Role Name"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    sx={{ mb: 2, mt: 1 }}
                  />
                )}
              />
            )}
            <Typography variant="subtitle2" mb={1}>Permissions</Typography>
            <FormGroup>
              {ALL_PERMISSIONS.map(p => (
                <FormControlLabel
                  key={p}
                  control={
                    <Checkbox
                      size="small"
                      checked={selectedPermissions.includes(p)}
                      onChange={() => togglePermission(p)}
                    />
                  }
                  label={p}
                />
              ))}
            </FormGroup>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={actionLoading}>
              {actionLoading ? <CircularProgress size={18} /> : (editingId ? 'Save' : 'Create')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete Role</DialogTitle>
        <DialogContent><Typography>Delete this role definition?</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={onDeleteConfirm} disabled={actionLoading}>Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
