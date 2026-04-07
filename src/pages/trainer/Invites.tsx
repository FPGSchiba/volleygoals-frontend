import React, { useMemo, useState } from 'react';
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, Paper, TableCell, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { Controller, useForm } from 'react-hook-form';
import { ItemList, FetchResult } from '../../components/ItemList';
import { IInvite, RoleType } from '../../store/types';
import { ITeamInviteFilterOption } from '../../services/types';
import { useTeamStore } from '../../store/teams';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { usePermission } from '../../hooks/usePermission';
import i18next from 'i18next';

type InviteForm = { email: string; role: RoleType; message: string; };

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
  const canWrite = usePermission('invites:write');
  const canManage = canWrite;

  const [allowFetch, setAllowFetch] = React.useState<boolean>(!!selectedTeam);
  React.useEffect(() => setAllowFetch(!!selectedTeam), [selectedTeam]);

  const [inviteCount, setInviteCount] = React.useState(0);
  const [statusTab, setStatusTab] = React.useState<string>('pending');

  const currentInitialFilter: ITeamInviteFilterOption = useMemo(
    () => (statusTab ? { status: statusTab } : {}),
    [statusTab]
  );

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
    defaultValues: { email: '', role: RoleType.Member, message: '' }
  });

  const onCreate = async (data: InviteForm) => {
    if (!teamId) return;
    setActionLoading(true);
    try {
      await createInvite(teamId, data.email, data.role, data.message, true);
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
    <TableCell key="expires">{new Intl.DateTimeFormat('de-CH', { dateStyle: 'short' }).format(new Date(inv.expiresAt))}</TableCell>,
    <TableCell key="created">{new Intl.DateTimeFormat('de-CH', { dateStyle: 'short' }).format(new Date(inv.createdAt))}</TableCell>,
  ];

  const renderActions = (inv: IInvite): React.ReactElement[] => {
    if (!canManage) return [];
    const pending = inv.status === 'pending' || !inv.status;
    if (!pending) return [];
    return [
      <Box key="actions" className="invites-list-actions">
        <Button size="small" variant="outlined" onClick={() => resendInvite(inv.id)}>
          {i18next.t('invites.resend', 'Resend')}
        </Button>
        <Button size="small" variant="contained" color="error" onClick={() => { setCurrentInvite(inv); setRevokeOpen(true); }}>
          {i18next.t('invites.revoke', 'Revoke')}
        </Button>
      </Box>,
    ];
  };

  const tabOptions = [
    { value: '', label: i18next.t('invites.filterAll', 'All') },
    { value: 'pending', label: i18next.t('invites.filterPending', 'Pending') },
    { value: 'accepted', label: i18next.t('invites.filterAccepted', 'Accepted') },
    { value: 'declined', label: i18next.t('invites.filterDeclined', 'Declined') },
  ];

  return (
    <Paper className="invites-page-root" sx={{ borderRadius: 3 }}>
      <Box p={{ xs: 2, sm: 3 }}>
        <Typography variant="h5">{i18next.t('invites.title', 'Invites')}</Typography>
        <Box mt={1.5}>
          <ToggleButtonGroup
            size="small"
            value={statusTab}
            exclusive
            onChange={(_, v) => { if (v !== null) setStatusTab(v); }}
            sx={{ '& .MuiToggleButton-root': { borderRadius: 1.5, px: 1.5, py: 0.5, fontSize: 12 } }}
          >
            {tabOptions.map(opt => (
              <ToggleButton key={opt.value} value={opt.value}>{opt.label}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
        <Box mt={2}>
          {/* key={statusTab} forces ItemList to remount on tab change so it re-fetches with the new initialFilter */}
          <ItemList<IInvite, ITeamInviteFilterOption>
            key={statusTab}
            title={i18next.t('invites.title', 'Invites')}
            columns={[
              i18next.t('invites.email', 'Email'),
              i18next.t('invites.role', 'Role'),
              i18next.t('invites.status', 'Status'),
              i18next.t('invites.expiresAt', 'Expires'),
              i18next.t('user.goals.columns.created', 'Created'),
            ]}
            initialFilter={currentInitialFilter}
            rowsPerPage={10}
            fetch={fetchAdapter}
            initialFetchPaused={!allowFetch}
            create={canManage ? () => { reset(); setCreateOpen(true); } : undefined}
            renderFilterFields={(f, setF) => [
              <Grid key="email">
                <TextField fullWidth label={i18next.t('invites.email', 'Email')} value={f.email ?? ''} onChange={(e) => setF({ ...f, email: e.target.value })} />
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
            <Box className="invites-dialog-form" mt={1}>
              <Controller name="email" control={control} rules={{ required: true, pattern: /^\S+@\S+\.\S+$/ }} render={({ field, fieldState }) => (
                <TextField fullWidth label={i18next.t('invites.email', 'Email')} type="email" error={!!fieldState.error} {...field} />
              )} />
              <Controller name="role" control={control} render={({ field }) => (
                <TextField select fullWidth label={i18next.t('invites.role', 'Role')} {...field}>
                  {userRole === 'admin' && <MenuItem value={RoleType.Admin}>admin</MenuItem>}
                  <MenuItem value={RoleType.Trainer}>trainer</MenuItem>
                  <MenuItem value={RoleType.Member}>member</MenuItem>
                </TextField>
              )} />
              <Controller name="message" control={control} render={({ field }) => (
                <TextField fullWidth multiline rows={3} label={i18next.t('invites.message', 'Personal Message')} {...field} />
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
