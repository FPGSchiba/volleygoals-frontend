import React, { useState } from 'react';
import i18next from 'i18next';
import {
  Grid, TextField, TableCell, Button, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTenantStore } from '../../store/tenants';
import { useForm, Controller } from 'react-hook-form';
import { ItemList, FetchResult } from '../../components/ItemList';
import { ITenant } from '../../store/types';

export interface ITenantFilterOption {
  name?: string;
}

export function Tenants() {
  const fetchTenants = useTenantStore(s => s.fetchTenants);
  const tenants = useTenantStore(s => s.tenants);
  const createTenant = useTenantStore(s => s.createTenant);
  const deleteTenant = useTenantStore(s => s.deleteTenant);
  const navigate = useNavigate();

  const [createOpen, setCreateOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const { control, handleSubmit, reset } = useForm<{ name: string }>({ defaultValues: { name: '' } });

  const initialFilter: ITenantFilterOption = {};

  const sortableFields = [
    { field: 'name', label: 'Name' },
  ];

  const fetchAdapter = async (filter?: ITenantFilterOption): Promise<FetchResult<ITenant>> => {
    await fetchTenants();
    return { items: useTenantStore.getState().tenants, count: useTenantStore.getState().tenants.length };
  };

  const onCreateSubmit = async (data: { name: string }) => {
    setActionLoading(true);
    try {
      await createTenant(data.name);
      setCreateOpen(false);
      reset({ name: '' });
      await fetchTenants();
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = async (tenant: ITenant) => {
    navigate(`/tenants/${tenant.id}`);
  };

  const handleDelete = async (id: string) => {
    setActionLoading(true);
    try {
      await deleteTenant(id);
      await fetchTenants();
    } finally {
      setActionLoading(false);
    }
  };

  const renderFilterFields = (filter: ITenantFilterOption, setFilter: (f: ITenantFilterOption) => void) => {
    return [
      <Grid key="name">
        <TextField
          fullWidth
          label={i18next.t('admin.tenants.filter.name', 'Name')}
          value={filter.name ?? ''}
          onChange={(e) => setFilter({ ...filter, name: e.target.value })}
        />
      </Grid>
    ];
  };

  const renderRow = (tenant: ITenant) => {
    return [
      <TableCell key="name">{tenant.name}</TableCell>,
      <TableCell key="owner">{tenant.ownerId}</TableCell>,
      <TableCell key="created">{new Date(tenant.createdAt).toLocaleDateString()}</TableCell>,
    ];
  };

  const renderActions = (tenant: ITenant) => {
    return [
      <Button key="edit" variant="contained" size="small" onClick={() => handleEdit(tenant)} style={{ marginRight: 8 }} disabled={actionLoading}>
        {i18next.t('common.edit', 'Edit')}
      </Button>,
      <Button key="delete" variant="contained" size="small" color="error" onClick={() => handleDelete(tenant.id)} disabled={actionLoading}>
        {i18next.t('common.delete', 'Delete')}
      </Button>
    ];
  };

  return (
    <>
      <ItemList<ITenant, ITenantFilterOption>
        title={i18next.t('admin.tenants.title', 'Tenants')}
        columns={[
          i18next.t('admin.tenants.columns.name', 'Name'),
          i18next.t('admin.tenants.columns.owner', 'Owner'),
          i18next.t('admin.tenants.columns.created', 'Created'),
        ]}
        initialFilter={initialFilter}
        rowsPerPage={10}
        fetch={fetchAdapter}
        create={() => { reset({ name: '' }); setCreateOpen(true); }}
        onEdit={handleEdit}
        onDelete={handleDelete}
        renderFilterFields={renderFilterFields}
        renderRow={renderRow}
        renderActions={(item) => renderActions(item as ITenant)}
        sortableFields={sortableFields}
        items={tenants}
        count={tenants.length}
      />

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onCreateSubmit)}>
          <DialogTitle>{i18next.t('admin.tenants.dialog.createTitle', 'Create Tenant')}</DialogTitle>
          <DialogContent>
            <Controller
              name="name"
              control={control}
              rules={{ required: i18next.t('admin.tenants.dialog.nameRequired', 'Name is required') }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  autoFocus
                  fullWidth
                  margin="normal"
                  label={i18next.t('admin.tenants.dialog.name', 'Tenant Name')}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)} disabled={actionLoading}>
              {i18next.t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" variant="contained" disabled={actionLoading}>
              {i18next.t('common.create', 'Create')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
