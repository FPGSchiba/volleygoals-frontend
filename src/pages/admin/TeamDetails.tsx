import * as React from 'react';
import { useEffect, useState, useCallback } from "react";
import {useParams, Link as RouterLink, useNavigate} from "react-router-dom";
import {useTeamStore} from "../../store/teams";
import {useNotificationStore} from "../../store/notification";
import { useLoading } from '../../hooks/useLoading';
import i18next from 'i18next';
import { ItemList, FetchResult } from '../../components/ItemList';
import {
  ITeamInviteFilterOption,
  ITeamMemberFilterOption
} from '../../services/types';

// MUI
import { Box, TextField, Select, MenuItem, InputLabel, FormControl, Button, Typography, Card, CardContent, CircularProgress, Alert, Stack, Divider, IconButton, Paper, FormControlLabel, Switch, FormGroup, Chip, Tabs, Tab, TableCell, Avatar, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddIcon from '@mui/icons-material/Add';
import {ITeamUser, RoleType, TeamMemberStatus} from "../../store/types";
import { useUsersStore } from '../../store/users';
import { useForm, Controller } from 'react-hook-form';
import {useInvitesStore} from "../../store/invites";

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
  const uploadTeamPicture = useTeamStore(state => state.uploadTeamPicture);
  const notify = useNotificationStore(state => state.notify);
  const deleteMembership = useUsersStore(state => state.deleteMembership);
  const updateMembership = useUsersStore(state => state.updateMembership);
  const createInvite = useInvitesStore(state => state.createInvite);
  const resendInvite = useInvitesStore(state => state.resendInvite);
  const revokeInvite = useInvitesStore(state => state.revokeInvite);
  const navigate = useNavigate();
  const { loading, setLoading, Loading } = useLoading(true);

  // Invite action state
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { control: inviteControl, handleSubmit: handleInviteSubmit, reset: resetInvite } = useForm<{ email: string; role: RoleType; message: string; sendEmail: boolean }>({ defaultValues: { email: '', role: RoleType.Member, message: '', sendEmail: true } as any });

  const [name, setName] = useState<string>('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [teamSettings, setTeamSettings] = useState<{ allowFileUploads: boolean; allowTeamGoalComments: boolean; allowIndividualGoalComments: boolean } | undefined>(undefined);
  const [picturePreview, setPicturePreview] = useState<string | undefined>(undefined);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const pictureInputRef = React.useRef<HTMLInputElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);

  // Member edit/delete dialog state
  const [memberEditOpen, setMemberEditOpen] = useState(false);
  const [memberDeleteOpen, setMemberDeleteOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ITeamUser | null>(null);
  const { control: memberControl, handleSubmit: handleMemberSubmit, reset: resetMember } = useForm<{ role: string; status: string }>({ defaultValues: { role: RoleType.Member, status: TeamMemberStatus.Active } as any });

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
      setPicturePreview(currentTeam.picture);
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

  useEffect(() => {
    if (selectedMember && memberEditOpen) {
      resetMember({ role: (selectedMember as any).role ?? RoleType.Member, status: (selectedMember as any).status ?? TeamMemberStatus.Active });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMember, memberEditOpen]);

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

  const handlePictureFile = async (file?: File) => {
    if (!file || !currentTeam) return;
    try {
      setUploadingPicture(true);
      const url = await uploadTeamPicture(currentTeam.id, file, (_pct) => {
        // could set progress state here
      });
      if (url) {
        setPicturePreview(url);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingPicture(false);
      if (pictureInputRef.current) pictureInputRef.current.value = '';
    }
  };

  const onPictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handlePictureFile(f);
  };

  const openCreateInvite = () => {
    resetInvite({ email: '', role: RoleType.Member, message: '', sendEmail: true } as any);
    setInviteDialogOpen(true);
  };

  const submitCreateInvite = async (data: { email: string; role: RoleType; message: string; sendEmail: boolean }) => {
    if (!currentTeam) return;
    setActionLoading(true);
    try {
      await createInvite(currentTeam.id, data.email, data.role, data.message || '', !!data.sendEmail);
      await fetchTeamInvites(currentTeam.id, {} as any);
      setInviteDialogOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeInvite = async (id: string) => {
    setActionLoading(true);
    try {
      await revokeInvite(id);
      if (currentTeam) await fetchTeamInvites(currentTeam.id, {} as any);
    } finally { setActionLoading(false); }
  };

  const handleResendInvite = async (id: string) => {
    setActionLoading(true);
    try {
      await resendInvite(id);
      if (currentTeam) await fetchTeamInvites(currentTeam.id, {} as any);
    } finally { setActionLoading(false); }
  };

  const openEditMember = (m: ITeamUser) => { setSelectedMember(m); setMemberEditOpen(true); };
  const openDeleteMember = (m: ITeamUser) => { setSelectedMember(m); setMemberDeleteOpen(true); };

  const submitMemberEdit = async (data: { role: string; status: string }) => {
    if (!selectedMember || !currentTeam) return;
    await updateMembership(selectedMember.id, currentTeam.id, data.role, data.status);
    await fetchTeamMembers(currentTeam.id, {} as any);
    setMemberEditOpen(false);
    setSelectedMember(null);
  };

  const confirmDeleteMember = async () => {
    if (!selectedMember || !currentTeam) return;
    await deleteMembership(selectedMember.id, currentTeam.id);
    await fetchTeamMembers(currentTeam.id, {} as any);
    setMemberDeleteOpen(false);
    setSelectedMember(null);
  };

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
                  <Box display="flex" flexDirection="column" alignItems="center" mb={2}>
                    <Avatar alt={currentTeam?.name || ''} src={picturePreview} sx={{ width: 120, height: 120, mb: 1 }}>
                      {!picturePreview && (currentTeam?.name ? currentTeam.name[0] : 'T')}
                    </Avatar>
                    <input accept="image/*" id="team-picture-input" type="file" onChange={onPictureChange} ref={pictureInputRef} style={{ display: 'none' }} />
                    <label htmlFor="team-picture-input">
                      <Button variant="outlined" component="span" size="small" disabled={uploadingPicture}>
                        {uploadingPicture ? <><CircularProgress size={16} />&nbsp;{i18next.t('profile.uploading','Uploading...')}</> : i18next.t('profile.upload','Upload picture')}
                      </Button>
                    </label>
                  </Box>
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
                <Box className="team-invites-actions">
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={openCreateInvite}
                    disabled={actionLoading}
                    className="create-invite-button"
                  >
                    {i18next.t('admin.team.invites.create','Create Invite')}
                  </Button>
                </Box>
              )}

              {tabIndex === 0 && (
                <Box mt={2} className="team-members-list">
                  <ItemList<ITeamUser, ITeamMemberFilterOption>
                    title={i18next.t('admin.team.members.title','Members')}
                    // include Name and Email columns with avatar
                    columns={[i18next.t('common.name','Name'), i18next.t('common.email','Email'), i18next.t('admin.memberships.columns.role','Role'), i18next.t('admin.memberships.columns.status','Status'), i18next.t('admin.memberships.columns.joined','Joined')]}
                    initialFilter={{} as ITeamMemberFilterOption}
                    rowsPerPage={10}
                    // render typed filter controls
                    renderFilterFields={(draftFilter: ITeamMemberFilterOption, setDraftFilter: (f: ITeamMemberFilterOption) => void) => (
                      <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                        <TextField
                          size="small"
                          label={i18next.t('common.search','Search')}
                          value={(draftFilter as any).userId ?? ''}
                          onChange={e => setDraftFilter({ ...(draftFilter || {}), userId: e.target.value || undefined } as ITeamMemberFilterOption)}
                        />

                        <FormControl size="small" sx={{ minWidth: 160 }}>
                          <InputLabel id="filter-role-label">{i18next.t('admin.memberships.columns.role','Role')}</InputLabel>
                          <Select
                            labelId="filter-role-label"
                            label={i18next.t('admin.memberships.columns.role','Role')}
                            value={(draftFilter as any).role ?? ''}
                            onChange={e => setDraftFilter({ ...(draftFilter || {}), role: e.target.value || undefined } as ITeamMemberFilterOption)}
                          >
                            <MenuItem value="">{i18next.t('common.all','All')}</MenuItem>
                            <MenuItem value="member">{i18next.t('admin.memberships.role.member','Member')}</MenuItem>
                            <MenuItem value="owner">{i18next.t('admin.memberships.role.owner','Owner')}</MenuItem>
                            <MenuItem value="admin">{i18next.t('admin.memberships.role.admin','Admin')}</MenuItem>
                          </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 160 }}>
                          <InputLabel id="filter-status-label">{i18next.t('admin.memberships.columns.status','Status')}</InputLabel>
                          <Select
                            labelId="filter-status-label"
                            label={i18next.t('admin.memberships.columns.status','Status')}
                            value={(draftFilter as any).status ?? ''}
                            onChange={e => setDraftFilter({ ...(draftFilter || {}), status: e.target.value || undefined } as ITeamMemberFilterOption)}
                          >
                            <MenuItem value="">{i18next.t('common.all','All')}</MenuItem>
                            <MenuItem value="active">{i18next.t('common.active','Active')}</MenuItem>
                            <MenuItem value="inactive">{i18next.t('common.inactive','Inactive')}</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    )}
                    fetch={async (filter?) => {
                      const res = await fetchTeamMembers(currentTeam!.id, filter as any);
                      return { items: res.items as any[], count: res.count } as FetchResult<any>;
                    }}
                    renderActions={(m) => (
                      [
                        <Button key="edit" variant="contained" size="small" onClick={() => openEditMember(m)} style={{ marginRight: 8 }}>
                          {i18next.t('common.edit','Edit')}
                        </Button>,
                        <Button key="delete" variant="contained" size="small" color="error" onClick={() => openDeleteMember(m)}>
                          {i18next.t('common.delete','Delete')}
                        </Button>
                      ]
                    )}
                    // render rows with avatar + name + email
                    renderRow={(m) => {
                      const displayName = (m as any).user?.name ?? (m as any).name ?? (m as any).displayName ?? (m as any).email ?? '-';
                      const pictureSrc = (m as any).user?.picture ?? (m as any).picture;
                      const avatarLetter = displayName && displayName.length ? displayName[0] : 'U';
                      const displayEmail = (m as any).user?.email ?? (m as any).email ?? '-';

                      return [
                        <TableCell key="name">
                          <Box display="flex" alignItems="center" gap={1}>
                            <Avatar src={pictureSrc} alt={displayName} sx={{ width: 32, height: 32 }}>
                              {!pictureSrc && avatarLetter}
                            </Avatar>
                            <Typography variant="body2">{displayName}</Typography>
                          </Box>
                        </TableCell>,
                        <TableCell key="email"><Typography variant="body2">{displayEmail}</Typography></TableCell>,
                        <TableCell key="role"><Chip label={m.role} size="small" /></TableCell>,
                        <TableCell key="status"><Chip label={m.status} color={m.status === 'active' ? 'success' : 'default'} size="small" /></TableCell>,
                        <TableCell key="joined">{m.joinedAt ? new Date(m.joinedAt).toLocaleString('de-CH') : '-'}</TableCell>,
                      ];
                    }}
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
                    renderFilterFields={(draftFilter: ITeamInviteFilterOption, setDraftFilter: (f: ITeamInviteFilterOption) => void) => (
                      <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                        <TextField
                          size="small"
                          label={i18next.t('invitePage.accept.email.label','Email')}
                          value={(draftFilter as any).email ?? ''}
                          onChange={e => setDraftFilter({ ...(draftFilter || {}), email: e.target.value || undefined } as ITeamInviteFilterOption)}
                        />

                        <FormControl size="small" sx={{ minWidth: 160 }}>
                          <InputLabel id="filter-invite-role-label">{i18next.t('invitePage.complete.details.roleLabel','Role')}</InputLabel>
                          <Select
                            labelId="filter-invite-role-label"
                            label={i18next.t('invitePage.complete.details.roleLabel','Role')}
                            value={(draftFilter as any).role ?? ''}
                            onChange={e => setDraftFilter({ ...(draftFilter || {}), role: e.target.value || undefined } as ITeamInviteFilterOption)}
                          >
                            <MenuItem value="">{i18next.t('common.all','All')}</MenuItem>
                            <MenuItem value="member">{i18next.t('admin.memberships.role.member','Member')}</MenuItem>
                            <MenuItem value="owner">{i18next.t('admin.memberships.role.owner','Owner')}</MenuItem>
                            <MenuItem value="admin">{i18next.t('admin.memberships.role.admin','Admin')}</MenuItem>
                          </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 160 }}>
                          <InputLabel id="filter-invite-status-label">{i18next.t('invitePage.complete.details.statusLabel','Status')}</InputLabel>
                          <Select
                            labelId="filter-invite-status-label"
                            label={i18next.t('invitePage.complete.details.statusLabel','Status')}
                            value={(draftFilter as any).status ?? ''}
                            onChange={e => setDraftFilter({ ...(draftFilter || {}), status: e.target.value || undefined } as ITeamInviteFilterOption)}
                          >
                            <MenuItem value="">{i18next.t('common.all','All')}</MenuItem>
                            <MenuItem value="pending">{i18next.t('invite.status.pending','Pending')}</MenuItem>
                            <MenuItem value="accepted">{i18next.t('invite.status.accepted','Accepted')}</MenuItem>
                            <MenuItem value="expired">{i18next.t('invite.status.expired','Expired')}</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    )}
                    fetch={async (filter?) => {
                      const res = await fetchTeamInvites(currentTeam!.id, filter as any);
                      return { items: res.items as any[], count: res.count } as FetchResult<any>;
                    }}
                    renderActions={(inv) => {
                      const status = (inv.status || '').toString();

                      const revokeEnabled = status === 'pending';
                      const disableResend = status === 'accepted' || status == 'declined';

                      return [
                        <Button key="revoke" variant="contained" size="small" color="warning" onClick={() => handleRevokeInvite(inv.id)} disabled={actionLoading || !revokeEnabled} style={{ marginRight: 8 }}>
                          {i18next.t('admin.invites.revoke','Revoke')}
                        </Button>,
                        <Button key="resend" variant="contained" size="small" onClick={() => handleResendInvite(inv.id)} disabled={actionLoading || disableResend}>
                          {i18next.t('admin.invites.resend','Resend')}
                        </Button>
                      ];
                    }}
                    renderRow={(inv) => {
                      const status = (inv.status || '').toString();
                      const statusColor = (() => {
                        switch (status) {
                          case 'accepted':
                            return 'success';
                          case 'pending':
                            return 'info';
                          case 'declined':
                            return 'error';
                          case 'revoked':
                          case 'expired':
                            return 'warning';
                          default:
                            return 'default';
                        }
                      })();

                      return [
                        <TableCell key="email">{inv.email}</TableCell>,
                        <TableCell key="role"><Chip label={inv.role} size="small" /></TableCell>,
                        <TableCell key="status"><Chip label={inv.status} color={statusColor as any} size="small" /></TableCell>,
                        <TableCell key="message">{inv.message ?? '-'}</TableCell>,
                        <TableCell key="created">{inv.createdAt ? new Date(inv.createdAt).toLocaleString('de-CH') : '-'}</TableCell>,
                        <TableCell key="expires">{inv.expiresAt ? new Date(inv.expiresAt).toLocaleString('de-CH') : '-'}</TableCell>,
                      ];
                    }}
                    items={teamInvites.invites}
                    count={teamInvites.count}
                  />
                </Box>
              )}
            </Box>
          </Paper>

          {/* Member Edit Dialog */}
          <Dialog open={memberEditOpen} onClose={() => { setMemberEditOpen(false); setSelectedMember(null); }} fullWidth maxWidth="sm">
            <DialogTitle>{i18next.t('admin.memberships.editTitle','Edit Membership')}</DialogTitle>
            <DialogContent>
              <Box mt={1}>
                <Controller name="role" control={memberControl} render={({ field }) => (
                  <FormControl fullWidth margin="normal">
                    <InputLabel id="member-role-label">{i18next.t('admin.memberships.roleLabel','Role')}</InputLabel>
                    <Select {...field} labelId="member-role-label" label={i18next.t('admin.memberships.roleLabel','Role')}>
                      <MenuItem value={RoleType.Member}>{i18next.t('roles.member','Member')}</MenuItem>
                      <MenuItem value={RoleType.Trainer}>{i18next.t('roles.trainer','Trainer')}</MenuItem>
                      <MenuItem value={RoleType.Admin}>{i18next.t('roles.admin','Admin')}</MenuItem>
                    </Select>
                  </FormControl>
                )} />

                <Controller name="status" control={memberControl} render={({ field }) => (
                  <FormControl fullWidth margin="normal">
                    <InputLabel id="member-status-label">{i18next.t('admin.memberships.statusLabel','Status')}</InputLabel>
                    <Select {...field} labelId="member-status-label" label={i18next.t('admin.memberships.statusLabel','Status')}>
                      <MenuItem value={TeamMemberStatus.Active}>{i18next.t('statuses.active','active')}</MenuItem>
                      <MenuItem value={TeamMemberStatus.Invited}>{i18next.t('statuses.invited','invited')}</MenuItem>
                      <MenuItem value={TeamMemberStatus.Left}>{i18next.t('statuses.left','left')}</MenuItem>
                      <MenuItem value={TeamMemberStatus.Removed}>{i18next.t('statuses.removed','removed')}</MenuItem>
                    </Select>
                  </FormControl>
                )} />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { setMemberEditOpen(false); setSelectedMember(null); }}>{i18next.t('common.cancel','Cancel')}</Button>
              <Button onClick={handleMemberSubmit(submitMemberEdit)} variant="contained">{i18next.t('common.save','Save')}</Button>
            </DialogActions>
          </Dialog>

          {/* Member Delete Confirm Dialog */}
          <Dialog open={memberDeleteOpen} onClose={() => { setMemberDeleteOpen(false); setSelectedMember(null); }}>
            <DialogTitle>{i18next.t('admin.memberships.deleteTitle','Delete Membership')}</DialogTitle>
            <DialogContent>
              <Typography>{i18next.t('admin.memberships.deleteConfirm','Are you sure you want to remove this membership?')}</Typography>
              {selectedMember && <Typography mt={2}>{i18next.t('admin.memberships.teamLabel','Team')}: {currentTeam?.id}</Typography>}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => { setMemberDeleteOpen(false); setSelectedMember(null); }}>{i18next.t('common.cancel','Cancel')}</Button>
              <Button onClick={confirmDeleteMember} variant="contained" color="error">{i18next.t('common.delete','Delete')}</Button>
            </DialogActions>
          </Dialog>

          {/* Create Invite Dialog */}
          <Dialog open={inviteDialogOpen} onClose={() => setInviteDialogOpen(false)} fullWidth maxWidth="sm" className="create-invite-dialog">
            <DialogTitle>{i18next.t('admin.team.invites.create','Create Invite')}</DialogTitle>
            <DialogContent>
              <Box className="invite-form">
                <Controller name="email" control={inviteControl} rules={{ required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }} render={({ field, fieldState }) => (
                  <TextField fullWidth margin="normal" label={i18next.t('invitePage.accept.email.label','Email')} {...field} error={!!fieldState.error} helperText={fieldState.error ? i18next.t('admin.invites.invalidEmail','Invalid email') : ''} />
                )} />

                <Controller name="role" control={inviteControl} render={({ field }) => (
                  <FormControl fullWidth margin="normal">
                    <InputLabel id="invite-role-label">{i18next.t('invitePage.complete.details.roleLabel','Role')}</InputLabel>
                    <Select {...field} labelId="invite-role-label" label={i18next.t('invitePage.complete.details.roleLabel','Role')}>
                      <MenuItem value={RoleType.Member}>{i18next.t('roles.member','Member')}</MenuItem>
                      <MenuItem value={RoleType.Trainer}>{i18next.t('roles.trainer','Trainer')}</MenuItem>
                      <MenuItem value={RoleType.Admin}>{i18next.t('roles.admin','Admin')}</MenuItem>
                    </Select>
                  </FormControl>
                )} />

                <Controller name="message" control={inviteControl} render={({ field }) => (
                  <TextField fullWidth margin="normal" label={i18next.t('invitePage.complete.details.messageLabel','Message')} multiline minRows={3} {...field} />
                )} />

                <Controller name="sendEmail" control={inviteControl} render={({ field }) => (
                  <FormControlLabel control={<Switch checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />} label={i18next.t('admin.invites.sendEmail','Send email')} />
                )} />
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setInviteDialogOpen(false)}>{i18next.t('common.cancel','Cancel')}</Button>
              <Button onClick={handleInviteSubmit(submitCreateInvite)} variant="contained" disabled={actionLoading}>{i18next.t('common.create','Create')}</Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}
    </Box>
  );
}
