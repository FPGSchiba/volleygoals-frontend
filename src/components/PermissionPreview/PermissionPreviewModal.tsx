import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Divider,
  Paper
} from '@mui/material';
// Download/export UI removed per UX request
import { useTenantStore } from '../../store/tenants';
import { useParams } from 'react-router-dom';

// Local types for preview response normalization
interface PermissionSource {
  resourceType: string;
  policyId?: string;
  grantedBy?: string;
  details?: string;
}

interface EffectivePermissionItem {
  permission: string;
  explicit: boolean;
  inherited: boolean;
  sources: PermissionSource[];
}

interface PreviewPermissionsResponse {
  message?: string;
  effectivePermissions: EffectivePermissionItem[];
  summary?: { explicitCount: number; inheritedCount: number; missingCount: number };
}

interface Props {
  open: boolean;
  onClose: () => void;
  resourceId: string;
  resourceName?: string;
  // optional instance id if caller wants to preview for a specific instance
  initialInstanceId?: string;
  // callback to highlight sources in a graph view (resourceType[])
  onHighlightSources?: (resourceTypes: string[]) => void;
}

export default function PermissionPreviewModal({ open, onClose, resourceId, resourceName, initialInstanceId, onHighlightSources }: Props) {
  const previewApi = useTenantStore(s => s.previewOwnershipPermissions);
  const params = useParams<{ tenantId: string }>();
  const tenantId = params?.tenantId;

  const [loading, setLoading] = useState(false);
  const [instanceId, setInstanceId] = useState<string | undefined>(initialInstanceId);
  const [rawResult, setRawResult] = useState<any>(null);
  const [normalized, setNormalized] = useState<PreviewPermissionsResponse | null>(null);
  const [filter, setFilter] = useState<'all'|'explicit'|'inherited'|'missing'>('all');
  const [search, setSearch] = useState('');
  const [selectedPermission, setSelectedPermission] = useState<EffectivePermissionItem | null>(null);
  const rawContainerRef = React.useRef<HTMLDivElement | null>(null);
  const rawInnerRef = React.useRef<HTMLDivElement | null>(null);
  const [highlightSource, setHighlightSource] = useState<any | null>(null);
  const [markedRawJson, setMarkedRawJson] = useState<string | null>(null);
  const [highlightMarkerId, setHighlightMarkerId] = useState<string | null>(null);

  // fetchPreview: re-usable function for initial load and Refresh button
  const fetchPreview = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await previewApi(tenantId ?? '', resourceId, instanceId);
      setRawResult(resp);
      // prepare marked JSON for robust highlighting
      const mrk = markSourcesForRaw(resp);
      setMarkedRawJson(mrk);
      const norm = normalizePreview(resp);
      setNormalized(norm);
      // preserve currently selected permission when possible
      setSelectedPermission(prev => {
        if (!prev) return norm.effectivePermissions[0] ?? null;
        const still = norm.effectivePermissions.find(ep => ep.permission === prev.permission);
        return still ?? (norm.effectivePermissions[0] ?? null);
      });
    } catch (e) {
      setRawResult({ message: 'error', error: String(e) });
      setNormalized({ message: 'error', effectivePermissions: [], summary: { explicitCount: 0, inheritedCount: 0, missingCount: 0 } });
    } finally {
      setLoading(false);
    }
  }, [previewApi, tenantId, resourceId, instanceId]);

  useEffect(() => {
    if (!open) return;
    let mounted = true; // kept for symmetry with previous logic; not strictly required here
    // call the reusable fetch function
    fetchPreview().catch(() => { /* errors handled inside fetchPreview */ });
    return () => { mounted = false; };
  }, [open, fetchPreview]);

  // mark sources in raw JSON by injecting a __pp_marker into cloned objects and stringify
  const markSourcesForRaw = (raw: any): string | null => {
    if (!raw) return null;
    try {
      const clone = JSON.parse(JSON.stringify(raw));
      if (Array.isArray(clone.sources)) {
        clone.sources.forEach((s: any, idx: number) => {
          // add marker property
          s.__pp_marker = `pp-${idx}`;
        });
      }
      return JSON.stringify(clone, null, 2);
    } catch (e) {
      return JSON.stringify(raw, null, 2);
    }
  };

  // normalization helper
  const normalizePreview = (raw: any): PreviewPermissionsResponse => {
    const result: EffectivePermissionItem[] = [];
    if (!raw) return { effectivePermissions: [], summary: { explicitCount: 0, inheritedCount: 0, missingCount: 0 } };

    if (Array.isArray(raw.effectivePermissions)) {
      // handle two shapes: array of objects { permission, sources... } or array of strings
      raw.effectivePermissions.forEach((e: any) => {
        if (typeof e === 'string') {
          const perm = e;
          // find sources listed at top-level `raw.sources` if present
          const srcsRaw = Array.isArray(raw.sources) ? raw.sources.filter((s: any) => s.permission === perm) : [];
          const sources = srcsRaw.map((s: any) => ({ resourceType: s.resourceType ?? s.sourceResourceType ?? s.resourceType, policyId: s.policyId ?? s.id, grantedBy: s.grantedBy }));
          const explicit = sources.some((s: any) => s.resourceType === resourceId);
          const inherited = sources.length > 0 && !explicit;
          result.push({ permission: perm, explicit, inherited, sources });
        } else {
          const sources = (e.sources || []).map((s: any) => ({ resourceType: s.resourceType, policyId: s.policyId ?? s.id, grantedBy: s.grantedBy }));
          const explicit = !!e.explicit || sources.some((s: any) => s.resourceType === resourceId);
          const inherited = !!e.inherited || (sources.length > 0 && !explicit);
          result.push({ permission: e.permission, explicit, inherited, sources });
        }
      });
    } else if (Array.isArray(raw.effective)) {
      raw.effective.forEach((e: any) => {
        const sources = (e.sources || []).map((s: any) => ({ resourceType: s.resourceType, policyId: s.id ?? s.policyId, grantedBy: s.grantedBy }));
        const explicit = !!e.explicit || sources.some((s: any) => s.resourceType === resourceId);
        const inherited = !!e.inherited || (sources.length > 0 && !explicit);
        result.push({
          permission: e.permission ?? e,
          explicit,
          inherited,
          sources
        });
      });
    } else if (raw.permissionsMap && typeof raw.permissionsMap === 'object') {
      Object.keys(raw.permissionsMap).forEach(k => {
        const srcs = (raw.permissionsMap[k] || []).map((s: any) => ({ resourceType: s.resourceType, policyId: s.id }));
        result.push({ permission: k, explicit: false, inherited: srcs.length > 0, sources: srcs });
      });
    } else if (Array.isArray(raw.permissions)) {
      // Backend returned a simple list of effective permissions. Mark them as inherited/effective when explicit info is missing.
      raw.permissions.forEach((p: any) => result.push({ permission: p, explicit: false, inherited: true, sources: [] }));
    } else if (Array.isArray(raw)) {
      raw.forEach((p: any) => {
        const sources = (p.sources || []).map((s: any) => ({ resourceType: s.resourceType }));
        const explicit = !!p.explicit || sources.some((s: any) => s.resourceType === resourceId);
        const inherited = !!p.inherited || (sources.length > 0 && !explicit);
        result.push({ permission: p.permission ?? p, explicit, inherited, sources });
      });
    } else if (raw && raw.effectivePermissions) {
      // Already normalized
      return raw as PreviewPermissionsResponse;
    } else {
      // Fallback: no known shape
      return { message: raw?.message ?? 'success', effectivePermissions: [], summary: { explicitCount: 0, inheritedCount: 0, missingCount: 0 } };
    }

    const explicitCount = result.filter(r => r.explicit).length;
    const inheritedCount = result.filter(r => !r.explicit && r.inherited).length;
    const missingCount = result.length - explicitCount - inheritedCount;
    return { message: raw?.message ?? 'success', effectivePermissions: result, summary: { explicitCount, inheritedCount, missingCount } };
  };

  const filtered = useMemo(() => {
    if (!normalized) return [] as EffectivePermissionItem[];
    return normalized.effectivePermissions.filter(p => {
      if (filter === 'explicit' && !p.explicit) return false;
      if (filter === 'inherited' && !(p.inherited && !p.explicit)) return false;
      if (filter === 'missing' && (p.explicit || p.inherited)) return false;
      if (search) {
        if (!p.permission.toLowerCase().includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [normalized, filter, search]);

  useEffect(() => {
    if (!onHighlightSources) return;
    if (!selectedPermission) {
      onHighlightSources([]);
      return;
    }
    const list = selectedPermission.sources.map(s => s.resourceType);
    onHighlightSources(list);
    // prepare highlighted source object for raw JSON rendering
    if (rawResult && Array.isArray(rawResult.sources)) {
      const permissionsList = rawResult.sources.map((s: any) => s.permission);
      // try index by exact permission
      let idx = rawResult.sources.findIndex((s: any) => s.permission === selectedPermission.permission);
      // fallback: try match by policyId from selectedPermission.sources
      if (idx === -1 && selectedPermission.sources && selectedPermission.sources.length > 0) {
        const pid = selectedPermission.sources[0].policyId;
        if (pid) {
          idx = rawResult.sources.findIndex((s: any) => s.policyId === pid);
        }
      }
      // fallback: try JSON string match per-source
      if (idx === -1) {
        for (let i = 0; i < rawResult.sources.length; i++) {
          try {
            const sstr = JSON.stringify(rawResult.sources[i]);
            if (sstr.includes(selectedPermission.permission)) { idx = i; break; }
          } catch (e) { }
        }
      }
      const src = idx >= 0 ? rawResult.sources[idx] : null;
      setHighlightSource(src ?? null);
      const marker = idx >= 0 ? `pp-${idx}` : null;
      setHighlightMarkerId(marker);
    } else {
      setHighlightSource(null);
    }
  }, [selectedPermission]);

  // when highlightSource changes, scroll to highlighted element after render
  useEffect(() => {
    if (!highlightSource) return;
    let attempts = 0;
    const maxAttempts = 15;
    const tryScroll = () => {
      attempts++;
      try {
        // try to find highlight element inside the inner rendered div first
        const el = rawInnerRef.current?.querySelector('#pp-highlight') as HTMLElement | null;
        const container = rawContainerRef.current;
        if (el && container) {
          // compute offset relative to container and scroll so element is centered
          const elTop = el.offsetTop;
          const elHeight = el.offsetHeight;
          const containerHeight = container.clientHeight;
          const scrollPos = Math.max(0, elTop - (containerHeight / 2) + (elHeight / 2));
          container.scrollTo({ top: scrollPos, behavior: 'smooth' });
          return;
        }
      } catch (err) {
        // ignore
      }
      if (attempts < maxAttempts) {
        setTimeout(tryScroll, 100);
      }
    };
    // start attempts after a small delay to allow DOM update
    setTimeout(tryScroll, 50);
  }, [highlightSource]);

  // scroll the raw JSON to the marker position by computing line offset within the markedRawJson
  useEffect(() => {
    if (!highlightMarkerId || !markedRawJson || !rawContainerRef.current) return;
    setTimeout(() => {
      try {
        const token = `"__pp_marker": "${highlightMarkerId}"`;
        const idx = markedRawJson.indexOf(token);
        if (idx === -1) return;
        // count lines before idx to estimate vertical position
        const before = markedRawJson.slice(0, idx);
        const lineCountBefore = before.split('\n').length;
        const totalLines = markedRawJson.split('\n').length;
        const container = rawContainerRef.current as HTMLDivElement;
        const inner = rawInnerRef.current as HTMLDivElement | null;
        // estimate scrollTop proportionally
        const ratio = lineCountBefore / Math.max(1, totalLines);
        const scrollHeight = inner ? inner.scrollHeight : container.scrollHeight;
        const target = Math.max(0, Math.floor(ratio * scrollHeight) - container.clientHeight / 2);
        container.scrollTo({ top: target, behavior: 'smooth' });
      } catch (e) {
        // ignore
      }
    }, 120);
  }, [highlightMarkerId, markedRawJson]);

  // exportJSON removed

  // Render JSON with optional highlighting of a source object.
  const renderJsonWithHighlight = (rawObj: any, highlightSource?: any) => {
    const esc = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const rawJson = markedRawJson ?? JSON.stringify(rawObj ?? {}, null, 2);

    let marked = rawJson;
    if (highlightSource && highlightMarkerId) {
      const token = `"__pp_marker": "${highlightMarkerId}"`;
      let idx = rawJson.indexOf(token);
      if (idx !== -1) {
        // find opening brace before idx
        let open = rawJson.lastIndexOf('{', idx);
        if (open === -1) open = Math.max(0, idx - 50);
        // find matching closing brace by scanning forward from open
        let depth = 0;
        let close = -1;
        for (let i = open; i < rawJson.length; i++) {
          if (rawJson[i] === '{') depth++;
          else if (rawJson[i] === '}') {
            depth--;
            if (depth === 0) { close = i; break; }
          }
        }
        if (close !== -1) {
          const before = rawJson.slice(0, open);
          const mid = rawJson.slice(open, close + 1);
          const after = rawJson.slice(close + 1);
          marked = before + '__PP_START__' + mid + '__PP_END__' + after;
        }
      }
    }

    // remove internal marker properties from the marked text so they are not visible to users
    marked = marked.replace(/,?\s*"__pp_marker"\s*:\s*"pp-\d+"/g, '');

    // escape and then replace markers with span
    const escaped = esc(marked)
      .replace(/"(.*?)"(?=:\s)/g, '<span style="color:#a626a4;">"$1"</span>') // keys
      .replace(/: (".*?")/g, ': <span style="color:#50a14f;">$1</span>') // string values
      .replace(/: (\d+(?:\.\d+)?)/g, ': <span style="color:#0184bb;">$1</span>') // numbers
      .replace(/\b(true|false|null)\b/g, '<span style="color:#c18401;">$1</span>');

    // insert highlight span for markers (markers are not escaped characters)
    const withHighlight = escaped.replace('__PP_START__', '<span id="pp-highlight" style="background: rgba(255,214,170,0.12); border-radius:4px; display:inline-block; width:100%">')
                 .replace('__PP_END__', '</span>');
    return withHighlight;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Effective permissions preview — {resourceName ?? resourceId}</DialogTitle>
      <DialogContent dividers>
        <Box display="flex" gap={2}>
          <Box sx={{ width: 360 }}>
            <Box display="flex" gap={1} alignItems="center" mb={1}>
              <TextField size="small" placeholder="Instance id (optional)" value={instanceId ?? ''} onChange={(e) => setInstanceId(e.target.value || undefined)} sx={{ flex: 1 }} />
              <Button variant="outlined" size="small" onClick={() => fetchPreview()} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</Button>
            </Box>

            <Box display="flex" gap={1} alignItems="center" mb={1}>
              <ToggleButtonGroup size="small" value={filter} exclusive onChange={(_e, v) => v && setFilter(v)}>
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="explicit">Explicit</ToggleButton>
                <ToggleButton value="inherited">Inherited</ToggleButton>
                <ToggleButton value="missing">Missing</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <TextField size="small" placeholder="Search permissions" value={search} onChange={(e) => setSearch(e.target.value)} fullWidth sx={{ mb: 1 }} />

            <Paper variant="outlined" sx={{ maxHeight: 420, overflow: 'auto', p: 0, '&::-webkit-scrollbar': { width: 8 }, '&::-webkit-scrollbar-thumb': { background: 'rgba(0,0,0,0.2)', borderRadius: 2 } }}>
              {loading && <Box p={2}><Typography variant="body2">Loading preview…</Typography></Box>}

              {!loading && (!normalized || normalized.effectivePermissions.length === 0) && (
                <Box p={2}><Typography variant="body2" color="text.secondary">No permissions returned by preview.</Typography></Box>
              )}

              {!loading && normalized && (
                <List dense>
                          {filtered.map(p => (
                            <ListItemButton key={p.permission} selected={selectedPermission?.permission === p.permission} onClick={() => setSelectedPermission(p)} sx={{ cursor: 'pointer' }}>
                              <ListItemText primary={p.permission} secondary={p.explicit ? 'Explicit' : (p.inherited ? 'Inherited' : 'Missing')} />
                              <Box>
                                {p.explicit && <Chip label="explicit" color="success" size="small" sx={{ mr: 0.5 }} />}
                                {p.inherited && !p.explicit && <Chip label="inherited" color="warning" size="small" sx={{ mr: 0.5 }} />}
                                {!p.explicit && !p.inherited && <Chip label="missing" size="small" sx={{ opacity: 0.7 }} />}
                                {p.sources.slice(0,3).map(s => <Chip key={`${p.permission}-${s.resourceType}`} label={s.resourceType} size="small" sx={{ ml: 0.5 }} />)}
                              </Box>
                            </ListItemButton>
                          ))}
                </List>
              )}
            </Paper>
          </Box>

          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2">Details</Typography>
            <Divider sx={{ my: 1 }} />
            {!selectedPermission && <Typography variant="body2" color="text.secondary">Select a permission to view sources and details.</Typography>}
            {selectedPermission && (
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedPermission.permission}</Typography>
                <Box mt={1} display="flex" gap={1}>
                  {selectedPermission.explicit && <Chip label="explicit" color="success" />}
                  {selectedPermission.inherited && !selectedPermission.explicit && <Chip label="inherited" color="warning" />}
                </Box>

                <Box mt={2}>
                  <Typography variant="subtitle2">Sources</Typography>
                  {selectedPermission.sources.length === 0 && <Typography variant="body2" color="text.secondary">No sources — permission not granted</Typography>}
                  {selectedPermission.sources.map((s, idx) => (
                    <Paper key={idx} variant="outlined" sx={{ p: 1, mt: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{s.resourceType}{s.policyId ? ` (${s.policyId})` : ''}</Typography>
                      {s.grantedBy && <Typography variant="caption" color="text.secondary">granted via {s.grantedBy}</Typography>}
                      {s.details && <Typography variant="body2">{s.details}</Typography>}
                    </Paper>
                  ))}

                </Box>

                <Box mt={2} display="flex" gap={1}>
                  <Button variant="outlined" onClick={() => onHighlightSources && onHighlightSources(selectedPermission.sources.map(s => s.resourceType))}>Highlight sources</Button>
                </Box>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="text.secondary">Raw response:</Typography>
            <Box ref={(el: HTMLDivElement | null) => { rawContainerRef.current = el; }} sx={{ mt: 1, maxHeight: 200, overflow: 'auto', bgcolor: '#0f1720', borderRadius: 1, p: 1, '&::-webkit-scrollbar': { height: 8 }, '&::-webkit-scrollbar-thumb': { background: '#22303a', borderRadius: 4 } }}>
              <div
                ref={(el: HTMLDivElement | null) => { rawInnerRef.current = el; }}
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace', fontSize: 12, lineHeight: 1.4, color: '#e6edf3', whiteSpace: 'pre-wrap' }}
                dangerouslySetInnerHTML={{ __html: renderJsonWithHighlight(rawResult ?? normalized ?? {}, highlightSource) }}
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

