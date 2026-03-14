import React, { useMemo, useState } from 'react';
import { Box, Grid, TextField, MenuItem, TableCell, Button, Paper, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ItemList, FetchResult } from '../../components/ItemList';
import { IProgressReport, ISeason } from '../../store/types';
import { IProgressReportFilterOption } from '../../services/types';
import { useProgressReportStore } from '../../store/progressReports';
import { useSeasonStore } from '../../store/seasons';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { useTeamStore } from '../../store/teams';
import i18next from 'i18next';

export function Progress() {
  const fetchReports = useProgressReportStore((s) => s.fetchReports);
  const deleteReport = useProgressReportStore((s) => s.deleteReport);
  const reports = useProgressReportStore((s) => s.reportList.reports) || [];
  const count = useProgressReportStore((s) => s.reportList.count) || 0;
  const fetchSeasons = useSeasonStore((s) => s.fetchSeasons);
  const seasons = useSeasonStore((s) => s.seasonList.seasons) || [] as ISeason[];
  const selectedTeam = useCognitoUserStore((s) => s.selectedTeam);
  const currentUser = useCognitoUserStore((s) => s.user);
  const fetchTeamMembers = useTeamStore((s) => s.fetchTeamMembers);
  const teamMembers = useTeamStore((s) => s.teamMembers) || [];
  const navigate = useNavigate();

  const teamId = selectedTeam?.team?.id || '';

  const [allowFetch, setAllowFetch] = useState<boolean>(!!selectedTeam);
  React.useEffect(() => setAllowFetch(!!selectedTeam), [selectedTeam]);

  const userRole = selectedTeam?.role as string | undefined;
  const canEdit = userRole === 'admin' || userRole === 'trainer';

  const initialFilter: IProgressReportFilterOption = useMemo(() => ({}), []);

  const [selectedSeasonId, setSelectedSeasonId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (teamId) {
      fetchSeasons(teamId, { teamId });
      fetchTeamMembers(teamId);
    }
  }, [teamId]);

  const resolveAuthor = (id: string): string => {
    const member = teamMembers.find(m => m.id === id);
    return member?.name || member?.preferredUsername || member?.email || id;
  };

  React.useEffect(() => {
    if (!seasons || seasons.length === 0) {
      setSelectedSeasonId(null);
      return;
    }
    const sorted = [...seasons].sort((a, b) => {
      const aDate = a.startDate || a.createdAt || '';
      const bDate = b.startDate || b.createdAt || '';
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
    setSelectedSeasonId(prev => prev || (sorted[0] && sorted[0].id) || null);
  }, [seasons]);

  const fetchAdapter = async (filter?: IProgressReportFilterOption): Promise<FetchResult<IProgressReport>> => {
    if (!selectedSeasonId) return { items: [], count: 0 };
    const usedFilter: IProgressReportFilterOption = { ...(filter || {}) };
    await fetchReports(selectedSeasonId, usedFilter).catch(() => {});
    const state = useProgressReportStore.getState().reportList;
    return { items: state.reports, count: state.count };
  };

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [currentReport, setCurrentReport] = useState<IProgressReport | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const openDelete = (r: IProgressReport) => {
    const isAuthor = currentUser?.id === r.authorId;
    if (!isAuthor && !canEdit) return;
    setCurrentReport(r);
    setDeleteOpen(true);
  };

  const onDelete = async () => {
    if (!currentReport || !selectedSeasonId) return;
    setActionLoading(true);
    try {
      await deleteReport(currentReport.seasonId, currentReport.id);
      setDeleteOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const onSeasonChange = (seasonId: string) => {
    setSelectedSeasonId(seasonId);
  };

  const renderRow = (r: IProgressReport) => {
    const summary = r.summary && r.summary.length > 60 ? r.summary.slice(0, 60) + '…' : r.summary;
    return [
      <TableCell key="summary" style={{ cursor: 'pointer' }} onClick={() => navigate(`/progress/${r.id}`, { state: { seasonId: selectedSeasonId } })}>{summary}</TableCell>,
      <TableCell key="author">{resolveAuthor(r.authorId)}</TableCell>,
      <TableCell key="created">{new Date(r.createdAt).toLocaleString()}</TableCell>,
    ];
  };

  const renderActions = (r: IProgressReport) => {
    const isAuthor = currentUser?.id === r.authorId;
    const canDelete = isAuthor || canEdit;
    return [
      <Button key="view" variant="contained" size="small" onClick={() => navigate(`/progress/${r.id}`, { state: { seasonId: selectedSeasonId } })} style={{ marginRight: 8 }}>
        {i18next.t('common.view', 'View')}
      </Button>,
      canDelete ? (
        <Button key="delete" variant="contained" size="small" color="error" onClick={() => openDelete(r)} disabled={actionLoading}>
          {i18next.t('progress.delete', 'Delete')}
        </Button>
      ) : null
    ].filter(Boolean);
  };

  return (
    <Paper>
      <Box p={2}>
        <Typography variant="h5">{i18next.t('progress.title', 'Progress Reports')}</Typography>
        <Box mt={2} display="flex" alignItems="center" gap={2}>
          <TextField
            select
            size="small"
            value={selectedSeasonId ?? ''}
            label={i18next.t('user.goals.selectSeason', 'Season')}
            onChange={(e) => onSeasonChange(e.target.value)}
            style={{ minWidth: 240 }}
          >
            {seasons.map((s) => (
              <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
            ))}
          </TextField>
          <Button variant="contained" color="primary" onClick={() => navigate('/progress/create')} disabled={!selectedSeasonId}>
            {i18next.t('progress.createTitle', 'Create Progress Report')}
          </Button>
        </Box>
        <Box mt={2}>
          <ItemList<IProgressReport, IProgressReportFilterOption>
            title={i18next.t('progress.title', 'Progress Reports')}
            columns={[
              i18next.t('progress.summary', 'Summary'),
              i18next.t('progress.author', 'Author'),
              i18next.t('user.goals.columns.created', 'Created'),
            ]}
            initialFilter={initialFilter}
            rowsPerPage={10}
            fetch={fetchAdapter}
            initialFetchPaused={!allowFetch || !selectedSeasonId}
            renderFilterFields={(f, setF) => [
              <Grid key="summary">
                <TextField fullWidth label={i18next.t('progress.summary', 'Summary')} value={f.summary ?? ''} onChange={(e) => setF({ ...f, summary: e.target.value })} />
              </Grid>,
              <Grid key="authorId">
                <TextField fullWidth label={i18next.t('progress.author', 'Author')} value={f.authorId ?? ''} onChange={(e) => setF({ ...f, authorId: e.target.value })} />
              </Grid>
            ]}
            renderRow={(item) => renderRow(item)}
            renderActions={(item) => renderActions(item as IProgressReport)}
            sortableFields={[{ field: 'createdAt', label: i18next.t('user.goals.columns.created', 'Created') }]}
            items={reports}
            count={count}
          />
        </Box>
      </Box>

      {/* Delete Dialog */}
      {deleteOpen && (
        <Box
          position="fixed"
          top={0}
          left={0}
          width="100%"
          height="100%"
          display="flex"
          alignItems="center"
          justifyContent="center"
          style={{ background: 'rgba(0,0,0,0.4)', zIndex: 1300 }}
          onClick={() => setDeleteOpen(false)}
        >
          <Paper style={{ padding: 24, minWidth: 320 }} onClick={(e) => e.stopPropagation()}>
            <Typography variant="h6" gutterBottom>{i18next.t('progress.delete', 'Delete')}</Typography>
            <Typography>{i18next.t('progress.deleteConfirm', 'Are you sure you want to delete this progress report?')}</Typography>
            <Box mt={2} display="flex" justifyContent="flex-end" gap={1}>
              <Button onClick={() => setDeleteOpen(false)}>{i18next.t('common.cancel', 'Cancel')}</Button>
              <Button variant="contained" color="error" onClick={onDelete} disabled={actionLoading}>
                {i18next.t('progress.delete', 'Delete')}
              </Button>
            </Box>
          </Paper>
        </Box>
      )}
    </Paper>
  );
}
