# Progress Report Permission-Aware Views Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the ProgressReport page so that users see different views based on their permissions — personal progress with an interactive goal×date scatter chart, a team overview, or both via a context switcher.

**Architecture:** A `useProgressReportPermissions` hook derives two boolean flags (`canParticipate`, `canOversee`) from the existing permissions store. `Progress.tsx` becomes a thin orchestrator that renders `PersonalProgressView`, `TeamOverviewView`, or `MemberProgressView` based on those flags and a local `viewMode` state. A `ContextSwitcher` component (MUI ToggleButtonGroup + Autocomplete) only renders when the user has both flags. All components live under `src/components/progress/`.

**Tech Stack:** React 19, MUI v7, Recharts v3, Zustand v5, React Router v7, React Hook Form, Zod, AWS Amplify/Cognito, i18next, @testing-library/react

**Spec:** `docs/superpowers/specs/2026-04-08-progress-report-permission-views-design.md`

---

## File Map

**New files:**
- `src/hooks/useProgressReportPermissions.ts` — derives `canParticipate` + `canOversee` from permission store
- `src/components/progress/ContextSwitcher.tsx` — MUI ToggleButtonGroup + Autocomplete for view switching
- `src/components/progress/GoalActivityChart.tsx` — Recharts ScatterChart (goal × date with clickable dots)
- `src/components/progress/EntryDrawer.tsx` — MUI Drawer showing a single progress entry detail
- `src/components/progress/PersonalProgressView.tsx` — personal graph + entries list + create button
- `src/components/progress/TeamOverviewView.tsx` — aggregate team view with member cards
- `src/components/progress/MemberProgressView.tsx` — read-only personal view for a selected member

**Modified files:**
- `src/utils/chartUtils.ts` — add `buildGoalActivityScatterData()` for the scatter chart
- `src/pages/user/Progress.tsx` — refactored to thin orchestrator using the new components

**Test files:**
- `src/hooks/__tests__/useProgressReportPermissions.test.ts`
- `src/components/progress/__tests__/ContextSwitcher.test.tsx`
- `src/components/progress/__tests__/GoalActivityChart.test.tsx`
- `src/components/progress/__tests__/EntryDrawer.test.tsx`
- `src/components/progress/__tests__/PersonalProgressView.test.tsx`
- `src/components/progress/__tests__/TeamOverviewView.test.tsx`

---

## Task 1: Add `buildGoalActivityScatterData` to `chartUtils.ts`

