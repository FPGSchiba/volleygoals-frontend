import * as React from 'react';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Link, Paper, TextField, Typography } from '@mui/material';
import i18next from 'i18next';
import { SetupNewPassword } from './SetupNewPassword';

export function ResetPassword() {
  const [username, setUsername] = useState<string | null>(null);
  const navigate = useNavigate();

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<{ email: string }>({
    defaultValues: { email: '' },
    mode: 'onBlur',
  });

  const onSubmitEmail = (data: { email: string }) => {
    setUsername(data.email);
  };

  const handleSuccess = () => {
    navigate('/login');
  };

  if (username) {
    return (
      <Paper className="login login-paper">
        <SetupNewPassword username={username} onSuccess={handleSuccess} />
        <Box className="login login-divider" sx={{ mt: 2 }}>
          <Button variant="text" onClick={() => setUsername(null)}>
            {i18next.t('resetPassword.back', 'Use a different email')}
          </Button>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper className="login login-paper">
      <Box className="login login-header login-header-wrapper">
        <Typography className="login login-header login-header-heading" variant="h2">
          {i18next.t('resetPassword.heading', 'Reset Password')}
        </Typography>
        <Typography className="login login-header login-header-subheading" variant="h4">
          {i18next.t('resetPassword.subheading', 'Enter your email to receive a verification code.')}
        </Typography>
      </Box>

      <Box component="form" onSubmit={handleSubmit(onSubmitEmail)} noValidate className="login login-form" sx={{ mt: 2 }}>
        <Controller
          name="email"
          control={control}
          rules={{
            required: i18next.t('resetPassword.email.required', 'Email is required'),
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: i18next.t('resetPassword.email.invalid', 'Please enter a valid email address'),
            },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label={i18next.t('resetPassword.email.label', 'Email')}
              type="email"
              error={!!errors.email}
              helperText={errors.email?.message}
              autoFocus
              autoComplete="email"
            />
          )}
        />
        <Button type="submit" variant="contained" color="primary" disabled={isSubmitting} sx={{ mt: 2 }} fullWidth>
          {i18next.t('resetPassword.submit', 'Continue')}
        </Button>
      </Box>

      <Box className="login login-divider" sx={{ mt: 2 }}>
        <Link href="/login" className="login login-link login-link-reset-password">
          {i18next.t('resetPassword.backToLogin', 'Back to login')}
        </Link>
      </Box>
    </Paper>
  );
}
