import React from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import SearchIcon from '@mui/icons-material/Search';
import { useProgressReportStore } from '../../store/progressReports';

interface TeamMember {
  id: string;
  name: string;
  picture?: string;
}

interface TeamOverviewViewProps {
  teamId: string;
  seasonId: string;
  members: TeamMember[];
  onMemberSelect: (memberId: string) => void;
}

export function TeamOverviewView({
  teamId: _teamId,
  seasonId,
  members,
  onMemberSelect,
}: TeamOverviewViewProps) {
  const { reportList, fetchReports } = useProgressReportStore();
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    void Promise.resolve(fetchReports(seasonId, { limit: 100 })).catch(() => {});
  }, [seasonId]);

  const reportCountByAuthor = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const report of reportList.reports) {
      counts[report.authorId] = (counts[report.authorId] ?? 0) + 1;
    }
    return counts;
  }, [reportList.reports]);

  const maxReports = React.useMemo(() => {
    const counts = Object.values(reportCountByAuthor);
    return counts.length > 0 ? Math.max(...counts) : 1;
  }, [reportCountByAuthor]);

  const filteredMembers = React.useMemo(() => {
    if (!search.trim()) return members;
    const lower = search.toLowerCase();
    return members.filter((m) => m.name.toLowerCase().includes(lower));
  }, [members, search]);

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Grid container spacing={2}>
        {filteredMembers.map((member) => {
          const count = reportCountByAuthor[member.id] ?? 0;
          const progress = maxReports > 0 ? (count / maxReports) * 100 : 0;
          const reportLabel = count === 1 ? '1 report this season' : `${count} reports this season`;

          return (
            <Grid key={member.id} item xs={12} sm={6} md={4}>
              <Card variant="outlined">
                <CardActionArea onClick={() => onMemberSelect(member.id)}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                      <Avatar src={member.picture} alt={member.name}>
                        {member.name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {member.name}
                      </Typography>
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {reportLabel}
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={progress}
                      sx={{ borderRadius: 1 }}
                    />
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
