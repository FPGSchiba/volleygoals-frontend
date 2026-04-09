import React from 'react';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import CloseIcon from '@mui/icons-material/Close';
import { Link } from 'react-router-dom';

export interface EntryDrawerEntry {
  id: string;
  goalId: string;
  goalName: string;
  rating: number;
  details?: string;
  reportId: string;
  reportDate: string;
}

interface EntryDrawerProps {
  entry: EntryDrawerEntry | null;
  readonly: boolean;
  onClose: () => void;
}

export function EntryDrawer({ entry, readonly, onClose }: EntryDrawerProps) {
  return (
    <Drawer anchor="right" open={entry !== null} onClose={onClose}>
      <Box sx={{ width: 360, p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {entry && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="h6" noWrap sx={{ flex: 1 }}>
                {entry.goalName}
              </Typography>
              <IconButton aria-label="close" onClick={onClose} size="small">
                <CloseIcon />
              </IconButton>
            </Box>

            <Typography variant="caption" color="text.secondary" gutterBottom>
              {new Date(entry.reportDate).toLocaleDateString('default', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Rating
            </Typography>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              {entry.rating} / 5
            </Typography>

            {entry.details && (
              <>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                  Notes
                </Typography>
                <Typography variant="body2">{entry.details}</Typography>
              </>
            )}

            <Box sx={{ mt: 'auto', pt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                component={Link}
                to={`/progress/${entry.reportId}`}
                variant="outlined"
                fullWidth
                aria-label="open full report"
              >
                Open full report
              </Button>

              {!readonly && (
                <Button
                  component={Link}
                  to={`/progress/${entry.reportId}`}
                  variant="contained"
                  fullWidth
                >
                  Edit
                </Button>
              )}
            </Box>
          </>
        )}
      </Box>
    </Drawer>
  );
}
