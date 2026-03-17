import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Avatar, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Menu, MenuItem as MuiMenuItem, TextField, Typography } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { useCognitoUserStore } from '../store/cognitoUser';
import { CommentType, IComment } from '../store/types';
import VolleyGoalsAPI from '../services/backend.api';
import axios from 'axios';
import i18next from 'i18next';
import { formatDateTime } from '../utils/dateTime';

interface CommentSectionProps {
  targetId: string;
  commentType: CommentType;
  enabled?: boolean;
  allowFileUploads?: boolean;
  teamMembers?: Array<{ id: string; name?: string; preferredUsername?: string; email?: string; picture?: string }>;
}

export function CommentSection({ targetId, commentType, enabled = true, allowFileUploads, teamMembers }: CommentSectionProps) {
  const [comments, setComments] = useState<IComment[]>([]);
  const [loading, setLoading] = useState(false);
  const currentUser = useCognitoUserStore((s) => s.user);
  const selectedTeam = useCognitoUserStore((s) => s.selectedTeam);
  const userRole = selectedTeam?.role as string | undefined;
  const canEdit = userRole === 'admin' || userRole === 'trainer';

  const [newContent, setNewContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; commentId: string } | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const newFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const result = await VolleyGoalsAPI.listComments({ commentType, targetId });
      setComments((result.items || []) as IComment[]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [targetId, commentType]);

  useEffect(() => {
    if (enabled !== false) {
      loadComments();
    }
  }, [targetId, commentType, enabled]);

  if (enabled === false) {
    return <Alert severity="info">{i18next.t('comments.disabled', 'Comments are disabled for this goal type.')}</Alert>;
  }

  const resolveCommentAuthor = (c: IComment) => {
    if (c.authorName) return { name: c.authorName, picture: c.authorPicture as string | undefined };
    if (currentUser?.id === c.authorId) {
      return { name: currentUser.name || currentUser.preferredUsername || currentUser.email || c.authorId, picture: currentUser.picture as string | undefined };
    }
    const m = teamMembers?.find(m => m.id === c.authorId);
    return { name: m?.name || m?.preferredUsername || m?.email || c.authorId, picture: m?.picture };
  };

  const handleSubmit = async () => {
    if (!newContent.trim()) return;
    const result = await VolleyGoalsAPI.createComment({ commentType, targetId, content: newContent.trim() });
    setNewContent('');
    if (result.comment && pendingFile) {
      const presign = await VolleyGoalsAPI.getPresignedCommentFileUploadUrl(
        result.comment.id, pendingFile.name, pendingFile.type
      );
      if (presign.uploadUrl) {
        await axios.put(presign.uploadUrl, pendingFile, { headers: { 'Content-Type': pendingFile.type } });
      }
      setPendingFile(null);
    }
    loadComments();
  };

  const handleEditSave = async (id: string) => {
    if (!editContent.trim()) return;
    await VolleyGoalsAPI.updateComment(id, editContent.trim());
    setEditingId(null);
    loadComments();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    await VolleyGoalsAPI.deleteComment(deleteId);
    setDeleteId(null);
    loadComments();
  };

  const handleFileSelect = async (comment: IComment, file: File) => {
    const presign = await VolleyGoalsAPI.getPresignedCommentFileUploadUrl(comment.id, file.name, file.type);
    if (presign.uploadUrl) {
      await axios.put(presign.uploadUrl, file, { headers: { 'Content-Type': file.type } });
      loadComments();
    }
  };

  const sortedComments = [...comments].sort((a, b) => {
    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return sortOrder === 'asc' ? diff : -diff;
  });

  const [showAllComments, setShowAllComments] = useState(false);
  const displayedComments = showAllComments ? sortedComments : sortedComments.slice(0, 3);
  const hasMoreComments = sortedComments.length > 3;

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={1}>
        <Typography variant="h6">{i18next.t('comments.title', 'Comments')}</Typography>
        {loading && <CircularProgress size={16} />}
        <Box flex={1} />
        <Button
          size="small"
          variant="outlined"
          onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
        >
          {sortOrder === 'asc'
            ? i18next.t('comments.sort.newest', 'Newest first')
            : i18next.t('comments.sort.oldest', 'Oldest first')}
        </Button>
      </Box>

      {displayedComments.map((c) => {
        const isOwn = c.authorId === currentUser?.id;
        const canModify = isOwn || canEdit;
        const author = resolveCommentAuthor(c);
        const files = c.files || [];
        return (
          <Box key={c.id} mb={2} p={1} border={1} borderColor="divider" borderRadius={1}>
            <Box display="flex" alignItems="center" gap={1}>
              <Avatar src={author.picture || undefined} sx={{ width: 28, height: 28 }}>
                {author.name[0]}
              </Avatar>
              <Typography variant="caption" fontWeight="medium">{author.name}</Typography>
              <Typography variant="caption" color="text.secondary">{formatDateTime(c.createdAt)}</Typography>
              <Box flex={1} />
              {canModify && editingId !== c.id && (
                <>
                  <IconButton size="small" onClick={(e) => setMenuAnchor({ el: e.currentTarget, commentId: c.id })}>
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                  <Menu
                    anchorEl={menuAnchor?.commentId === c.id ? menuAnchor.el : null}
                    open={menuAnchor?.commentId === c.id}
                    onClose={() => setMenuAnchor(null)}
                  >
                    <MuiMenuItem onClick={() => { setEditingId(c.id); setEditContent(c.content); setMenuAnchor(null); }}>
                      {i18next.t('comments.edit', 'Edit')}
                    </MuiMenuItem>
                    {allowFileUploads && (
                      <MuiMenuItem onClick={() => { fileInputRefs.current[c.id]?.click(); setMenuAnchor(null); }}>
                        {i18next.t('comments.attachFile', 'Attach file')}
                      </MuiMenuItem>
                    )}
                    <MuiMenuItem onClick={() => { setDeleteId(c.id); setMenuAnchor(null); }} sx={{ color: 'error.main' }}>
                      {i18next.t('comments.delete', 'Delete')}
                    </MuiMenuItem>
                  </Menu>
                  {allowFileUploads && (
                    <input
                      type="file"
                      ref={(el) => { fileInputRefs.current[c.id] = el; }}
                      style={{ display: 'none' }}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(c, f); }}
                    />
                  )}
                </>
              )}
            </Box>

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

            {files.map((f) => (
              f.fileUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(f.fileUrl) ? (
                <img key={f.id} src={f.fileUrl} alt="attachment" style={{ maxWidth: 200, maxHeight: 150, borderRadius: 4, display: 'block', marginTop: 4 }} />
              ) : f.fileUrl ? (
                <Button key={f.id} size="small" href={f.fileUrl} target="_blank">{f.storageKey?.split('/').pop() || 'File'}</Button>
              ) : null
            ))}
          </Box>
        );
      })}

      {!showAllComments && hasMoreComments && (
        <Button size="small" onClick={() => setShowAllComments(true)}>
          {i18next.t('comments.viewMore', 'View More Comments ({{count}} total)', { count: sortedComments.length })}
        </Button>
      )}

      <Box mt={2}>
        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder={i18next.t('comments.addComment', 'Add a comment...')}
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
        />
        <Box mt={1} display="flex" alignItems="center" gap={1}>
          <Button variant="contained" onClick={handleSubmit}>{i18next.t('comments.submit', 'Submit')}</Button>
          {allowFileUploads && (
            <>
              <IconButton size="small" onClick={() => newFileInputRef.current?.click()}>
                <AttachFileIcon />
              </IconButton>
              <input type="file" ref={newFileInputRef} style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setPendingFile(f); e.target.value = ''; }} />
            </>
          )}
        </Box>
        {pendingFile && allowFileUploads && (
          <Box mt={1}>
            <Chip
              label={i18next.t('comments.attachingFile', 'Attaching: {{filename}}', { filename: pendingFile.name })}
              size="small"
              onDelete={() => setPendingFile(null)}
            />
          </Box>
        )}
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