**Files:**
- Modify: `src/utils/chartUtils.ts`
- Test: `src/utils/__tests__/chartUtils.test.ts` (create if it doesn't exist)

- [ ] **Step 1: Write the failing test**

Add to (or create) `src/utils/__tests__/chartUtils.test.ts`:

```ts
import { buildGoalActivityScatterData } from '../chartUtils';

const mockGoals = [
  { id: 'goal-1', title: 'Serve accuracy' },
  { id: 'goal-2', title: 'Jump height' },
];

const mockReports = [
  {
    id: 'report-1',
    authorId: 'user-1',
    reportDate: '2025-03-01T00:00:00Z',
    summary: 'Good week',
    progress: [
      { id: 'entry-1', goalId: 'goal-1', rating: 4, details: 'Improved' },
      { id: 'entry-2', goalId: 'goal-2', rating: 2, details: 'Struggling' },
    ],
  },
];

describe('buildGoalActivityScatterData', () => {
  it('maps each progress entry to a scatter point', () => {
    const { points, goalNames } = buildGoalActivityScatterData(mockReports as any, mockGoals as any);

    expect(points).toHaveLength(2);
    expect(goalNames).toEqual(['Serve accuracy', 'Jump height']);

    expect(points[0]).toMatchObject({
      x: new Date('2025-03-01T00:00:00Z').getTime(),
      y: 0,
      rating: 4,
      progressId: 'entry-1',
      reportId: 'report-1',
      goalName: 'Serve accuracy',
      isOnTrack: true,
    });

    expect(points[1]).toMatchObject({
      y: 1,
      rating: 2,
      isOnTrack: false,
    });
  });

  it('skips progress entries whose goalId is not in the goals list', () => {
    const reportsWithUnknownGoal = [
      {
        id: 'report-2',
        reportDate: '2025-03-05T00:00:00Z',
        progress: [{ id: 'e-1', goalId: 'unknown-goal', rating: 3 }],
      },
    ];
    const { points } = buildGoalActivityScatterData(reportsWithUnknownGoal as any, mockGoals as any);
    expect(points).toHaveLength(0);
  });

  it('returns empty arrays when there are no reports', () => {
    const { points, goalNames } = buildGoalActivityScatterData([], mockGoals as any);
    expect(points).toHaveLength(0);
    expect(goalNames).toEqual(['Serve accuracy', 'Jump height']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="chartUtils"
```

Expected: FAIL — `buildGoalActivityScatterData is not a function`

- [ ] **Step 3: Add the type and function to `chartUtils.ts`**

Append to `src/utils/chartUtils.ts`:

```ts
export interface ScatterPoint {
  x: number;         // report date as Unix timestamp (ms)
  y: number;         // index into goalNames array
  rating: number;    // 1–5
  progressId: string;
  reportId: string;
  goalName: string;
  isOnTrack: boolean; // rating >= 3
}

export function buildGoalActivityScatterData(
  reports: Array<{
    id: string;
    reportDate: string;
    progress?: Array<{ id: string; goalId: string; rating: number; details?: string }>;
  }>,
  goals: Array<{ id: string; title: string }>,
): { points: ScatterPoint[]; goalNames: string[] } {
  const goalIndexMap = new Map(goals.map((g, i) => [g.id, i]));
  const goalNames = goals.map((g) => g.title);
  const points: ScatterPoint[] = [];

  for (const report of reports) {
    const x = new Date(report.reportDate).getTime();
    for (const entry of report.progress ?? []) {
      const y = goalIndexMap.get(entry.goalId);
      if (y === undefined) continue;
      points.push({
        x,
        y,
        rating: entry.rating,
        progressId: entry.id,
        reportId: report.id,
        goalName: goalNames[y],
        isOnTrack: entry.rating >= 3,
      });
    }
  }

  return { points, goalNames };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="chartUtils"
```

Expected: PASS — all 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/utils/chartUtils.ts src/utils/__tests__/chartUtils.test.ts
git commit -m "feat: add buildGoalActivityScatterData to chartUtils"
```

---

## Task 2: Create `useProgressReportPermissions` Hook

**Files:**
- Create: `src/hooks/useProgressReportPermissions.ts`
- Test: `src/hooks/__tests__/useProgressReportPermissions.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/hooks/__tests__/useProgressReportPermissions.test.ts`:

```ts
import { renderHook } from '@testing-library/react';
import { useProgressReportPermissions } from '../useProgressReportPermissions';
import { usePermission } from '../usePermission';

jest.mock('../usePermission');
const mockUsePermission = usePermission as jest.MockedFunction<typeof usePermission>;

describe('useProgressReportPermissions', () => {
  it('returns canParticipate=true when individual_goals:write permission exists', () => {
    mockUsePermission.mockImplementation((p) => p === 'individual_goals:write');
    const { result } = renderHook(() => useProgressReportPermissions());
    expect(result.current.canParticipate).toBe(true);
    expect(result.current.canOversee).toBe(false);
  });

  it('returns canOversee=true when members:read permission exists', () => {
    mockUsePermission.mockImplementation((p) => p === 'members:read');
    const { result } = renderHook(() => useProgressReportPermissions());
    expect(result.current.canParticipate).toBe(false);
    expect(result.current.canOversee).toBe(true);
  });

  it('returns both flags true when user has both permissions', () => {
    mockUsePermission.mockReturnValue(true);
    const { result } = renderHook(() => useProgressReportPermissions());
    expect(result.current.canParticipate).toBe(true);
    expect(result.current.canOversee).toBe(true);
  });

  it('returns both flags false when user has neither permission', () => {
    mockUsePermission.mockReturnValue(false);
    const { result } = renderHook(() => useProgressReportPermissions());
    expect(result.current.canParticipate).toBe(false);
    expect(result.current.canOversee).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="useProgressReportPermissions"
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/hooks/useProgressReportPermissions.ts`**

```ts
import { usePermission } from './usePermission';

export interface ProgressReportPermissions {
  /** User can create/edit their own progress reports */
  canParticipate: boolean;
  /** User can view all team members' progress reports */
  canOversee: boolean;
}

export function useProgressReportPermissions(): ProgressReportPermissions {
  const canParticipate = usePermission('individual_goals:write');
  const canOversee = usePermission('members:read');
  return { canParticipate, canOversee };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="useProgressReportPermissions"
```

Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useProgressReportPermissions.ts src/hooks/__tests__/useProgressReportPermissions.test.ts
git commit -m "feat: add useProgressReportPermissions hook"
```

---

## Task 3: Create `GoalActivityChart` Component

**Files:**
- Create: `src/components/progress/GoalActivityChart.tsx`
- Test: `src/components/progress/__tests__/GoalActivityChart.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/progress/__tests__/GoalActivityChart.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GoalActivityChart } from '../GoalActivityChart';

// Recharts renders SVG — suppress ResizeObserver errors in jsdom
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };

const mockGoalNames = ['Serve accuracy', 'Jump height'];
const mockPoints = [
  {
    x: new Date('2025-03-01').getTime(),
    y: 0,
    rating: 4,
    progressId: 'entry-1',
    reportId: 'report-1',
    goalName: 'Serve accuracy',
    isOnTrack: true,
  },
  {
    x: new Date('2025-03-10').getTime(),
    y: 1,
    rating: 2,
    progressId: 'entry-2',
    reportId: 'report-2',
    goalName: 'Jump height',
    isOnTrack: false,
  },
];

describe('GoalActivityChart', () => {
  it('renders goal names as Y-axis labels', () => {
    render(
      <GoalActivityChart
        points={mockPoints}
        goalNames={mockGoalNames}
        onEntryClick={jest.fn()}
      />,
    );
    expect(screen.getByText('Serve accuracy')).toBeInTheDocument();
    expect(screen.getByText('Jump height')).toBeInTheDocument();
  });

  it('renders a dot for each scatter point', () => {
    render(
      <GoalActivityChart
        points={mockPoints}
        goalNames={mockGoalNames}
        onEntryClick={jest.fn()}
      />,
    );
    // Each dot renders its rating as text
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('calls onEntryClick with progressId and reportId when a dot is clicked', async () => {
    const onEntryClick = jest.fn();
    render(
      <GoalActivityChart
        points={mockPoints}
        goalNames={mockGoalNames}
        onEntryClick={onEntryClick}
      />,
    );
    await userEvent.click(screen.getByText('4'));
    expect(onEntryClick).toHaveBeenCalledWith('entry-1', 'report-1');
  });

  it('renders an empty state message when there are no points', () => {
    render(
      <GoalActivityChart
        points={[]}
        goalNames={mockGoalNames}
        onEntryClick={jest.fn()}
      />,
    );
    expect(screen.getByText(/no progress entries/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="GoalActivityChart"
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/components/progress/GoalActivityChart.tsx`**

```tsx
import React from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { ScatterPoint } from '../../utils/chartUtils';

interface GoalActivityChartProps {
  points: ScatterPoint[];
  goalNames: string[];
  onEntryClick: (progressId: string, reportId: string) => void;
}

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: ScatterPoint;
  onEntryClick: (progressId: string, reportId: string) => void;
}

function ActivityDot({ cx = 0, cy = 0, payload, onEntryClick }: DotProps) {
  if (!payload) return null;
  const color = payload.isOnTrack ? '#1976d2' : '#e67e22';
  return (
    <g
      onClick={() => onEntryClick(payload.progressId, payload.reportId)}
      style={{ cursor: 'pointer' }}
      role="button"
      aria-label={`Rating ${payload.rating} for ${payload.goalName}`}
    >
      <circle cx={cx} cy={cy} r={14} fill={color} opacity={0.85} />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize={12}
        fontWeight="bold"
        pointerEvents="none"
      >
        {payload.rating}
      </text>
    </g>
  );
}

export function GoalActivityChart({ points, goalNames, onEntryClick }: GoalActivityChartProps) {
  if (points.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">No progress entries yet this season.</Typography>
      </Box>
    );
  }

  const chartHeight = Math.max(goalNames.length * 64 + 60, 160);

  const formatXTick = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString('default', { month: 'short', day: 'numeric' });

  const formatYTick = (index: number) => goalNames[index] ?? '';

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <ScatterChart margin={{ top: 16, right: 24, bottom: 16, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="x"
          type="number"
          domain={['dataMin - 86400000', 'dataMax + 86400000']}
          tickFormatter={formatXTick}
          name="Date"
          scale="time"
        />
        <YAxis
          dataKey="y"
          type="number"
          domain={[-0.5, goalNames.length - 0.5]}
          ticks={goalNames.map((_, i) => i)}
          tickFormatter={formatYTick}
          width={110}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as ScatterPoint;
            return (
              <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', p: 1, borderRadius: 1 }}>
                <Typography variant="caption" display="block" fontWeight="bold">{p.goalName}</Typography>
                <Typography variant="caption" display="block">Rating: {p.rating}/5</Typography>
                <Typography variant="caption" color="text.secondary">Click to open</Typography>
              </Box>
            );
          }}
        />
        <Scatter
          data={points}
          shape={(props: any) => <ActivityDot {...props} onEntryClick={onEntryClick} />}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="GoalActivityChart"
```

Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/progress/GoalActivityChart.tsx src/components/progress/__tests__/GoalActivityChart.test.tsx
git commit -m "feat: add GoalActivityChart scatter component"
```

---

## Task 4: Create `EntryDrawer` Component

**Files:**
- Create: `src/components/progress/EntryDrawer.tsx`
- Test: `src/components/progress/__tests__/EntryDrawer.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/progress/__tests__/EntryDrawer.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EntryDrawer } from '../EntryDrawer';
import { MemoryRouter } from 'react-router-dom';

const mockEntry = {
  id: 'entry-1',
  goalId: 'goal-1',
  goalName: 'Serve accuracy',
  rating: 4,
  details: 'Really focused this week.',
  reportId: 'report-1',
  reportDate: '2025-03-01T00:00:00Z',
};

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('EntryDrawer', () => {
  it('renders nothing when entry is null', () => {
    const { container } = renderWithRouter(
      <EntryDrawer entry={null} readonly={false} onClose={jest.fn()} />,
    );
    // MUI Drawer with no entry should not show content
    expect(screen.queryByText('Serve accuracy')).not.toBeInTheDocument();
  });

  it('shows goal name, rating, and details when entry is provided', () => {
    renderWithRouter(
      <EntryDrawer entry={mockEntry} readonly={false} onClose={jest.fn()} />,
    );
    expect(screen.getByText('Serve accuracy')).toBeInTheDocument();
    expect(screen.getByText('4 / 5')).toBeInTheDocument();
    expect(screen.getByText('Really focused this week.')).toBeInTheDocument();
  });

  it('hides the "Open full report" link in readonly mode — it is still present (read-only just means no edit controls)', () => {
    renderWithRouter(
      <EntryDrawer entry={mockEntry} readonly={true} onClose={jest.fn()} />,
    );
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open full report/i })).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = jest.fn();
    renderWithRouter(
      <EntryDrawer entry={mockEntry} readonly={false} onClose={onClose} />,
    );
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="EntryDrawer"
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/components/progress/EntryDrawer.tsx`**

```tsx
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="EntryDrawer"
```

Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/progress/EntryDrawer.tsx src/components/progress/__tests__/EntryDrawer.test.tsx
git commit -m "feat: add EntryDrawer component for progress entry detail"
```

---

## Task 5: Create `ContextSwitcher` Component

**Files:**
- Create: `src/components/progress/ContextSwitcher.tsx`
- Test: `src/components/progress/__tests__/ContextSwitcher.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/progress/__tests__/ContextSwitcher.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContextSwitcher } from '../ContextSwitcher';

const mockMembers = [
  { id: 'user-1', name: 'Anna Müller' },
  { id: 'user-2', name: 'Bob Klein' },
];

describe('ContextSwitcher', () => {
  it('shows all three segments when canParticipate and canOversee are both true', () => {
    render(
      <ContextSwitcher
        canParticipate={true}
        canOversee={true}
        value="personal"
        onChange={jest.fn()}
        members={mockMembers}
      />,
    );
    expect(screen.getByRole('button', { name: /my progress/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /team overview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /member/i })).toBeInTheDocument();
  });

  it('does not render at all when only canParticipate is true', () => {
    const { container } = render(
      <ContextSwitcher
        canParticipate={true}
        canOversee={false}
        value="personal"
        onChange={jest.fn()}
        members={[]}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not render at all when only canOversee is true', () => {
    const { container } = render(
      <ContextSwitcher
        canParticipate={false}
        canOversee={true}
        value="team"
        onChange={jest.fn()}
        members={mockMembers}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('calls onChange with "personal" when My Progress is clicked', async () => {
    const onChange = jest.fn();
    render(
      <ContextSwitcher
        canParticipate={true}
        canOversee={true}
        value="team"
        onChange={onChange}
        members={mockMembers}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /my progress/i }));
    expect(onChange).toHaveBeenCalledWith('personal');
  });

  it('shows member autocomplete when Member button is active', async () => {
    render(
      <ContextSwitcher
        canParticipate={true}
        canOversee={true}
        value="member"
        onChange={jest.fn()}
        members={mockMembers}
      />,
    );
    expect(screen.getByPlaceholderText(/search member/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="ContextSwitcher"
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/components/progress/ContextSwitcher.tsx`**

```tsx
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="ContextSwitcher"
```

Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/progress/ContextSwitcher.tsx src/components/progress/__tests__/ContextSwitcher.test.tsx
git commit -m "feat: add ContextSwitcher component for progress view navigation"
```

---

## Task 6: Create `PersonalProgressView` Component

**Files:**
- Create: `src/components/progress/PersonalProgressView.tsx`
- Test: `src/components/progress/__tests__/PersonalProgressView.test.tsx`

> This component extracts the personal progress content from `src/pages/user/Progress.tsx`. Look at Progress.tsx to see what goals store and report fetching it uses — replicate those patterns here. The existing `buildProgressChartData` (LineChart) is replaced by `GoalActivityChart` (ScatterChart).

- [ ] **Step 1: Write the failing test**

Create `src/components/progress/__tests__/PersonalProgressView.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PersonalProgressView } from '../PersonalProgressView';

// Stub child components to keep tests focused
jest.mock('../GoalActivityChart', () => ({
  GoalActivityChart: () => <div data-testid="goal-activity-chart" />,
}));
jest.mock('../EntryDrawer', () => ({
  EntryDrawer: () => null,
}));
jest.mock('../../store/progressReports', () => ({
  useProgressReportStore: () => ({
    reportList: { reports: [], count: 0 },
    fetchReports: jest.fn(),
  }),
}));
jest.mock('../../store/goals', () => ({  // adjust import path to match actual goals store
  useIndividualGoalStore: () => ({
    goals: [],
    fetchGoals: jest.fn(),
  }),
}));

describe('PersonalProgressView', () => {
  it('renders the goal activity chart', () => {
    render(
      <MemoryRouter>
        <PersonalProgressView teamId="team-1" seasonId="season-1" canParticipate={true} />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('goal-activity-chart')).toBeInTheDocument();
  });

  it('shows the New Report button when canParticipate is true', () => {
    render(
      <MemoryRouter>
        <PersonalProgressView teamId="team-1" seasonId="season-1" canParticipate={true} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: /new report/i })).toBeInTheDocument();
  });

  it('hides the New Report button when canParticipate is false', () => {
    render(
      <MemoryRouter>
        <PersonalProgressView teamId="team-1" seasonId="season-1" canParticipate={false} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button', { name: /new report/i })).not.toBeInTheDocument();
  });
});
```

> **Note:** The mock path `'../../store/goals'` may differ. Check the actual import used in `Progress.tsx` for the goals store and update the mock accordingly.

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="PersonalProgressView"
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/components/progress/PersonalProgressView.tsx`**

```tsx
import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import { GoalActivityChart } from './GoalActivityChart';
import { EntryDrawer, EntryDrawerEntry } from './EntryDrawer';
import { buildGoalActivityScatterData } from '../../utils/chartUtils';
import { useProgressReportStore } from '../../store/progressReports';

// Import goals store using the same import as Progress.tsx — verify the actual path
// import { useIndividualGoalStore } from '../../store/goals';

interface PersonalProgressViewProps {
  teamId: string;
  seasonId: string;
  canParticipate: boolean;
  /** When provided, renders this member's data read-only instead of the current user's */
  authorId?: string;
}

export function PersonalProgressView({
  teamId,
  seasonId,
  canParticipate,
  authorId,
}: PersonalProgressViewProps) {
  const navigate = useNavigate();
  const [selectedEntry, setSelectedEntry] = React.useState<EntryDrawerEntry | null>(null);

  const { reportList, fetchReports } = useProgressReportStore();
  // const { goals, fetchGoals } = useIndividualGoalStore(); // uncomment with actual store

  // Temporary: replace with actual goals store
  const goals: Array<{ id: string; title: string }> = [];

  React.useEffect(() => {
    fetchReports(seasonId, authorId ? { authorId } : {});
    // fetchGoals(teamId);
  }, [seasonId, teamId, authorId]);

  const { points, goalNames } = buildGoalActivityScatterData(reportList.reports, goals);

  const handleEntryClick = (progressId: string, reportId: string) => {
    const report = reportList.reports.find((r) => r.id === reportId);
    if (!report) return;
    const entry = report.progress?.find((p) => p.id === progressId);
    if (!entry) return;
    const goal = goals.find((g) => g.id === entry.goalId);
    setSelectedEntry({
      id: entry.id,
      goalId: entry.goalId,
      goalName: goal?.title ?? entry.goalId,
      rating: entry.rating,
      details: entry.details,
      reportId: report.id,
      reportDate: report.reportDate,
    });
  };

  const readonly = !!authorId;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          {authorId ? 'Progress' : 'My Progress'}
        </Typography>
        {canParticipate && !authorId && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/progress/create')}
          >
            New Report
          </Button>
        )}
      </Box>

      <GoalActivityChart
        points={points}
        goalNames={goalNames}
        onEntryClick={handleEntryClick}
      />

      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Reports
        </Typography>
        {reportList.reports.map((report) => (
          <Box
            key={report.id}
            sx={{
              p: 1.5,
              mb: 1,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              cursor: 'pointer',
              '&:hover': { bgcolor: 'action.hover' },
            }}
            onClick={() => navigate(`/progress/${report.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate(`/progress/${report.id}`)}
          >
            <Typography variant="body2" fontWeight="medium">{report.summary}</Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(report.reportDate).toLocaleDateString()}
            </Typography>
          </Box>
        ))}
      </Box>

      <EntryDrawer
        entry={selectedEntry}
        readonly={readonly}
        onClose={() => setSelectedEntry(null)}
      />
    </Box>
  );
}
```

- [ ] **Step 4: Integrate actual goals store**

Open `src/pages/user/Progress.tsx` and find the goals store import and usage (look for a hook that returns a `goals` array with `id` and `title` fields). Add the same import to `PersonalProgressView.tsx`, uncomment the goals lines, and remove the `const goals = []` placeholder.

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="PersonalProgressView"
```

