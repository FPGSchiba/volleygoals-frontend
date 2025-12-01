import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCognitoUserStore } from '../../store/cognitoUser';
import {
  Container,
  Paper,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Avatar,
  ListItemAvatar,
  Box,
} from '@mui/material';
import { ITeamAssignment } from '../../store/types';
import GroupIcon from '@mui/icons-material/Group';

export function SelectTeam() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const fetchSelf = useCognitoUserStore(s => s.fetchSelf);
  const setSelectedTeam = useCognitoUserStore(s => s.setSelectedTeam);
  const availableTeams = useCognitoUserStore(s => s.availableTeams ?? []);
  const selectedTeam = useCognitoUserStore(s => s.selectedTeam);

  useEffect(() => {
    if (availableTeams.length === 0) {
      fetchSelf();
    }
  }, [fetchSelf, availableTeams.length]);

  useEffect(() => {
    if (selectedTeam) {
      navigate('/dashboard', { replace: true });
    }
  }, [selectedTeam, navigate]);

  const onSelect = (teamId: string) => {
    setSelectedTeam(teamId);
    navigate('/dashboard', { replace: true });
  };

  return (
    <Container className="select-team__container">
      <Paper className="select-team__card" elevation={3}>
        <Typography variant="h5" className="select-team__title">
          {t('selectTeam.title', 'Select a Team')}
        </Typography>

        {availableTeams.length === 0 ? (
          <div className="select-team__loading" aria-live="polite">
            <CircularProgress />
            <Typography variant="body2" className="select-team__loadingText">
              {t('selectTeam.loading')}
            </Typography>
          </div>
        ) : (
          <List className="select-team__list">
            {availableTeams.map((assignment: ITeamAssignment) => {
              const key = assignment.team.id;
              const name = assignment.team.name || t('selectTeam.unknownTeam');
              const picture = assignment.team.picture || '';

              return (
                <ListItemButton
                  key={key}
                  onClick={() => onSelect(assignment.team.id)}
                  className="select-team__item"
                >
                  <ListItemAvatar className="select-team__avatarWrapper">
                    <Avatar
                      src={picture || undefined}
                      alt={name}
                      imgProps={{
                        onError: (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                          // clear the src so Avatar will render the fallback children
                          (e.currentTarget as HTMLImageElement).src = '';
                        },
                      }}
                      sx={{ width: 160, height: 160 }}
                      aria-label={t('selectTeam.selectTeam', { team: name })}
                    >
                      <GroupIcon sx={{ fontSize: 56 }} />
                    </Avatar>
                  </ListItemAvatar>

                  <Box sx={{ mt: 1, textAlign: 'center', width: '100%' }}>
                    <ListItemText
                      primary={<Typography variant="h6">{name}</Typography>}
                      secondary={assignment.role}
                    />
                  </Box>
                </ListItemButton>
              );
            })}
          </List>
        )}
      </Paper>
    </Container>
  );
}
