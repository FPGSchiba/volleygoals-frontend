import React, { useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Paper, Switch, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useTeamStore } from '../../store/teams';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { UserType } from '../../store/types';
import { SELECTED_TEAM_KEY } from '../../store/consts';
import i18next from 'i18next';

export function TeamSettings() {
  const navigate = useNavigate();
  const getTeam = useTeamStore((s) => s.getTeam);
  const updateTeam = useTeamStore((s) => s.updateTeam);
  const updateTeamSettings = useTeamStore((s) => s.updateTeamSettings);
  const uploadTeamPicture = useTeamStore((s) => s.uploadTeamPicture);
  const currentTeam = useTeamStore((s) => s.currentTeam);
  const currentTeamSettings = useTeamStore((s) => s.currentTeamSettings);
  const selectedTeam = useCognitoUserStore((s) => s.selectedTeam);
  const userType = useCognitoUserStore((s) => s.userType);
  const leaveTeam = useCognitoUserStore((s) => s.leaveTeam);

  const teamId = selectedTeam?.team?.id || '';
  const userRole = selectedTeam?.role as string | undefined;
  const isAdmin = userType === UserType.Admin || userRole === 'admin';

  const [teamName, setTeamName] = useState('');
  const [teamStatus, setTeamStatus] = useState<string>('active');
  const [allowFileUploads, setAllowFileUploads] = useState(false);
  const [allowTeamGoalComments, setAllowTeamGoalComments] = useState(false);
  const [allowIndividualGoalComments, setAllowIndividualGoalComments] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveError, setLeaveError] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (teamId) getTeam(teamId);
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

  const handleSaveTeamInfo = async () => {
    if (!teamId) return;
    setActionLoading(true);
    try {
      await updateTeam(teamId, teamName, teamStatus);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!teamId || !isAdmin) return;
    setActionLoading(true);
    try {
      await updateTeamSettings(teamId, { allowFileUploads, allowTeamGoalComments, allowIndividualGoalComments });
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

  const handleLeaveTeam = async () => {
    if (!teamId) return;
    setActionLoading(true);
    try {
      const ok = await leaveTeam(teamId);
      if (ok) {
        sessionStorage.removeItem(SELECTED_TEAM_KEY);
        navigate('/select-team');
      } else {
        setLeaveError(true);
      }
    } finally {
      setActionLoading(false);
      setLeaveOpen(false);
    }
  };

  return (
    <Paper>
      <Box p={2}>
        <Typography variant="h5">{i18next.t('teamSettings.title', 'Team Settings')}</Typography>

        {/* Section 1: Team Info */}
        <Box mt={3}>
          <Typography variant="h6">{i18next.t('admin.team.editName', 'Team Info')}</Typography>
          <Box mt={2} display="flex" flexDirection="column" gap={2} maxWidth={400}>
            <TextField
              fullWidth
              label={i18next.t('teamSettings.teamName', 'Team Name')}
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
            <TextField
              select fullWidth
              label={i18next.t('teamSettings.teamStatus', 'Status')}
              value={teamStatus}
              onChange={(e) => setTeamStatus(e.target.value)}
            >
              <MenuItem value="active">{i18next.t('common.active', 'active')}</MenuItem>
              <MenuItem value="inactive">{i18next.t('common.inactive', 'inactive')}</MenuItem>
            </TextField>
            <Box>
              <Button variant="outlined" onClick={() => fileInputRef.current?.click()} disabled={actionLoading}>
                {i18next.t('teamSettings.uploadPicture', 'Upload Picture')}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePictureUpload(f); }}
              />
            </Box>
            <Button variant="contained" onClick={handleSaveTeamInfo} disabled={actionLoading}>
              {i18next.t('teamSettings.save', 'Save')}
            </Button>
          </Box>
        </Box>

        {/* Section 2: Feature Toggles */}
        <Box mt={4}>
          <Typography variant="h6">{i18next.t('admin.team.settings.title', 'Feature Toggles')}</Typography>
          {!isAdmin && (
            <Alert severity="info" sx={{ mt: 1 }}>
              {i18next.t('teamSettings.settingsAdminOnly', 'Only admins can change these settings.')}
            </Alert>
          )}
          <Box mt={2} display="flex" flexDirection="column" gap={1}>
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
            {isAdmin && (
              <Box mt={1}>
                <Button variant="contained" onClick={handleSaveSettings} disabled={actionLoading}>
                  {i18next.t('teamSettings.save', 'Save')}
                </Button>
              </Box>
            )}
          </Box>
        </Box>

        {/* Section 3: Leave Team */}
        <Box mt={4}>
          {leaveError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {i18next.t('teamSettings.cannotLeave', 'You cannot leave: you are the only admin or trainer. Assign another member first.')}
            </Alert>
          )}
          <Button variant="contained" color="error" onClick={() => setLeaveOpen(true)}>
            {i18next.t('teamSettings.leaveTeam', 'Leave Team')}
          </Button>
        </Box>
      </Box>

      {/* Leave Confirm Dialog */}
      <Dialog open={leaveOpen} onClose={() => setLeaveOpen(false)}>
        <DialogTitle>{i18next.t('teamSettings.leaveTeam', 'Leave Team')}</DialogTitle>
        <DialogContent>
          <Typography>{i18next.t('teamSettings.leaveTeamConfirm', 'Are you sure you want to leave this team?')}</Typography>
          {currentTeam && <Typography variant="subtitle2">{currentTeam.name}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaveOpen(false)}>{i18next.t('common.cancel', 'Cancel')}</Button>
          <Button variant="contained" color="error" onClick={handleLeaveTeam} disabled={actionLoading}>
            {i18next.t('teamSettings.leaveTeam', 'Leave Team')}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
