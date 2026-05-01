import React from 'react';
import { render, screen } from '../../test-utils';
import { SeasonDetails } from '../../../pages/user/SeasonDetails';
import { buildSeason, buildGoal } from '../../mocks/factories';
import { RoleType, SeasonStatus, TeamMemberStatus } from '../../../store/types';

jest.mock('../../../store/seasons', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useSeasonStore: m }; });
jest.mock('../../../store/goals', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useGoalStore: m }; });
jest.mock('../../../store/cognitoUser', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useCognitoUserStore: m }; });
jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useParams: () => ({ seasonId: 'season-1' }), useNavigate: () => jest.fn() }));

import { useSeasonStore } from '../../../store/seasons';
import { useGoalStore } from '../../../store/goals';
import { useCognitoUserStore } from '../../../store/cognitoUser';

function setup(overrides?: { role?: string }) {
  const team = { id: 'team1', name: 'T', status: 'active', picture: '', createdAt: '', updatedAt: '' };
  (useCognitoUserStore as any).mockImplementation((s?: any) => s ? s({
    selectedTeam: { team, role: overrides?.role ?? RoleType.Trainer, status: TeamMemberStatus.Active },
    user: { id: 'u1' },
  }) : {});

  const season = buildSeason({ id: 'season-1', name: 'Spring 2025', status: SeasonStatus.Active });
  (useSeasonStore as any).mockImplementation((s?: any) => s ? s({
    getSeason: jest.fn().mockResolvedValue(season),
    updateSeason: jest.fn().mockResolvedValue(undefined),
    seasonList: { seasons: [season], count: 1 },
  }) : {});

  const goal = buildGoal({ id: 'g1', title: 'Serve accuracy' });
  (useGoalStore as any).mockImplementation((s?: any) => s ? s({
    goalList: { goals: [goal], count: 1 },
    seasonGoals: [goal],
    fetchGoals: jest.fn().mockResolvedValue(undefined),
    fetchSeasonGoals: jest.fn().mockResolvedValue(undefined),
    tagGoalToSeason: jest.fn().mockResolvedValue(undefined),
    untagGoalFromSeason: jest.fn().mockResolvedValue(undefined),
  }) : {});
}

describe('SeasonDetails', () => {
  it('renders back nav', () => {
    setup();
    render(<SeasonDetails />);
    expect(screen.getByText(/back to seasons/i)).toBeInTheDocument();
  });

  it('renders goals panel with season goals', () => {
    setup();
    render(<SeasonDetails />);
    expect(screen.getByText(/goals in this season/i)).toBeInTheDocument();
  });

  it('renders meta panel', () => {
    setup();
    render(<SeasonDetails />);
    expect(screen.getByText(/status/i)).toBeInTheDocument();
  });

  it('renders add goal control for trainer', () => {
    setup({ role: RoleType.Trainer });
    render(<SeasonDetails />);
    expect(screen.getByText(/add a goal/i)).toBeInTheDocument();
  });
});
