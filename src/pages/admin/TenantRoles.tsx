import React, { useEffect, useState } from 'react';
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
import i18next from 'i18next';

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
      <Box className="tenant-roles-page">
        <Box className="tenant-roles-header">
          <Typography variant="h6" className="tenant-roles-title">
            {i18next.t('admin.tenantRoles.title')}
          </Typography>
          <Button variant="contained" color="primary" onClick={openCreate} startIcon={<AddIcon />}>
            {i18next.t('admin.tenantRoles.createButton')}
          </Button>
        </Box>

        <Box display="flex" flexDirection="column" gap={1}>
          {(roleDefinitions || []).map(roleResult => (
            <Paper key={roleResult.id} className="tenant-roles-list-item" variant="outlined" sx={{ p: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="subtitle1">{roleResult.name}</Typography>
                {roleResult.isDefault && <Chip label="default" size="small" color="primary" variant="outlined" />}
              </Box>
              <Box className="tenant-roles-actions">
                <Button size="small" variant="outlined" startIcon={roleResult.isDefault ? <VisibilityIcon /> : <EditIcon />} onClick={() => openEdit(roleResult.id, roleResult.isDefault)}>
                  {roleResult.isDefault ? i18next.t('common.view') : i18next.t('common.edit')}
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
              {editingId
                ? (isReadonly ? i18next.t('common.view') : i18next.t('admin.tenantRoles.editTitle'))
                : i18next.t('admin.tenantRoles.createTitle')}
            </DialogTitle>
            <DialogContent>
              <Box className="tenant-roles-dialog-form">
                {!editingId && (
                  <Controller
                    name="name"
                    control={control}
                    rules={{ required: i18next.t('admin.tenantRoles.nameRequired') }}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        fullWidth
                        label={i18next.t('admin.tenantRoles.nameLabel')}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        disabled={isReadonly}
                      />
                    )}
                  />
                )}

                <Typography variant="subtitle2">
                  {i18next.t('admin.tenantRoles.permissionsLabel')}
                </Typography>

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
                        <TableCell colSpan={2} align="center">
                          <Typography variant="body2" color="text.secondary">{i18next.t('common.loading')}</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>
                {isReadonly ? i18next.t('common.cancel') : i18next.t('common.cancel')}
              </Button>
              {!isReadonly && (
                <Button type="submit" variant="contained" disabled={actionLoading}>
                  {actionLoading ? <CircularProgress size={18} /> : (editingId ? i18next.t('common.save') : i18next.t('common.create'))}
                </Button>
              )}
            </DialogActions>
          </form>
        </Dialog>

        <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
          <DialogTitle>{i18next.t('admin.tenantRoles.title')}</DialogTitle>
          <DialogContent>
            <Typography>{i18next.t('admin.tenantRoles.deleteConfirm')}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteId(null)}>{i18next.t('common.cancel')}</Button>
            <Button color="error" variant="contained" onClick={onDeleteConfirm} disabled={actionLoading}>
              {i18next.t('common.delete')}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </TenantLayout>
  );
}
