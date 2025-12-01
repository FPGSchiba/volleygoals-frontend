import React, {useState} from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

// Simple loading hook that exposes loading state, a setter, and a Loading component
export function useLoading(initial = false) {
  const [loading, setLoading] = useState<boolean>(initial);

  const Loading = ({ size = 40 }: { size?: number }) => (
    loading ? (
      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
        <CircularProgress size={size} />
      </Box>
    ) : null
  );

  return { loading, setLoading, Loading } as const;
}

