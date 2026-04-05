import React, { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, Button, Paper, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, IconButton,
  FormGroup, FormControlLabel, Checkbox, CircularProgress,
  Table, TableBody, TableRow, TableCell,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import { useParams } from 'react-router-dom';
import { useTenantStore } from '../../store/tenants';
import { useForm, Controller } from 'react-hook-form';
import { TenantLayout } from './TenantLayout';

type RoleForm = { name: string; permissions: string[] };

export function TenantRoles() {
  const { tenantId } = useParams<{ tenantId: string }>();

  const roleDefinitions = useTenantStore(s => s.roleDefinitions);
  const fetchRoleDefinitions = useTenantStore(s => s.fetchRoleDefinitions);
  const createRoleDefinition = useTenantStore(s => s.createRoleDefinition);
  const updateRoleDefinition = useTenantStore(s => s.updateRoleDefinition);
  const deleteRoleDefinition = useTenantStore(s => s.deleteRoleDefinition);

  const resourceDefinitions = useTenantStore(s => s.resourceDefinitions);
  const fetchResourceModel = useTenantStore(s => s.fetchResourceModel);
  const fetchResourceDefinitions = useTenantStore(s => s.fetchResourceDefinitions);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isReadonly, setIsReadonly] = useState<boolean>(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const { control, handleSubmit, reset, setValue } = useForm<RoleForm>({
    defaultValues: { name: '', permissions: [] },
  });

  useEffect(() => {
    if (tenantId) {
      fetchRoleDefinitions(tenantId);
      // Fetch dynamic resource model if possible, otherwise definitions
      fetchResourceModel(tenantId).catch(() => fetchResourceDefinitions());
    }
  }, [tenantId]);

  const openCreate = () => {
    setEditingId(null);
    setIsReadonly(false);
    setSelectedPermissions([]);
    reset({ name: '', permissions: [] });
    setDialogOpen(true);
  };

  const openEdit = (roleId: string, readonly: boolean) => {
    const roleResult = roleDefinitions.find(r => r.id === roleId);
    if (!roleResult) return;
    setEditingId(roleId);
    setIsReadonly(readonly);
    // Directly use the string array of permissions from backend
    const perms = roleResult.permissions || [];
    setSelectedPermissions(perms);
    reset({ name: roleResult.name, permissions: perms });
    setDialogOpen(true);
  };

  const togglePermission = (p: string) => {
    if (isReadonly) return;
    const next = selectedPermissions.includes(p)
      ? selectedPermissions.filter(x => x !== p)
      : [...selectedPermissions, p];
    setSelectedPermissions(next);
    setValue('permissions', next);
  };

  const onSubmit = async (data: RoleForm) => {
    if (!tenantId || isReadonly) return;
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
    <TenantLayout currentTab={1}>
      <Box display="flex" alignItems="center" justifyContent="flex-end" mb={2}>
        <Button variant="contained" color="primary" onClick={openCreate} startIcon={<AddIcon />}>Add Role</Button>
      </Box>

      <Box display="flex" flexDirection="column" gap={1}>
        {(roleDefinitions || []).map(roleResult => (
          <Paper key={roleResult.id} variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="subtitle1">{roleResult.name}</Typography>
              {roleResult.isDefault && <Chip label="default" size="small" color="primary" variant="outlined" />}
            </Box>
            <Box display="flex" gap={1}>
              <Button size="small" variant="outlined" startIcon={roleResult.isDefault ? <VisibilityIcon /> : <EditIcon />} onClick={() => openEdit(roleResult.id, roleResult.isDefault)}>
                {roleResult.isDefault ? 'View' : 'Edit'}
              </Button>
              <IconButton size="small" color="error" onClick={() => setDeleteId(roleResult.id)} disabled={roleResult.isDefault}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Paper>
        ))}
      </Box>

      {(!roleDefinitions || roleDefinitions.length === 0) && (
        <Typography variant="body2" color="text.secondary">No custom roles defined.</Typography>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {editingId ? (isReadonly ? 'View Role' : 'Edit Role') : 'Add Role'}
          </DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
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
                    disabled={isReadonly}
                  />
                )}
              />
            )}

            <Typography variant="subtitle2" mt={editingId ? 1 : 0} mb={1}>Permissions</Typography>

            <Table size="small" sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <TableBody>
                {(resourceDefinitions || []).map((def) => (
                  <TableRow key={def.id}>
                    <TableCell sx={{ fontWeight: 600, width: '35%', textTransform: 'capitalize', borderBottom: '1px solid', borderColor: 'divider' }}>
                      {def.name.replace('_', ' ')}
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                      <FormGroup row sx={{ gap: 2 }}>
                        {(def.actions || []).map(action => {
                          const fullPerm = `${def.id}:${action}`;
                          return (
                            <FormControlLabel
                              key={fullPerm}
                              control={
                                <Checkbox
                                  size="small"
                                  checked={selectedPermissions.includes(fullPerm)}
                                  onChange={() => togglePermission(fullPerm)}
                                  disabled={isReadonly}
                                  sx={{ py: 0.5 }}
                                />
                              }
                              label={<Typography variant="body2" sx={{ textTransform: 'capitalize' }}>{action.replace('_', ' ')}</Typography>}
                              sx={{ m: 0 }}
                            />
                          );
                        })}
                        {(!def.actions || def.actions.length === 0) && (
                          <Typography variant="body2" color="text.secondary">No actions defined</Typography>
                        )}
                      </FormGroup>
                    </TableCell>
                  </TableRow>
                ))}
                {(!resourceDefinitions || resourceDefinitions.length === 0) && (
                  <TableRow>
                     <TableCell colSpan={2} align="center"><Typography variant="body2" color="text.secondary">Loading resource definitions...</Typography></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>{isReadonly ? 'Close' : 'Cancel'}</Button>
            {!isReadonly && (
              <Button type="submit" variant="contained" disabled={actionLoading}>
                {actionLoading ? <CircularProgress size={18} /> : (editingId ? 'Save' : 'Create')}
              </Button>
            )}
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
    </TenantLayout>
  );
}
