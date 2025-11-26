import * as React from 'react';
import { useEffect, useState, useCallback } from "react";
import {useParams, Link as RouterLink, useNavigate} from "react-router-dom";
import {useTeamStore} from "../../store/teams";
import {useNotificationStore} from "../../store/notification";
import { useLoading } from '../../hooks/useLoading';
import i18next from 'i18next';
import { ItemList, FetchResult } from '../../components/ItemList';
import { IFilterOption, ITeamInviteFilterOption } from '../../services/types';

// MUI
import { Box, TextField, Select, MenuItem, InputLabel, FormControl, Button, Typography, Card, CardContent, CircularProgress, Alert, Stack, Divider, IconButton, Paper, FormControlLabel, Switch, FormGroup, Chip, Tabs, Tab, TableCell } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';

export function TeamDetails() {
  const { teamId } = useParams<{ teamId?: string }>();
  const getTeam = useTeamStore(state => state.getTeam);
  const updateTeam = useTeamStore(state => state.updateTeam);
  const updateTeamSettings = useTeamStore(state => state.updateTeamSettings);
  const currentTeam = useTeamStore(state => state.currentTeam);
  const currentTeamSettings = useTeamStore(state => state.currentTeamSettings);
  const teamMembers = useTeamStore(state => state.teamMembers) || [];
  const teamInvites = useTeamStore(state => state.teamInvites) || { invites: [], count: 0, nextToken: undefined, hasMore: false, filter: {} as any };
  const fetchTeamMembers = useTeamStore(state => state.fetchTeamMembers);
  const fetchTeamInvites = useTeamStore(state => state.fetchTeamInvites);
  const notify = useNotificationStore(state => state.notify);
  const navigate = useNavigate();
  const { loading, setLoading, Loading } = useLoading(true);

  const [name, setName] = useState<string>('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [teamSettings, setTeamSettings] = useState<{ allowFileUploads: boolean; allowTeamGoalComments: boolean; allowIndividualGoalComments: boolean } | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);

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
      if (teamSettings) {
        await updateTeamSettings(currentTeam.id, teamSettings);
      }
      notify({ level: 'success', message: 'Team updated', title: 'Success' });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, [currentTeam, name, status, updateTeam, getTeam, teamId, notify, teamSettings, updateTeamSettings]);

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

  const onTabChange = (_: any, newIndex: number) => setTabIndex(newIndex);

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
          <Paper className="team-main-paper" elevation={3} sx={{ maxWidth: 1100, margin: '0 auto' }}>
            <Box p={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <IconButton size="small" component={RouterLink} to="/teams">
                    <ArrowBackIcon />
                  </IconButton>
                  <Typography variant="h5">{currentTeam.name || i18next.t('admin.teamDetails.title','Team Details')}</Typography>
                </Box>
              </Box>

              <Box display="flex" gap={3} alignItems="flex-start">
                {/* Left column: Static data (kept to the left as requested) */}
                <Box sx={{ width: 280 }}>
                  <Box mt={1} mb={1}>
                    <Box display="flex" alignItems="center" gap={1} style={{marginBottom: 8}}>
                      <Typography variant="body2" color="text.secondary">{i18next.t('admin.team.status','Status:')}</Typography>
                      <Chip label={currentTeam.status} color={currentTeam.status === 'active' ? 'success' : 'error'} />
                    </Box>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Typography variant="body2" color="text.secondary">{i18next.t('admin.team.created','Created:')}</Typography>
                      <Typography variant="body2">{currentTeam.createdAt ? new Date(currentTeam.createdAt).toLocaleString('de-CH') : '-'}</Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Typography variant="body2" color="text.secondary">{i18next.t('admin.team.updated','Updated:')}</Typography>
                      <Typography variant="body2">{currentTeam.updatedAt ? new Date(currentTeam.updatedAt).toLocaleString('de-CH') : '-'}</Typography>
                    </Box>
                  </Box>
                </Box>

                {/* vertical divider between static data and form */}
                <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

                {/* Middle column: Editable fields (name, edit status) */}
                <Box flex={1}>
                  <TextField fullWidth label={i18next.t('admin.team.editName','Edit team name')} value={name} onChange={e => setName(e.target.value)} sx={{ mb: 2 }} />

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel id="team-status-label">{i18next.t('admin.team.editStatus','Edit status')}</InputLabel>
                    <Select labelId="team-status-label" label={i18next.t('admin.team.editStatus','Edit status')} value={status} onChange={e => setStatus(e.target.value as any)}>
                      <MenuItem value="active">{i18next.t('common.active','Active')}</MenuItem>
                      <MenuItem value="inactive">{i18next.t('common.inactive','Inactive')}</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* Right column: Team Settings */}
                <Box sx={{ width: 360 }}>
                  <Card variant="outlined" className="team-settings-card">
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight={600}>{i18next.t('admin.team.settings.title','Team Settings')}</Typography>
                      <Divider sx={{ my: 1 }} />
                      {currentTeamSettings ? (
                        <FormGroup>
                          <FormControlLabel control={<Switch checked={!!teamSettings?.allowFileUploads} onChange={(e) => setTeamSettings(s => s ? ({ ...s, allowFileUploads: e.target.checked }) : ({ allowFileUploads: e.target.checked, allowTeamGoalComments: false, allowIndividualGoalComments: false }))} />} label={i18next.t('admin.team.settings.allowFileUploads','Allow file uploads')} />
                          <FormControlLabel control={<Switch checked={!!teamSettings?.allowTeamGoalComments} onChange={(e) => setTeamSettings(s => s ? ({ ...s, allowTeamGoalComments: e.target.checked }) : ({ allowFileUploads: false, allowTeamGoalComments: e.target.checked, allowIndividualGoalComments: false }))} />} label={i18next.t('admin.team.settings.allowTeamGoalComments','Allow team goal comments')} />
                          <FormControlLabel control={<Switch checked={!!teamSettings?.allowIndividualGoalComments} onChange={(e) => setTeamSettings(s => s ? ({ ...s, allowIndividualGoalComments: e.target.checked }) : ({ allowFileUploads: false, allowTeamGoalComments: false, allowIndividualGoalComments: e.target.checked }))} />} label={i18next.t('admin.team.settings.allowIndividualGoalComments','Allow individual goal comments')} />
                        </FormGroup>
                      ) : (
                        <Typography>{i18next.t('admin.team.settings.noSettings','No settings available for this team.')}</Typography>
                      )}
                    </CardContent>
                  </Card>
                </Box>
              </Box>

              <Box display="flex" justifyContent="flex-end" gap={2} mt={3}>
                <Button variant="outlined" onClick={onCancel} disabled={saving}>{i18next.t('common.cancel','Cancel')}</Button>
                <Button variant="contained" onClick={onSave} disabled={saving}>{saving ? <CircularProgress size={18} /> : i18next.t('admin.team.save','Save changes')}</Button>
              </Box>
            </Box>
          </Paper>

          {/* Team members spanning full width below */}
          <Paper className="team-members-paper" elevation={1}>
            <Box p={2}>
              <Typography variant="h6">{i18next.t('admin.team.members.title','Team Members')}</Typography>
              <Tabs value={tabIndex} onChange={onTabChange} aria-label="team tabs" className="team-details-tabs" sx={{ mt: 1 }}>
                <Tab label={i18next.t('admin.team.members.tabs.members','Members')} id="tab-members" />
                <Tab label={i18next.t('admin.team.members.tabs.invites','Invites')} id="tab-invites" />
              </Tabs>
              {tabIndex === 1 && (
                <Box display="flex" justifyContent="flex-end" mt={1}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => console.log('Create invite (stub) for team', currentTeam?.id)}
                  >
                    {i18next.t('admin.team.invites.create','Create Invite')}
                  </Button>
                </Box>
              )}

              {tabIndex === 0 && (
                <Box mt={2} className="team-members-list">
                  <ItemList<any, IFilterOption>
                    title={i18next.t('admin.team.members.title','Members')}
                    columns={[i18next.t('admin.memberships.columns.team','Team'), i18next.t('admin.memberships.columns.role','Role'), i18next.t('admin.memberships.columns.status','Status'), i18next.t('admin.memberships.columns.joined','Joined'), i18next.t('admin.memberships.columns.updated','Updated')]}
                    initialFilter={{} as IFilterOption}
                    rowsPerPage={10}
                    fetch={async (filter) => {
                      const res = await fetchTeamMembers(currentTeam!.id, filter);
                      return { items: res.items as any[], count: res.count } as FetchResult<any>;
                    }}
                    renderRow={(m) => [
                      <TableCell key="team">{m.teamId}</TableCell>,
                      <TableCell key="role"><Chip label={m.role} size="small" /></TableCell>,
                      <TableCell key="status"><Chip label={m.status} color={m.status === 'active' ? 'success' : 'default'} size="small" /></TableCell>,
                      <TableCell key="joined">{m.joinedAt ? new Date(m.joinedAt).toLocaleString('de-CH') : '-'}</TableCell>,
                      <TableCell key="updated">{m.updatedAt ? new Date(m.updatedAt).toLocaleString('de-CH') : '-'}</TableCell>,
                    ]}
                    items={teamMembers}
                    count={teamMembers.length}
                  />
                </Box>
              )}

              {tabIndex === 1 && (
                <Box mt={2} className="team-invites-list">
                  <ItemList<any, ITeamInviteFilterOption>
                    title={i18next.t('admin.team.invites.title','Invites')}
                    columns={[i18next.t('invitePage.accept.email.label','Email'), i18next.t('invitePage.complete.details.roleLabel','Role'), i18next.t('invitePage.complete.details.statusLabel','Status'), i18next.t('invitePage.complete.details.messageLabel','Message'), i18next.t('admin.invites.columns.created','Created'), i18next.t('admin.invites.columns.expires','Expires')]}
                    initialFilter={{} as ITeamInviteFilterOption}
                    rowsPerPage={10}
                    fetch={async (filter: ITeamInviteFilterOption) => {
                      const res = await fetchTeamInvites(currentTeam!.id, filter);
                      return { items: res.items as any[], count: res.count } as FetchResult<any>;
                    }}
                    renderRow={(inv) => [
                      <TableCell key="email">{inv.email}</TableCell>,
                      <TableCell key="role"><Chip label={inv.role} size="small" /></TableCell>,
                      <TableCell key="status"><Chip label={inv.status} color={inv.status === 'accepted' ? 'success' : 'default'} size="small" /></TableCell>,
                      <TableCell key="message">{inv.message ?? '-'}</TableCell>,
                      <TableCell key="created">{inv.createdAt ? new Date(inv.createdAt).toLocaleString('de-CH') : '-'}</TableCell>,
                      <TableCell key="expires">{inv.expiresAt ? new Date(inv.expiresAt).toLocaleString('de-CH') : '-'}</TableCell>,
                    ]}
                    items={teamInvites.invites}
                    count={teamInvites.count}
                  />
                </Box>
              )}
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
}
