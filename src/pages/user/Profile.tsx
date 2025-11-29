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

export function Profile() {
  const { t } = useTranslation();
  const user = useCognitoUserStore((s) => s.user);
  const fetchSelf = useCognitoUserStore((s) => s.fetchSelf);
  const updateSelf = useCognitoUserStore((s) => s.updateSelf);
  const uploadSelfPicture = useCognitoUserStore((s) => s.uploadSelfPicture);

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
    <Box className="page page-profile">
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
              <Button variant="outlined" component="span" sx={{ mt: 2 }} disabled={uploading}>
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
                    <TextField fullWidth label={t('profile.name', 'Name')} {...field} />
                  )}
                />
              </Grid>

              <Grid className="profile-field profile-field-half">
                <Controller
                  name="preferredUsername"
                  control={control}
                  render={({ field }) => (
                    <TextField fullWidth label={t('profile.username', 'Username')} {...field} />
                  )}
                />
              </Grid>

              <Grid className="profile-field profile-field-half">
                <TextField fullWidth label={t('profile.email', 'Email')} value={user?.email || ''} disabled />
              </Grid>

              <Grid className="profile-field profile-field-half">
                <Controller
                  name="birthdate"
                  control={control}
                  render={({ field }) => (
                    <TextField fullWidth type="date" InputLabelProps={{ shrink: true }} label={t('profile.birthdate', 'Birthdate')} {...field} />
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
    </Box>
  );
}
