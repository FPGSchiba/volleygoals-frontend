import React from 'react';
import { render, screen } from '../../test-utils';
import { Seasons } from '../../../pages/user/Seasons';
import { setupMockStore, mockCognitoUserState, mockSeasonState } from '../../mocks/stores';
import { buildSeason } from '../../mocks/factories';
import { SeasonStatus, RoleType, TeamMemberStatus } from '../../../store/types';

jest.mock('../../../store/seasons', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useSeasonStore: m }; });
import { useSeasonStore } from '../../../store/seasons';
jest.mock('../../../store/cognitoUser', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useCognitoUserStore: m }; });
import { useCognitoUserStore } from '../../../store/cognitoUser';

beforeEach(() => {
  jest.clearAllMocks();
});

function setup(overrides?: { seasons?: any[]; role?: string }) {
  const role = overrides?.role || RoleType.Trainer;
  setupMockStore(useCognitoUserStore as any, mockCognitoUserState({
    selectedTeam: { team: { id: 'team1', name: 'T', status: 'active', picture: '', createdAt: '', updatedAt: '' }, role, status: TeamMemberStatus.Active },
  }));
  setupMockStore(useSeasonStore as any, mockSeasonState({
    seasonList: {
      seasons: overrides?.seasons || [],
      count: overrides?.seasons?.length || 0,
      hasMore: false, nextToken: '', filter: { teamId: 'team1' },
    },
  }));
}

describe('Seasons', () => {
  it('renders seasons page title', () => {
    setup();
    render(<Seasons />);
    // 'Seasons' appears as both the page heading and the ItemList title
    const headings = screen.getAllByText('Seasons');
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it('renders seasons list with status chips', () => {
    const seasons = [
      buildSeason({ name: 'Spring 2026', status: SeasonStatus.Active }),
      buildSeason({ name: 'Fall 2025', status: SeasonStatus.Completed }),
    ];
    setup({ seasons });
    render(<Seasons />);
    expect(screen.getByText('Spring 2026')).toBeInTheDocument();
    expect(screen.getByText('Fall 2025')).toBeInTheDocument();
  });

  it('disables create button for member role', () => {
    setup({ role: RoleType.Member });
    render(<Seasons />);
    const createBtn = screen.getByText('Create');
    expect(createBtn).toBeDisabled();
  });
});
