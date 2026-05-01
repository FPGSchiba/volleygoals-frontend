import React from 'react';
import Box from '@mui/material/Box';

interface Member { id: string; name: string; }

interface ContextSwitcherProps {
  canParticipate: boolean;
  canOversee: boolean;
  value: string;
  onChange: (value: string) => void;
  members: Member[];
}

export function ContextSwitcher({ canParticipate, canOversee, value, onChange, members }: ContextSwitcherProps) {
  if (!canParticipate || !canOversee) return null;

  const isPersonal = value === 'personal';
  const isTeam = value === 'team';
  const isMember = !isPersonal && !isTeam;

  return (
    <div className="vg-chip-row" style={{ marginBottom: 16 }}>
      <button
        className={`vg-chip${isPersonal ? ' vg-chip--active' : ''}`}
        onClick={() => onChange('personal')}
        aria-pressed={isPersonal}
      >
        👤 My Progress
      </button>
      <button
        className={`vg-chip${isTeam ? ' vg-chip--active' : ''}`}
        onClick={() => onChange('team')}
        aria-pressed={isTeam}
      >
        👥 Team Overview
      </button>
      <button
        className={`vg-chip${isMember ? ' vg-chip--active' : ''}`}
        onClick={() => onChange('member')}
        aria-pressed={isMember}
      >
        🔍 Member ▾
      </button>
      {isMember && (
        <Box sx={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {members.map(m => (
            <button
              key={m.id}
              className={`vg-chip${value === m.id ? ' vg-chip--active' : ''}`}
              onClick={() => onChange(m.id)}
              style={{ height: 26, fontSize: 10 }}
            >
              {m.name}
            </button>
          ))}
        </Box>
      )}
    </div>
  );
}
