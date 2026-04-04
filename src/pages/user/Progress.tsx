import React, { useState, useMemo } from 'react';
import {
  Avatar, Box, Button, Chip, Paper, Typography, MenuItem, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions, useTheme, useMediaQuery,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend,
} from 'recharts';
import { useProgressReportStore } from '../../store/progressReports';
import { useSeasonStore } from '../../store/seasons';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { usePermission } from '../../hooks/usePermission';
import { useGoalStore } from '../../store/goals';
import { useTeamStore } from '../../store/teams';
import { IProgressReport, ISeason } from '../../store/types';
import { formatDate, formatDateTime } from '../../utils/dateTime';
import { buildProgressChartData, GOAL_COLORS } from '../../utils/chartUtils';
import i18next from 'i18next';
import IconButton from '@mui/material/IconButton';

// Custom tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <Paper sx={{ p: 1.5, maxWidth: 220 }} elevation={4}>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
        {label}
      </Typography>
      {payload.map((entry: any) => (
        <Box key={entry.dataKey} display="flex" alignItems="center" gap={1} mb={0.25}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.color }} />
          <Typography variant="caption">
            {entry.name}: <strong>{entry.value}/5</strong>
          </Typography>
        </Box>
      ))}
      {payload[0]?.payload?.summary && (
        <Typography variant="caption" color="text.secondary" display="block" mt={0.5} sx={{ fontStyle: 'italic' }}>
          {payload[0].payload.summary.length > 40
            ? payload[0].payload.summary.slice(0, 38) + '…'
            : payload[0].payload.summary}
        </Typography>
      )}
    </Paper>
  );
};

