import * as React from 'react';
import {useNavigate, useSearchParams} from "react-router-dom";
import {useEffect, useState} from "react";
import {InviteErrorType} from "../help/InviteError";
import {Typography, Paper, TextField, Button, Box, CircularProgress} from "@mui/material";
import {useInvitesStore} from "../../store/invites";
import {useForm} from "react-hook-form";
import i18next from 'i18next';
import {useCognitoUserStore} from '../../store/cognitoUser';

export function AcceptInvite() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const completeInvite = useInvitesStore(state => state.completeInvite);
  const [loading, setLoading] = useState(false);
  // read cognito user/session to possibly prefill the email
  const { user, session } = useCognitoUserStore();

  useEffect(() => {
    if (!token) {
      navigate(`/invite-error?type=${InviteErrorType.NoToken}`);
    }
  }, [token, navigate])

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, getValues } = useForm<{ email: string }>({
    defaultValues: { email: '' }
  });

  // Prefill email from Cognito user/session if available and the field is empty
  useEffect(() => {
    try {
      const current = getValues('email');
      if (current) return; // don't override a user-typed value

      if (user && session) {
        // try common locations for email
        // user may contain attributes.email or username; session idToken payload may contain email
        const u: any = user as any;
        let email: string | undefined = undefined;
        if (u?.attributes?.email) email = u.attributes.email;
        if (!email && u?.username) email = u.username;
        // try session tokens
        const s: any = session as any;
        const idEmail = s?.tokens?.idToken?.payload?.email;
        if (!email && idEmail) email = idEmail;

        if (email) {
          setValue('email', email);
        }
      }
    } catch (err) {
      // silent — prefilling isn't critical
    }
  }, [user, session, setValue, getValues]);

  const submit = async (email: string, accepted: boolean) => {
    if (!token) {
      navigate(`/invite-error?type=${InviteErrorType.NoToken}`);
      return;
    }
    try {
      setLoading(true);
      const result = await completeInvite(token, email, accepted);
      if (result.success) {
        navigate('/complete-invite');
      } else {
        navigate(`/invite-error?type=${result?.error}`);
      }
    } catch (err) {
      navigate(`/invite-error?type=${InviteErrorType.UnknownError}`);
    } finally {
      setLoading(false);
    }
  }

  const onAccept = handleSubmit(async (data) => await submit(data.email, true));
  const onDecline = handleSubmit(async (data) => await submit(data.email, false));

  return (
    <Box className="accept-invite">
      <Paper className="accept-invite-paper" elevation={2} sx={{padding: 3, maxWidth: 560, margin: '4rem auto'}}>
        <div className="accept-invite-header">
          <Typography component="h2" variant="h4" className="accept-invite-title">{i18next.t('invitePage.accept.title')}</Typography>
          <Typography variant="body1" className="accept-invite-subtitle">{i18next.t('invitePage.accept.subtitle')}</Typography>
        </div>

        <Box component="form" onSubmit={onAccept} className="accept-invite-form" sx={{marginTop: 2}}>
          <TextField
            label={i18next.t('invitePage.accept.email.label')}
            variant="outlined"
            fullWidth
            className="accept-invite-input"
            {...register('email', { required: i18next.t('invitePage.accept.email.required'), pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: i18next.t('invitePage.accept.email.invalid') } })}
            error={!!errors.email}
            helperText={errors.email ? (errors.email.message as string) : ''}
            disabled={loading || isSubmitting}
          />

          <Typography variant="caption" display="block" sx={{marginTop: 1}} className="accept-invite-token">{i18next.t('invitePage.accept.tokenLabel', {token})}</Typography>

          <Box sx={{display: 'flex', gap: 2, marginTop: 3}}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              className="accept-invite-accept"
              disabled={loading || isSubmitting}
              onClick={onAccept}
            >
              {loading ? <CircularProgress size={20} /> : i18next.t('invitePage.accept.button.accept')}
            </Button>

            <Button
              type="button"
              variant="outlined"
              color="error"
              className="accept-invite-decline"
              disabled={loading || isSubmitting}
              onClick={onDecline}
            >
              {loading ? <CircularProgress size={20} /> : i18next.t('invitePage.accept.button.decline')}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
