import React, {useEffect, useState} from 'react';
import i18next from 'i18next';
import {Typography, Box, Paper, Button, Divider, IconButton, Tooltip} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {useNavigate, useSearchParams} from "react-router-dom";
import {InviteErrorType} from "../help/InviteError";
import {useInvitesStore} from "../../store/invites";
import {useCognitoUserStore} from '../../store/cognitoUser';

export function CompleteInvite() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token');
  const currentInvite = useInvitesStore(state => state.currentInvite);
  const getInvite = useInvitesStore(state => state.getInvite);
  const { cognitoUser, session } = useCognitoUserStore();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate(`/invite-error?type=${InviteErrorType.NoToken}`);
    }
  }, [token, navigate]);

  useEffect(() => {
    if (token && !currentInvite) {
      getInvite(token).catch(() => {
        navigate(`/invite-error?type=${InviteErrorType.UnknownError}`);
      });
    }
  }, [token, currentInvite, getInvite, navigate]);

  if (!currentInvite) {
    return (
      <Box sx={{padding: 3}} className="complete-invite">
        <Paper className="complete-invite-paper" elevation={2} sx={{maxWidth: 720, margin: '3rem auto', padding: 3}}>
          <Typography variant="h4">{i18next.t('invitePage.complete.title')}</Typography>
          <Typography variant="body1" sx={{marginTop: 1}}>{i18next.t('invitePage.complete.subtitle')}</Typography>
          <Typography variant="body2" sx={{marginTop: 2}}>{i18next.t('invitePage.complete.loading', 'Loading invite...')}</Typography>
        </Paper>
      </Box>
    );
  }

  const { invite, userCreated, temporaryPassword } = currentInvite;

  const onCopyTempPassword = async () => {
    if (!temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // ignore clipboard errors
    }
  }

  return (
    <Box sx={{padding: 3}} className="complete-invite">
      <Paper className="complete-invite-paper" elevation={2} sx={{maxWidth: 720, margin: '3rem auto', padding: 3}}>
        <div className="complete-invite-header">
          <Typography variant="h4" className="complete-invite-title">{i18next.t('invitePage.complete.title')}</Typography>
          <Typography variant="body1" className="complete-invite-subtitle" sx={{marginTop: 1}}>{i18next.t('invitePage.complete.subtitle')}</Typography>
        </div>

        <Divider sx={{marginY: 2}} />

        <div className="complete-invite-details">
          <Typography variant="subtitle2" className="detail-label">{i18next.t('invitePage.complete.details.emailLabel')}</Typography>
          <Typography variant="body1" className="detail-value">{invite.email}</Typography>

          <Typography variant="subtitle2" className="detail-label">{i18next.t('invitePage.complete.details.roleLabel')}</Typography>
          <Typography variant="body1" className="detail-value">{i18next.t(`roles.${invite.role}`, invite.role)}</Typography>

          {/* Show invite.message if present */}
          {invite.message && (
            <>
              <Typography variant="subtitle2" className="detail-label">{i18next.t('invitePage.complete.details.messageLabel')}</Typography>
              <Typography variant="body1" className="detail-value">{invite.message}</Typography>
            </>
          )}

          {/* If a cognitoUser was created show temporary password + description + copy button */}
          {userCreated && (
            <>
              <Divider sx={{marginY: 2}} />
              <Typography variant="h6" className="created-title">{i18next.t('invitePage.complete.memberCreatedTitle')}</Typography>
              <Typography variant="body2" className="created-note">{i18next.t('invitePage.complete.memberCreatedMessage')}</Typography>

              {temporaryPassword && (
                <Box className="temporary-password-row" sx={{display: 'flex', alignItems: 'center', gap: 1, marginTop: 1}}>
                  <Typography variant="body1" className="temporary-password" sx={{fontWeight: 600}}>{temporaryPassword}</Typography>
                  <Tooltip title={copied ? i18next.t('invitePage.complete.copied') : i18next.t('invitePage.complete.copy')}>
                    <IconButton size="small" onClick={onCopyTempPassword} className="temporary-password-copy" aria-label={i18next.t('invitePage.complete.copy')}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </>
          )}
        </div>

        <Divider sx={{marginY: 2}} />

        <div className="complete-invite-actions" style={{display: 'flex', gap: 12}}>
          {(!cognitoUser || !session) && (
            <Button variant="outlined" color="primary" onClick={() => navigate('/login')} className="complete-invite-login">{i18next.t('invitePage.complete.actions.login')}</Button>
          )}
          {(cognitoUser && session) && (
            <Button variant="outlined" color="primary" onClick={() => navigate('/dashboard')} className="complete-invite-profile">{i18next.t('invitePage.complete.actions.profile')}</Button>
          )}
        </div>
      </Paper>
    </Box>
  );
}