export function Progress() {
  const fetchReports = useProgressReportStore((s) => s.fetchReports);
  const deleteReport = useProgressReportStore((s) => s.deleteReport);
  const reports = useProgressReportStore((s) => s.reportList.reports) || [];
  const fetchSeasons = useSeasonStore((s) => s.fetchSeasons);
  const seasons = useSeasonStore((s) => s.seasonList.seasons) || [] as ISeason[];
  const selectedTeam = useCognitoUserStore((s) => s.selectedTeam);
  const currentUser = useCognitoUserStore((s) => s.user);
  const fetchGoals = useGoalStore((s) => s.fetchGoals);
  const goals = useGoalStore((s) => s.goalList.goals) || [];
  const fetchTeamMembers = useTeamStore((s) => s.fetchTeamMembers);
  const teamMembers = useTeamStore((s) => s.teamMembers) || [];
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const teamId = selectedTeam?.team?.id || '';
  const canCreate = usePermission('progress_reports:write');
  const canEdit = usePermission('progress_reports:write');
  const canDelete = usePermission('progress_reports:delete');

  const [allowFetch, setAllowFetch] = useState<boolean>(!!selectedTeam);
  React.useEffect(() => setAllowFetch(!!selectedTeam), [selectedTeam]);

  const [selectedSeasonId, setSelectedSeasonId] = React.useState<string | null>(null);
  const [hiddenGoalIds, setHiddenGoalIds] = useState<Set<string>>(new Set());
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [currentReport, setCurrentReport] = useState<IProgressReport | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAllReports, setShowAllReports] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  React.useEffect(() => {
    if (teamId) {
      fetchSeasons(teamId, { teamId });
      fetchTeamMembers(teamId, { limit: 100 } as any).catch(() => {});
    }
  }, [teamId]);

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

  React.useEffect(() => {
    if (selectedSeasonId && allowFetch) {
      fetchReports(selectedSeasonId, { limit: 100 } as any).catch(() => {});
      fetchGoals(selectedSeasonId, { limit: 100 } as any).catch(() => {});
    }
  }, [selectedSeasonId, allowFetch]);

  const resolveAuthor = (id: string): string => {
    if (currentUser?.id === id) return currentUser.name || currentUser.preferredUsername || currentUser.email || id;
    const member = teamMembers.find(m => m.id === id);
    return member?.name || member?.preferredUsername || member?.email || id;
  };

  const toggleGoal = (goalId: string) => {
    setHiddenGoalIds(prev => {
      const next = new Set(prev);
      if (next.has(goalId)) next.delete(goalId);
      else next.add(goalId);
      return next;
    });
  };

  const { data: chartData, chartGoals } = useMemo(
    () => buildProgressChartData(reports, goals, hiddenGoalIds),
    [reports, goals, hiddenGoalIds]
  );

  // Goals with data for filter chips
  const goalsWithData = useMemo(() => {
    const goalIdsWithData = new Set<string>();
    reports.forEach(r => r.progress?.forEach(p => goalIdsWithData.add(p.goalId)));
    return goals.filter(g => goalIdsWithData.has(g.id));
  }, [goals, reports]);

  // Report list filters
  const sortedReports = useMemo(
    () => [...reports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [reports]
  );

  const filteredReports = useMemo(() => {
    return sortedReports.filter(r => {
      if (searchText && !r.summary?.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (filterFrom && new Date(r.createdAt) < new Date(filterFrom)) return false;
      if (filterTo && new Date(r.createdAt) > new Date(filterTo + 'T23:59:59')) return false;
      return true;
    });
  }, [sortedReports, searchText, filterFrom, filterTo]);

  const displayedReports = showAllReports ? filteredReports : filteredReports.slice(0, 5);
  const hasMoreReports = filteredReports.length > 5;

  const hasActiveFilters = searchText || filterFrom || filterTo;

  const clearFilters = () => {
    setSearchText('');
    setFilterFrom('');
    setFilterTo('');
    setShowAllReports(false);
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

  return (
    <Box sx={{ pb: { xs: 2, sm: 0 } }}>
      {/* Graph Paper */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box p={{ xs: 2, sm: 3 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
            <Typography variant="h5" fontWeight={600}>
              {i18next.t('progress.title', 'Progress Reports')}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate('/progress/create')}
              disabled={!selectedSeasonId}
              sx={{ borderRadius: 2 }}
            >
              {i18next.t('progress.createTitle', 'Create Progress Report')}
            </Button>
          </Box>

          {/* Season selector */}
          <Box mt={2}>
            <TextField
              select
              size="small"
              value={selectedSeasonId ?? ''}
              label={i18next.t('user.goals.selectSeason', 'Season')}
              onChange={(e) => setSelectedSeasonId(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              {seasons.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Goal filter chips */}
          {goalsWithData.length > 0 && (
            <Box mt={2} display="flex" gap={1} flexWrap="wrap" alignItems="center">
              <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                {i18next.t('progress.goals', 'Goals:')}
              </Typography>
              {goalsWithData.map((g, idx) => (
                <Chip
                  key={g.id}
                  label={g.title}
                  size="small"
                  variant={hiddenGoalIds.has(g.id) ? 'outlined' : 'filled'}
                  onClick={() => toggleGoal(g.id)}
                  sx={hiddenGoalIds.has(g.id)
                    ? { borderRadius: 1.5 }
                    : { bgcolor: GOAL_COLORS[idx % GOAL_COLORS.length], color: '#fff', borderRadius: 1.5 }
                  }
                />
              ))}
            </Box>
          )}

          {/* Chart */}
          <Box mt={3}>
            {!selectedSeasonId || !allowFetch ? (
              <Typography variant="body2" color="text.secondary">
                {i18next.t('progress.graph.selectSeason', 'Select a season to view the progress graph.')}
              </Typography>
            ) : chartGoals.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {reports.length > 0
                  ? i18next.t('progress.graph.noDataWithReports', 'Progress data loading — if graph remains empty, progress entries may not yet be linked to goals.')
                  : i18next.t('progress.graph.noData', 'No progress data available for this season.')}
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height={isMobile ? 240 : 320}>
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fontSize: 11, fill: theme.palette.text.secondary }}
                    tickLine={false}
                    axisLine={{ stroke: theme.palette.divider }}
                  />
                  <YAxis hide />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    iconType="circle"
                    iconSize={10}
                  />
                  {chartGoals.map((g) => (
                    <Line
                      key={g.id}
                      type="monotone"
                      dataKey={g.id}
                      name={g.title}
                      stroke={g.color}
                      strokeWidth={2}
                      connectNulls={false}
                      dot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{
                        r: 7,
                        strokeWidth: 2,
                        stroke: '#fff',
                        style: { cursor: 'pointer' },
                        onClick: (_: any, payload: any) => {
                          if (payload?.payload?.reportId)
                            navigate(`/progress/${payload.payload.reportId}`, { state: { seasonId: selectedSeasonId } });
                        },
                      }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </Box>

        </Box>
      </Paper>

      {/* Report List Paper */}
      {reports.length > 0 && (
        <Paper sx={{ mt: 2, borderRadius: 3, overflow: 'hidden' }}>
          <Box p={{ xs: 2, sm: 3 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} mb={2}>
              <Typography variant="h6" fontWeight={600}>
                {i18next.t('progress.reports', 'Progress Reports')}
              </Typography>
              <Box display="flex" gap={1} alignItems="center">
                {hasActiveFilters && (
                  <Chip
                    label={i18next.t('common.clearFilters', 'Clear filters')}
                    size="small"
                    onDelete={clearFilters}
                    deleteIcon={<ClearIcon />}
                    sx={{ borderRadius: 1.5 }}
                  />
                )}
                <IconButton
                  size="small"
                  onClick={() => setShowFilters(v => !v)}
                  color={showFilters ? 'primary' : 'default'}
                  title={i18next.t('common.filters', 'Filters')}
                >
                  <FilterListIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* Search bar (always visible) */}
            <TextField
              size="small"
              fullWidth
              placeholder={i18next.t('progress.searchPlaceholder', 'Search by summary...')}
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setShowAllReports(false); }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                endAdornment: searchText ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchText('')}><ClearIcon fontSize="small" /></IconButton>
                  </InputAdornment>
                ) : null,
              }}
              sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            {/* Expanded filters */}
            {showFilters && (
              <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
                <TextField
                  size="small"
                  type="date"
                  label={i18next.t('progress.filterFrom', 'From Date')}
                  value={filterFrom}
                  onChange={(e) => { setFilterFrom(e.target.value); setShowAllReports(false); }}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
                <TextField
                  size="small"
                  type="date"
                  label={i18next.t('progress.filterTo', 'To Date')}
                  value={filterTo}
                  onChange={(e) => { setFilterTo(e.target.value); setShowAllReports(false); }}
                  InputLabelProps={{ shrink: true }}
                  sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Box>
            )}

            <Box display="flex" flexDirection="column" gap={1}>
              {displayedReports.map(r => {
                const isAuthor = currentUser?.id === r.authorId;
                const canDeleteThis = isAuthor || canDelete;
                const authorName = r.authorName || resolveAuthor(r.authorId);
                const authorPicture = r.authorPicture;
                return (
                  <Box
                    key={r.id}
                    display="flex"
                    alignItems="center"
                    gap={2}
                    py={1.5}
                    px={1}
                    sx={{
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      transition: 'background-color 0.15s',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Avatar src={authorPicture || undefined} sx={{ width: 36, height: 36, flexShrink: 0 }}>
                      {authorName[0]}
                    </Avatar>
                    <Box flex={1} minWidth={0}>
                      <Typography variant="body2" fontWeight={500} noWrap>
                        {r.summary.length > 60 ? r.summary.slice(0, 60) + '…' : r.summary}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {authorName} · {formatDateTime(r.createdAt)}
                      </Typography>
                    </Box>
                    <Box display="flex" gap={1} flexShrink={0}>
                      <Button
                        size="small"
                        variant="outlined"
                        sx={{ borderRadius: 1.5 }}
                        onClick={() => navigate(`/progress/${r.id}`, { state: { seasonId: selectedSeasonId } })}
                      >
                        {i18next.t('common.view', 'View')}
                      </Button>
                      {canDeleteThis && (
                        <Button
                          size="small"
                          variant="contained"
                          color="error"
                          sx={{ borderRadius: 1.5 }}
                          onClick={() => { setCurrentReport(r); setDeleteOpen(true); }}
                        >
                          {i18next.t('progress.delete', 'Delete')}
                        </Button>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>

            {!showAllReports && hasMoreReports && (
              <Box mt={1.5}>
                <Button
                  size="small"
                  variant="text"
                  sx={{ borderRadius: 2 }}
                  onClick={() => setShowAllReports(true)}
                >
                  {i18next.t('progress.viewMoreReports', 'View More Progress Reports')}
                </Button>
              </Box>
            )}
          </Box>
        </Paper>
      )}

      {/* Delete Dialog */}
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>{i18next.t('progress.delete', 'Delete')}</DialogTitle>
        <DialogContent>
          <Typography>{i18next.t('progress.deleteConfirm', 'Are you sure you want to delete this progress report?')}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteOpen(false)} sx={{ borderRadius: 2 }}>{i18next.t('common.cancel', 'Cancel')}</Button>
          <Button variant="contained" color="error" sx={{ borderRadius: 2 }} onClick={onDelete} disabled={actionLoading}>
            {i18next.t('progress.delete', 'Delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
