import React, { useState } from 'react';
import {
  Box, Typography, Button, Table, TableHead, TableBody, TableRow, TableCell,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton,
  CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import { useTenantStore } from '../../store/tenants';
import { useForm, Controller } from 'react-hook-form';

export function Tenants() {
  const tenants = useTenantStore(s => s.tenants);
  const createTenant = useTenantStore(s => s.createTenant);
  const deleteTenant = useTenantStore(s => s.deleteTenant);
  const navigate = useNavigate();

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, reset } = useForm<{ name: string }>({ defaultValues: { name: '' } });

  const onCreateSubmit = async (data: { name: string }) => {
    setLoading(true);
    try {
      await createTenant(data.name);
      setCreateOpen(false);
      reset({ name: '' });
    } finally {
      setLoading(false);
    }
  };

  const onDeleteConfirm = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      await deleteTenant(deleteId);
      setDeleteId(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={3}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Tenants</Typography>
        <Button variant="contained" onClick={() => { reset({ name: '' }); setCreateOpen(true); }}>
          Create Tenant
        </Button>
      </Box>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Owner</TableCell>
            <TableCell>Created</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {tenants.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} align="center">
                <Typography variant="body2" color="text.secondary">No tenants yet.</Typography>
              </TableCell>
            </TableRow>
          )}
          {tenants.map(tenant => (
            <TableRow
              key={tenant.id}
              hover
              sx={{ cursor: 'pointer' }}
              onClick={() => navigate(`/tenants/${tenant.id}`)}
            >
              <TableCell>{tenant.name}</TableCell>
              <TableCell>{tenant.ownerId}</TableCell>
              <TableCell>{new Date(tenant.createdAt).toLocaleDateString()}</TableCell>
              <TableCell align="right">
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); setDeleteId(tenant.id); }}
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onCreateSubmit)}>
          <DialogTitle>Create Tenant</DialogTitle>
          <DialogContent>
            <Controller
              name="name"
              control={control}
              rules={{ required: 'Name is required' }}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  autoFocus
                  fullWidth
                  label="Tenant Name"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  sx={{ mt: 1 }}
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? <CircularProgress size={18} /> : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Delete Tenant</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this tenant? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button onClick={onDeleteConfirm} color="error" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={18} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