Expected: PASS — all 3 tests green.

- [ ] **Step 6: Commit**

```bash
git add src/components/progress/PersonalProgressView.tsx src/components/progress/__tests__/PersonalProgressView.test.tsx
git commit -m "feat: add PersonalProgressView with interactive scatter chart"
```

---

## Task 7: Create `TeamOverviewView` Component

**Files:**
- Create: `src/components/progress/TeamOverviewView.tsx`
- Test: `src/components/progress/__tests__/TeamOverviewView.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/progress/__tests__/TeamOverviewView.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamOverviewView } from '../TeamOverviewView';

jest.mock('../../store/progressReports', () => ({
  useProgressReportStore: () => ({
    reportList: {
      reports: [
        { id: 'r1', authorId: 'user-1', reportDate: '2025-03-01T00:00:00Z', summary: 'S1', progress: [] },
        { id: 'r2', authorId: 'user-2', reportDate: '2025-03-05T00:00:00Z', summary: 'S2', progress: [] },
      ],
    },
    fetchReports: jest.fn(),
  }),
}));

const mockMembers = [
  { id: 'user-1', name: 'Anna Müller', picture: undefined },
  { id: 'user-2', name: 'Bob Klein', picture: undefined },
];

describe('TeamOverviewView', () => {
  it('renders a card for each team member', () => {
    render(
      <TeamOverviewView
        teamId="team-1"
        seasonId="season-1"
        members={mockMembers}
        onMemberSelect={jest.fn()}
      />,
    );
    expect(screen.getByText('Anna Müller')).toBeInTheDocument();
    expect(screen.getByText('Bob Klein')).toBeInTheDocument();
  });

  it('shows the report count per member', () => {
    render(
      <TeamOverviewView
        teamId="team-1"
        seasonId="season-1"
        members={mockMembers}
        onMemberSelect={jest.fn()}
      />,
    );
    // Anna has 1 report, Bob has 1 report
    expect(screen.getAllByText(/1 report/i)).toHaveLength(2);
  });

  it('calls onMemberSelect with memberId when a member card is clicked', async () => {
    const onMemberSelect = jest.fn();
    render(
      <TeamOverviewView
        teamId="team-1"
        seasonId="season-1"
        members={mockMembers}
        onMemberSelect={onMemberSelect}
      />,
    );
    await userEvent.click(screen.getByText('Anna Müller'));
    expect(onMemberSelect).toHaveBeenCalledWith('user-1');
  });

  it('filters members when search input is used', async () => {
    render(
      <TeamOverviewView
        teamId="team-1"
        seasonId="season-1"
        members={mockMembers}
        onMemberSelect={jest.fn()}
      />,
    );
    await userEvent.type(screen.getByPlaceholderText(/search/i), 'Anna');
    expect(screen.getByText('Anna Müller')).toBeInTheDocument();
    expect(screen.queryByText('Bob Klein')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="TeamOverviewView"
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/components/progress/TeamOverviewView.tsx`**

