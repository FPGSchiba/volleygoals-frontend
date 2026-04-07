import React, { useMemo, useState } from 'react';
import { Alert, Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel, InputAdornment, MenuItem, Paper, Switch, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useTeamStore } from '../../store/teams';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { usePermission } from '../../hooks/usePermission';
import { ITeamUser, UserType } from '../../store/types';
import VolleyGoalsAPI from '../../services/backend.api';
import i18next from 'i18next';
import { UserDisplay } from '../../components/UserDisplay';

type MemberEditForm = { role: string; status: string; };

export function TeamSettings() {
  const navigate = useNavigate();
  const getTeam = useTeamStore((s) => s.getTeam);
  const updateTeam = useTeamStore((s) => s.updateTeam);
  const updateTeamSettings = useTeamStore((s) => s.updateTeamSettings);
  const uploadTeamPicture = useTeamStore((s) => s.uploadTeamPicture);
  const fetchTeamMembers = useTeamStore((s) => s.fetchTeamMembers);
  const teamMembers = useTeamStore((s) => s.teamMembers) || [];
  const currentTeam = useTeamStore((s) => s.currentTeam);
  const currentTeamSettings = useTeamStore((s) => s.currentTeamSettings);
  const selectedTeam = useCognitoUserStore((s) => s.selectedTeam);
  const currentUser = useCognitoUserStore((s) => s.user);
  const userType = useCognitoUserStore((s) => s.userType);

  const teamId = selectedTeam?.team?.id || '';
  const userRole = selectedTeam?.role as string | undefined;
  const isAdmin = userType === UserType.Admin || userRole === 'admin';
  const canWrite = usePermission('team_settings:write');
  const canManageMembers = canWrite;

  const [teamName, setTeamName] = useState('');
  const [teamStatus, setTeamStatus] = useState<string>('active');
  const [allowFileUploads, setAllowFileUploads] = useState(false);
  const [allowTeamGoalComments, setAllowTeamGoalComments] = useState(false);
  const [allowIndividualGoalComments, setAllowIndividualGoalComments] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Members section state
  const [editMemberOpen, setEditMemberOpen] = useState(false);
  const [removeMemberOpen, setRemoveMemberOpen] = useState(false);
  const [currentMember, setCurrentMember] = useState<ITeamUser | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState('');

  const filteredMembers = useMemo(() => {
    return teamMembers.filter(m => {
      if (memberSearch) {
        const q = memberSearch.toLowerCase();
        if (!m.name?.toLowerCase().includes(q) && !m.email?.toLowerCase().includes(q) && !m.preferredUsername?.toLowerCase().includes(q)) return false;
      }
      if (memberRoleFilter && m.role !== memberRoleFilter) return false;
      return true;
    });
  }, [teamMembers, memberSearch, memberRoleFilter]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { control: memberControl, handleSubmit: handleMemberSubmit, reset: resetMember } = useForm<MemberEditForm>({
    defaultValues: { role: '', status: '' }
  });

  React.useEffect(() => {
    if (teamId) {
      getTeam(teamId);
      if (canManageMembers) {
        fetchTeamMembers(teamId, {}).catch(() => {});
      }
    }
  }, [teamId]);

  React.useEffect(() => {
    if (currentTeam) {
      setTeamName(currentTeam.name);
      setTeamStatus(currentTeam.status);
    }
  }, [currentTeam]);

  React.useEffect(() => {
    if (currentTeamSettings) {
      setAllowFileUploads(currentTeamSettings.allowFileUploads);
      setAllowTeamGoalComments(currentTeamSettings.allowTeamGoalComments);
      setAllowIndividualGoalComments(currentTeamSettings.allowIndividualGoalComments);
    }
  }, [currentTeamSettings]);

  const handleSaveAll = async () => {
    if (!teamId) return;
    setActionLoading(true);
    try {
      await updateTeam(teamId, teamName, teamStatus);
      if (isAdmin) {
        await updateTeamSettings(teamId, { allowFileUploads, allowTeamGoalComments, allowIndividualGoalComments });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handlePictureUpload = async (file: File) => {
    if (!teamId) return;
    setActionLoading(true);
    try {
      await uploadTeamPicture(teamId, file);
    } finally {
      setActionLoading(false);
    }
  };

  const openEditMember = (m: ITeamUser) => {
    setCurrentMember(m);
    resetMember({ role: m.role, status: m.status });
    setEditMemberOpen(true);
  };

  const onEditMember = async (data: MemberEditForm) => {
    if (!currentMember || !teamId) return;
    setActionLoading(true);
    try {
      await VolleyGoalsAPI.updateMembership(currentMember.id, teamId, data.role, data.status);
      setEditMemberOpen(false);
      await fetchTeamMembers(teamId, {});
    } finally {
      setActionLoading(false);
    }
  };

  const onRemoveMember = async () => {
    if (!currentMember || !teamId) return;
    setActionLoading(true);
    try {
      await VolleyGoalsAPI.deleteMembership(currentMember.id, teamId);
      setRemoveMemberOpen(false);
      await fetchTeamMembers(teamId, {});
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Box className="team-settings-page">
    <Paper className="team-settings-section" sx={{ borderRadius: 3 }}>
      <Box p={{ xs: 2, sm: 3 }}>
        <Typography variant="h5">{i18next.t('teamSettings.title', 'Team Settings')}</Typography>

        <Box display="flex" gap={3} mt={2} alignItems="flex-start" flexWrap="wrap">
          {/* LEFT: avatar column */}
          <Box sx={{ width: 200, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              src={currentTeam?.picture || undefined}
              sx={{ width: 128, height: 128, cursor: 'pointer' }}
              onClick={() => fileInputRef.current?.click()}
            >
              {!currentTeam?.picture && (currentTeam?.name ? currentTeam.name[0] : 'T')}
            </Avatar>
            <Button variant="outlined" size="small" onClick={() => fileInputRef.current?.click()} disabled={actionLoading}>
              {i18next.t('teamSettings.uploadPicture', 'Upload Picture')}
            </Button>
            <Typography variant="caption" color="text.secondary" textAlign="center">
              {i18next.t('teamSettings.clickToUpload', 'Click avatar or button to upload')}
            </Typography>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePictureUpload(f); }} />
          </Box>

          {/* Vertical separator */}
          <Divider orientation="vertical" flexItem />

          {/* RIGHT: merged form */}
          <Box flex={1} minWidth={240} display="flex" flexDirection="column" gap={2}>
            <TextField fullWidth label={i18next.t('teamSettings.teamName', 'Team Name')}
              value={teamName} onChange={(e) => setTeamName(e.target.value)} />
            <TextField select fullWidth label={i18next.t('teamSettings.teamStatus', 'Status')}
              value={teamStatus} onChange={(e) => setTeamStatus(e.target.value)}>
              <MenuItem value="active">{i18next.t('common.active', 'active')}</MenuItem>
              <MenuItem value="inactive">{i18next.t('common.inactive', 'inactive')}</MenuItem>
            </TextField>

            <Box>
              <Typography variant="subtitle2">{i18next.t('admin.team.settings.title', 'Feature Toggles')}</Typography>
              {!isAdmin && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  {i18next.t('teamSettings.settingsAdminOnly', 'Only admins can change these settings.')}
                </Alert>
              )}
              <Box display="flex" flexDirection="column" gap={0.5} mt={1}>
                <FormControlLabel
                  control={<Switch checked={allowFileUploads} onChange={(e) => setAllowFileUploads(e.target.checked)} disabled={!isAdmin} />}
                  label={i18next.t('teamSettings.allowFileUploads', 'Allow File Uploads')}
                />
                <FormControlLabel
                  control={<Switch checked={allowTeamGoalComments} onChange={(e) => setAllowTeamGoalComments(e.target.checked)} disabled={!isAdmin} />}
                  label={i18next.t('teamSettings.allowTeamGoalComments', 'Allow Team Goal Comments')}
                />
                <FormControlLabel
                  control={<Switch checked={allowIndividualGoalComments} onChange={(e) => setAllowIndividualGoalComments(e.target.checked)} disabled={!isAdmin} />}
                  label={i18next.t('teamSettings.allowIndividualGoalComments', 'Allow Individual Goal Comments')}
                />
              </Box>
            </Box>

            <Box>
              <Button variant="contained" onClick={handleSaveAll} disabled={actionLoading}>
                {i18next.t('teamSettings.saveAll', 'Save All')}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Paper>

    {/* Section: Team Members (admin/trainer only) — separate Paper */}
    {canManageMembers && (
      <Paper className="team-settings-section" sx={{ mt: 2, borderRadius: 3 }}>
        <Box p={{ xs: 2, sm: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6">{i18next.t('teamSettings.members', 'Team Members')}</Typography>
            <Button variant="outlined" size="small" onClick={() => navigate('/invites')}>
              {i18next.t('teamSettings.addMember', 'Add Member')}
            </Button>
          </Box>

          {/* Search and filter row */}
          <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
            <TextField
              size="small"
              className="team-settings-members-search"
              placeholder={i18next.t('teamSettings.searchMembers', 'Search members...')}
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              sx={{ flex: '1 1 180px', maxWidth: 300, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              select
              size="small"
              label={i18next.t('members.role', 'Role')}
              value={memberRoleFilter}
              onChange={(e) => setMemberRoleFilter(e.target.value)}
              sx={{ minWidth: 130, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            >
              <MenuItem value="">{i18next.t('admin.teams.filter.any', 'Any')}</MenuItem>
              <MenuItem value="admin">admin</MenuItem>
              <MenuItem value="trainer">trainer</MenuItem>
              <MenuItem value="member">member</MenuItem>
            </TextField>
          </Box>

          <Box display="flex" flexDirection="column" gap={1}>
            {filteredMembers.map(m => (
              <Box
                key={m.id}
                className="team-settings-member-item"
                display="flex"
                alignItems="center"
                gap={1.5}
                px={2}
                py={1.5}
                sx={{
                  borderRadius: 2,
                  transition: 'background-color 0.15s',
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Box flex={1} minWidth={0}>
                  <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                    <UserDisplay user={m} size="small" />
                    <Chip label={m.role} size="small" />
                    <Chip label={m.status} size="small" color={m.status === 'active' ? 'success' : 'default'} />
                  </Box>
                </Box>
                <Box className="team-settings-actions" flexShrink={0}>
                  <Button
                    size="small"
                    variant="outlined"
                    sx={{ borderRadius: 1.5 }}
                    onClick={() => openEditMember(m)}
                    disabled={actionLoading || currentUser?.email === m.email}
                  >
                    {i18next.t('common.edit', 'Edit')}
                  </Button>
                  {m.status !== 'removed' && (
                    <Button
                      size="small"
                      variant="contained"
                      color="error"
                      sx={{ borderRadius: 1.5 }}
                      onClick={() => { setCurrentMember(m); setRemoveMemberOpen(true); }}
                      disabled={actionLoading || currentUser?.email === m.email}
                    >
                      {i18next.t('members.remove', 'Remove')}
                    </Button>
                  )}
                </Box>
              </Box>
            ))}
            {filteredMembers.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                {teamMembers.length === 0
                  ? i18next.t('members.noMembers', 'No members found.')
                  : i18next.t('members.noMatchingMembers', 'No members match the current filters.')}
              </Typography>
            )}
          </Box>
        </Box>
      </Paper>
    )}

      {/* Edit Member Dialog */}
      <Dialog open={editMemberOpen} onClose={() => setEditMemberOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{i18next.t('members.editMember', 'Edit Member')}</DialogTitle>
        <DialogContent>
          <form id="ts-member-edit-form" onSubmit={handleMemberSubmit(onEditMember)}>
            <Box mt={1} display="flex" flexDirection="column" gap={2}>
              <Controller name="role" control={memberControl} render={({ field }) => (
                <TextField select fullWidth label={i18next.t('members.role', 'Role')} {...field}>
                  {userRole === 'admin' && <MenuItem value="admin">admin</MenuItem>}
                  <MenuItem value="trainer">trainer</MenuItem>
                  <MenuItem value="member">member</MenuItem>
                </TextField>
              )} />
              <Controller name="status" control={memberControl} render={({ field }) => (
                <TextField select fullWidth label={i18next.t('members.status', 'Status')} {...field}>
                  <MenuItem value="active">active</MenuItem>
                  <MenuItem value="removed">removed</MenuItem>
                </TextField>
              )} />
            </Box>
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditMemberOpen(false)}>{i18next.t('common.cancel', 'Cancel')}</Button>
          <Button type="submit" form="ts-member-edit-form" variant="contained" disabled={actionLoading}>{i18next.t('common.save', 'Save')}</Button>
        </DialogActions>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog open={removeMemberOpen} onClose={() => setRemoveMemberOpen(false)}>
        <DialogTitle>{i18next.t('members.remove', 'Remove')}</DialogTitle>
        <DialogContent>
          <Typography>{i18next.t('members.removeConfirm', 'Remove this member from the team?')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveMemberOpen(false)}>{i18next.t('common.cancel', 'Cancel')}</Button>
          <Button variant="contained" color="error" onClick={onRemoveMember} disabled={actionLoading}>{i18next.t('members.remove', 'Remove')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
