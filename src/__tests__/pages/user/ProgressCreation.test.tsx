import React from 'react';
import { render, screen } from '../../test-utils';
import { ProgressCreation } from '../../../pages/user/ProgressCreation';
import { setupMockStore, mockCognitoUserState, mockProgressReportState, mockSeasonState, mockGoalState } from '../../mocks/stores';
import { buildSeason, buildGoal } from '../../mocks/factories';
import { GoalStatus, RoleType, TeamMemberStatus } from '../../../store/types';

jest.mock('../../../store/progressReports', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useProgressReportStore: m }; });
import { useProgressReportStore } from '../../../store/progressReports';
jest.mock('../../../store/seasons', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useSeasonStore: m }; });
import { useSeasonStore } from '../../../store/seasons';
jest.mock('../../../store/cognitoUser', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useCognitoUserStore: m }; });
import { useCognitoUserStore } from '../../../store/cognitoUser';
jest.mock('../../../store/goals', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useGoalStore: m }; });
import { useGoalStore } from '../../../store/goals';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ProgressCreation', () => {
  it('renders form fields', () => {
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState());
    setupMockStore(useSeasonStore as any, mockSeasonState({ seasonList: { seasons: [buildSeason({ id: 's1' })], count: 1, hasMore: false, nextToken: '', filter: { teamId: '' } } }));
    setupMockStore(useProgressReportStore as any, mockProgressReportState());
    setupMockStore(useGoalStore as any, mockGoalState());

    render(<ProgressCreation />);
    expect(screen.getByText('Create Progress Report')).toBeInTheDocument();
    expect(screen.getByLabelText('Summary')).toBeInTheDocument();
    expect(screen.getByLabelText('Details')).toBeInTheDocument();
  });

  it('renders goal ratings when goals exist', () => {
    const goals = [
      buildGoal({ id: 'g1', title: 'Goal A', status: GoalStatus.Open }),
      buildGoal({ id: 'g2', title: 'Goal B', status: GoalStatus.InProgress }),
    ];
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState());
    setupMockStore(useSeasonStore as any, mockSeasonState({ seasonList: { seasons: [buildSeason({ id: 's1' })], count: 1, hasMore: false, nextToken: '', filter: { teamId: '' } } }));
    setupMockStore(useProgressReportStore as any, mockProgressReportState());
    setupMockStore(useGoalStore as any, mockGoalState({ goalList: { goals, count: 2, hasMore: false, nextToken: '', filter: {} } }));

    render(<ProgressCreation />);
    expect(screen.getByText('Goal Ratings')).toBeInTheDocument();
    expect(screen.getByText('Goal A')).toBeInTheDocument();
    expect(screen.getByText('Goal B')).toBeInTheDocument();
  });

  it('shows no goals message when no active goals', () => {
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState());
    setupMockStore(useSeasonStore as any, mockSeasonState({ seasonList: { seasons: [buildSeason({ id: 's1' })], count: 1, hasMore: false, nextToken: '', filter: { teamId: '' } } }));
    setupMockStore(useProgressReportStore as any, mockProgressReportState());
    setupMockStore(useGoalStore as any, mockGoalState());

    render(<ProgressCreation />);
    expect(screen.getByText('No goals available for this season.')).toBeInTheDocument();
  });

  it('renders create and cancel buttons', () => {
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState());
    setupMockStore(useSeasonStore as any, mockSeasonState({ seasonList: { seasons: [buildSeason({ id: 's1' })], count: 1, hasMore: false, nextToken: '', filter: { teamId: '' } } }));
    setupMockStore(useProgressReportStore as any, mockProgressReportState());
    setupMockStore(useGoalStore as any, mockGoalState());

    render(<ProgressCreation />);
    expect(screen.getByText('Create')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });
});