```tsx
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Avatar from '@mui/material/Avatar';
import LinearProgress from '@mui/material/LinearProgress';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import { useProgressReportStore } from '../../store/progressReports';

interface Member {
  id: string;
  name: string;
  picture?: string;
}

interface TeamOverviewViewProps {
  teamId: string;
  seasonId: string;
  members: Member[];
  onMemberSelect: (memberId: string) => void;
}

export function TeamOverviewView({
  teamId,
  seasonId,
  members,
  onMemberSelect,
}: TeamOverviewViewProps) {
  const [search, setSearch] = React.useState('');
  const { reportList, fetchReports } = useProgressReportStore();

  React.useEffect(() => {
    fetchReports(seasonId, {});
  }, [seasonId]);

  const reportCountByAuthor = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const report of reportList.reports) {
      counts[report.authorId] = (counts[report.authorId] ?? 0) + 1;
    }
    return counts;
  }, [reportList.reports]);

  const maxReports = Math.max(...Object.values(reportCountByAuthor), 1);

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Team Overview</Typography>
        <TextField
          size="small"
          placeholder="Search members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ width: 200 }}
        />
      </Box>

      <Grid container spacing={2}>
        {filteredMembers.map((member) => {
          const count = reportCountByAuthor[member.id] ?? 0;
          const progress = (count / maxReports) * 100;
          return (
            <Grid item xs={12} sm={6} md={4} key={member.id}>
              <Card variant="outlined">
                <CardActionArea onClick={() => onMemberSelect(member.id)}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                      <Avatar src={member.picture} sx={{ width: 36, height: 36 }}>
                        {member.name[0]}
                      </Avatar>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {member.name}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" gutterBottom>
                      {count} {count === 1 ? 'report' : 'reports'} this season
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={progress}
                      sx={{ mt: 1, height: 6, borderRadius: 3 }}
                    />
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="TeamOverviewView"
```

