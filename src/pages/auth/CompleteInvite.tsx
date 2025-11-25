import React from 'react';
import {useAuthRedirect} from "../../hooks/useAuthRedirect";
import i18next from 'i18next';
import {Typography, Box, Paper} from '@mui/material';

export function CompleteInvite() {
  useAuthRedirect();

  return (
    <Box sx={{padding: 3}}>
      <Paper sx={{maxWidth: 720, margin: '3rem auto', padding: 3}}>
        <Typography variant="h4">{i18next.t('invitePage.complete.title')}</Typography>
        <Typography variant="body1" sx={{marginTop: 1}}>{i18next.t('invitePage.complete.subtitle')}</Typography>
      </Paper>
    </Box>
  );
}
