import React from 'react';
import { Box, Button, Card, CardContent, Chip, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSeasonStore } from '../../store/seasons';
import { useGoalStore } from '../../store/goals';
import { useProgressReportStore } from '../../store/progressReports';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { GoalStatus, SeasonStatus } from '../../store/types';
import i18next from 'i18next';

export function Dashboard() {
  const navigate = useNavigate();
  const fetchSeasons = useSeasonStore((s) => s.fetchSeasons);
  const seasons = useSeasonStore((s) => s.seasonList.seasons);
  const fetchGoals = useGoalStore((s) => s.fetchGoals);
  const goals = useGoalStore((s) => s.goalList.goals);
  const fetchReports = useProgressReportStore((s) => s.fetchReports);
  const reports = useProgressReportStore((s) => s.reportList.reports);
  const selectedTeam = useCognitoUserStore((s) => s.selectedTeam);
  const teamId = selectedTeam?.team?.id || '';

  React.useEffect(() => {
    if (teamId) fetchSeasons(teamId, { teamId });
  }, [teamId]);

  const activeSeason = seasons.find(s => s.status === SeasonStatus.Active);

  React.useEffect(() => {
    if (activeSeason?.id) {
      fetchGoals(activeSeason.id, {});
      fetchReports(activeSeason.id, { limit: 5 });
    }
  }, [activeSeason?.id]);

  const openGoals = goals.filter(g => g.status === GoalStatus.Open).length;
  const inProgressGoals = goals.filter(g => g.status === GoalStatus.InProgress).length;
  const completedGoals = goals.filter(g => g.status === GoalStatus.Completed).length;
  const recentReports = reports.slice(0, 3);

  return (
    <Box p={2}>
      <Typography variant="h5">{i18next.t('dashboard.title', 'Dashboard')}</Typography>
      <Box display="flex" flexWrap="wrap" gap={2} mt={1}>
        {/* Active Season Card */}
        <Box flex="1 1 280px" minWidth={0}>
          <Card>
            <CardContent>
              <Typography variant="h6">{i18next.t('dashboard.activeSeason', 'Active Season')}</Typography>
              {activeSeason ? (
                <Box mt={1}>
                  <Typography variant="subtitle1">{activeSeason.name}</Typography>
                  <Typography variant="body2">{activeSeason.startDate} – {activeSeason.endDate}</Typography>
                  <Chip label={activeSeason.status} size="small" color="success" sx={{ mt: 1 }} />
                  <Box mt={2}>
                    <Button size="small" onClick={() => navigate('/seasons')}>{i18next.t('dashboard.viewAll', 'View All')}</Button>
                  </Box>
                </Box>
              ) : (
                <Box mt={1}>
                  <Typography variant="body2">{i18next.t('dashboard.noActiveSeason', 'No active season.')}</Typography>
                  <Button size="small" sx={{ mt: 1 }} onClick={() => navigate('/seasons')}>{i18next.t('dashboard.viewAll', 'View All')}</Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Goals Summary Card */}
        <Box flex="1 1 280px" minWidth={0}>
          <Card>
            <CardContent>
              <Typography variant="h6">{i18next.t('dashboard.goalsSummary', 'Goals')}</Typography>
              <Box mt={1} display="flex" gap={1} flexWrap="wrap">
                <Chip label={`Open: ${openGoals}`} size="small" color="warning" />
                <Chip label={`In Progress: ${inProgressGoals}`} size="small" color="primary" />
                <Chip label={`Completed: ${completedGoals}`} size="small" color="success" />
              </Box>
              <Box mt={2}>
                <Button size="small" onClick={() => navigate('/goals')}>{i18next.t('dashboard.viewGoals', 'View Goals')}</Button>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Recent Progress Card */}
        <Box flex="1 1 280px" minWidth={0}>
          <Card>
            <CardContent>
              <Typography variant="h6">{i18next.t('dashboard.recentProgress', 'Recent Progress Reports')}</Typography>
              {recentReports.length === 0 ? (
                <Typography variant="body2" mt={1}>{i18next.t('dashboard.noReports', 'No progress reports yet.')}</Typography>
              ) : (
                <Box mt={1}>
                  {recentReports.map(r => (
                    <Box key={r.id} mb={1}>
                      <Typography variant="body2">{r.summary.length > 50 ? r.summary.slice(0, 50) + '…' : r.summary}</Typography>
                      <Typography variant="caption">{new Date(r.createdAt).toLocaleDateString()}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
              <Box mt={2} display="flex" gap={1}>
                <Button size="small" onClick={() => navigate('/progress/create')}>{i18next.t('dashboard.createProgress', 'Create Progress Report')}</Button>
                <Button size="small" onClick={() => navigate('/progress')}>{i18next.t('dashboard.viewAll', 'View All')}</Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
