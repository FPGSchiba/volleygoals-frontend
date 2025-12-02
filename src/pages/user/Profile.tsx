import * as React from "react";
import { useEffect, useState, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { useCognitoUserStore } from "../../store/cognitoUser";
import { useTranslation } from "react-i18next";
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';

export function Profile() {
  const { t } = useTranslation();
  const user = useCognitoUserStore((s) => s.user);
  const fetchSelf = useCognitoUserStore((s) => s.fetchSelf);
  const updateSelf = useCognitoUserStore((s) => s.updateSelf);
  const uploadSelfPicture = useCognitoUserStore((s) => s.uploadSelfPicture);
  const availableTeams = useCognitoUserStore((s) => s.availableTeams || []);

  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(user?.picture);

  const { control, handleSubmit, reset, formState } = useForm<{ name?: string; preferredUsername?: string; birthdate?: string }>({
    defaultValues: { name: user?.name || '', preferredUsername: user?.preferredUsername || '', birthdate: user?.birthdate || '' }
  });

  useEffect(() => {
    if (!user) {
      fetchSelf().catch((err) => console.error(err));
    } else {
      reset({ name: user.name || '', preferredUsername: user.preferredUsername || '', birthdate: user.birthdate || '' });
      setAvatarPreview(user.picture);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const onSubmit = async (data: any) => {
    await updateSelf(data);
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    try {
      setUploading(true);
      // show a local preview
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarPreview(String(reader.result));
      };
      reader.readAsDataURL(f);
      const url = await uploadSelfPicture(f, (_pct) => {
        // could be used to show progress
      });
      if (url) {
        setAvatarPreview(url);
      }
    } catch (err) {
      // noop - store will show notification
    } finally {
      setUploading(false);
      // clear input value so same file can be uploaded again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
    <Paper className="page page-profile page-profile-paper" elevation={3} sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>{t('profile.title', 'Profile')}</Typography>

      <Grid container spacing={4}>
        <Grid className="profile-avatar-col">
          <Box className="profile-avatar">
            <Avatar alt={user?.name || ''} src={avatarPreview} sx={{ width: 120, height: 120 }} />
            <input
              accept="image/*"
              id="profile-picture-input"
              type="file"
              onChange={handleFileChange}
              ref={fileInputRef}
              style={{ display: 'none' }}
            />
            <label htmlFor="profile-picture-input">
              <Button variant="outlined" component="span" sx={{ mt: 2 }} disabled={uploading} className="profile-upload-button">
                {uploading ? <><CircularProgress size={16} />&nbsp;{t('profile.uploading', 'Uploading...')}</> : t('profile.upload', 'Upload picture')}
              </Button>
            </label>
          </Box>
        </Grid>

        <Grid className="profile-form-col">
          <Box component="form" onSubmit={handleSubmit(onSubmit)} className="profile-form">
            <Grid container spacing={2}>
              <Grid className="profile-field profile-field-half">
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField fullWidth label={t('profile.name', 'Name')} {...field} helperText={t('profile.editable.name', 'Editable')} />
                  )}
                />
              </Grid>

              <Grid className="profile-field profile-field-half">
                <Controller
                  name="preferredUsername"
                  control={control}
                  render={({ field }) => (
                    <TextField fullWidth label={t('profile.username', 'Username')} {...field} helperText={t('profile.editable.username', 'Editable')} />
                  )}
                />
              </Grid>

              <Grid className="profile-field profile-field-half">
                <TextField fullWidth label={t('profile.email', 'Email')} value={user?.email || ''} disabled className="readonly-field" helperText={t('profile.readOnly.email', 'Read only')} />
              </Grid>

              <Grid className="profile-field profile-field-half">
                <Controller
                  name="birthdate"
                  control={control}
                  render={({ field }) => (
                    <TextField fullWidth type="date" InputLabelProps={{ shrink: true }} label={t('profile.birthdate', 'Birthdate')} {...field} helperText={t('profile.editable.birthdate', 'Editable')} />
                  )}
                />
              </Grid>

              <Grid className="profile-field profile-field-full">
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button type="submit" variant="contained" disabled={formState.isSubmitting}>{t('profile.save', 'Save')}</Button>
                  <Button type="button" variant="outlined" onClick={() => { if (user) reset({ name: user.name || '', preferredUsername: user.preferredUsername || '', birthdate: user.birthdate || '' }); }}>{t('profile.cancel', 'Cancel')}</Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Grid>
      </Grid>
    </Paper>

    {/* Secondary paper: List available teams for this user */}
    <Paper className="page page-profile page-profile-teams" elevation={1} sx={{ padding: 2, marginTop: 2 }}>
      <Typography variant="h6" gutterBottom>{t('profile.teams.title', 'Teams')}</Typography>
      <List>
        {availableTeams.length === 0 ? (
          <ListItem>
            <ListItemText primary={t('profile.teams.none', 'No teams available')} />
          </ListItem>
        ) : (
          availableTeams.map((ta: any) => (
            <React.Fragment key={ta.team?.id ?? ta.team?.name}>
              <ListItem
                className="profile-team-item"
                secondaryAction={
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => console.log('Leave team', ta.team?.id, ta.team?.name)}
                  >
                    {t('profile.teams.leave', 'Leave')}
                  </Button>
                }
              >
                <ListItemAvatar>
                  <Avatar className="profile-team-avatar" src={ta.team?.picture || undefined}>
                    {ta.team?.name ? ta.team.name[0] : 'T'}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText primary={ta.team?.name ?? ''} secondary={ta.role ? `${t('profile.teams.role', 'Role')}: ${ta.role}` : null} />
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))
        )}
      </List>
    </Paper>
    </>
  );
}
