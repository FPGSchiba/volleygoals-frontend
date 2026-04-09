import React from 'react';
import Box from '@mui/material/Box';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';

interface Member {
  id: string;
  name: string;
}

interface ContextSwitcherProps {
  canParticipate: boolean;
  canOversee: boolean;
  /** 'personal' | 'team' | '<memberId>' */
  value: string;
  onChange: (value: string) => void;
  members: Member[];
}

export function ContextSwitcher({
  canParticipate,
  canOversee,
  value,
  onChange,
  members,
}: ContextSwitcherProps) {
  // Only render when user has both flags — otherwise the correct view loads directly
  if (!canParticipate || !canOversee) return null;

  const mainValue = value === 'personal' || value === 'team' ? value : 'member';

  const handleToggle = (_: React.MouseEvent<HTMLElement>, next: string | null) => {
    if (!next) return; // prevent deselect
    if (next === 'personal') onChange('personal');
    if (next === 'team') onChange('team');
    if (next === 'member') onChange('member'); // cleared until autocomplete picks a member
  };

  const selectedMember = members.find((m) => m.id === value) ?? null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', mb: 2 }}>
      <ToggleButtonGroup
        value={mainValue}
        exclusive
        onChange={handleToggle}
        size="small"
        aria-label="progress view"
      >
        <ToggleButton value="personal" aria-label="my progress">
          <PersonIcon fontSize="small" sx={{ mr: 0.5 }} />
          My Progress
        </ToggleButton>
        <ToggleButton value="team" aria-label="team overview">
          <GroupIcon fontSize="small" sx={{ mr: 0.5 }} />
          Team Overview
        </ToggleButton>
        <ToggleButton value="member" aria-label="member">
          <PersonIcon fontSize="small" sx={{ mr: 0.5 }} />
          Member ▾
        </ToggleButton>
      </ToggleButtonGroup>

      {mainValue === 'member' && (
        <Autocomplete
          options={members}
          getOptionLabel={(m) => m.name}
          value={selectedMember}
          onChange={(_, member) => member && onChange(member.id)}
          sx={{ width: 200 }}
          renderInput={(params) => (
            <TextField
              {...params}
              size="small"
              placeholder="Search member..."
              inputProps={{ ...params.inputProps, 'aria-label': 'search member' }}
            />
          )}
          isOptionEqualToValue={(option, val) => option.id === val.id}
        />
      )}
    </Box>
  );
}
