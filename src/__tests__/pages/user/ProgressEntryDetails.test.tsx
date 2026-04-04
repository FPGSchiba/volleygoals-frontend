import React from 'react';
import { render, screen } from '../../test-utils';
import { setupMockStore, mockCognitoUserState, mockProgressReportState, mockSeasonState, mockGoalState, mockTeamState } from '../../mocks/stores';
import { buildProgressReport, buildProgressEntry, buildGoal, buildSeason } from '../../mocks/factories';

jest.mock('../../../store/progressReports', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useProgressReportStore: m }; });
import { useProgressReportStore } from '../../../store/progressReports';
jest.mock('../../../store/seasons', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useSeasonStore: m }; });
import { useSeasonStore } from '../../../store/seasons';
jest.mock('../../../store/cognitoUser', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useCognitoUserStore: m }; });
import { useCognitoUserStore } from '../../../store/cognitoUser';
jest.mock('../../../store/goals', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useGoalStore: m }; });
import { useGoalStore } from '../../../store/goals';
jest.mock('../../../store/teams', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useTeamStore: m }; });
import { useTeamStore } from '../../../store/teams';
jest.mock('../../../services/backend.api', () => ({
  __esModule: true,
  default: { listComments: jest.fn().mockResolvedValue({ items: [] }), setToken: jest.fn(), getPresignedCommentFileUploadUrl: jest.fn(), createComment: jest.fn(), updateComment: jest.fn(), deleteComment: jest.fn() },
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ progressId: 'p1', entryId: 'e1' }),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ state: { seasonId: 's1' } }),
}));

let ProgressEntryDetails: any;
try {
  ProgressEntryDetails = require('../../../pages/user/ProgressEntryDetails').ProgressEntryDetails;
} catch {
  ProgressEntryDetails = null;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ProgressEntryDetails', () => {
  if (!ProgressEntryDetails) {
    it('component exists', () => {
      expect(ProgressEntryDetails).toBeTruthy();
    });
    return;
  }

  it('renders entry details page', () => {
    const entry = buildProgressEntry({ id: 'e1', goalId: 'g1', rating: 4, details: 'Great progress' });
    const report = buildProgressReport({ id: 'p1', seasonId: 's1', progress: [entry] });
    const goal = buildGoal({ id: 'g1', title: 'Goal 1', teamId: 't1' });

    setupMockStore(useCognitoUserStore as any, mockCognitoUserState());
    setupMockStore(useProgressReportStore as any, mockProgressReportState({ currentReport: report }));
    setupMockStore(useSeasonStore as any, mockSeasonState({ seasonList: { seasons: [buildSeason({ id: 's1' })], count: 1, hasMore: false, nextToken: '', filter: { teamId: '' } } }));
    setupMockStore(useGoalStore as any, mockGoalState({ goalList: { goals: [goal], count: 1, hasMore: false, nextToken: '', filter: {} } }));
    setupMockStore(useTeamStore as any, mockTeamState());

    render(<ProgressEntryDetails />);
    // Should render something from the entry details page
    expect(document.body.textContent).toBeTruthy();
  });
});
