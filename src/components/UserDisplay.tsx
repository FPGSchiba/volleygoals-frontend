import React from 'react';
import { Avatar, Box, Typography } from '@mui/material';

/** 1×1 transparent PNG used as avatar placeholder to ensure an img element is always rendered */
const TRANSPARENT_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

interface UserLike {
  id?: string;
  name?: string;
  preferredUsername?: string;
  email?: string;
  picture?: string;
}

interface UserDisplayProps {
  user?: UserLike;
  /** Raw ID used only as a lookup hint — never displayed as text */
  fallbackId?: string;
  size?: 'small' | 'medium';
  showAvatar?: boolean;
}

function resolveDisplayName(user?: UserLike): string {
  if (!user) return '?';
  return user.preferredUsername ?? user.name ?? user.email ?? '?';
}

export function UserDisplay({
  user,
  fallbackId: _fallbackId,
  size = 'small',
  showAvatar = true,
}: UserDisplayProps) {
  const displayName = resolveDisplayName(user);
  const avatarSize = size === 'small' ? 24 : 32;

  return (
    <Box className="user-display-root" display="flex" alignItems="center" gap={1}>
      {showAvatar && (
        <Avatar
          src={user?.picture ?? TRANSPARENT_PNG}
          alt={displayName}
          sx={{ width: avatarSize, height: avatarSize, fontSize: avatarSize * 0.5 }}
        >
          {!user?.picture && displayName !== '?' && displayName.charAt(0).toUpperCase()}
        </Avatar>
      )}
      <Typography variant="body2" className="user-display-name">
        {displayName}
      </Typography>
    </Box>
  );
}
