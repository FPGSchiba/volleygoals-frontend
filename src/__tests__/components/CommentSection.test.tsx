import React from 'react';
import { render, screen, waitFor } from '../test-utils';
import { CommentSection } from '../../components/CommentSection';
import { CommentType } from '../../store/types';
import { buildComment, buildUser } from '../mocks/factories';
import { setupMockStore, mockCognitoUserState } from '../mocks/stores';

// Mock stores
jest.mock('../../store/cognitoUser', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useCognitoUserStore: m }; });
import { useCognitoUserStore } from '../../store/cognitoUser';

// Mock API
jest.mock('../../services/backend.api', () => ({
  __esModule: true,
  default: {
    listComments: jest.fn(),
    createComment: jest.fn(),
    updateComment: jest.fn(),
    deleteComment: jest.fn(),
    getPresignedCommentFileUploadUrl: jest.fn(),
  },
}));

import VolleyGoalsAPI from '../../services/backend.api';
const api = jest.mocked(VolleyGoalsAPI);

beforeEach(() => {
  jest.clearAllMocks();
  const state = mockCognitoUserState();
  setupMockStore(useCognitoUserStore as any, state);
  api.listComments.mockResolvedValue({ message: '', items: [] });
});

describe('CommentSection', () => {
  it('renders comments title', async () => {
    render(<CommentSection targetId="t1" commentType={CommentType.Goal} />);
    expect(screen.getByText('Comments')).toBeInTheDocument();
  });

  it('renders comments list when loaded', async () => {
    const user = mockCognitoUserState().user;
    const comments = [
      buildComment({ id: 'c1', content: 'First comment', authorId: user.id, authorName: 'Test User' }),
      buildComment({ id: 'c2', content: 'Second comment', authorName: 'Other User' }),
    ];
    api.listComments.mockResolvedValue({ message: '', items: comments });

    render(<CommentSection targetId="t1" commentType={CommentType.Goal} />);

    await waitFor(() => {
      expect(screen.getByText('First comment')).toBeInTheDocument();
      expect(screen.getByText('Second comment')).toBeInTheDocument();
    });
  });

  it('shows add comment input', () => {
    render(<CommentSection targetId="t1" commentType={CommentType.Goal} />);
    expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
    expect(screen.getByText('Submit')).toBeInTheDocument();
  });

  it('shows disabled message when enabled is false', () => {
    render(<CommentSection targetId="t1" commentType={CommentType.Goal} enabled={false} />);
    expect(screen.getByText('Comments are disabled for this goal type.')).toBeInTheDocument();
  });
});
