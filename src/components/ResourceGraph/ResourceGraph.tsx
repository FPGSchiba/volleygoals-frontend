import React, { useMemo } from 'react';
import { Box, Typography, Chip, Paper, Tooltip } from '@mui/material';
import { ResourceDefinition } from '../../types/api-types';
import { IOwnershipPolicy } from '../../store/types';

interface Props {
  resourceDefinitions: ResourceDefinition[];
  normalizedPolicies: IOwnershipPolicy[];
  selectedResource: string | null;
  onSelectResource: (id: string) => void;
}

export default function ResourceGraph({ resourceDefinitions, normalizedPolicies, selectedResource, onSelectResource }: Props) {
  // Lightweight SVG-based graph renderer (no external graph lib required).
  const nodeDefs = useMemo(() => {
    const n = resourceDefinitions || [];
    const count = n.length;
    const cols = Math.ceil(Math.sqrt(Math.max(1, count)));
    return n.map((def, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = col * 220 + 20;
      const y = row * 120 + 20;
      const p = normalizedPolicies.find(p => p.resourceType === def.id);
      const explicitCount = p ? (p.ownerPermissions?.length ?? 0) : 0;
      return { id: def.id, x, y, w: 180, h: 64, def, explicitCount };
    });
  }, [resourceDefinitions, normalizedPolicies]);

  const declaredEdges = useMemo(() => {
    const edges: { id: string; source: string; target: string; type: 'declared' }[] = [];
    (resourceDefinitions || []).forEach(def => {
      (def.allowedChildResources || []).forEach(childId => {
        if (!resourceDefinitions.find(d => d.id === childId)) return;
        edges.push({ id: `declared-${def.id}-${childId}`, source: def.id, target: childId, type: 'declared' });
      });
    });
    return edges;
  }, [resourceDefinitions]);

  const inferredEdges = useMemo(() => {
    const edges: { id: string; source: string; target: string; type: 'inferred' }[] = [];
    (normalizedPolicies || []).forEach(p => {
      const src = p.resourceType;
      (p.ownerPermissions || []).forEach((perm: string) => {
        const parts = String(perm).split(':', 2);
        if (parts.length === 2) {
          const child = parts[0];
          if (child && child !== src && resourceDefinitions.find(d => d.id === child)) {
            const id = `inferred-${src}-${child}`;
            if (!edges.find(e => e.id === id)) edges.push({ id, source: src, target: child, type: 'inferred' });
          }
        }
      });
    });
    return edges;
  }, [normalizedPolicies, resourceDefinitions]);

  const allEdges = [...declaredEdges, ...inferredEdges];

  // helpers to find node center
  const findNode = (id: string) => nodeDefs.find(n => n.id === id);

  return (
    <Paper variant="outlined" sx={{ height: 600, position: 'relative', overflow: 'auto' }}>
      <Box sx={{ position: 'relative', height: 600 }}>
        <svg style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }}>
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill="#1976d2" />
            </marker>
            <marker id="arrow-orange" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill="#ff6d00" />
            </marker>
            <marker id="arrow-gray" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill="#888" />
            </marker>
          </defs>
          {allEdges.map(e => {
            const s = findNode(e.source);
            const t = findNode(e.target);
            if (!s || !t) return null;
            const x1 = s.x + s.w / 2;
            const y1 = s.y + s.h / 2;
            const x2 = t.x + t.w / 2;
            const y2 = t.y + t.h / 2;
            const isTarget = selectedResource && e.target === selectedResource;
            const stroke = isTarget ? '#ff6d00' : (e.type === 'declared' ? '#1976d2' : '#888');
            const dash = e.type === 'inferred' ? '6 4' : undefined;
            const marker = isTarget ? 'url(#arrow-orange)' : (e.type === 'declared' ? 'url(#arrow)' : 'url(#arrow-gray)');
            return (
              <line key={e.id} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={isTarget ? 2 : 1.25} strokeDasharray={dash} markerEnd={marker} />
            );
          })}
        </svg>

        {nodeDefs.map(n => (
          <Tooltip key={n.id} title={`${n.def.name ?? n.id} — ${n.explicitCount} explicit`} placement="top">
            <Box onClick={() => onSelectResource(n.id)} sx={{ position: 'absolute', left: n.x, top: n.y, width: n.w, height: n.h, cursor: 'pointer' }}>
              <Paper elevation={selectedResource === n.id ? 4 : 1} sx={{ width: '100%', height: '100%', p: 1, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{n.def.name ?? n.id}</Typography>
                  <Chip label={`${n.explicitCount}`} size="small" />
                </Box>
                <Typography variant="caption" color="text.secondary">{(n.def.description ?? '').slice(0, 80)}</Typography>
              </Paper>
            </Box>
          </Tooltip>
        ))}
      </Box>
    </Paper>
  );
}

