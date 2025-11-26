import * as React from 'react';
import { useEffect } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { useUsersStore } from '../../store/users';
import { useLoading } from '../../hooks/useLoading';
import { ItemList, FetchResult } from '../../components/ItemList';
import i18next from 'i18next';

// MUI
import { Box, Typography, Card, CardContent, Paper, Chip, Avatar, Button, IconButton, TableCell, Link } from '@mui/material';
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
    const idKey = m.id || m.teamId || Math.random().toString(36).slice(2, 9);
    const roleColor = (() => {
      switch (m.role) {
        case 'admin':
          return 'primary';
        case 'trainer':
          return 'secondary';
        default:
          return 'default';
      }
    })();

    return [
      <TableCell key={`${idKey}-team`} component="td">
        <Link component={RouterLink} to={`/teams/${m.teamId}`}>{m.teamId}</Link>
      </TableCell>,
      <TableCell key={`${idKey}-role`} component="td">
        <Chip label={m.role} color={roleColor as any} size="small" />
      </TableCell>,
      <TableCell key={`${idKey}-status`} component="td">
        <Chip label={m.status} color={m.status === TeamMemberStatus.Active ? 'success' : 'default'} size="small" />
      </TableCell>,
      <TableCell key={`${idKey}-joined`} component="td">{m.joinedAt ? new Date(m.joinedAt).toLocaleString('de-CH') : '-'}</TableCell>,
      <TableCell key={`${idKey}-updated`} component="td">{m.updatedAt ? new Date(m.updatedAt).toLocaleString('de-CH') : '-'}</TableCell>,
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
            <Typography variant="h6">{i18next.t('admin.userDetails.couldNotLoad', 'Could not load user.')}</Typography>
            <Box mt={2}>
              <Button variant="outlined" onClick={() => navigate('/users')}>{i18next.t('admin.actions.goToUsers', 'Go to Users')}</Button>
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
                <Typography variant="h5">{i18next.t('admin.userDetails.title', 'User Details')}</Typography>
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
                    <Typography variant="body2" color="text.secondary">{i18next.t('admin.user.email', 'Email')}</Typography>
                    <Typography>{currentUser.email}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">{i18next.t('admin.user.created', 'Created')}</Typography>
                    <Typography>{currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleString('de-CH') : '-'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">{i18next.t('admin.user.updated', 'Updated')}</Typography>
                    <Typography>{currentUser.updatedAt ? new Date(currentUser.updatedAt).toLocaleString('de-CH') : '-'}</Typography>
                  </Box>
                </Box>

                <Box display="flex" gap={2} alignItems="center">
                  <Box>
                    <Typography variant="body2" color="text.secondary">{i18next.t('admin.user.status', 'Status')}</Typography>
                    <Box mt={0.5}><Chip label={currentUser.enabled ? i18next.t('common.active','active') : i18next.t('common.inactive','inactive')} color={currentUser.enabled ? 'success' : 'default'} /></Box>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary">{i18next.t('admin.user.type', 'Type')}</Typography>
                    <Box mt={0.5}><Chip label={currentUser.userType} color={currentUser.userType === 'ADMINS' ? 'primary' : 'default'} /></Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Paper>

          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="h6">{i18next.t('admin.memberships.title', 'Memberships')}</Typography>
            <Typography color="text.secondary" mb={1}>{i18next.t('admin.memberships.subtitle', 'Manage memberships for this user.')}</Typography>

            <ItemList<ITeamMember, IFilterOption>
              title={i18next.t('admin.memberships.title','Memberships')}
              columns={[i18next.t('admin.memberships.columns.team','Team'),i18next.t('admin.memberships.columns.role','Role'),i18next.t('admin.memberships.columns.status','Status'),i18next.t('admin.memberships.columns.joined','Joined'),i18next.t('admin.memberships.columns.updated','Updated')]}
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
