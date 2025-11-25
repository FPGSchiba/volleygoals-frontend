import React from 'react';
import {useAuthRedirect} from "../../hooks/useAuthRedirect";
import i18next from 'i18next';
import {Typography, Box, Paper, Button, Stack} from '@mui/material';
import {useSearchParams, useNavigate} from 'react-router-dom';

export enum InviteErrorType {
  NoToken = 'no_token',
  InvalidToken = 'invalid_token',
  ExpiredToken = 'expired_token',
  AlreadyCompleted = 'already_completed',
  UnknownError = 'unknown_error',
}

export function InviteError() {
  useAuthRedirect();
  const [params] = useSearchParams();
  const type = params.get('type') ?? 'unknown_error';
  const navigate = useNavigate();

  const title = i18next.t(`invitePage.error.${type}.title`);
  const message = i18next.t(`invitePage.error.${type}.message`);
  const explain = i18next.t(`invitePage.error.${type}.explain`);

  const goHome = () => navigate('/');

  return (
    <Box sx={{padding: 3}} className="invite-error-page">
      <Paper sx={{maxWidth: 720, margin: '3rem auto', padding: 3}}>
        <Typography variant="h4">{title}</Typography>
        <Typography variant="subtitle1" sx={{marginTop: 1, color: 'text.secondary'}}>{message}</Typography>
        {explain && (
          <Typography variant="body2" sx={{marginTop: 2, whiteSpace: 'pre-line'}}>{explain}</Typography>
        )}

        <Stack direction="row" spacing={2} sx={{marginTop: 3}}>
          <Button variant="contained" color="primary" onClick={goHome}>{i18next.t('invitePage.error.actions.home')}</Button>
        </Stack>
      </Paper>
    </Box>
  );
}
