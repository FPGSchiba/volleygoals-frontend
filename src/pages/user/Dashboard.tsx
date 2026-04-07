import React, { useMemo } from 'react';
import {
  Avatar, Box, Button, Card, CardContent, Chip, Typography,
  useTheme, useMediaQuery,
} from '@mui/material';
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AssessmentIcon from '@mui/icons-material/Assessment';
import GroupIcon from '@mui/icons-material/Group';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend,
} from 'recharts';
import { useSeasonStore } from '../../store/seasons';
import { useGoalStore } from '../../store/goals';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { useActivityStore } from '../../store/activity';
import { useProgressReportStore } from '../../store/progressReports';
import { GoalStatus, ISeasonStats, SeasonStatus } from '../../store/types';
import { formatDateTime } from '../../utils/dateTime';
import { buildProgressChartData, ratingColor } from '../../utils/chartUtils';
import VolleyGoalsAPI from '../../services/backend.api';
import i18next from 'i18next';

// Stat card component
function StatCard({ icon, label, value, color, onClick }: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      sx={{
        flex: '1 1 0',
        minWidth: { xs: 'calc(50% - 8px)', sm: 0 },
        borderRadius: 3,
        borderLeft: `4px solid ${color}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s, transform 0.15s',
        '&:hover': onClick ? { boxShadow: 4, transform: 'translateY(-2px)' } : {},
      }}
      elevation={1}
    >
      <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" fontWeight={700} color={color}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary" mt={0.25}>
              {label}
            </Typography>
          </Box>
          <Box sx={{ color, opacity: 0.85 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// Activity border color
const activityBorderColor = (action: string) => {
  if (action.startsWith('goal')) return '#4caf50';
  if (action.startsWith('member')) return '#2196f3';
  if (action.startsWith('settings') || action.startsWith('team')) return '#ff9800';
  return '#9e9e9e';
};

// Custom tooltip for dashboard chart
const DashboardChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 1.5,
        boxShadow: 3,
        maxWidth: 200,
      }}
    >
      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
        {label}
      </Typography>
      {payload.map((entry: any) => (
        <Box key={entry.dataKey} display="flex" alignItems="center" gap={0.75} mb={0.25}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: entry.color, flexShrink: 0 }} />
          <Typography variant="caption">
            {entry.name}: <strong>{entry.value}/5</strong>
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

export function Dashboard() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const fetchSeasons = useSeasonStore((s) => s.fetchSeasons);
  const seasons = useSeasonStore((s) => s.seasonList.seasons);
  const fetchGoals = useGoalStore((s) => s.fetchGoals);
  const goals = useGoalStore((s) => s.goalList.goals);
  const selectedTeam = useCognitoUserStore((s) => s.selectedTeam);
  const currentUser = useCognitoUserStore((s) => s.user);
  const teamId = selectedTeam?.team?.id || '';
  const fetchActivity = useActivityStore((s) => s.fetchActivity);
  const activities = useActivityStore((s) => s.activities);
  const fetchReports = useProgressReportStore((s) => s.fetchReports);
  const reports = useProgressReportStore((s) => s.reportList.reports) || [];

  const [seasonStats, setSeasonStats] = React.useState<ISeasonStats | null>(null);

  React.useEffect(() => {
    if (teamId) {
      fetchSeasons(teamId, { teamId });
      fetchActivity(teamId, { limit: 7 }).catch(() => {});
    }
  }, [teamId]);

  const activeSeason = seasons.find(s => s.status === SeasonStatus.Active);

  React.useEffect(() => {
    if (activeSeason?.id) {
      fetchReports(activeSeason.id, { limit: 100 } as any).catch(() => {});
      setSeasonStats(null);
      VolleyGoalsAPI.getSeasonStats(activeSeason.id)
        .then(r => { if (r.stats) setSeasonStats(r.stats as ISeasonStats); })
        .catch(() => {});
    }
  }, [activeSeason?.id]);

  React.useEffect(() => {
    if (teamId) {
      fetchGoals(teamId, { limit: 100 } as any);
    }
  }, [teamId]);

  const ownGoals = goals.filter(g => g.ownerId === currentUser?.id);

  // Compute stat card values — use API stats when available, fall back to computed
  const openGoalCount = useMemo(() => {
    if (seasonStats?.openGoalCount !== undefined) return seasonStats.openGoalCount;
    return goals.filter(g => g.status === GoalStatus.Open).length;
  }, [seasonStats, goals]);

  const inProgressGoalCount = useMemo(() => {
    if (seasonStats?.inProgressGoalCount !== undefined) return seasonStats.inProgressGoalCount;
    return goals.filter(g => g.status === GoalStatus.InProgress).length;
  }, [seasonStats, goals]);

  // Build chart data for own goals (last 10 reports)
  const recentReports = useMemo(
    () => [...reports]
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-10),
    [reports]
  );

  const { data: chartData, chartGoals } = useMemo(
    () => buildProgressChartData(recentReports, ownGoals, new Set()),
    [recentReports, ownGoals]
  );

  const recentActivities = activities.slice(0, 7);

  return (
    <Box className="dashboard-page" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1400 }}>
      <Box className="dashboard-header">
        <Typography variant="h4" fontWeight={700} color="text.primary" className="dashboard-title">
          {i18next.t('dashboard.title', 'Dashboard')}
        </Typography>
        {activeSeason && (
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" color="text.secondary" component="span">
              {activeSeason.name} · {i18next.t('dashboard.activeSeason', 'Active Season')}
            </Typography>
            <Chip label={activeSeason.status} size="small" color="success" sx={{ borderRadius: 1 }} />
          </Box>
        )}
      </Box>

      {/* Stat Cards Row */}
      <Box className="dashboard-stats-grid">
        <StatCard
          icon={<TrackChangesIcon sx={{ fontSize: 36 }} />}
          label={i18next.t('dashboard.stats.openGoals', 'Open Goals')}
          value={activeSeason ? openGoalCount : '—'}
          color={theme.palette.warning.main}
          onClick={() => navigate('/goals')}
        />
        <StatCard
          icon={<PlayCircleOutlineIcon sx={{ fontSize: 36 }} />}
          label={i18next.t('dashboard.stats.inProgressGoals', 'In Progress')}
          value={activeSeason ? inProgressGoalCount : '—'}
          color={theme.palette.info.main}
          onClick={() => navigate('/goals')}
        />
        <StatCard
          icon={<CheckCircleOutlineIcon sx={{ fontSize: 36 }} />}
          label={i18next.t('dashboard.stats.completedGoals', 'Completed Goals')}
          value={activeSeason && seasonStats ? seasonStats.completedGoalCount : '—'}
          color={theme.palette.success.main}
          onClick={() => navigate('/goals')}
        />
        <StatCard
          icon={<AssessmentIcon sx={{ fontSize: 36 }} />}
          label={i18next.t('dashboard.stats.reports', 'Progress Reports')}
          value={activeSeason && seasonStats ? seasonStats.reportCount : '—'}
          color={theme.palette.primary.main}
          onClick={() => navigate('/progress')}
        />
        <StatCard
          icon={<GroupIcon sx={{ fontSize: 36 }} />}
          label={i18next.t('dashboard.stats.members', 'Team Members')}
          value={seasonStats ? seasonStats.memberCount : '—'}
          color="#7B1FA2"
        />
      </Box>

      {/* Main content: Chart + Activity Feed */}
      <Box display="flex" gap={2} flexDirection={isTablet ? 'column' : 'row'} alignItems="stretch">

        {/* Progress Chart — hidden on mobile */}
        {!isMobile && (
        <Card sx={{ flex: '2 1 0', minWidth: 0, borderRadius: 3 }} elevation={1}>
          <CardContent sx={{ pb: '16px !important' }}>
            <Box className="dashboard-section-header">
              <Typography variant="h6" className="dashboard-section-title">
                {i18next.t('dashboard.myProgress', 'My Progress')}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                sx={{ borderRadius: 2 }}
                onClick={() => navigate('/progress')}
              >
                {i18next.t('dashboard.viewAll', 'View All')}
              </Button>
            </Box>

            {!activeSeason ? (
              <Typography variant="body2" color="text.secondary">
                {i18next.t('dashboard.noActiveSeason', 'No active season.')}
              </Typography>
            ) : ownGoals.length === 0 || chartData.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {i18next.t('dashboard.noProgress', 'No progress data yet.')}
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height={isMobile ? 200 : 280}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                  <XAxis
                    dataKey="dateLabel"
                    tick={{ fontSize: 10, fill: theme.palette.text.secondary }}
                    tickLine={false}
                    axisLine={{ stroke: theme.palette.divider }}
                  />
                  <YAxis
                    domain={[1, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    tick={{ fontSize: 10, fill: theme.palette.text.secondary }}
                    tickLine={false}
                    axisLine={{ stroke: theme.palette.divider }}
                    width={24}
                  />
                  <RechartsTooltip content={<DashboardChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
                  {chartGoals.map((g) => (
                    <Line
                      key={g.id}
                      type="monotone"
                      dataKey={g.id}
                      name={g.title}
                      stroke={g.color}
                      strokeWidth={2}
                      connectNulls={false}
                      dot={{ r: 4, fill: g.color, stroke: '#fff', strokeWidth: 2 }}
                      activeDot={{
                        r: 7,
                        style: { cursor: 'pointer' },
                        onClick: (_: any, payload: any) => {
                          if (payload?.payload?.reportId) navigate(`/progress/${payload.payload.reportId}`);
                        },
                      }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        )}

        {/* Activity Feed */}
        <Card sx={{ flex: '1 1 0', minWidth: 0, borderRadius: 3 }} elevation={1}>
          <CardContent sx={{ pb: '16px !important' }}>
            <Box className="dashboard-section-header">
              <Typography variant="h6" className="dashboard-section-title">
                {i18next.t('dashboard.activityHistory', 'Recent Activity')}
              </Typography>
            </Box>

            {recentActivities.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {i18next.t('dashboard.noActivity', 'No recent activity.')}
              </Typography>
            ) : (
              <Box display="flex" flexDirection="column" gap={1} sx={{
                overflowY: 'auto',
                maxHeight: isMobile ? 280 : 320,
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(0,0,0,0.2) transparent',
                '&::-webkit-scrollbar': { width: '4px' },
                '&::-webkit-scrollbar-track': { background: 'transparent' },
                '&::-webkit-scrollbar-thumb': { background: 'rgba(0,0,0,0.2)', borderRadius: 2 },
              }}>
                {recentActivities.map(a => {
                  const relativeTime = (() => {
                    const diff = Date.now() - new Date(a.timestamp).getTime();
                    const mins = Math.floor(diff / 60000);
                    if (mins < 60) return `${mins}m ago`;
                    const hrs = Math.floor(mins / 60);
                    if (hrs < 24) return `${hrs}h ago`;
                    return `${Math.floor(hrs / 24)}d ago`;
                  })();

                  return (
                    <Box
                      key={a.id}
                      className="dashboard-activity-item"
                      display="flex"
                      alignItems="flex-start"
                      gap={1.5}
                      py={1}
                      px={1.5}
                      sx={{
                        borderLeft: `3px solid ${activityBorderColor(a.action)}`,
                        borderRadius: '0 8px 8px 0',
                        bgcolor: 'action.hover',
                      }}
                    >
                      <Avatar
                        src={a.actorPicture || undefined}
                        sx={{ width: 30, height: 30, fontSize: 12, flexShrink: 0 }}
                      >
                        {a.actorName ? a.actorName[0] : '?'}
                      </Avatar>
                      <Box flex={1} minWidth={0}>
                        <Typography variant="body2" sx={{ lineHeight: 1.3 }}>
                          {a.description}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={0.5} mt={0.25}>
                          {a.actorName && (
                            <Typography variant="caption" color="text.secondary">
                              {a.actorName}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.disabled">
                            · {relativeTime}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </CardContent>
        </Card>

      </Box>

      {/* Season quick info (if active season exists) */}
      {activeSeason && seasonStats && (
        <Card sx={{ mt: 2, borderRadius: 3 }} elevation={1}>
          <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
              <Box>
                <Typography variant="subtitle1" fontWeight={600}>{activeSeason.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {i18next.t('dashboard.season.goals', 'Goals')}: {seasonStats.completedGoalCount}/{seasonStats.goalCount} {i18next.t('dashboard.completed', 'completed')}
                </Typography>
              </Box>
              <Box sx={{ flex: '0 0 200px', minWidth: 100 }}>
                <Box sx={{ height: 8, bgcolor: 'action.hover', borderRadius: 4, overflow: 'hidden' }}>
                  <Box sx={{
                    height: '100%',
                    bgcolor: 'success.main',
                    borderRadius: 4,
                    width: `${seasonStats.goalCount > 0 ? Math.round((seasonStats.completedGoalCount / seasonStats.goalCount) * 100) : 0}%`,
                    transition: 'width 0.4s ease',
                  }} />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {seasonStats.goalCount > 0
                    ? `${Math.round((seasonStats.completedGoalCount / seasonStats.goalCount) * 100)}%`
                    : '0%'} {i18next.t('dashboard.completion', 'completion')}
                </Typography>
              </Box>
              <Button size="small" sx={{ borderRadius: 2 }} onClick={() => navigate('/seasons')}>
                {i18next.t('dashboard.viewAll', 'View All')}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
