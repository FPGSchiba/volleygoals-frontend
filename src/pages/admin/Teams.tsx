import React from 'react';
import i18next from 'i18next';
import { Grid, TextField, MenuItem, TableCell, Chip, Button, Avatar } from '@mui/material';
import { ItemList, FetchResult } from '../../components/ItemList';
import { ITeam } from '../../store/types';
import { ITeamFilterOption } from '../../services/types';
import { useTeamStore } from '../../store/teams';
import {useNavigate} from "react-router-dom";

export function Teams() {
  const fetchTeams = useTeamStore(state => state.fetchTeams);
  const createTeam = useTeamStore(state => state.createTeam);
  const editTeam = useTeamStore(state => state.updateTeam);
  const deleteTeam = useTeamStore(state => state.deleteTeam);
  const teams = useTeamStore(state => state.teamList.teams);
  const count = useTeamStore(state => state.teamList.count);
  const navigate = useNavigate();
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
    const name = window.prompt(i18next.t('admin.teams.prompt.newName', 'New team name'));
    if (!name) return;
    await createTeam(name);
  };

  const handleEdit = async (team: ITeam) => {
    navigate(`/teams/${team.id}`);
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
          label={i18next.t('admin.teams.filter.name','Name')}
          value={filter.name ?? ''}
          onChange={(e) => setFilter({ ...filter, name: e.target.value })}
        />
      </Grid>,
      <Grid key="status">
        <TextField
          fullWidth
          select
          label={i18next.t('admin.teams.filter.status','Status')}
          value={filter.status ?? ''}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
        >
          <MenuItem value="">{i18next.t('admin.teams.filter.any','Any')}</MenuItem>
          <MenuItem value="active">{i18next.t('common.active','active')}</MenuItem>
          <MenuItem value="inactive">{i18next.t('common.inactive','inactive')}</MenuItem>
        </TextField>
      </Grid>,
    ];
  };

  const renderRow = (team: ITeam) => {
    return [
      <TableCell key="picture" className="teams-avatar-cell"><Avatar src={team.picture} alt={team.name} className="teams-avatar">{!team.picture && (team.name ? team.name[0] : 'T')}</Avatar></TableCell>,
      <TableCell key="name">{team.name}</TableCell>,
      <TableCell key="status"><Chip label={team.status} color={team.status == 'active' ? 'success' : 'error'} /></TableCell>,
      <TableCell key="created">{new Date(team.createdAt).toLocaleString('de-CH')}</TableCell>,
      <TableCell key="updated">{team.updatedAt ? new Date(team.updatedAt).toLocaleString('de-CH') : '-'}</TableCell>,
    ];
  };

  const renderActions = (team: ITeam) => {
    // Edit button - directly call local handler
    const editBtn = (
      <Button key="edit" variant="contained" size="small" onClick={() => handleEdit(team)} style={{ marginRight: 8 }}>
        Edit
      </Button>
    );

    // If team is active, show a Deactivate button; otherwise show Delete
    if (team.status === 'active') {
      return [
        editBtn,
        <Button key="deactivate" variant="contained" size="small" color="warning" onClick={async () => { await editTeam(team.id, team.name, 'inactive'); }}>
          {i18next.t('admin.actions.deactivate','Deactivate')}
        </Button>
      ];
    }

    return [
      editBtn,
      <Button key="delete" variant="contained" size="small" color="error" onClick={() => handleDelete(team.id)}>
        {i18next.t('admin.actions.delete','Delete')}
      </Button>
    ];
  };

  return (
    <ItemList<ITeam, ITeamFilterOption>
      title={i18next.t('admin.teams.title','Teams')}
      columns={[i18next.t('admin.teams.columns.picture','Picture'), i18next.t('admin.teams.columns.name','Name'), i18next.t('admin.teams.columns.status','Status'), i18next.t('admin.teams.columns.created','Created'), i18next.t('admin.teams.columns.updated','Updated')]}
      initialFilter={initialFilter}
      rowsPerPage={10}
      fetch={fetchAdapter}
      create={handleCreate}
      onEdit={handleEdit}
      onDelete={handleDelete}
      renderFilterFields={renderFilterFields}
      renderRow={(item) => renderRow(item)}
      renderActions={(item) => renderActions(item as ITeam)}
      sortableFields={sortableFields}
      items={teams}
      count={count}
    />
  );
}
