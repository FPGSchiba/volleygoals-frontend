import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useSeasonStore } from '../../store/seasons';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { RoleType, ISeason, SeasonStatus } from '../../store/types';
import i18next from 'i18next';

const isoToDateOnly = (iso?: string) => (!iso ? '' : iso.substring(0, 10));
const dateOnlyToISO = (s?: string) => (!s ? '' : new Date(s).toISOString());

type SeasonForm = { name: string; startDate: string; endDate: string; status: SeasonStatus | '' };

function statusBadgeClass(s: SeasonStatus) {
  if (s === SeasonStatus.Active) return 'vg-badge vg-badge--done';
  if (s === SeasonStatus.Planned) return 'vg-badge vg-badge--progress';
  return 'vg-badge vg-badge--muted';
}

export function Seasons() {
  const navigate = useNavigate();
  const fetchSeasons = useSeasonStore(s => s.fetchSeasons);
  const createSeason = useSeasonStore(s => s.createSeason);
  const seasons = useSeasonStore(s => s.seasonList.seasons) || [];
  const selectedTeam = useCognitoUserStore(s => s.selectedTeam);
  const teamId = selectedTeam?.team?.id || '';
  const userRole = selectedTeam?.role;
  const canCreate = userRole === RoleType.Admin || userRole === RoleType.Trainer;

  React.useEffect(() => {
    if (teamId) fetchSeasons(teamId, { teamId });
  }, [teamId, fetchSeasons]);

  const activeSeason = seasons.find(s => s.status === SeasonStatus.Active);
  const pastSeasons = seasons.filter(s => s.status !== SeasonStatus.Active);

  const [createOpen, setCreateOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { control, handleSubmit, reset } = useForm<SeasonForm>({
    defaultValues: { name: '', startDate: '', endDate: '', status: SeasonStatus.Planned },
  });

  const openCreate = () => {
    reset({ name: '', startDate: '', endDate: '', status: SeasonStatus.Planned });
    setCreateOpen(true);
  };

  const onCreate = async (data: SeasonForm) => {
    if (!teamId) return;
    setActionLoading(true);
    try {
      await createSeason(
        teamId, data.name,
        data.startDate ? dateOnlyToISO(data.startDate) : undefined,
        data.endDate ? dateOnlyToISO(data.endDate) : undefined,
        (data.status as SeasonStatus) || undefined,
      );
      setCreateOpen(false);
      fetchSeasons(teamId, { teamId });
    } finally {
      setActionLoading(false);
    }
  };

  const formatRange = (s: ISeason) => {
    const start = s.startDate ? new Date(s.startDate).toLocaleDateString() : '?';
    const end = s.endDate ? new Date(s.endDate).toLocaleDateString() : '?';
    return `${start} – ${end}`;
  };

  return (
    <Box className="seasons-page" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 900 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <div>
          <div className="vg-eyebrow">{seasons.length} {i18next.t('user.seasons.eyebrow', 'Seasons')}</div>
          <div className="vg-page-title">{i18next.t('user.seasons.title', 'Seasons')}</div>
        </div>
        {canCreate && (
          <button className="vg-chip vg-chip--active" onClick={openCreate} style={{ height: 34, borderRadius: 8 }}>
            {i18next.t('user.seasons.new', 'New Season')}
          </button>
        )}
      </Box>

      {activeSeason && (
        <div className="seasons-hero-card">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <span className="vg-badge vg-badge--done">{i18next.t('user.seasons.status.active', 'Active')}</span>
          </Box>
          <div className="seasons-hero-name">{activeSeason.name}</div>
          <div className="seasons-hero-stats">
            <div className="vg-stat-card" style={{ padding: '10px 14px', minWidth: 80 }}>
              <div className="vg-stat-num" style={{ fontSize: 20 }}>—</div>
              <div className="vg-stat-label">{i18next.t('user.seasons.goals', 'Goals')}</div>
            </div>
          </div>
          <div className="seasons-hero-actions">
            <button className="vg-chip vg-chip--active" onClick={() => navigate('/goals')}>
              {i18next.t('user.seasons.viewGoals', 'View Goals')}
            </button>
            <button className="vg-chip" onClick={() => navigate('/progress')}>
              {i18next.t('user.seasons.viewReports', 'View Reports')}
            </button>
            <button className="vg-chip" onClick={() => navigate(`/seasons/${activeSeason.id}`)}>
              {i18next.t('user.seasons.details', 'Details')}
            </button>
          </div>
        </div>
      )}

      {pastSeasons.length > 0 && (
        <>
          <div className="seasons-list-title">{i18next.t('user.seasons.pastSeasons', 'Past Seasons')}</div>
          <div className="seasons-list">
            {pastSeasons.map(s => (
              <div
                key={s.id}
                className="vg-row-item"
                data-testid={`season-row-${s.id}`}
                onClick={() => navigate(`/seasons/${s.id}`)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="seasons-row-name">{s.name}</div>
                  <div className="seasons-row-dates">{formatRange(s)}</div>
                </div>
                <div className="seasons-row-right">
                  <span className={statusBadgeClass(s.status)}>{s.status}</span>
                  <span className="vg-chevron">›</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {seasons.length === 0 && (
        <Typography sx={{ fontSize: 12, color: 'var(--vg-text-muted)', py: 6, textAlign: 'center' }}>
          {i18next.t('user.seasons.empty', 'No seasons yet.')}
        </Typography>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm"
        PaperProps={{ className: 'vg-dialog-paper' }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 800, borderBottom: '1px solid var(--vg-border)', pb: 1.5 }}>
          {i18next.t('user.seasons.dialog.createTitle', 'New Season')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Controller name="name" control={control} rules={{ required: true }} render={({ field }) => (
              <TextField fullWidth size="small" label={i18next.t('user.seasons.form.name', 'Name')} {...field} />
            )} />
            <Controller name="status" control={control} render={({ field }) => (
              <TextField select fullWidth size="small" label={i18next.t('user.seasons.form.status', 'Status')} {...field}>
                <MenuItem value={SeasonStatus.Planned}>{i18next.t('user.seasons.status.planned', 'Planned')}</MenuItem>
                <MenuItem value={SeasonStatus.Active}>{i18next.t('user.seasons.status.active', 'Active')}</MenuItem>
              </TextField>
            )} />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Controller name="startDate" control={control} render={({ field }) => (
                <TextField fullWidth type="date" size="small" InputLabelProps={{ shrink: true }}
                  label={i18next.t('user.seasons.form.startDate', 'Start Date')} {...field} />
              )} />
              <Controller name="endDate" control={control} render={({ field }) => (
                <TextField fullWidth type="date" size="small" InputLabelProps={{ shrink: true }}
                  label={i18next.t('user.seasons.form.endDate', 'End Date')} {...field} />
              )} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid var(--vg-border)', px: 2.5, py: 1.5 }}>
          <button className="vg-chip" onClick={() => setCreateOpen(false)}>{i18next.t('common.cancel', 'Cancel')}</button>
          <button className="vg-chip vg-chip--active" onClick={handleSubmit(onCreate)} disabled={actionLoading}
            style={{ height: 30, borderRadius: 7, padding: '0 14px' }}>
            {i18next.t('common.create', 'Create')}
          </button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
