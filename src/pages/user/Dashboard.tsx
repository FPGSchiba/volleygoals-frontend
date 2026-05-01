import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import { useNavigate } from 'react-router-dom';
import { useSeasonStore } from '../../store/seasons';
import { useGoalStore } from '../../store/goals';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { useActivityStore } from '../../store/activity';
import { useProgressReportStore } from '../../store/progressReports';
import { GoalStatus, ISeasonStats, SeasonStatus } from '../../store/types';
import { buildHeatmapData } from '../../utils/chartUtils';
import { GoalHeatmap } from '../../components/progress/GoalHeatmap';
import { EntryDrawer, EntryDrawerEntry } from '../../components/progress/EntryDrawer';
import VolleyGoalsAPI from '../../services/backend.api';
import i18next from 'i18next';

function relTime(timestamp: string) {
  const mins = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function Dashboard() {
  const navigate = useNavigate();
  const fetchSeasons = useSeasonStore(s => s.fetchSeasons);
  const seasons = useSeasonStore(s => s.seasonList.seasons);
  const fetchGoals = useGoalStore(s => s.fetchGoals);
  const goals = useGoalStore(s => s.goalList.goals);
  const selectedTeam = useCognitoUserStore(s => s.selectedTeam);
  const currentUser = useCognitoUserStore(s => s.user);
  const teamId = selectedTeam?.team?.id || '';
  const fetchActivity = useActivityStore(s => s.fetchActivity);
  const activities = useActivityStore(s => s.activities);
  const fetchReports = useProgressReportStore(s => s.fetchReports);
  const reports = useProgressReportStore(s => s.reportList.reports) || [];
  const [seasonStats, setSeasonStats] = React.useState<ISeasonStats | null>(null);
  const [selectedEntry, setSelectedEntry] = React.useState<EntryDrawerEntry | null>(null);

  React.useEffect(() => {
    if (teamId) {
      fetchSeasons(teamId, { teamId });
      fetchActivity(teamId, { limit: 7 }).catch(() => {});
      fetchGoals(teamId, { limit: 100 } as any);
    }
  }, [teamId, fetchSeasons, fetchActivity, fetchGoals]);

  const activeSeason = seasons.find(s => s.status === SeasonStatus.Active);

  React.useEffect(() => {
    if (activeSeason?.id) {
      fetchReports(activeSeason.id, { limit: 100 } as any).catch(() => {});
      setSeasonStats(null);
      VolleyGoalsAPI.getSeasonStats(activeSeason.id)
        .then(r => { if (r.stats) setSeasonStats(r.stats as ISeasonStats); })
        .catch(() => {});
    }
  }, [activeSeason?.id, fetchReports]);

  const ownGoals = goals.filter(g => g.ownerId === currentUser?.id);
  const ownReports = useMemo(() => {
    const eightWeeksAgo = Date.now() - 8 * 7 * 24 * 3600 * 1000;
    return reports.filter(r => r.authorId === currentUser?.id && new Date(r.createdAt).getTime() >= eightWeeksAgo);
  }, [reports, currentUser?.id]);

  const heatmapData = useMemo(() => buildHeatmapData(ownReports, ownGoals, 16), [ownReports, ownGoals]);

  const handleCellClick = (progressId: string, reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;
    const entry = report.progress?.find(p => p.id === progressId);
    if (!entry) return;
    const goal = goals.find(g => g.id === entry.goalId);
    setSelectedEntry({
      id: entry.id,
      goalId: entry.goalId,
      goalName: goal?.title ?? entry.goalId,
      rating: entry.rating,
      details: entry.details,
      reportId: report.id,
      reportDate: report.createdAt,
    });
  };

  const openCount = seasonStats?.openGoalCount ?? goals.filter(g => g.status === GoalStatus.Open).length;
  const inProgressCount = seasonStats?.inProgressGoalCount ?? goals.filter(g => g.status === GoalStatus.InProgress).length;
  const completedCount = seasonStats?.completedGoalCount ?? 0;
  const reportCount = seasonStats?.reportCount ?? 0;
  const memberCount = seasonStats?.memberCount ?? 0;

  const goalPct = seasonStats && seasonStats.goalCount > 0
    ? Math.round((seasonStats.completedGoalCount / seasonStats.goalCount) * 100)
    : 0;

  const stats = [
    { label: i18next.t('dashboard.stats.openGoals', 'Open Goals'), value: activeSeason ? openCount : '—', onClick: () => navigate('/goals') },
    { label: i18next.t('dashboard.stats.inProgressGoals', 'In Progress'), value: activeSeason ? inProgressCount : '—', onClick: () => navigate('/goals') },
    { label: i18next.t('dashboard.stats.completedGoals', 'Completed'), value: activeSeason ? completedCount : '—', onClick: () => navigate('/goals') },
    { label: i18next.t('dashboard.stats.reports', 'Progress Reports'), value: activeSeason ? reportCount : '—', onClick: () => navigate('/progress') },
    { label: i18next.t('dashboard.stats.members', 'Team Members'), value: memberCount },
  ];

  return (
    <Box className="dashboard-page" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1400 }}>
      {activeSeason && (
        <div className="vg-eyebrow dashboard-eyebrow">
          {activeSeason.name} · {i18next.t('dashboard.activeSeason', 'Active Season')}
        </div>
      )}
      <div className="vg-page-title dashboard-title">
        {i18next.t('dashboard.title', 'Dashboard')}
      </div>

      {/* Stat grid */}
      <div className="dashboard-stats-grid">
        {stats.map(s => (
          <div
            key={s.label}
            className="vg-stat-card"
            onClick={s.onClick}
            style={{ cursor: s.onClick ? 'pointer' : 'default' }}
          >
            <div className="vg-stat-num">{s.value}</div>
            <div className="vg-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Content row */}
      <div className="dashboard-content-row">
        {/* Heatmap panel */}
        <div className="vg-panel">
          <div className="dashboard-section-title">
            {i18next.t('dashboard.myProgress', 'My Progress')}
          </div>
          {!activeSeason ? (
            <span style={{ fontSize: 12, color: 'var(--vg-text-muted)' }}>
              {i18next.t('dashboard.noActiveSeason', 'No active season.')}
            </span>
          ) : (
            <GoalHeatmap
              data={heatmapData}
              onCellClick={handleCellClick}
              showGoalLabels={true}
              showDateHeaders={true}
              showLegend={true}
            />
          )}
        </div>

        {/* Activity feed */}
        <div className="vg-panel">
          <div className="dashboard-section-title">
            {i18next.t('dashboard.activityHistory', 'Recent Activity')}
          </div>
          <Box sx={{ maxHeight: 320, overflowY: 'auto', scrollbarWidth: 'thin' }}>
            {activities.slice(0, 7).map(a => (
              <div key={a.id} className="dashboard-activity-item">
                <div className="dashboard-activity-dot" />
                <div>
                  <div className="dashboard-activity-desc">{a.description}</div>
                  <div className="dashboard-activity-time">{relTime(a.timestamp)}</div>
                </div>
              </div>
            ))}
            {activities.length === 0 && (
              <span style={{ fontSize: 12, color: 'var(--vg-text-muted)' }}>
                {i18next.t('dashboard.noActivity', 'No recent activity.')}
              </span>
            )}
          </Box>
        </div>
      </div>

      {/* Season strip */}
      {activeSeason && seasonStats && (
        <div className="vg-panel">
          <div className="dashboard-season-strip">
            <div>
              <div className="dashboard-season-name">{activeSeason.name}</div>
              <div className="dashboard-season-fraction">
                {seasonStats.completedGoalCount}/{seasonStats.goalCount} {i18next.t('dashboard.completed', 'goals completed')}
              </div>
            </div>
            <Box sx={{ flex: '0 0 160px', minWidth: 80 }}>
              <div className="vg-prog-track" style={{ marginBottom: 4 }}>
                <div className="vg-prog-fill" style={{ width: `${goalPct}%` }} />
              </div>
              <div className="dashboard-season-pct">{goalPct}%</div>
            </Box>
            <button className="dashboard-view-link" onClick={() => navigate('/seasons')}>
              {i18next.t('dashboard.viewAll', 'View →')}
            </button>
          </div>
        </div>
      )}

      <EntryDrawer
        entry={selectedEntry}
        readonly={true}
        onClose={() => setSelectedEntry(null)}
      />
    </Box>
  );
}
