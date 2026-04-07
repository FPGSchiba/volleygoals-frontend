import React, { useState } from 'react';
import { Grid, TextField, TableCell, Button, Chip } from '@mui/material';
import { ItemList, FetchResult } from '../../components/ItemList';
import { IUser, UserType } from '../../store/types';
import { IUserFilterOption } from '../../services/types';
import { useUsersStore } from '../../store/users';
import { useNavigate } from 'react-router-dom';
import i18next from 'i18next';
import { UserDisplay } from '../../components/UserDisplay';
import '../../resources/styles/pages/users.scss';

export function Users() {
  const fetchUsers = useUsersStore((state) => state.fetchUsers);
  const deleteUser = useUsersStore((state) => state.deleteUser);
  const updateUser = useUsersStore((state) => state.updateUser);
  const users = useUsersStore((state) => state.userList.users) || [];
  const count = users.length;
  const navigate = useNavigate();

  const initialFilter: IUserFilterOption = {};

  const fetchAdapter = async (filter?: IUserFilterOption): Promise<FetchResult<IUser>> => {
    await fetchUsers(filter);
    return { items: users, count };
  };

  const handleEdit = async (user: IUser) => {
    // navigate to cognitoUser details/edit page if it exists
    navigate(`/users/${user.id}`);
  };

  // when true, an action (activate/deactivate/delete) is in progress and all actions should be disabled
  const [actionLoading, setActionLoading] = useState(false);

  const handleDelete = async (id: string) => {
    if (!deleteUser) return;
    setActionLoading(true);
    try {
      await deleteUser(id);
      // refresh list
      await fetchUsers(initialFilter);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!updateUser) return;
    setActionLoading(true);
    try {
      await updateUser(id, { enabled: false });
      await fetchUsers(initialFilter);
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async (id: string) => {
    if (!updateUser) return;
    setActionLoading(true);
    try {
      await updateUser(id, { enabled: true });
      await fetchUsers(initialFilter);
    } finally {
      setActionLoading(false);
    }
  }

  const renderFilterFields = (filter: IUserFilterOption, setFilter: (f: IUserFilterOption) => void) => {
    return [
      <Grid key="email">
        <TextField
          fullWidth
          className="users-filter-email"
          label={i18next.t('admin.users.columns.email', 'Email')}
          value={filter.email ?? ''}
          onChange={(e) => setFilter({ ...filter, email: e.target.value })}
        />
      </Grid>,
      <Grid key="name">
        <TextField
          fullWidth
          className="users-filter-name"
          label={i18next.t('admin.users.columns.name', 'Name')}
          value={filter.name ?? ''}
          onChange={(e) => setFilter({ ...filter, name: e.target.value })}
        />
      </Grid>,
    ];
  };

  const renderRow = (user: IUser) => {
    const userTypeLabel = user.userType === UserType.Admin ? 'Admin' : 'User';
    return [
      <TableCell key="avatar"><UserDisplay user={user} size="small" /></TableCell>,
      <TableCell key="email">{user.email}</TableCell>,
      <TableCell key="name"><UserDisplay user={user} showAvatar={false} /></TableCell>,
      <TableCell key="type"><Chip label={userTypeLabel} color={user.userType === UserType.Admin ? 'primary' : 'default'} /></TableCell>,
      <TableCell key="status"><Chip label={user.enabled ? i18next.t('common.active','active') : i18next.t('common.inactive','inactive')} color={user.enabled ? 'success' : 'default'} /></TableCell>,
      <TableCell key="created">{new Date(user.createdAt).toLocaleString('de-CH')}</TableCell>,
      <TableCell key="updated">{user.updatedAt ? new Date(user.updatedAt).toLocaleString('de-CH') : '-'}</TableCell>,
    ];
  };

  const renderActions = (user: IUser) => {
    // If user is active, offer a Deactivate button; otherwise offer Delete + Activate
    const editBtn = (
      <Button key="edit" variant="contained" size="small" onClick={() => handleEdit(user)} style={{ marginRight: 8 }} disabled={actionLoading}>
        {i18next.t('common.edit','Edit')}
      </Button>
    );

    if (user.enabled) {
      return [
        editBtn,
        <Button key="deactivate" variant="contained" size="small" color="warning" onClick={() => handleDeactivate(user.id)} disabled={actionLoading}>
          {i18next.t('admin.actions.deactivate','Deactivate')}
        </Button>
      ];
    }

    // user is inactive -> offer Activate + Delete
    return [
      editBtn,
      <Button key="activate" variant="contained" size="small" color="success" onClick={() => handleActivate(user.id)} style={{ marginRight: 8 }} disabled={actionLoading}>
        {i18next.t('admin.actions.activate','Activate')}
      </Button>,
      <Button key="delete" variant="contained" size="small" color="error" onClick={() => handleDelete(user.id)} disabled={actionLoading}>
        {i18next.t('admin.actions.delete','Delete')}
      </Button>
    ];
  };

  return (
    <div className="users-page-root">
    <ItemList<IUser, IUserFilterOption>
      title={i18next.t('admin.users.title', 'Users')}
      columns={[
        i18next.t('admin.users.columns.avatar', ''),
        i18next.t('admin.users.columns.email', 'Email'),
        i18next.t('admin.users.columns.name', 'Name'),
        i18next.t('admin.users.columns.type', 'Type'),
        i18next.t('admin.users.columns.status', 'Status'),
        i18next.t('admin.users.columns.created', 'Created'),
        i18next.t('admin.users.columns.updated', 'Updated'),
      ]}
      initialFilter={initialFilter}
      rowsPerPage={10}
      fetch={fetchAdapter}
      onEdit={handleEdit}
      onDelete={handleDelete}
      renderFilterFields={renderFilterFields}
      renderRow={(item) => renderRow(item)}
      renderActions={(item) => renderActions(item as IUser)}
      items={users}
      count={count}
    />
    </div>
  );
}
