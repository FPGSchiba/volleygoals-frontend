import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const selectedTeam = useCognitoUserStore(s => s.selectedTeam);
  const teamId = selectedTeam?.team?.id ?? '';

  const fetchSeasons = useSeasonStore(s => s.fetchSeasons);
  const seasons = useSeasonStore(s => s.seasonList.seasons) ?? ([] as ISeason[]);
  const fetchTeamMembers = useTeamStore(s => s.fetchTeamMembers);
  const teamMembers = useTeamStore(s => s.teamMembers) ?? [];
  const { canParticipate, canOversee } = useProgressReportPermissions();

  const [selectedSeasonId, setSelectedSeasonId] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<string>(() => canParticipate ? 'personal' : 'team');

  React.useEffect(() => {
    if (teamId) fetchSeasons(teamId, { teamId });
  }, [teamId]);

  React.useEffect(() => {
    if (!seasons || seasons.length === 0) { setSelectedSeasonId(null); return; }
    const sorted = [...seasons].sort((a, b) => {
      const aDate = a.startDate || a.createdAt || '';
      const bDate = b.startDate || b.createdAt || '';
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
    setSelectedSeasonId(prev => prev || sorted[0]?.id || null);
  }, [seasons]);

  React.useEffect(() => {
    if (canOversee && teamId) fetchTeamMembers(teamId, { limit: 100 } as any).catch(() => {});
  }, [canOversee, teamId]);

  React.useEffect(() => {
    if (!canParticipate && canOversee && viewMode === 'personal') setViewMode('team');
  }, [canParticipate, canOversee]);

  const members = teamMembers.map(m => ({
    id: m.id,
    name: m.name || m.preferredUsername || m.email,
    picture: m.picture,
  }));

  const selectedMember = members.find(m => m.id === viewMode);
  const isPersonal = viewMode === 'personal';
  const isTeam = viewMode === 'team';
  const isMember = !isPersonal && !isTeam;

  return (
    <Box className="progress-page" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1200 }}>
      {/* Header */}
      <div className="progress-header">
        <div>
          <div className="vg-eyebrow">{i18next.t('progress.eyebrow', 'Progress')}</div>
          <div className="vg-page-title">{i18next.t('progress.title', 'Progress Reports')}</div>
        </div>
        <div className="progress-header-right">
          <button
            className="vg-chip vg-chip--active"
            onClick={() => navigate('/progress/create')}
            style={{ height: 34, borderRadius: 8 }}
          >
            + {i18next.t('progress.newReport', 'New Report')}
          </button>
        </div>
      </div>

      {/* Season chips */}
      {seasons.length > 0 && (
        <div className="progress-season-chips">
          {seasons.map(s => (
            <button
              key={s.id}
              className={`vg-chip${selectedSeasonId === s.id ? ' vg-chip--active' : ''}`}
              onClick={() => setSelectedSeasonId(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Context switcher */}
      <ContextSwitcher
        canParticipate={canParticipate}
        canOversee={canOversee}
        value={viewMode}
        onChange={setViewMode}
        members={members}
      />

      {!selectedSeasonId ? (
        <Typography sx={{ fontSize: 12, color: 'var(--vg-text-muted)', py: 6, textAlign: 'center' }}>
          {i18next.t('progress.graph.selectSeason', 'Select a season to view progress.')}
        </Typography>
      ) : (
        <Box sx={{ mt: 1 }}>
          {isPersonal && (
            <PersonalProgressView teamId={teamId} seasonId={selectedSeasonId} canParticipate={canParticipate} />
          )}
          {isTeam && (
            <TeamOverviewView
              teamId={teamId}
              seasonId={selectedSeasonId}
              members={members}
              onMemberSelect={id => setViewMode(id)}
            />
          )}
          {isMember && !selectedMember && (
            <Typography sx={{ fontSize: 12, color: 'var(--vg-text-muted)', py: 6, textAlign: 'center' }}>
              {i18next.t('progress.selectMember', 'Select a member above to view their progress.')}
            </Typography>
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
    </Box>
  );
}

export default Progress;
