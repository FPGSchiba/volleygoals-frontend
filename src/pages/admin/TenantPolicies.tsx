import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, List, ListItemButton, ListItemText, Paper
} from '@mui/material';
import { useParams } from 'react-router-dom';
import i18next from 'i18next';
import { useTenantStore } from '../../store/tenants';
import PermissionEditor from '../../components/PermissionEditor/PermissionEditor';
import { TenantLayout } from './TenantLayout';

export function TenantPolicies() {
  const { tenantId } = useParams<{ tenantId: string }>();

  const ownershipPolicies = useTenantStore(s => s.ownershipPolicies);
  const fetchOwnershipPolicies = useTenantStore(s => s.fetchOwnershipPolicies);
  const updateOwnershipPolicy = useTenantStore(s => s.updateOwnershipPolicy);
  const resourceDefinitions = useTenantStore(s => s.resourceDefinitions);
  const fetchResourceModel = useTenantStore(s => s.fetchResourceModel);

  const [selectedResource, setSelectedResource] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) {
      // fetch combined resource model (definitions + policies) when available
      fetchResourceModel(tenantId).catch(() => {
        // fallback to fetching only ownership policies
        fetchOwnershipPolicies(tenantId);
      });
    }
  }, [tenantId]);

  // Normalize ownership policies into a flat array of policy objects.
  const normalizedPolicies = useMemo(() => {
    if (!ownershipPolicies) return [] as any[];
    const items = Array.isArray(ownershipPolicies) ? ownershipPolicies as any[] : (ownershipPolicies as any).items ?? [];
    return items.map((it: any) => {
      if (!it) return null;
      if (it.resourceType) return it;
      if (typeof it === 'object') {
        const keys = Object.keys(it);
        if (keys.length === 1) {
          const k = keys[0];
          const v = it[k];
          if (v && v.resourceType) return v;
          if (v && typeof v === 'object') return { ...v, resourceType: v.resourceType ?? k };
        }
      }
      return null;
    }).filter(Boolean) as any[];
  }, [ownershipPolicies]);

  const resources = useMemo(() => {
    const discovered = new Set<string>();
    normalizedPolicies.forEach((p: any) => {
      if (p && p.resourceType) discovered.add(p.resourceType);
    });
    const defIds = (resourceDefinitions || []).map(r => r.id);
    return Array.from(new Set([...Array.from(discovered), ...defIds]));
  }, [normalizedPolicies, resourceDefinitions]);

  useEffect(() => {
    if (!selectedResource && resources.length > 0) setSelectedResource(resources[0]);
  }, [resources]);

  const getActionsForResource = (resId: string) => {
    const def = resourceDefinitions?.find(d => d.id === resId);
    if (def && def.actions && def.actions.length > 0) return def.actions;
    const set = new Set<string>();
    normalizedPolicies.forEach((val: any) => {
      if (!val) return;
      const perms = (val.ownerPermissions ?? []).concat(val.parentOwnerPermissions ?? []);
      perms.forEach((p: string) => {
        if (String(p).startsWith(`${resId}:`)) {
          const parts = String(p).split(':', 2);
          if (parts[1]) set.add(parts[1]);
        }
      });
    });
    return Array.from(set);
  };

  return (
    <TenantLayout currentTab={2}>
      <Typography variant="h6" mb={2}>{i18next.t('admin.tenantPolicies.title')}</Typography>

      {normalizedPolicies.length === 0 && (
        <Typography variant="body2" color="text.secondary" mb={2}>
          {i18next.t('admin.tenantPolicies.selectResource')}
        </Typography>
      )}

      <Box className="tenant-policies-page">
        <Box className="tenant-policies-sidebar">
          <Paper variant="outlined">
            <Typography className="tenant-policies-sidebar-title" variant="subtitle2">
              {i18next.t('admin.tenantPolicies.title')}
            </Typography>
            <List dense>
              {resources.map(rt => {
                const p = normalizedPolicies.find((op: any) => op.resourceType === rt);
                const count = p ? (p.ownerPermissions?.length ?? 0) : 0;
                const isActive = rt === selectedResource;
                return (
                  <ListItemButton
                    key={rt}
                    selected={isActive}
                    onClick={() => setSelectedResource(rt)}
                    className={`tenant-policies-sidebar-item${isActive ? ' tenant-policies-sidebar-item--active' : ''}`}
                  >
                    <ListItemText primary={((resourceDefinitions || []).find(d => d.id === rt)?.name ?? rt).replace('_', ' ')} secondary={`${count} explicit`} />
                  </ListItemButton>
                );
              })}
            </List>
          </Paper>
        </Box>
        <Box className="tenant-policies-content">
          {selectedResource ? (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <PermissionEditor
                resourceId={selectedResource}
                resourceDefinitions={resourceDefinitions}
                ownershipPolicies={normalizedPolicies}
                getActionsForResource={(rid: string) => getActionsForResource(rid)}
                onSave={async (res, ownerPermissions, parentOwnerPermissions) => {
                  await updateOwnershipPolicy(tenantId ?? '', res, ownerPermissions, parentOwnerPermissions);
                }}
              />
            </Paper>
          ) : (
            <Typography variant="body2">{i18next.t('admin.tenantPolicies.noResource')}</Typography>
          )}
        </Box>
      </Box>
    </TenantLayout>
  );
}