Expected: PASS — all 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/components/progress/TeamOverviewView.tsx src/components/progress/__tests__/TeamOverviewView.test.tsx
git commit -m "feat: add TeamOverviewView with member cards and search"
```

---

## Task 8: Create `MemberProgressView` Component

**Files:**
- Create: `src/components/progress/MemberProgressView.tsx`

> `MemberProgressView` is a thin wrapper around `PersonalProgressView` with `readonly` semantics. It passes the selected member's `userId` as `authorId` and shows a back button.

- [ ] **Step 1: Create `src/components/progress/MemberProgressView.tsx`**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/progress/MemberProgressView.tsx
git commit -m "feat: add MemberProgressView read-only wrapper"
```

---

## Task 9: Refactor `Progress.tsx` as Orchestrator

**Files:**
- Modify: `src/pages/user/Progress.tsx`

> Replace the body of `Progress.tsx` with the orchestration logic. The existing content (chart, list, member fetching) has moved into `PersonalProgressView`. Preserve all existing imports that are still needed (routing params, team/season store access).

- [ ] **Step 1: Read the current `Progress.tsx`**

Open `src/pages/user/Progress.tsx` and note:
1. How `teamId` and `seasonId` are obtained (params? store?)
2. How `currentUserId` is obtained (Cognito store?)
3. Imports that are still needed vs ones now handled by sub-components

