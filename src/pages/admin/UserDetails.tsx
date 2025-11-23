import * as React from 'react';
import { useEffect } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { useUsersStore } from '../../store/users';
import { useLoading } from '../../hooks/useLoading';
import { ItemList, FetchResult } from '../../components/ItemList';

// MUI
import { Box, Typography, Card, CardContent, Paper, Chip, Avatar, Button, IconButton } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { ITeamMember, TeamMemberStatus } from '../../store/types';
import { IFilterOption } from '../../services/types';

export function UserDetails() {
  const { userId } = useParams<{ userId?: string }>();
  const getUser = useUsersStore(state => state.getUser);
  const currentUser = useUsersStore(state => state.currentUser);
  const memberships = useUsersStore(state => state.currentUserMemberships) || [];
  const navigate = useNavigate();
  const { loading, setLoading, Loading } = useLoading(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        if (userId) await getUser(userId);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false };
  }, [userId]);

  const onAddMembership = async () => {
    console.log('Add membership (stub)');
  };
  const onEditMembership = async (m: ITeamMember) => {
    console.log('Edit membership (stub):', m);
  };
  const onDeleteMembership = async (id: string) => {
    console.log('Delete membership (stub):', id);
  };

  const fetchMemberships = async (_filter: IFilterOption): Promise<FetchResult<ITeamMember>> => {
    // For now just return the memberships from store
    return { items: memberships, count: memberships.length };
  };

  const renderMembershipRow = (m: ITeamMember) => {
    return [
      <React.Fragment key="teamId"><Box component="span">{m.teamId}</Box></React.Fragment>,
      <React.Fragment key="role"><Box component="span">{m.role}</Box></React.Fragment>,
      <React.Fragment key="status"><Chip label={m.status} color={m.status === TeamMemberStatus.Active ? 'success' : 'default'} size="small" /></React.Fragment>,
      <React.Fragment key="joined">{m.joinedAt ? new Date(m.joinedAt).toLocaleString('de-CH') : '-'}</React.Fragment>,
      <React.Fragment key="updated">{m.updatedAt ? new Date(m.updatedAt).toLocaleString('de-CH') : '-'}</React.Fragment>,
    ];
  };

  const renderMembershipActions = (m: ITeamMember) => {
    return [
      <Button key="edit" variant="contained" size="small" onClick={() => onEditMembership(m)} style={{ marginRight: 8 }}>Edit</Button>,
      <Button key="delete" variant="contained" size="small" color="error" onClick={() => onDeleteMembership(m.id)}>Delete</Button>
    ];
  };

  return (
    <Box p={3} className="user-details-root">
      <Loading />

      {!loading && !currentUser && (
        <Card>
          <CardContent>
            <Typography variant="h6">Could not load user.</Typography>
            <Box mt={2}>
              <Button variant="outlined" onClick={() => navigate('/users')}>Go to Users</Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {!loading && currentUser && (
        <Box className="user-details-inner">
          <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={1}>
                <IconButton size="small" component={RouterLink} to="/users">
                  <ArrowBackIcon />
                </IconButton>
                <Typography variant="h5">User Details</Typography>
              </Box>
            </Box>

            <Box display="flex" gap={3} mt={2}>
              <Box display="flex" flexDirection="column" alignItems="center" sx={{ width: 160 }}>
                <Avatar src={currentUser.picture} alt={currentUser.name || currentUser.email} sx={{ width: 96, height: 96 }} />
                <Box mt={1}>
                  <Typography variant="subtitle1">{currentUser.name ?? currentUser.preferredUsername ?? currentUser.email}</Typography>
                </Box>
              </Box>

              <Box flex={1}>
                <Box display="flex" gap={2} mb={1}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Email</Typography>
                    <Typography>{currentUser.email}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Created</Typography>
                    <Typography>{currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleString('de-CH') : '-'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Updated</Typography>
                    <Typography>{currentUser.updatedAt ? new Date(currentUser.updatedAt).toLocaleString('de-CH') : '-'}</Typography>
                  </Box>
                </Box>

                <Box display="flex" gap={2} alignItems="center">
                  <Box>
                    <Typography variant="body2" color="text.secondary">Status</Typography>
                    <Box mt={0.5}><Chip label={currentUser.enabled ? 'active' : 'inactive'} color={currentUser.enabled ? 'success' : 'default'} /></Box>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary">Type</Typography>
                    <Box mt={0.5}><Chip label={currentUser.userType} color={currentUser.userType === 'ADMINS' ? 'primary' : 'default'} /></Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Paper>

          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="h6">Memberships</Typography>
            <Typography color="text.secondary" mb={1}>Manage memberships for this user.</Typography>

            <ItemList<ITeamMember, IFilterOption>
              title="Memberships"
              columns={["Team","Role","Status","Joined","Updated"]}
              initialFilter={{} as IFilterOption}
              rowsPerPage={10}
              fetch={fetchMemberships}
              create={onAddMembership}
              onEdit={onEditMembership}
              onDelete={onDeleteMembership}
              renderRow={(m) => renderMembershipRow(m)}
              renderActions={(m) => renderMembershipActions(m)}
              items={memberships}
              count={memberships.length}
            />
          </Paper>
        </Box>
      )}
    </Box>
  );
}
