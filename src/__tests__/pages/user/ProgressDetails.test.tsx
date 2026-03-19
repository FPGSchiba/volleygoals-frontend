import React from 'react';
import { render, screen } from '../../test-utils';
import { setupMockStore, mockCognitoUserState, mockProgressReportState, mockSeasonState, mockGoalState, mockTeamState } from '../../mocks/stores';
import { buildProgressReport, buildProgressEntry, buildGoal, buildSeason } from '../../mocks/factories';

// We need to read the actual component to know its exports. For now, test that the file renders.
// Mock the stores and router params.
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
  useParams: () => ({ progressId: 'p1' }),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ state: { seasonId: 's1' } }),
}));

// Dynamically import to check if the component exists
let ProgressDetails: any;
try {
  ProgressDetails = require('../../../pages/user/ProgressDetails').ProgressDetails;
} catch {
  ProgressDetails = null;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ProgressDetails', () => {
  if (!ProgressDetails) {
    it('component exists', () => {
      expect(ProgressDetails).toBeTruthy();
    });
    return;
  }

  it('shows loading when no current report', () => {
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState());
    setupMockStore(useProgressReportStore as any, mockProgressReportState({ currentReport: undefined }));
    setupMockStore(useSeasonStore as any, mockSeasonState({ seasonList: { seasons: [buildSeason({ id: 's1' })], count: 1, hasMore: false, nextToken: '', filter: { teamId: '' } } }));
    setupMockStore(useGoalStore as any, mockGoalState());
    setupMockStore(useTeamStore as any, mockTeamState());

    render(<ProgressDetails />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders report summary and details when loaded', () => {
    const report = buildProgressReport({ id: 'p1', seasonId: 's1', summary: 'Good week', details: 'Made progress' });
    setupMockStore(useCognitoUserStore as any, mockCognitoUserState());
    setupMockStore(useProgressReportStore as any, mockProgressReportState({ currentReport: report }));
    setupMockStore(useSeasonStore as any, mockSeasonState({ seasonList: { seasons: [buildSeason({ id: 's1' })], count: 1, hasMore: false, nextToken: '', filter: { teamId: '' } } }));
    setupMockStore(useGoalStore as any, mockGoalState());
    setupMockStore(useTeamStore as any, mockTeamState());

    render(<ProgressDetails />);
    expect(screen.getByText('Good week')).toBeInTheDocument();
  });
});
