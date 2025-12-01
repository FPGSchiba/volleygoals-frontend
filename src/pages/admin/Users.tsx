import React from 'react';
import { Grid, TextField, TableCell, Avatar, Button, Chip } from '@mui/material';
import { ItemList, FetchResult } from '../../components/ItemList';
import { IUser, UserType } from '../../store/types';
import { IUserFilterOption } from '../../services/types';
import { useUsersStore } from '../../store/users';
import { useNavigate } from 'react-router-dom';

export function Users() {
  const fetchUsers = useUsersStore((state) => state.fetchUsers);
  const deleteUser = useUsersStore((state) => state.deleteUser);
  const users = useUsersStore((state) => state.userList.users) || [];
  const count = users.length;
  const navigate = useNavigate();

  const initialFilter: IUserFilterOption = {};

  const fetchAdapter = async (filter: IUserFilterOption): Promise<FetchResult<IUser>> => {
    await fetchUsers(filter);
    return { items: users, count };
  };

  const handleEdit = async (user: IUser) => {
    // navigate to cognitoUser details/edit page if it exists
    navigate(`/users/${user.id}`);
  };

  const handleDelete = async (id: string) => {
    if (!deleteUser) return;
    await deleteUser(id);
  };

  const renderFilterFields = (filter: IUserFilterOption, setFilter: (f: IUserFilterOption) => void) => {
    return [
      <Grid key="email">
        <TextField
          fullWidth
          label="Email"
          value={filter.email ?? ''}
          onChange={(e) => setFilter({ ...filter, email: e.target.value })}
        />
      </Grid>,
      <Grid key="name">
        <TextField
          fullWidth
          label="Name"
          value={filter.name ?? ''}
          onChange={(e) => setFilter({ ...filter, name: e.target.value })}
        />
      </Grid>,
    ];
  };

  const renderRow = (user: IUser) => {
    const userTypeLabel = user.userType === UserType.Admin ? 'Admin' : 'User';
    return [
      <TableCell key="avatar"><Avatar alt={user.name || user.email} src={user.picture} /></TableCell>,
      <TableCell key="email">{user.email}</TableCell>,
      <TableCell key="name">{user.name ?? user.preferredUsername ?? '-'}</TableCell>,
      <TableCell key="type"><Chip label={userTypeLabel} color={user.userType === UserType.Admin ? 'primary' : 'default'} /></TableCell>,
      <TableCell key="status"><Chip label={user.enabled ? 'active' : 'inactive'} color={user.enabled ? 'success' : 'default'} /></TableCell>,
      <TableCell key="created">{new Date(user.createdAt).toLocaleString('de-CH')}</TableCell>,
      <TableCell key="updated">{user.updatedAt ? new Date(user.updatedAt).toLocaleString('de-CH') : '-'}</TableCell>,
    ];
  };

  const renderActions = (user: IUser) => {
    return [
      <Button key="edit" variant="contained" size="small" onClick={() => handleEdit(user)} style={{ marginRight: 8 }}>
        Edit
      </Button>,
      <Button key="delete" variant="contained" size="small" color="error" disabled={user.enabled} onClick={() => handleDelete(user.id)}>
        Delete
      </Button>,
    ];
  };

  return (
    <ItemList<IUser, IUserFilterOption>
      title="Users"
      columns={["","Email","Name","Type","Status","Created","Updated"]}
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
  );
}