- [ ] **Step 2: Replace `Progress.tsx` body**

Keep the file's existing imports for team/season context. Replace the component body with:

```tsx
import React from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { useProgressReportPermissions } from '../../hooks/useProgressReportPermissions';
import { ContextSwitcher } from '../../components/progress/ContextSwitcher';
import { PersonalProgressView } from '../../components/progress/PersonalProgressView';
import { TeamOverviewView } from '../../components/progress/TeamOverviewView';
import { MemberProgressView } from '../../components/progress/MemberProgressView';
import { useTeamStore } from '../../store/teams';
// Keep existing imports for teamId, seasonId, currentUserId resolution

export function Progress() {
  // Resolve teamId, seasonId from existing store/params — keep as-is from original file
  const teamId = ''; // replace with existing resolution
  const seasonId = ''; // replace with existing resolution

  const { canParticipate, canOversee } = useProgressReportPermissions();

  const members = useTeamStore((s) => s.teamMembers) ?? [];
  const fetchTeamMembers = useTeamStore((s) => s.fetchTeamMembers);

  // 'personal' | 'team' | '<memberId>'
  const [viewMode, setViewMode] = React.useState<string>(() =>
    canParticipate ? 'personal' : 'team',
  );

  React.useEffect(() => {
    if (canOversee && teamId) {
      fetchTeamMembers(teamId, { limit: 100 } as any).catch(() => {});
    }
  }, [canOversee, teamId]);

  const selectedMember = members.find((m) => m.id === viewMode);

  const isPersonal = viewMode === 'personal';
  const isTeam = viewMode === 'team';
  const isMember = !isPersonal && !isTeam;

  // For oversight-only users landing directly on team, ensure viewMode is 'team'
  React.useEffect(() => {
    if (!canParticipate && canOversee && viewMode === 'personal') {
      setViewMode('team');
    }
  }, [canParticipate, canOversee]);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <ContextSwitcher
        canParticipate={canParticipate}
        canOversee={canOversee}
        value={viewMode}
        onChange={setViewMode}
        members={members.map((m) => ({ id: m.id, name: m.name }))}
      />

      <Box>
        {isPersonal && (
          <PersonalProgressView
            teamId={teamId}
            seasonId={seasonId}
            canParticipate={canParticipate}
          />
        )}

        {isTeam && (
          <TeamOverviewView
            teamId={teamId}
            seasonId={seasonId}
            members={members.map((m) => ({ id: m.id, name: m.name, picture: m.picture }))}
            onMemberSelect={(memberId) => setViewMode(memberId)}
          />
        )}

        {isMember && selectedMember && (
          <MemberProgressView
            memberId={selectedMember.id}
            memberName={selectedMember.name}
            teamId={teamId}
            seasonId={seasonId}
            onBack={() => setViewMode('team')}
          />
        )}
      </Box>
    </Container>
  );
}

export default Progress;
```

