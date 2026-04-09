import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { PersonalProgressView } from './PersonalProgressView';

interface MemberProgressViewProps {
  memberId: string;
  memberName: string;
  teamId: string;
  seasonId: string;
  onBack: () => void;
}

export function MemberProgressView({
  memberId,
  memberName,
  teamId,
  seasonId,
  onBack,
}: MemberProgressViewProps) {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          size="small"
          variant="text"
        >
          Team Overview
        </Button>
        <Typography variant="body2" color="text.secondary">
          / {memberName}
        </Typography>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
        Viewing {memberName}'s progress — read only
      </Typography>

      <PersonalProgressView
        teamId={teamId}
        seasonId={seasonId}
        canParticipate={false}
        authorId={memberId}
      />
    </Box>
  );
}
