import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, Paper, Tabs, Tab, CircularProgress,
  FormGroup, FormControlLabel, Checkbox,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenantStore } from '../../store/tenants';
import { ALL_PERMISSIONS, Permission } from '../../utils/permissions';

const RESOURCE_TYPES = ['goals', 'progress_reports', 'comments'];

export function TenantPolicies() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();

  const ownershipPolicies = useTenantStore(s => s.ownershipPolicies);
  const fetchOwnershipPolicies = useTenantStore(s => s.fetchOwnershipPolicies);
  const updateOwnershipPolicy = useTenantStore(s => s.updateOwnershipPolicy);

  const [savingType, setSavingType] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, { ownerPerms: Permission[]; parentOwnerPerms: Permission[] }>>({});

  useEffect(() => {
    if (tenantId) fetchOwnershipPolicies(tenantId);
  }, [tenantId]);

  useEffect(() => {
    const initial: typeof draft = {};
    RESOURCE_TYPES.forEach(rt => {
      const existing = ownershipPolicies.find(p => p.resourceType === rt);
      initial[rt] = {
        ownerPerms: (existing?.ownerPermissions ?? []).filter((p): p is Permission => ALL_PERMISSIONS.includes(p as Permission)),
        parentOwnerPerms: (existing?.parentOwnerPermissions ?? []).filter((p): p is Permission => ALL_PERMISSIONS.includes(p as Permission)),
      };
    });
    setDraft(initial);
  }, [ownershipPolicies]);

  const togglePerm = (resourceType: string, field: 'ownerPerms' | 'parentOwnerPerms', perm: Permission) => {
    setDraft(prev => {
      const current = prev[resourceType] ?? { ownerPerms: [], parentOwnerPerms: [] };
      const list = current[field];
      const next = list.includes(perm) ? list.filter(p => p !== perm) : [...list, perm];
      return { ...prev, [resourceType]: { ...current, [field]: next } };
    });
  };

  const onSave = async (resourceType: string) => {
    if (!tenantId) return;
    const d = draft[resourceType];
    if (!d) return;
    setSavingType(resourceType);
    try {
      await updateOwnershipPolicy(tenantId, resourceType, d.ownerPerms, d.parentOwnerPerms);
    } finally {
      setSavingType(null);
    }
  };

  return (
    <Box p={3}>
      <Tabs value={2} sx={{ mb: 2 }}>
        <Tab label="Members & Teams" onClick={() => navigate(`/tenants/${tenantId}`)} />
        <Tab label="Role Definitions" onClick={() => navigate(`/tenants/${tenantId}/roles`)} />
        <Tab label="Ownership Policies" />
      </Tabs>

      <Typography variant="h6" mb={2}>Ownership Policies</Typography>

      {RESOURCE_TYPES.map(rt => {
        const d = draft[rt] ?? { ownerPerms: [], parentOwnerPerms: [] };
        return (
          <Paper key={rt} variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" mb={1} sx={{ textTransform: 'capitalize' }}>{rt.replace('_', ' ')}</Typography>
            <Box display="flex" gap={4} flexWrap="wrap">
              <Box flex={1} minWidth={240}>
                <Typography variant="subtitle2" mb={0.5}>Owner Permissions</Typography>
                <FormGroup>
                  {ALL_PERMISSIONS.map(p => (
                    <FormControlLabel
                      key={p}
                      control={
                        <Checkbox
                          size="small"
                          checked={d.ownerPerms.includes(p)}
                          onChange={() => togglePerm(rt, 'ownerPerms', p)}
                        />
                      }
                      label={p}
                    />
                  ))}
                </FormGroup>
              </Box>
              <Box flex={1} minWidth={240}>
                <Typography variant="subtitle2" mb={0.5}>Parent Owner Permissions</Typography>
                <FormGroup>
                  {ALL_PERMISSIONS.map(p => (
                    <FormControlLabel
                      key={p}
                      control={
                        <Checkbox
                          size="small"
                          checked={d.parentOwnerPerms.includes(p)}
                          onChange={() => togglePerm(rt, 'parentOwnerPerms', p)}
                        />
                      }
                      label={p}
                    />
                  ))}
                </FormGroup>
              </Box>
            </Box>
            <Box mt={1}>
              <Button
                variant="contained"
                size="small"
                onClick={() => onSave(rt)}
                disabled={savingType === rt}
              >
                {savingType === rt ? <CircularProgress size={18} /> : 'Save'}
              </Button>
            </Box>
          </Paper>
        );
      })}
    </Box>
  );
}