- [ ] **Step 3: Fill in `teamId` and `seasonId`**

From the original `Progress.tsx`, copy the logic that resolves `teamId` and `seasonId` (likely from a team store or URL params). Replace the empty string placeholders above.

- [ ] **Step 4: Verify the app compiles**

```bash
npm run build
```

Expected: build succeeds with no TypeScript errors. Fix any type errors before continuing.

- [ ] **Step 5: Manual smoke test**

Start the dev server:
```bash
npm start
```

Verify:
1. Log in as a **member** account → `/progress` shows personal graph only, no switcher
2. Log in as a **trainer** account → `/progress` shows Team Overview directly, member cards clickable
3. Log in as an **admin (playing)** account → `/progress` shows switcher with all 3 segments, defaults to "My Progress"
4. Click a dot on any graph → Drawer opens with entry detail
5. Click a report row → navigates to `/progress/:id`
6. Click "Open full report" in Drawer → navigates to `/progress/:id`

- [ ] **Step 6: Commit**

```bash
git add src/pages/user/Progress.tsx
git commit -m "feat: refactor Progress page as permission-aware orchestrator"
```

---

## Self-Review Checklist

- [x] **Permission detection** — `useProgressReportPermissions` hook in Task 2 ✓
- [x] **Personal scatter chart** — `GoalActivityChart` with clickable dots in Task 3 ✓
- [x] **Dot click → Drawer** — `EntryDrawer` in Task 4, wired in `PersonalProgressView` Task 6 ✓
- [x] **Report row → Navigate** — handled in `PersonalProgressView` Task 6 ✓
- [x] **Context Switcher (both flags)** — `ContextSwitcher` in Task 5, only renders when both true ✓
- [x] **Team Overview** — `TeamOverviewView` with member cards in Task 7 ✓
- [x] **Member drill-down from Team Overview** — `onMemberSelect` prop → `setViewMode(memberId)` in Task 9 ✓
- [x] **Member drill-down from Switcher** — ToggleButton "Member ▾" + Autocomplete in Task 5 ✓
- [x] **MemberProgressView always read-only** — `canParticipate={false}`, `authorId` passed in Task 8 ✓
- [x] **Oversight-only users land on Team view** — `useEffect` correction in Task 9 ✓
- [x] **Edit/Delete only for own reports** — Drawer shows Edit only when `!readonly` in Task 4; readonly is determined by whether `authorId` is set in Task 8 ✓
- [x] **No role names read in frontend** — only `canParticipate`/`canOversee` flags used throughout ✓
- [x] **Scales to 16+ members** — Autocomplete in ContextSwitcher + search in TeamOverviewView ✓
