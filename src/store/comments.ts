import { create } from 'zustand';
import { IComment, CommentType } from './types';
import { ICommentFilterOption } from '../services/types';
import VolleyGoalsAPI from '../services/backend.api';
import { useNotificationStore } from './notification';
import i18next from 'i18next';

type CommentState = {
  comments: IComment[];
  loading: boolean;
}

type CommentActions = {
  fetchComments: (targetId: string, commentType: CommentType) => Promise<void>;
  createComment: (commentType: CommentType, targetId: string, content: string) => Promise<void>;
  updateComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  clear: () => void;
}

const useCommentsStore = create<CommentState & CommentActions>((set, get) => ({
  comments: [],
  loading: false,
  fetchComments: async (targetId: string, commentType: CommentType) => {
    set({ loading: true });
    const filter: ICommentFilterOption = { targetId, commentType: commentType as string, limit: 20 };
    const response = await VolleyGoalsAPI.listComments(filter);
    set({ loading: false });
    if (response.items) {
      set({ comments: response.items });
    } else {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, 'Something went wrong while fetching comments.'),
        title: i18next.t(`${response.message}.title`, 'Something went wrong'),
        details: response.error
      });
    }
  },
  createComment: async (commentType: CommentType, targetId: string, content: string) => {
    const response = await VolleyGoalsAPI.createComment({ commentType: commentType as string, targetId, content });
    if (response.comment) {
      set((state) => ({ comments: [...state.comments, response.comment!] }));
    } else {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, 'Something went wrong while posting the comment.'),
        title: i18next.t(`${response.message}.title`, 'Something went wrong'),
        details: response.error
      });
    }
  },
  updateComment: async (commentId: string, content: string) => {
    const response = await VolleyGoalsAPI.updateComment(commentId, content);
    if (response.comment) {
      set((state) => ({
        comments: state.comments.map(c => c.id === commentId ? response.comment! : c)
      }));
    } else {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, 'Something went wrong while updating the comment.'),
        title: i18next.t(`${response.message}.title`, 'Something went wrong'),
        details: response.error
      });
    }
  },
  deleteComment: async (commentId: string) => {
    const response = await VolleyGoalsAPI.deleteComment(commentId);
    if (response.error) {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, 'Something went wrong while deleting the comment.'),
        title: i18next.t(`${response.message}.title`, 'Something went wrong'),
        details: response.error
      });
    } else {
      set((state) => ({ comments: state.comments.filter(c => c.id !== commentId) }));
    }
  },
  clear: () => {
    set({ comments: [], loading: false });
  }
}));

export { useCommentsStore };
