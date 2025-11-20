import * as React from 'react';
import { useEffect, useState, useCallback } from "react";
import {useParams, Link as RouterLink, useNavigate} from "react-router-dom";
import {useTeamStore} from "../../store/teams";
import {useNotificationStore} from "../../store/notification";
import { useLoading } from '../../hooks/useLoading';

// MUI
import { Box, TextField, Select, MenuItem, InputLabel, FormControl, Button, Typography, Card, CardContent, CircularProgress, Alert, Stack, Divider, IconButton, Paper, FormControlLabel, Switch, FormGroup, Chip } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export function TeamDetails() {
  const { teamId } = useParams<{ teamId?: string }>();
  const getTeam = useTeamStore(state => state.getTeam);
  const updateTeam = useTeamStore(state => state.updateTeam);
  const currentTeam = useTeamStore(state => state.currentTeam);
  const currentTeamSettings = useTeamStore(state => state.currentTeamSettings);
  const notify = useNotificationStore(state => state.notify);
  const navigate = useNavigate();
  const { loading, setLoading, Loading } = useLoading(true);

  const [name, setName] = useState<string>('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [teamSettings, setTeamSettings] = useState<{ allowFileUploads: boolean; allowTeamGoalComments: boolean; allowIndividualGoalComments: boolean } | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  // Dummy updater for team settings (simulates API call)
  const dummyUpdateTeamSettings = async (id: string, settings: any) => {
    // simulate network latency
    return new Promise((resolve) => setTimeout(() => resolve({ ok: true, settings }), 400));
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        if (teamId) await getTeam(teamId);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false };
  }, [teamId]);

  // populate local form state when currentTeam updates
  useEffect(() => {
    if (currentTeam) {
      setName(currentTeam.name || '');
      setStatus((currentTeam.status as 'active' | 'inactive') || 'active');
    }
  }, [currentTeam]);

  // populate local settings state when currentTeamSettings updates
  useEffect(() => {
    if (currentTeamSettings) {
      setTeamSettings({
        allowFileUploads: currentTeamSettings.allowFileUploads,
        allowTeamGoalComments: currentTeamSettings.allowTeamGoalComments,
        allowIndividualGoalComments: currentTeamSettings.allowIndividualGoalComments,
      });
    }
  }, [currentTeamSettings]);

  const onSave = useCallback(async () => {
    if (!currentTeam) return;
    setSaving(true);
    try {
      await updateTeam(currentTeam.id, name, status);
      // update settings with dummy function for now
      if (teamSettings) {
        try {
          await dummyUpdateTeamSettings(currentTeam.id, teamSettings as any);
        } catch (err) {
          console.error('Failed to update team settings (dummy):', err);
        }
      }
      // refresh
      if (teamId) await getTeam(teamId);
      // show simple success notification if notify exists
      try { notify({ level: 'success', message: 'Team updated', title: 'Success' }); } catch {}
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, [currentTeam, name, status, updateTeam, getTeam, teamId, notify, teamSettings, dummyUpdateTeamSettings]);

  const onCancel = useCallback(() => {
    if (currentTeam) {
      setName(currentTeam.name || '');
      setStatus((currentTeam.status as 'active' | 'inactive') || 'active');
    }
    // reset settings as well
    if (currentTeamSettings) {
      setTeamSettings({
        allowFileUploads: currentTeamSettings.allowFileUploads,
        allowTeamGoalComments: currentTeamSettings.allowTeamGoalComments,
        allowIndividualGoalComments: currentTeamSettings.allowIndividualGoalComments,
      });
    }
  }, [currentTeam, currentTeamSettings]);

  return (
    <Box p={3} className="team-details-root">
      <Loading />

      {/* If loading finished and we still don't have team or settings, show error */}
      {!loading && !currentTeam && !currentTeamSettings && (
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Alert severity="error">Could not load team. Please try again or go back to the teams list.</Alert>
              <Box display="flex" gap={2}>
                <Button variant="contained" color="primary" onClick={() => { if (teamId) { setLoading(true); getTeam(teamId).finally(() => setLoading(false)); } }}>
                  Retry
                </Button>
                <Button variant="outlined" onClick={() => navigate('/teams')}>Go to Teams</Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      {!loading && currentTeam && (
        <Box className="team-details-inner">
          {/* One Paper that spans full width and contains both Team Info (left) and Settings (right) */}
          <Paper className="team-main-paper" elevation={3}>
            <Box p={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <IconButton size="small" component={RouterLink} to="/teams">
                    <ArrowBackIcon />
                  </IconButton>
                  <Typography variant="h5">Team Details</Typography>
                </Box>
              </Box>

              <Box display="flex" gap={3}>
                {/* Left column: Non-editable fields (Created, Status chip) */}
                <Box flex={1}>
                  <Typography variant="h6">{currentTeam.name}</Typography>
                  <Box mt={1} mb={1}>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Typography variant="body2" color="text.secondary">Created:</Typography>
                      <Typography variant="body2">{currentTeam.createdAt ? new Date(currentTeam.createdAt).toLocaleString('de-CH') : '-'}</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Typography variant="body2" color="text.secondary">Updated:</Typography>
                      <Typography variant="body2">{currentTeam.updatedAt ? new Date(currentTeam.updatedAt).toLocaleString('de-CH') : '-'}</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" color="text.secondary">Status:</Typography>
                      <Chip label={currentTeam.status} color={currentTeam.status === 'active' ? 'success' : 'error'} />
                    </Box>
                  </Box>
                </Box>

                {/* Right column: Editable fields (name, edit status, settings) */}
                <Box sx={{ width: 360 }}>
                  <TextField fullWidth label="Edit team name" value={name} onChange={e => setName(e.target.value)} sx={{ mb: 2 }} />

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel id="team-status-label">Edit status</InputLabel>
                    <Select labelId="team-status-label" label="Edit status" value={status} onChange={e => setStatus(e.target.value as any)}>
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                    </Select>
                  </FormControl>

                  <Card variant="outlined" className="team-settings-card">
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={600}>Team Settings</Typography>
                      <Divider sx={{ my: 1 }} />
                      {currentTeamSettings ? (
                        <FormGroup>
                          <FormControlLabel control={<Switch checked={!!teamSettings?.allowFileUploads} onChange={(e) => setTeamSettings(s => s ? ({ ...s, allowFileUploads: e.target.checked }) : ({ allowFileUploads: e.target.checked, allowTeamGoalComments: false, allowIndividualGoalComments: false }))} />} label="Allow file uploads" />
                          <FormControlLabel control={<Switch checked={!!teamSettings?.allowTeamGoalComments} onChange={(e) => setTeamSettings(s => s ? ({ ...s, allowTeamGoalComments: e.target.checked }) : ({ allowFileUploads: false, allowTeamGoalComments: e.target.checked, allowIndividualGoalComments: false }))} />} label="Allow team goal comments" />
                          <FormControlLabel control={<Switch checked={!!teamSettings?.allowIndividualGoalComments} onChange={(e) => setTeamSettings(s => s ? ({ ...s, allowIndividualGoalComments: e.target.checked }) : ({ allowFileUploads: false, allowTeamGoalComments: false, allowIndividualGoalComments: e.target.checked }))} />} label="Allow individual goal comments" />
                        </FormGroup>
                      ) : (
                        <Typography>No settings available for this team.</Typography>
                      )}
                    </CardContent>
                  </Card>
                </Box>
              </Box>

              <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
                <Button variant="outlined" onClick={onCancel} disabled={saving}>Cancel</Button>
                <Button variant="contained" onClick={onSave} disabled={saving}>{saving ? <CircularProgress size={18} /> : 'Save changes'}</Button>
              </Box>
            </Box>
          </Paper>

          {/* Team members spanning full width below */}
          <Paper className="team-members-paper" elevation={1}>
            <Box p={2}>
              <Typography variant="h6">Team Members</Typography>
              <Typography color="text.secondary" mb={1}>Members list will appear here. (Placeholder)</Typography>
              <Card variant="outlined" sx={{ borderStyle: 'dashed', p: 2 }}>
                <Typography><em>Team members will be shown here once implemented.</em></Typography>
              </Card>
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
}
