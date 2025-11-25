import * as React from 'react';
import {Typography, Box, Paper, Button, Stack} from '@mui/material';
import i18next from 'i18next';
import {useNavigate} from 'react-router-dom';
import {useCognitoUserStore} from '../../store/cognitoUser';
import {UserType} from '../../store/types';

export function NotFound() {
  const navigate = useNavigate();
  const { user, session, userType } = useCognitoUserStore();

  const title = i18next.t('notFoundPage.title');
  const subtitle = i18next.t('notFoundPage.subtitle');
  const explain = i18next.t('notFoundPage.explain');

  const goPrimary = () => {
    if (user || session) {
      // signed in: decide based on role
      if (userType === UserType.Admin) navigate('/teams');
      else navigate('/dashboard');
    } else {
      // not signed in
      navigate('/login');
    }
  }

  const primaryLabel = () => {
    if (user || session) {
      return userType === UserType.Admin ? i18next.t('notFoundPage.actions.teams') : i18next.t('notFoundPage.actions.dashboard');
    }
    return i18next.t('notFoundPage.actions.login');
  }

  const goHome = () => navigate('/');

  return (
    <Box sx={{padding: 3}} className="notfound-page">
      <Paper sx={{maxWidth: 720, margin: '3rem auto', padding: 3}}>
        <Typography variant="h4">{title}</Typography>
        <Typography variant="subtitle1" sx={{marginTop: 1, color: 'text.secondary'}}>{subtitle}</Typography>
        {explain && (
          <Typography variant="body2" sx={{marginTop: 2, whiteSpace: 'pre-line'}}>{explain}</Typography>
        )}

        <Stack direction="row" spacing={2} sx={{marginTop: 3}}>
          <Button variant="contained" color="primary" onClick={goPrimary}>{primaryLabel()}</Button>
        </Stack>
      </Paper>
    </Box>
  );
}
