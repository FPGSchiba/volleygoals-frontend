import React from 'react';
import { render, screen } from '../../test-utils';
import { Goals } from '../../../pages/user/Goals';
import { setupMockStore, mockCognitoUserState, mockGoalState, mockSeasonState } from '../../mocks/stores';
import { buildGoal, buildSeason } from '../../mocks/factories';
import { GoalType, GoalStatus, RoleType, TeamMemberStatus } from '../../../store/types';

jest.mock('../../../store/goals', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useGoalStore: m }; });
import { useGoalStore } from '../../../store/goals';
jest.mock('../../../store/seasons', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useSeasonStore: m }; });
import { useSeasonStore } from '../../../store/seasons';
jest.mock('../../../store/cognitoUser', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useCognitoUserStore: m }; });
import { useCognitoUserStore } from '../../../store/cognitoUser';

beforeEach(() => {
  jest.clearAllMocks();
});

function setup(overrides?: { goals?: any[]; seasons?: any[]; role?: string }) {
  const season = buildSeason({ id: 's1', name: 'Season 1' });
  const seasons = overrides?.seasons || [season];
  const goals = overrides?.goals || [];
  const role = overrides?.role || RoleType.Trainer;

  setupMockStore(useCognitoUserStore as any, mockCognitoUserState({
    selectedTeam: { team: { id: 'team1', name: 'T', status: 'active', picture: '', createdAt: '', updatedAt: '' }, role, status: TeamMemberStatus.Active },
  }));
  setupMockStore(useSeasonStore as any, mockSeasonState({
    seasonList: { seasons, count: seasons.length, hasMore: false, nextToken: '', filter: { teamId: 'team1' } },
  }));
  setupMockStore(useGoalStore as any, mockGoalState({
    goalList: { goals, count: goals.length, hasMore: false, nextToken: '', filter: {} },
  }));
}

describe('Goals', () => {
  it('renders goals page title', () => {
    setup();
    render(<Goals />);
    // 'Goals' appears as both the page heading and the ItemList title
    const headings = screen.getAllByText('Goals');
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it('renders season selector', () => {
    setup();
    render(<Goals />);
    expect(screen.getByLabelText('Season')).toBeInTheDocument();
  });

  it('renders search input', () => {
    setup();
    render(<Goals />);
    expect(screen.getByPlaceholderText('Search goals...')).toBeInTheDocument();
  });

  it('renders status filter toggle buttons', () => {
    setup();
    render(<Goals />);
    // 'All' appears twice: once in the status filter group and once in the type filter group
    const allButtons = screen.getAllByText('All');
    expect(allButtons.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Open')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('renders type filter toggle buttons', () => {
    setup();
    render(<Goals />);
    expect(screen.getByText('Team')).toBeInTheDocument();
    expect(screen.getByText('Individual')).toBeInTheDocument();
  });

  it('disables edit/delete buttons for member role', () => {
    const goals = [buildGoal({ title: 'My Goal' })];
    setup({ goals, role: RoleType.Member });
    render(<Goals />);
    const editButtons = screen.getAllByText('Edit');
    editButtons.forEach(btn => expect(btn).toBeDisabled());
  });
});
