import React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useProgressReportPermissions } from '../../hooks/useProgressReportPermissions';
import { ContextSwitcher } from '../../components/progress/ContextSwitcher';
import { PersonalProgressView } from '../../components/progress/PersonalProgressView';
import { TeamOverviewView } from '../../components/progress/TeamOverviewView';
import { MemberProgressView } from '../../components/progress/MemberProgressView';
import { useSeasonStore } from '../../store/seasons';
import { useTeamStore } from '../../store/teams';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { ISeason } from '../../store/types';
import i18next from 'i18next';

export function Progress() {
  const selectedTeam = useCognitoUserStore((s) => s.selectedTeam);
  const teamId = selectedTeam?.team?.id ?? '';

  const fetchSeasons = useSeasonStore((s) => s.fetchSeasons);
  const seasons = useSeasonStore((s) => s.seasonList.seasons) ?? ([] as ISeason[]);

  const fetchTeamMembers = useTeamStore((s) => s.fetchTeamMembers);
  const teamMembers = useTeamStore((s) => s.teamMembers) ?? [];

  const { canParticipate, canOversee } = useProgressReportPermissions();

  const [selectedSeasonId, setSelectedSeasonId] = React.useState<string | null>(null);

  // 'personal' | 'team' | '<memberId>'
  const [viewMode, setViewMode] = React.useState<string>(() =>
    canParticipate ? 'personal' : 'team',
  );

  React.useEffect(() => {
    if (teamId) {
      fetchSeasons(teamId, { teamId });
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
    setSelectedSeasonId((prev) => prev || (sorted[0] && sorted[0].id) || null);
  }, [seasons]);

  React.useEffect(() => {
    if (canOversee && teamId) {
      fetchTeamMembers(teamId, { limit: 100 } as any).catch(() => {});
    }
  }, [canOversee, teamId]);

  // Oversight-only users should never land on personal view
  React.useEffect(() => {
    if (!canParticipate && canOversee && viewMode === 'personal') {
      setViewMode('team');
    }
  }, [canParticipate, canOversee]);

  const members = teamMembers.map((m) => ({
    id: m.id,
    name: m.name || m.preferredUsername || m.email,
    picture: m.picture,
  }));

  const selectedMember = members.find((m) => m.id === viewMode);
  const isPersonal = viewMode === 'personal';
  const isTeam = viewMode === 'team';
  const isMember = !isPersonal && !isTeam;

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Paper className="progress-page" sx={{ p: 3 }}>
        {/* Season selector */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Typography variant="h5" fontWeight={600} sx={{ flex: 1 }}>
            {i18next.t('progress.title', 'Progress Reports')}
          </Typography>
          <TextField
            select
            size="small"
            value={selectedSeasonId ?? ''}
            label={i18next.t('user.goals.selectSeason', 'Season')}
            onChange={(e) => setSelectedSeasonId(e.target.value)}
            sx={{ minWidth: 200 }}
            disabled={seasons.length === 0}
          >
            {seasons.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.name}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <ContextSwitcher
          canParticipate={canParticipate}
          canOversee={canOversee}
          value={viewMode}
          onChange={setViewMode}
          members={members}
        />

        {!selectedSeasonId ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {i18next.t('progress.graph.selectSeason', 'Select a season to view progress.')}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ mt: 2 }}>
            {isPersonal && (
              <PersonalProgressView
                teamId={teamId}
                seasonId={selectedSeasonId}
                canParticipate={canParticipate}
              />
            )}

            {isTeam && (
              <TeamOverviewView
                teamId={teamId}
                seasonId={selectedSeasonId}
                members={members}
                onMemberSelect={(memberId) => setViewMode(memberId)}
              />
            )}

            {isMember && !selectedMember && (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography color="text.secondary">
                  {i18next.t('progress.selectMember', 'Select a member from the list above to view their progress.')}
                </Typography>
              </Box>
            )}

            {isMember && selectedMember && (
              <MemberProgressView
                memberId={selectedMember.id}
                memberName={selectedMember.name}
                teamId={teamId}
                seasonId={selectedSeasonId}
                onBack={() => setViewMode('team')}
              />
            )}
          </Box>
        )}
      </Paper>
    </Container>
  );
}

export default Progress;
