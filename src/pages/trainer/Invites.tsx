import React, { useMemo, useState } from 'react';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Grid, MenuItem, Paper, Switch, TableCell, TextField, Typography } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { ItemList, FetchResult } from '../../components/ItemList';
import { IInvite, RoleType } from '../../store/types';
import { ITeamInviteFilterOption } from '../../services/types';
import { useTeamStore } from '../../store/teams';
import { useCognitoUserStore } from '../../store/cognitoUser';
import i18next from 'i18next';

type InviteForm = { email: string; role: RoleType; message: string; sendEmail: boolean; };

export function Invites() {
  const fetchTeamInvites = useTeamStore((s) => s.fetchTeamInvites);
  const createInvite = useTeamStore((s) => s.createInvite);
  const resendInvite = useTeamStore((s) => s.resendInvite);
  const revokeInvite = useTeamStore((s) => s.revokeInvite);
  const teamInvites = useTeamStore((s) => s.teamInvites);
  const invites = teamInvites?.invites || [];
  const selectedTeam = useCognitoUserStore((s) => s.selectedTeam);
  const teamId = selectedTeam?.team?.id || '';
  const userRole = selectedTeam?.role as string | undefined;
  const canManage = userRole === 'admin' || userRole === 'trainer';

  const [allowFetch, setAllowFetch] = React.useState<boolean>(!!selectedTeam);
  React.useEffect(() => setAllowFetch(!!selectedTeam), [selectedTeam]);

  const [inviteCount, setInviteCount] = React.useState(0);
  const initialFilter: ITeamInviteFilterOption = useMemo(() => ({}), []);

  const fetchAdapter = async (filter?: ITeamInviteFilterOption): Promise<FetchResult<IInvite>> => {
    if (!teamId) return { items: [], count: 0 };
    const result = await fetchTeamInvites(teamId, filter || {});
    setInviteCount(result.count);
    return { items: result.items, count: result.count };
  };

  const [createOpen, setCreateOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [currentInvite, setCurrentInvite] = useState<IInvite | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { control, handleSubmit, reset } = useForm<InviteForm>({
    defaultValues: { email: '', role: RoleType.Member, message: '', sendEmail: true }
  });

  const onCreate = async (data: InviteForm) => {
    if (!teamId) return;
    setActionLoading(true);
    try {
      await createInvite(teamId, data.email, data.role, data.message, data.sendEmail);
      setCreateOpen(false);
      reset();
    } finally {
      setActionLoading(false);
    }
  };

  const onRevoke = async () => {
    if (!currentInvite || !teamId) return;
    setActionLoading(true);
    try {
      await revokeInvite(currentInvite.id, teamId);
      setRevokeOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const renderRow = (inv: IInvite) => [
    <TableCell key="email">{inv.email}</TableCell>,
    <TableCell key="role"><Chip label={inv.role} size="small" /></TableCell>,
    <TableCell key="status"><Chip label={inv.status || 'pending'} size="small" /></TableCell>,
    <TableCell key="expires">{new Date(inv.expiresAt).toLocaleDateString()}</TableCell>,
    <TableCell key="created">{new Date(inv.createdAt).toLocaleDateString()}</TableCell>,
  ];

  const renderActions = (inv: IInvite): React.ReactElement[] => {
    if (!canManage) return [];
    const pending = inv.status === 'pending' || !inv.status;
    return [
      pending ? (
        <Button key="resend" size="small" variant="outlined" onClick={() => resendInvite(inv.id)} style={{ marginRight: 8 }}>
          {i18next.t('invites.resend', 'Resend')}
        </Button>
      ) : null,
      pending ? (
        <Button key="revoke" size="small" variant="contained" color="error" onClick={() => { setCurrentInvite(inv); setRevokeOpen(true); }}>
          {i18next.t('invites.revoke', 'Revoke')}
        </Button>
      ) : null,
    ].filter((x): x is React.ReactElement => x !== null);
  };

  return (
    <Paper>
      <Box p={2}>
        <Typography variant="h5">{i18next.t('invites.title', 'Invites')}</Typography>
        <Box mt={2}>
          <ItemList<IInvite, ITeamInviteFilterOption>
            title={i18next.t('invites.title', 'Invites')}
            columns={[
              i18next.t('invites.email', 'Email'),
              i18next.t('invites.role', 'Role'),
              i18next.t('invites.status', 'Status'),
              i18next.t('invites.expiresAt', 'Expires'),
              i18next.t('user.goals.columns.created', 'Created'),
            ]}
            initialFilter={initialFilter}
            rowsPerPage={10}
            fetch={fetchAdapter}
            initialFetchPaused={!allowFetch}
            create={canManage ? () => { reset(); setCreateOpen(true); } : undefined}
            renderFilterFields={(f, setF) => [
              <Grid key="email">
                <TextField fullWidth label={i18next.t('invites.email', 'Email')} value={f.email ?? ''} onChange={(e) => setF({ ...f, email: e.target.value })} />
              </Grid>,
              <Grid key="status">
                <TextField select fullWidth label={i18next.t('invites.status', 'Status')} value={f.status ?? ''} onChange={(e) => setF({ ...f, status: e.target.value })}>
                  <MenuItem value="">{i18next.t('admin.teams.filter.any', 'Any')}</MenuItem>
                  <MenuItem value="pending">pending</MenuItem>
                  <MenuItem value="accepted">accepted</MenuItem>
                  <MenuItem value="declined">declined</MenuItem>
                  <MenuItem value="revoked">revoked</MenuItem>
                </TextField>
              </Grid>,
              <Grid key="role">
                <TextField select fullWidth label={i18next.t('invites.role', 'Role')} value={f.role ?? ''} onChange={(e) => setF({ ...f, role: e.target.value })}>
                  <MenuItem value="">{i18next.t('admin.teams.filter.any', 'Any')}</MenuItem>
                  <MenuItem value="admin">admin</MenuItem>
                  <MenuItem value="trainer">trainer</MenuItem>
                  <MenuItem value="member">member</MenuItem>
                </TextField>
              </Grid>,
            ]}
            renderRow={(item) => renderRow(item)}
            renderActions={(item) => renderActions(item as IInvite)}
            sortableFields={[]}
            items={invites}
            count={inviteCount}
          />
        </Box>
      </Box>

      {/* Create Invite Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{i18next.t('invites.createTitle', 'Create Invite')}</DialogTitle>
        <DialogContent>
          <form id="invite-create-form" onSubmit={handleSubmit(onCreate)}>
            <Box mt={1} display="flex" flexDirection="column" gap={2}>
              <Controller name="email" control={control} rules={{ required: true, pattern: /^\S+@\S+\.\S+$/ }} render={({ field, fieldState }) => (
                <TextField fullWidth label={i18next.t('invites.email', 'Email')} type="email" error={!!fieldState.error} {...field} />
              )} />
              <Controller name="role" control={control} render={({ field }) => (
                <TextField select fullWidth label={i18next.t('invites.role', 'Role')} {...field}>
                  <MenuItem value={RoleType.Admin}>admin</MenuItem>
                  <MenuItem value={RoleType.Trainer}>trainer</MenuItem>
                  <MenuItem value={RoleType.Member}>member</MenuItem>
                </TextField>
              )} />
              <Controller name="message" control={control} render={({ field }) => (
                <TextField fullWidth multiline rows={3} label={i18next.t('invites.message', 'Personal Message')} {...field} />
              )} />
              <Controller name="sendEmail" control={control} render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
                  label={i18next.t('invites.sendEmail', 'Send Invitation Email')}
                />
              )} />
            </Box>
          </form>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>{i18next.t('common.cancel', 'Cancel')}</Button>
          <Button type="submit" form="invite-create-form" variant="contained" disabled={actionLoading}>
            {i18next.t('invites.create', 'Send Invite')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revoke Confirm Dialog */}
      <Dialog open={revokeOpen} onClose={() => setRevokeOpen(false)}>
        <DialogTitle>{i18next.t('invites.revoke', 'Revoke')}</DialogTitle>
        <DialogContent>
          <Typography>{i18next.t('invites.revokeConfirm', 'Revoke this invitation?')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeOpen(false)}>{i18next.t('common.cancel', 'Cancel')}</Button>
          <Button variant="contained" color="error" onClick={onRevoke} disabled={actionLoading}>{i18next.t('invites.revoke', 'Revoke')}</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
