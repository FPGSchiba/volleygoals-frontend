import React from 'react';
import { Grid, TextField, MenuItem, TableCell } from '@mui/material';
import { ItemList, FetchResult } from '../../components/ItemList';
import { ITeam } from '../../store/types';
import { ITeamFilterOption } from '../../services/types';
import { useTeamStore } from '../../store/teams';

export function Teams() {
  const fetchTeams = useTeamStore(state => state.fetchTeams);
  const createTeam = useTeamStore(state => state.createTeam);
  const editTeam = useTeamStore(state => state.updateTeam);
  const deleteTeam = useTeamStore(state => state.deleteTeam);
  const teams = useTeamStore(state => state.teamList.teams);
  const count = useTeamStore(state => state.teamList.count);
  const initialFilter: ITeamFilterOption = {};
  const sortableFields = [
    {
      field: 'name',
      label: 'Name',
    },
    {
      field: 'status',
      label: 'Status',
    },
    {
      field: 'createdAt',
      label: 'Created',
    },
    {
      field: 'updatedAt',
      label: 'Updated',
    }
  ]

  const fetchAdapter = async (filter: ITeamFilterOption): Promise<FetchResult<ITeam>> => {
    await fetchTeams(filter);
    return { items: teams, count };
  };

  const handleCreate = async () => {
    if (!createTeam) return;
    const name = window.prompt('New team name');
    if (!name) return;
    await createTeam(name);
  };

  const handleEdit = async (team: ITeam) => {
    if (!editTeam) return;
    await editTeam(team.id, team.name, team.status);
  };

  const handleDelete = async (id: string) => {
    if (!deleteTeam) return;
    await deleteTeam(id);
  };

  const renderFilterFields = (filter: ITeamFilterOption, setFilter: (f: ITeamFilterOption) => void) => {
    return [
      <Grid key="name">
        <TextField
          fullWidth
          label="Name"
          value={filter.name ?? ''}
          onChange={(e) => setFilter({ ...filter, name: e.target.value })}
        />
      </Grid>,
      <Grid key="status">
        <TextField
          fullWidth
          select
          label="Status"
          value={filter.status ?? ''}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
        >
          <MenuItem value="">Any</MenuItem>
          <MenuItem value="active">active</MenuItem>
          <MenuItem value="inactive">inactive</MenuItem>
        </TextField>
      </Grid>,
    ];
  };

  const renderRow = (team: ITeam) => {
    return [
      <TableCell key="name">{team.name}</TableCell>,
      <TableCell key="status">{team.status}</TableCell>,
      <TableCell key="created">{new Date(team.createdAt).toLocaleString('de-CH')}</TableCell>,
      <TableCell key="updated">{team.updatedAt ? new Date(team.updatedAt).toLocaleString('de-CH') : '-'}</TableCell>,
    ];
  };

  return (
    <ItemList<ITeam, ITeamFilterOption>
      title="Teams"
      columns={['Name', 'Status', 'Created', 'Updated']}
      initialFilter={initialFilter}
      rowsPerPage={10}
      fetch={fetchAdapter}
      create={handleCreate}
      onEdit={handleEdit}
      onDelete={handleDelete}
      renderFilterFields={renderFilterFields}
      renderRow={(item, handlers) => renderRow(item)}
      sortableFields={sortableFields}
      items={teams}
      count={count}
    />
  );
}
