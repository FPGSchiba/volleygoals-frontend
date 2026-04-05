import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Tabs, Tab, Button, IconButton, Avatar, Tooltip, TextField, CircularProgress } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenantStore } from '../../store/tenants';
import VolleyGoalsAPI from '../../services/backend.api';
import { IUser } from '../../store/types';
import { useNotificationStore } from '../../store/notification';
import { useForm, Controller } from 'react-hook-form';

interface TenantLayoutProps {
  children: React.ReactNode;
  currentTab: number;
}

export function TenantLayout({ children, currentTab }: TenantLayoutProps) {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const currentTenant = useTenantStore(s => s.currentTenant);
  const getTenant = useTenantStore(s => s.getTenant);
  const updateTenant = useTenantStore(s => s.updateTenant);
  const [owner, setOwner] = useState<IUser | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const { control: nameControl, handleSubmit: handleNameSubmit, reset: resetName } = useForm<{ name: string }>({ defaultValues: { name: '' } });

  useEffect(() => {
    if (tenantId && (!currentTenant || currentTenant.id !== tenantId)) {
      getTenant(tenantId);
    }
  }, [tenantId, currentTenant, getTenant]);

  useEffect(() => {
    if (currentTenant?.ownerId) {
      VolleyGoalsAPI.getUser(currentTenant.ownerId).then(res => {
        if (res.user) {
          setOwner(res.user);
        }
      }).catch(() => {});
    }
    if (currentTenant?.name) {
      resetName({ name: currentTenant.name });
    }
  }, [currentTenant, resetName]);

  const onNameSave = async (data: { name: string }) => {
    if (!tenantId) return;
    setActionLoading(true);
    try {
      await updateTenant(tenantId, data.name);
      setEditingName(false);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const copyTenantId = () => {
    if (tenantId) {
      navigator.clipboard.writeText(tenantId);
      useNotificationStore.getState().notify({
        level: 'success',
        title: 'Copied',
        message: 'Tenant ID copied to clipboard'
      });
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    if (newValue === 0) navigate(`/tenants/${tenantId}`);
    if (newValue === 1) navigate(`/tenants/${tenantId}/roles`);
    if (newValue === 2) navigate(`/tenants/${tenantId}/policies`);
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, boxSizing: 'border-box' }}>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3, md: 4 }, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              {editingName ? (
                <form onSubmit={handleNameSubmit(onNameSave)} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Controller
                    name="name"
                    control={nameControl}
                    rules={{ required: true }}
                    render={({ field }) => <TextField {...field} size="small" label="Name" autoFocus />}
                  />
                  <Button type="submit" variant="contained" size="small" disabled={actionLoading}>
                    {actionLoading ? <CircularProgress size={16} /> : 'Save'}
                  </Button>
                  <Button size="small" onClick={() => setEditingName(false)}>Cancel</Button>
                </form>
              ) : (
                <>
                  <Typography variant="h4">{currentTenant?.name || 'Tenant Details'}</Typography>
                  <IconButton size="small" onClick={() => setEditingName(true)}><EditIcon fontSize="small" /></IconButton>
                </>
              )}
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body2" color="text.secondary">ID: {tenantId}</Typography>
              <Tooltip title="Copy Tenant ID">
                <IconButton size="small" onClick={copyTenantId}><ContentCopyIcon fontSize="small" /></IconButton>
              </Tooltip>
            </Box>
          </Box>
          <Box display="flex" flexDirection="column" alignItems="center">
            <Typography variant="caption" color="text.secondary" mb={0.5}>Owner</Typography>
            <Avatar src={owner?.picture} sx={{ width: 56, height: 56, mb: 0.5 }}>
              {!owner?.picture && (owner?.name ? owner.name[0] : (owner?.email ? owner.email[0].toUpperCase() : 'O'))}
            </Avatar>
            <Typography variant="body2">{owner?.name || owner?.email || currentTenant?.ownerId}</Typography>
          </Box>
        </Box>
      </Paper>

      <Paper variant="outlined" sx={{ boxSizing: 'border-box' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={currentTab} aria-label="tenant tabs">
            <Tab label="Members & Teams" onClick={() => navigate(`/tenants/${tenantId}`)} />
            <Tab label="Role Definitions" onClick={() => navigate(`/tenants/${tenantId}/roles`)} />
            <Tab label="Ownership Policies" onClick={() => navigate(`/tenants/${tenantId}/policies`)} />
          </Tabs>
        </Box>
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          {children}
        </Box>
      </Paper>
    </Box>
  );
}

