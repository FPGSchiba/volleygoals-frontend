import React, { useEffect, useMemo, useState } from 'react';
import {
  Box, Typography, Button, FormGroup, FormControlLabel, Checkbox, Table, TableHead, TableRow, TableCell, TableBody, Tooltip, Chip,
} from '@mui/material';
import PermissionPreviewModal from '../PermissionPreview/PermissionPreviewModal';
import { ResourceDefinition } from '../../types/api-types';
import { IOwnershipPolicy } from '../../store/types';
import { useParams } from 'react-router-dom';

interface Props {
  resourceId: string;
  resourceDefinitions: ResourceDefinition[];
  ownershipPolicies: IOwnershipPolicy[];
  getActionsForResource: (resId: string) => string[];
  onSave: (resourceType: string, ownerPermissions: string[], parentOwnerPermissions: string[]) => Promise<void>;
}

export default function PermissionEditor({ resourceId, resourceDefinitions, ownershipPolicies, getActionsForResource, onSave }: Props) {
  const def = resourceDefinitions?.find(d => d.id === resourceId);

  const policy = ownershipPolicies?.find(p => p.resourceType === resourceId) || null;

  const [ownerPerms, setOwnerPerms] = useState<string[]>(policy?.ownerPermissions ?? []);
  const [parentPerms, setParentPerms] = useState<string[]>(policy?.parentOwnerPermissions ?? []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOwnerPerms(policy?.ownerPermissions ?? []);
    setParentPerms(policy?.parentOwnerPermissions ?? []);
  }, [policy]);

  const actions = useMemo(() => getActionsForResource(resourceId), [resourceId, getActionsForResource]);

  const childResources = useMemo(() => {
    // Only use allowedChildResources when declared by the resource definition.
    // If the backend does not declare allowedChildResources, do not assume other resources are children.
    return def?.allowedChildResources ?? [];
  }, [def, resourceDefinitions, resourceId]);

  // compute a union of child actions to use as table columns
  const childActionColumns = useMemo(() => {
    const set = new Set<string>();
    childResources.forEach(cr => getActionsForResource(cr).forEach(a => set.add(a)));
    return Array.from(set);
  }, [childResources, getActionsForResource]);

  const toggle = (perm: string, field: 'owner' | 'parent') => {
    if (field === 'owner') {
      setOwnerPerms(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
    } else {
      setParentPerms(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await onSave(resourceId, ownerPerms, parentPerms);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setOwnerPerms(policy?.ownerPermissions ?? []);
    setParentPerms(policy?.parentOwnerPermissions ?? []);
  };

  // preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const params = useParams<{ tenantId: string }>();
  const openPreview = () => setPreviewOpen(true);
  const closePreview = () => setPreviewOpen(false);

  // return list of source descriptors for a permission (other policies that explicitly grant it)
  const sourcesFor = (perm: string) => {
    return ownershipPolicies
      .filter(p => p.resourceType !== resourceId && (((p.ownerPermissions ?? []).includes(perm)) || ((p.parentOwnerPermissions ?? []).includes(perm))))
      .map(p => ({ resourceType: p.resourceType, id: p.id }));
  };

  const sourcesDisplay = (perm: string) => {
    const s = sourcesFor(perm);
    if (!s || s.length === 0) return '';
    return s.map(x => `${x.resourceType}${x.id ? ` (${x.id})` : ''}`).join(', ');
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <Typography variant="h6">{def?.name ?? resourceId}</Typography>
        <Chip label={`${(ownerPerms?.length ?? 0)} explicit`} size="small" />
      </Box>

      <Box display="flex" gap={4} flexWrap="wrap">
        <Box flex={1} minWidth={280}>
          <Typography variant="subtitle2" mb={1}>Resource-level (owner) permissions</Typography>
          <FormGroup>
            {actions.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No actions defined for this resource</Typography>
            ) : actions.map(a => {
              const key = `${resourceId}:${a}`;
              const checked = ownerPerms.includes(key);
              const srcs = sourcesFor(key);
              const inherited = !checked && srcs.length > 0;
              return (
                <FormControlLabel
                  key={key}
                  control={<Checkbox size="small" checked={checked} onChange={() => toggle(key, 'owner')} sx={{ opacity: inherited && !checked ? 0.7 : 1 }} />}
                  label={
                    <Box display="flex" alignItems="center" gap={1} sx={{ opacity: inherited && !checked ? 0.8 : 1 }}>
                      <span>{a.replace(/_/g, ' ').replace(/^(.)/, s => s.toUpperCase())}</span>
                      {inherited && <Tooltip title={sourcesDisplay(key)}><small style={{ opacity: 0.7 }}>inherited</small></Tooltip>}
                    </Box>
                  }
                />
              );
            })}
          </FormGroup>
        </Box>

        <Box flex={1} minWidth={320}>
          <Typography variant="subtitle2" mb={1}>Child resource permissions</Typography>
              {childResources.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No child resources</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Child</TableCell>
                  {childActionColumns.map(a => <TableCell key={a} align="center">{a.replace(/_/g, ' ').replace(/^(.)/, s => s.toUpperCase())}</TableCell>)}
                </TableRow>
              </TableHead>
              <TableBody>
                {childResources.map(childId => {
                  const childActions = getActionsForResource(childId);
                  const displayName = resourceDefinitions.find(r => r.id === childId)?.name ?? childId;
                  return (
                    <TableRow key={childId}>
                      <TableCell>{displayName}</TableCell>
                      {childActionColumns.map(a => {
                        // only render checkbox if child supports this action
                        const childSupports = childActions.includes(a);
                        const key = `${childId}:${a}`;
                        const checked = ownerPerms.includes(key);
                        const srcs = sourcesFor(key);
                        const inherited = !checked && srcs.length > 0;
                        return (
                          <TableCell key={key} align="center">
                            {childSupports ? (
                              <Box display="flex" alignItems="center" justifyContent="center">
                                <FormControlLabel control={<Checkbox size="small" checked={checked} onChange={() => toggle(key, 'owner')} sx={{ opacity: inherited && !checked ? 0.7 : 1 }} />} label="" />
                                {inherited && <Tooltip title={sourcesDisplay(key)}><small style={{ opacity: 0.6 }}>inherited</small></Tooltip>}
                              </Box>
                            ) : <Typography variant="body2" color="text.secondary">—</Typography>}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Box>
      </Box>

      <Box mt={2} display="flex" gap={2}>
        <Button variant="contained" size="small" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        <Button variant="outlined" size="small" onClick={reset}>Reset</Button>
        <Button variant="outlined" size="small" onClick={openPreview}>Preview Effective</Button>
      </Box>
      <PermissionPreviewModal open={previewOpen} onClose={closePreview} resourceId={resourceId} resourceName={def?.name} initialInstanceId={undefined} />
    </Box>
  );
}

