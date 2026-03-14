import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { useCommentsStore } from '../store/comments';
import { useCognitoUserStore } from '../store/cognitoUser';
import { CommentType, IComment } from '../store/types';
import VolleyGoalsAPI from '../services/backend.api';
import axios from 'axios';
import i18next from 'i18next';

interface CommentSectionProps {
  targetId: string;
  commentType: CommentType;
  enabled?: boolean;
  allowFileUploads?: boolean;
}

export function CommentSection({ targetId, commentType, enabled = true, allowFileUploads }: CommentSectionProps) {
  const comments = useCommentsStore((s) => s.comments);
  const loading = useCommentsStore((s) => s.loading);
  const fetchComments = useCommentsStore((s) => s.fetchComments);
  const createComment = useCommentsStore((s) => s.createComment);
  const updateComment = useCommentsStore((s) => s.updateComment);
  const deleteComment = useCommentsStore((s) => s.deleteComment);
  const clear = useCommentsStore((s) => s.clear);
  const currentUser = useCognitoUserStore((s) => s.user);
  const selectedTeam = useCognitoUserStore((s) => s.selectedTeam);
  const userRole = selectedTeam?.role as string | undefined;
  const canEdit = userRole === 'admin' || userRole === 'trainer';

  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (enabled !== false) {
      fetchComments(targetId, commentType);
    }
    return () => { clear(); };
  }, [targetId, commentType]);

  if (enabled === false) {
    return <Alert severity="info">{i18next.t('comments.disabled', 'Comments are disabled for this goal type.')}</Alert>;
  }

  const handleSubmit = async () => {
    if (!newContent.trim()) return;
    await createComment(commentType, targetId, newContent.trim());
    setNewContent('');
  };

  const handleEditSave = async (id: string) => {
    if (!editContent.trim()) return;
    await updateComment(id, editContent.trim());
    setEditingId(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    await deleteComment(deleteId);
    setDeleteId(null);
  };

  const handleFileSelect = async (comment: IComment, file: File) => {
    const presign = await VolleyGoalsAPI.getPresignedCommentFileUploadUrl(comment.id, file.name, file.type);
    if (presign.uploadUrl) {
      await axios.put(presign.uploadUrl, file, { headers: { 'Content-Type': file.type } });
    }
  };

  return (
    <Box>
      <Typography variant="h6">{i18next.t('comments.title', 'Comments')}</Typography>
      {loading && <CircularProgress size={20} />}
      {comments.map((c) => {
        const isOwn = c.authorId === currentUser?.id;
        const canModify = isOwn || canEdit;
        return (
          <Box key={c.id} mb={2} p={1} border={1} borderColor="divider" borderRadius={1}>
            <Typography variant="caption">{c.authorId} — {new Date(c.createdAt).toLocaleString()}</Typography>
            {editingId === c.id ? (
              <Box mt={1}>
                <TextField fullWidth multiline value={editContent} onChange={(e) => setEditContent(e.target.value)} />
                <Box mt={1} display="flex" gap={1}>
                  <Button size="small" variant="contained" onClick={() => handleEditSave(c.id)}>{i18next.t('comments.save', 'Save')}</Button>
                  <Button size="small" onClick={() => setEditingId(null)}>{i18next.t('common.cancel', 'Cancel')}</Button>
                </Box>
              </Box>
            ) : (
              <Typography mt={1}>{c.content}</Typography>
            )}
            {canModify && editingId !== c.id && (
              <Box mt={1} display="flex" gap={1}>
                <Button size="small" onClick={() => { setEditingId(c.id); setEditContent(c.content); }}>{i18next.t('comments.edit', 'Edit')}</Button>
                <Button size="small" color="error" onClick={() => setDeleteId(c.id)}>{i18next.t('comments.delete', 'Delete')}</Button>
                {allowFileUploads && (
                  <>
                    <input
                      type="file"
                      ref={(el) => { fileInputRefs.current[c.id] = el; }}
                      style={{ display: 'none' }}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(c, f); }}
                    />
                    <Button size="small" onClick={() => fileInputRefs.current[c.id]?.click()}>{i18next.t('comments.attachFile', 'Attach file')}</Button>
                  </>
                )}
              </Box>
            )}
          </Box>
        );
      })}
      <Box mt={2}>
        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder={i18next.t('comments.addComment', 'Add a comment...')}
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
        />
        <Box mt={1}>
          <Button variant="contained" onClick={handleSubmit}>{i18next.t('comments.submit', 'Submit')}</Button>
        </Box>
      </Box>
      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>{i18next.t('comments.delete', 'Delete')}</DialogTitle>
        <DialogContent>
          <Typography>{i18next.t('comments.deleteConfirm', 'Delete this comment?')}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>{i18next.t('common.cancel', 'Cancel')}</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm}>{i18next.t('comments.delete', 'Delete')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
