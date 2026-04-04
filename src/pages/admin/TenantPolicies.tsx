import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Tabs, Tab,
  List, ListItemButton, ListItemText, Paper
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { useTenantStore } from '../../store/tenants';
import PermissionEditor from '../../components/PermissionEditor/PermissionEditor';
// ...existing imports...

// Default resource types to show. We'll merge these with any discovered resourceTypes from the API items.
const DEFAULT_RESOURCE_TYPES = ['goals', 'progress', 'comments'];

export function TenantPolicies() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();

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

  // moved below resources declaration

  // Normalize ownership policies into a flat array of policy objects.
  const normalizedPolicies = useMemo(() => {
    if (!ownershipPolicies) return [] as any[];
    const items = Array.isArray(ownershipPolicies) ? ownershipPolicies as any[] : (ownershipPolicies as any).items ?? [];
    return items.map((it: any) => {
      if (!it) return null;
      // Already a policy object
      if (it.resourceType) return it;
      // Wrapped shape: { "goals": { ...policy... } }
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

  // Determine the set of resources to render (merge discovered and default) and map available permissions
  const resources = useMemo(() => {
    const discovered = new Set<string>();
    normalizedPolicies.forEach((p: any) => {
      if (p && p.resourceType) discovered.add(p.resourceType);
    });
    const defIds = (resourceDefinitions || []).map(r => r.id);
    return Array.from(new Set([...Array.from(discovered), ...defIds, ...DEFAULT_RESOURCE_TYPES]));
  }, [normalizedPolicies, resourceDefinitions]);

  useEffect(() => {
    if (!selectedResource && resources.length > 0) setSelectedResource(resources[0]);
  }, [resources]);

  // helper: get actions for a resource (from resourceDefinitions when available, otherwise infer from ownership items)
  const getActionsForResource = (resId: string) => {
    const def = resourceDefinitions?.find(d => d.id === resId);
    if (def && def.actions && def.actions.length > 0) return def.actions;
    // infer from ownershipItems: collect action parts of permissions that start with `${resId}:`
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

  // saving handled by PermissionEditor via updateOwnershipPolicy

  return (
    <Box p={3}>
      <Tabs value={2} sx={{ mb: 2 }}>
        <Tab label="Members & Teams" onClick={() => navigate(`/tenants/${tenantId}`)} />
        <Tab label="Role Definitions" onClick={() => navigate(`/tenants/${tenantId}/roles`)} />
        <Tab label="Ownership Policies" />
      </Tabs>

      <Typography variant="h6" mb={2}>Ownership Policies</Typography>
      {/* no graph view - use list editor only */}

      {normalizedPolicies.length === 0 && (
        <Typography variant="body2" color="text.secondary" mb={2}>
          No ownership policies found. You can grant access using the checkboxes below.
        </Typography>
      )}

      <Box display="flex" gap={2}>
        <Box sx={{ width: 300 }}>
          <Paper variant="outlined">
            <List dense>
              {resources.map(rt => {
                const p = normalizedPolicies.find((op: any) => op.resourceType === rt);
                const count = p ? (p.ownerPermissions?.length ?? 0) : 0;
                return (
                  <ListItemButton key={rt} selected={rt === selectedResource} onClick={() => setSelectedResource(rt)}>
                    <ListItemText primary={(resourceDefinitions.find(d => d.id === rt)?.name ?? rt).replace('_', ' ')} secondary={`${count} explicit`} />
                  </ListItemButton>
                );
              })}
            </List>
          </Paper>
        </Box>
        <Box sx={{ flex: 1 }}>
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
            <Typography variant="body2">Select a resource to edit</Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
