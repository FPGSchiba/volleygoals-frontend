import React, { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Controller, useForm } from 'react-hook-form';
import { IInvite, RoleType } from '../../store/types';
import { useTeamStore } from '../../store/teams';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { usePermission } from '../../hooks/usePermission';
import { formatDateTime } from '../../utils/dateTime';
import i18next from 'i18next';

type InviteForm = { email: string; role: RoleType; message: string };
type StatusFilter = 'all' | 'pending' | 'accepted' | 'revoked';

function statusBadgeClass(status: string): string {
  if (status === 'pending') return 'vg-badge vg-badge--open';
  if (status === 'accepted') return 'vg-badge vg-badge--done';
  return 'vg-badge vg-badge--muted';
}

export function Invites() {
  const fetchTeamInvites = useTeamStore(s => s.fetchTeamInvites);
  const createInvite = useTeamStore(s => s.createInvite);
  const resendInvite = useTeamStore(s => s.resendInvite);
  const revokeInvite = useTeamStore(s => s.revokeInvite);
  const teamInvites = useTeamStore(s => s.teamInvites);
  const invites = teamInvites?.invites || [];
  const selectedTeam = useCognitoUserStore(s => s.selectedTeam);
  const teamId = selectedTeam?.team?.id || '';
  const canWrite = usePermission('invites:write');

  React.useEffect(() => {
    if (teamId) fetchTeamInvites(teamId, {});
  }, [teamId, fetchTeamInvites]);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [currentInvite, setCurrentInvite] = useState<IInvite | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const { control, handleSubmit, reset } = useForm<InviteForm>({
    defaultValues: { email: '', role: RoleType.Member, message: '' },
  });

  const filteredInvites = useMemo(() => {
    if (statusFilter === 'all') return invites;
    return invites.filter(inv => (inv.status || 'pending') === statusFilter);
  }, [invites, statusFilter]);

  const onCreate = async (data: InviteForm) => {
    if (!teamId) return;
    setActionLoading(true);
    setCreateError(null);
    try {
      await createInvite(teamId, data.email, data.role, data.message, true);
      setCreateOpen(false);
      reset();
      await fetchTeamInvites(teamId, {});
    } catch {
      setCreateError(i18next.t('invites.createError', 'Failed to send invite. Please try again.'));
    } finally {
      setActionLoading(false);
    }
  };

  const onRevoke = async () => {
    if (!currentInvite || !teamId) return;
    setActionLoading(true);
    setRevokeError(null);
    try {
      await revokeInvite(currentInvite.id, teamId);
      setRevokeOpen(false);
      await fetchTeamInvites(teamId, {});
    } catch {
      setRevokeError(i18next.t('invites.revokeError', 'Failed to revoke invite. Please try again.'));
    } finally {
      setActionLoading(false);
    }
  };

  const statusChips: Array<{ label: string; value: StatusFilter }> = [
    { label: i18next.t('common.all', 'All'), value: 'all' },
    { label: i18next.t('invites.status.pending', 'Pending'), value: 'pending' },
    { label: i18next.t('invites.status.accepted', 'Accepted'), value: 'accepted' },
    { label: i18next.t('invites.status.revoked', 'Revoked'), value: 'revoked' },
  ];

  return (
    <Box className="invites-page" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 900 }}>
      <div className="invites-header">
        <div>
          <div className="vg-eyebrow">{invites.length} {i18next.t('invites.eyebrow', 'Invites')}</div>
          <div className="vg-page-title">{i18next.t('invites.title', 'Invites')}</div>
        </div>
        {canWrite && (
          <button
            type="button"
            className="vg-chip vg-chip--active"
            onClick={() => { reset(); setCreateError(null); setCreateOpen(true); }}
            style={{ height: 34, borderRadius: 8 }}
          >
            {i18next.t('invites.sendInvite', 'Send Invite')}
          </button>
        )}
      </div>

      <div className="vg-chip-row">
        {statusChips.map(c => (
          <button
            key={c.value}
            type="button"
            className={`vg-chip${statusFilter === c.value ? ' vg-chip--active' : ''}`}
            onClick={() => setStatusFilter(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="invites-list">
        {filteredInvites.map(inv => {
          const status = inv.status || 'pending';
          const isPending = status === 'pending';
          return (
            <div
              key={inv.id}
              className="vg-row-item"
              style={{ opacity: isPending ? 1 : 0.7, cursor: 'default' }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="invites-row-email">{inv.email}</div>
                <div className="invites-row-meta">
                  <span>{i18next.t('invites.sent', 'Sent')} {formatDateTime(inv.createdAt)}</span>
                </div>
              </div>
              <div className="invites-row-right">
                <span className="vg-badge vg-badge--trainer">{inv.role}</span>
                <span className={statusBadgeClass(status)}>{status}</span>
                {isPending && canWrite && (
                  <>
                    <button
                      type="button"
                      className="vg-chip"
                      style={{ height: 26, fontSize: 10 }}
                      onClick={() => { resendInvite(inv.id).catch(() => {}); /* fire-and-forget: resend is low-stakes */ }}
                    >
                      {i18next.t('invites.resend', 'Resend')}
                    </button>
                    <button
                      type="button"
                      className="vg-chip"
                      style={{ height: 26, fontSize: 10, color: 'var(--palette-error-main)', borderColor: 'var(--palette-error-main)' }}
                      onClick={() => { setCurrentInvite(inv); setRevokeOpen(true); }}
                    >
                      {i18next.t('invites.revoke', 'Revoke')}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {filteredInvites.length === 0 && (
          <Typography sx={{ fontSize: 12, color: 'var(--vg-text-muted)', py: 4, textAlign: 'center' }}>
            {i18next.t('invites.empty', 'No invites.')}
          </Typography>
        )}
      </div>

      {/* Send Invite Dialog */}
      <Dialog
        open={createOpen}
        onClose={() => { setCreateOpen(false); setCreateError(null); }}
        fullWidth
        maxWidth="sm"
        PaperProps={{ className: 'vg-dialog-paper' }}
      >
        <DialogTitle sx={{ fontSize: 15, fontWeight: 800, borderBottom: '1px solid var(--vg-border)', pb: 1.5 }}>
          {i18next.t('invites.sendInvite', 'Send Invite')}
        </DialogTitle>
        <DialogContent>
          <div className="invites-dialog-form">
            <Controller
              name="email"
              control={control}
              rules={{ required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }}
              render={({ field, fieldState }) => (
                <TextField
                  fullWidth
                  size="small"
                  label={i18next.t('invites.form.email', 'Email')}
                  type="email"
                  error={!!fieldState.error}
                  {...field}
                />
              )}
            />
            <Controller name="role" control={control} render={({ field }) => (
              <TextField select fullWidth size="small" label={i18next.t('invites.form.role', 'Role')} {...field}>
                <MenuItem value={RoleType.Member}>{i18next.t('members.role.member', 'Member')}</MenuItem>
                <MenuItem value={RoleType.Trainer}>{i18next.t('members.role.trainer', 'Trainer')}</MenuItem>
              </TextField>
            )} />
            <Controller name="message" control={control} render={({ field }) => (
              <TextField
                fullWidth
                multiline
                rows={2}
                size="small"
                label={i18next.t('invites.form.message', 'Message (optional)')}
                {...field}
              />
            )} />
          </div>
        </DialogContent>
        {createError && (
          <Typography sx={{ fontSize: 12, color: 'var(--palette-error-main)', px: 2.5, pb: 1 }}>
            {createError}
          </Typography>
        )}
        <DialogActions sx={{ borderTop: '1px solid var(--vg-border)', px: 2.5, py: 1.5 }}>
          <button type="button" className="vg-chip" onClick={() => { setCreateOpen(false); setCreateError(null); }}>
            {i18next.t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            className="vg-chip vg-chip--active"
            onClick={handleSubmit(onCreate)}
            disabled={actionLoading}
            style={{ height: 30, borderRadius: 7, padding: '0 14px' }}
          >
            {i18next.t('invites.sendInvite', 'Send Invite')}
          </button>
        </DialogActions>
      </Dialog>

      {/* Revoke Confirm Dialog */}
      <Dialog open={revokeOpen} onClose={() => { setRevokeOpen(false); setRevokeError(null); }} maxWidth="xs"
        PaperProps={{ className: 'vg-dialog-paper' }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 800, borderBottom: '1px solid var(--vg-border)', pb: 1.5 }}>
          {i18next.t('invites.revokeTitle', 'Revoke Invite')}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 1, fontSize: 12 }}>
            {i18next.t('invites.revokeConfirm', 'Revoke invite for')} <strong>{currentInvite?.email}</strong>?
          </Typography>
        </DialogContent>
        {revokeError && (
          <Typography sx={{ fontSize: 12, color: 'var(--palette-error-main)', px: 2.5, pb: 1 }}>
            {revokeError}
          </Typography>
        )}
        <DialogActions sx={{ borderTop: '1px solid var(--vg-border)', px: 2.5, py: 1.5 }}>
          <button type="button" className="vg-chip" onClick={() => { setRevokeOpen(false); setRevokeError(null); }}>
            {i18next.t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            className="vg-chip"
            onClick={onRevoke}
            disabled={actionLoading}
            style={{ background: 'var(--palette-error-main)', color: 'var(--palette-common-white, #fff)', borderColor: 'var(--palette-error-main)', height: 30, borderRadius: 7, padding: '0 14px' }}
          >
            {i18next.t('invites.revoke', 'Revoke')}
          </button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
