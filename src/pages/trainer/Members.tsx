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
import { ITeamUser, RoleType, TeamMemberStatus } from '../../store/types';
import { useTeamStore } from '../../store/teams';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { usePermission } from '../../hooks/usePermission';
import VolleyGoalsAPI from '../../services/backend.api';
import i18next from 'i18next';

type MemberEditForm = { role: string; status: string };
type RoleFilter = 'all' | 'trainer' | 'member' | 'invited';

const AVATAR_COLORS = [
  '#C41E3A', '#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4', '#ff5722',
];

function avatarBg(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  }
  return AVATAR_COLORS[Math.abs(h)];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.substring(0, 2).toUpperCase();
}

function getReportCount(m: ITeamUser): number {
  return typeof (m as Record<string, unknown>).reportCount === 'number'
    ? (m as Record<string, unknown>).reportCount as number
    : 0;
}

export function Members() {
  const fetchTeamMembers = useTeamStore(s => s.fetchTeamMembers);
  const teamMembers = useTeamStore(s => s.teamMembers) || [];
  const selectedTeam = useCognitoUserStore(s => s.selectedTeam);
  const currentUser = useCognitoUserStore(s => s.user);
  const teamId = selectedTeam?.team?.id || '';
  const canWrite = usePermission('members:write');

  React.useEffect(() => {
    if (teamId) fetchTeamMembers(teamId, {});
  }, [teamId, fetchTeamMembers]);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [editOpen, setEditOpen] = useState(false);
  const [currentMember, setCurrentMember] = useState<ITeamUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const { control, handleSubmit, reset } = useForm<MemberEditForm>({
    defaultValues: { role: '', status: '' },
  });

  const filteredMembers = useMemo(() => teamMembers.filter(m => {
    const q = search.toLowerCase();
    if (q && !(m.name || '').toLowerCase().includes(q) && !m.email.toLowerCase().includes(q)) return false;
    if (roleFilter === 'trainer' && m.role !== RoleType.Trainer) return false;
    if (roleFilter === 'member' && m.role !== RoleType.Member) return false;
    if (roleFilter === 'invited' && m.status !== TeamMemberStatus.Invited) return false;
    return true;
  }), [teamMembers, search, roleFilter]);

  const openEdit = (m: ITeamUser) => {
    setCurrentMember(m);
    reset({ role: m.role, status: m.status });
    setEditOpen(true);
  };

  const onEdit = async (data: MemberEditForm) => {
    if (!currentMember || !teamId) return;
    setActionLoading(true);
    setEditError(null);
    try {
      await VolleyGoalsAPI.updateMembership(currentMember.id, teamId, data.role, data.status);
      setEditOpen(false);
      await fetchTeamMembers(teamId, {});
    } catch {
      setEditError(i18next.t('members.saveError', 'Failed to save changes. Please try again.'));
    } finally {
      setActionLoading(false);
    }
  };

  const maxReports = Math.max(...teamMembers.map(m => getReportCount(m)), 1);

  const roleChips: Array<{ label: string; value: RoleFilter }> = [
    { label: i18next.t('common.all', 'All'), value: 'all' },
    { label: i18next.t('members.filter.trainers', 'Trainers'), value: 'trainer' },
    { label: i18next.t('members.filter.members', 'Members'), value: 'member' },
    { label: i18next.t('members.filter.invited', 'Invited'), value: 'invited' },
  ];

  return (
    <Box className="members-page" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1000 }}>
      <div className="members-header">
        <div>
          <div className="vg-eyebrow">
            {teamMembers.length} {i18next.t('members.eyebrow', 'Members')}
          </div>
          <div className="vg-page-title">{i18next.t('members.title', 'Members')}</div>
        </div>
      </div>

      <div className="members-toolbar">
        <input
          className="members-search"
          placeholder={i18next.t('members.search', 'Search members…')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="vg-chip-row">
        {roleChips.map(c => (
          <button
            key={c.value}
            type="button"
            className={`vg-chip${roleFilter === c.value ? ' vg-chip--active' : ''}`}
            onClick={() => setRoleFilter(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="members-list">
        {filteredMembers.map(m => {
          const name = m.name || m.preferredUsername || m.email;
          const isYou = m.id === currentUser?.id;
          const isInvited = m.status === TeamMemberStatus.Invited;
          const reportCount = getReportCount(m);
          const activityPct = Math.round((reportCount / maxReports) * 100);
          return (
            <div
              key={m.id}
              className="vg-row-item"
              style={{ opacity: isInvited ? 0.6 : 1 }}
              onClick={() => { if (canWrite) openEdit(m); }}
            >
              <div className="vg-avatar" style={{ background: avatarBg(name), marginRight: 14 }}>
                {initials(name)}
              </div>
              <div className="members-row-info">
                <div className="members-row-name">
                  {name}
                  {isYou && (
                    <span className="members-row-name-you">
                      ({i18next.t('members.you', 'you')})
                    </span>
                  )}
                </div>
                <div className="members-row-email">{m.email}</div>
              </div>
              <div className="members-row-right">
                <div className="vg-activity-bar">
                  <div className="vg-activity-track">
                    <div className="vg-activity-fill" style={{ width: `${activityPct}%` }} />
                  </div>
                  <div className="vg-activity-label">
                    {reportCount} {i18next.t('members.reports', 'rep.')}
                  </div>
                </div>
                {m.role === RoleType.Trainer
                  ? <span className="vg-badge vg-badge--trainer">{i18next.t(`members.role.${m.role}`, m.role)}</span>
                  : <span className="vg-badge vg-badge--muted">{i18next.t(`members.role.${m.role}`, m.role)}</span>
                }
                {isInvited && (
                  <span className="vg-badge vg-badge--open">
                    {i18next.t('members.status.invited', 'Invited')}
                  </span>
                )}
                {canWrite && <span className="vg-chevron">›</span>}
              </div>
            </div>
          );
        })}
        {filteredMembers.length === 0 && (
          <Typography sx={{ fontSize: 12, color: 'var(--vg-text-muted)', py: 4, textAlign: 'center' }}>
            {i18next.t('members.empty', 'No members match the filter.')}
          </Typography>
        )}
      </div>

      <Dialog
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditError(null); }}
        fullWidth
        maxWidth="sm"
        PaperProps={{ className: 'vg-dialog-paper' }}
      >
        <DialogTitle sx={{ fontSize: 15, fontWeight: 800, borderBottom: '1px solid var(--vg-border)', pb: 1.5 }}>
          {i18next.t('members.editTitle', 'Edit Member')}
        </DialogTitle>
        <DialogContent>
          <div className="members-dialog-form">
            <Controller name="role" control={control} render={({ field }) => (
              <TextField select fullWidth size="small" label={i18next.t('members.role.label', 'Role')} {...field}>
                <MenuItem value={RoleType.Trainer}>{i18next.t('members.role.trainer', 'Trainer')}</MenuItem>
                <MenuItem value={RoleType.Member}>{i18next.t('members.role.member', 'Member')}</MenuItem>
              </TextField>
            )} />
            <Controller name="status" control={control} render={({ field }) => (
              <TextField select fullWidth size="small" label={i18next.t('members.status.label', 'Status')} {...field}>
                <MenuItem value={TeamMemberStatus.Active}>{i18next.t('members.status.active', 'Active')}</MenuItem>
                <MenuItem value={TeamMemberStatus.Invited}>{i18next.t('members.status.invited', 'Invited')}</MenuItem>
              </TextField>
            )} />
          </div>
        </DialogContent>
        {editError && (
          <Typography sx={{ fontSize: 12, color: 'var(--palette-error-main)', px: 2.5, pb: 1 }}>
            {editError}
          </Typography>
        )}
        <DialogActions sx={{ borderTop: '1px solid var(--vg-border)', px: 2.5, py: 1.5 }}>
          <button className="vg-chip" type="button" onClick={() => { setEditOpen(false); setEditError(null); }}>
            {i18next.t('common.cancel', 'Cancel')}
          </button>
          <button
            className="vg-chip vg-chip--active"
            type="button"
            onClick={handleSubmit(onEdit)}
            disabled={actionLoading}
            style={{ height: 30, borderRadius: 7, padding: '0 14px' }}
          >
            {i18next.t('common.save', 'Save')}
          </button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
