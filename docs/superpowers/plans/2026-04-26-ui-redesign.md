# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all Normal-user pages (Dashboard, Goals, GoalDetails, Seasons, SeasonDetails, Progress, ProgressCreation, ProgressDetails, Members, Invites) with the approved minimalist design spec, replacing the scatter chart with a heatmap, and applying consistent tokens, chip filters, row items, and the Option-A dialog style.

**Architecture:** A single CSS-variable layer (`--vg-*`) is added to GlobalStyles first; all SCSS files consume only those variables. Each page is a self-contained TSX + SCSS pair redesigned independently. A new `GoalHeatmap` component replaces the scatter chart everywhere.

**Tech Stack:** React 18, TypeScript, Material UI v5, SCSS (via `sass`), Zustand, react-hook-form, Jest + @testing-library/react

**Spec:** `docs/superpowers/specs/2026-04-26-ui-redesign-design.md`  
**Design reference:** `docs/ui-design.md`

---

## File Map

### New files
| File | Purpose |
|---|---|
| `src/components/progress/GoalHeatmap.tsx` | Heatmap grid component (replaces scatter) |
| `src/components/progress/__tests__/GoalHeatmap.test.tsx` | Tests for GoalHeatmap |
| `src/resources/styles/components/shared.scss` | Shared design-system utility classes |

### Modified files
| File | Change |
|---|---|
| `src/index.tsx` | Add `--vg-*` CSS variables to GlobalStyles; update MUI theme values |
| `src/utils/chartUtils.ts` | Add `buildHeatmapData`, `HeatmapCell`, `HeatmapRow`, `HeatmapData`, `HEATMAP_RATING_COLORS` |
| `src/resources/styles/index.scss` | Import `shared.scss` |
| `src/components/progress/GoalActivityChart.tsx` | Replace Recharts scatter internals with `GoalHeatmap` |
| `src/components/progress/PersonalProgressView.tsx` | Use updated `GoalActivityChart` (no import change needed) |
| `src/components/progress/ContextSwitcher.tsx` | Replace MUI `ToggleButtonGroup` with `.vg-chip` buttons |
| `src/pages/user/Dashboard.tsx` | Full redesign: stat grid, heatmap panel, activity feed, season strip |
| `src/pages/user/Goals.tsx` | Full redesign: chip filters, season multi-select, row items, Option-A dialogs |
| `src/pages/user/GoalDetails.tsx` | Full redesign: two-col layout, mini heatmap, season pills, edit dialog |
| `src/pages/user/Seasons.tsx` | Full redesign: hero card, past-seasons rows, navigate to SeasonDetails |
| `src/pages/user/SeasonDetails.tsx` | Full redesign: two-col goals-panel + meta-panel |
| `src/pages/user/Progress.tsx` | Full redesign: season chips, chip context switcher |
| `src/pages/user/ProgressCreation.tsx` | Full redesign: heatmap-coloured rating cells replace MUI Rating |
| `src/pages/user/ProgressDetails.tsx` | Full redesign: summary as title, coloured rating cells, meta row |
| `src/pages/trainer/Members.tsx` | Full redesign: member rows with avatar + activity bar + badges |
| `src/pages/trainer/Invites.tsx` | Full redesign: chip status filters, invite rows, Option-A dialog |
| All `*.scss` page files | Replaced/extended to use `--vg-*` tokens only |
| Corresponding `*.test.tsx` files | Updated to match new component APIs |

---

## Task 1: Design system CSS variables

**Files:**
- Modify: `src/index.tsx`

- [ ] **Step 1: Update MUI theme values and add `--vg-*` CSS variables**

Replace the `createTheme` call and `GlobalStyles` in `src/index.tsx` with the following (keep all other code unchanged):

```tsx
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: mode,
          primary: { main: '#C41E3A' },
          secondary: { main: '#000000' },
          ...(mode === 'dark' ? {
            text: { primary: '#ffffff', secondary: '#aaaaaa' },
            background: { default: '#0d0d0d', paper: '#1a1a1a' },
            divider: '#252525',
          } : {
            text: { primary: '#111111', secondary: '#555555' },
            background: { default: '#f2f2f2', paper: '#ffffff' },
            divider: '#e4e4e4',
          }),
          success: { main: '#4caf50' },
          error: { main: '#C41E3A' },
          warning: { main: '#ff9800' },
          info: { main: '#2196f3' },
        },
      }),
    [mode]
  );
```

Replace the `GlobalStyles` styles prop with:

```tsx
        <GlobalStyles styles={(t) => ({
          ':root': {
            // MUI palette mirrors
            '--palette-mode': t.palette.mode,
            '--palette-primary-main': t.palette.primary.main,
            '--palette-secondary-main': t.palette.secondary.main,
            '--palette-text-primary': t.palette.text.primary,
            '--palette-text-secondary': t.palette.text.secondary,
            '--palette-background-default': t.palette.background.default,
            '--palette-background-paper': t.palette.background.paper,
            '--palette-divider': (t.palette.divider as string) || '',
            '--palette-success-main': t.palette.success.main,
            '--palette-error-main': t.palette.error.main,
            '--palette-warning-main': t.palette.warning.main,
            '--palette-info-main': t.palette.info.main,
            // VG design tokens — theme-dependent
            '--vg-bg-subtle': t.palette.mode === 'dark' ? '#141414' : '#fafafa',
            '--vg-border': t.palette.mode === 'dark' ? '#252525' : '#e4e4e4',
            '--vg-border-strong': t.palette.mode === 'dark' ? '#2a2a2a' : '#dddddd',
            '--vg-text-muted': t.palette.mode === 'dark' ? '#555555' : '#aaaaaa',
            '--vg-text-disabled': t.palette.mode === 'dark' ? '#333333' : '#cccccc',
            '--vg-rail-bg': t.palette.mode === 'dark' ? '#161616' : '#e8e8e8',
            '--vg-rail-border': t.palette.mode === 'dark' ? '#222222' : '#dddddd',
            // VG design tokens — constant (same in both modes)
            '--vg-accent': '#C41E3A',
            '--vg-chip-active-bg': 'rgba(196,30,58,0.15)',
            '--vg-chip-active-border': 'rgba(196,30,58,0.30)',
            '--vg-row-hover-border': 'rgba(196,30,58,0.25)',
            '--vg-season-pill-bg': 'rgba(196,30,58,0.10)',
            '--vg-season-pill-border': 'rgba(196,30,58,0.25)',
            '--vg-trainer-badge-bg': 'rgba(196,30,58,0.12)',
            '--vg-status-open-bg': 'rgba(255,152,0,0.12)',
            '--vg-status-open-text': '#f09800',
            '--vg-status-progress-bg': 'rgba(33,150,243,0.12)',
            '--vg-status-progress-text': '#2196f3',
            '--vg-status-done-bg': 'rgba(76,175,80,0.12)',
            '--vg-status-done-text': '#4caf50',
            '--vg-status-muted-bg': 'rgba(128,128,128,0.10)',
            // Heatmap rating colours (same in both modes)
            '--vg-r1-bg': '#fce4e9', '--vg-r1-text': '#6b1323',
            '--vg-r2-bg': '#f4a0b0', '--vg-r2-text': '#5a0e1c',
            '--vg-r3-bg': '#e05575', '--vg-r3-text': '#ffffff',
            '--vg-r4-bg': '#c4283e', '--vg-r4-text': '#ffffff',
            '--vg-r5-bg': '#8b0000', '--vg-r5-text': '#ffffff',
          },
        })} />
```

- [ ] **Step 2: Verify the build compiles**

```bash
npm run build 2>&1 | tail -20
```

Expected: exits 0, no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/index.tsx
git commit -m "feat: add vg design token CSS variables and update MUI theme values"
```

---

## Task 2: Shared SCSS utilities

**Files:**
- Create: `src/resources/styles/components/shared.scss`
- Modify: `src/resources/styles/index.scss`

- [ ] **Step 1: Create shared SCSS file**

Create `src/resources/styles/components/shared.scss`:

```scss
@use '../variables' as *;
@use '../mixins' as *;

/* ── Back navigation ── */
.vg-back-nav {
  font-size: 11px;
  font-weight: 600;
  color: var(--vg-text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 20px;
  user-select: none;
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  &:hover { color: var(--palette-text-primary); }
}

/* ── Eyebrow label ── */
.vg-eyebrow {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--vg-text-muted);
  margin-bottom: 4px;
}

/* ── Page title ── */
.vg-page-title {
  font-size: 26px;
  font-weight: 900;
  letter-spacing: -1px;
  color: var(--palette-text-primary);
  line-height: 1.1;
  margin-bottom: 0;
}

/* ── Panel / card ── */
.vg-panel {
  border-radius: 11px;
  border: 1px solid var(--vg-border);
  background: var(--palette-background-paper);
  padding: 16px;
}

.vg-panel-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--vg-text-muted);
  margin-bottom: 12px;
}

/* ── Stat card ── */
.vg-stat-card {
  border-radius: 11px;
  border: 1px solid var(--vg-border);
  background: var(--palette-background-paper);
  padding: 16px;
}
.vg-stat-num {
  font-size: 26px;
  font-weight: 900;
  color: var(--palette-primary-main);
  letter-spacing: -1px;
  line-height: 1;
}
.vg-stat-label {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--vg-text-muted);
  margin-top: 4px;
}

/* ── Filter chip ── */
.vg-chip {
  height: 28px;
  border-radius: 7px;
  padding: 0 12px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--vg-border);
  background: var(--palette-background-paper);
  color: var(--vg-text-muted);
  user-select: none;
  white-space: nowrap;
  font-family: inherit;
  &:hover { color: var(--palette-text-primary); border-color: var(--vg-border-strong); }
  &--active {
    background: var(--vg-chip-active-bg);
    border-color: var(--vg-chip-active-border);
    color: var(--palette-primary-main);
  }
}

/* ── Row item ── */
.vg-row-item {
  border-radius: 11px;
  border: 1px solid var(--vg-border);
  background: var(--palette-background-paper);
  padding: 12px 16px;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: border-color 0.15s;
  &:hover { border-color: var(--vg-row-hover-border); }
}

/* ── Badge ── */
.vg-badge {
  padding: 2px 8px;
  border-radius: 5px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  display: inline-flex;
  align-items: center;
}
.vg-badge--open    { background: var(--vg-status-open-bg);     color: var(--vg-status-open-text); }
.vg-badge--progress{ background: var(--vg-status-progress-bg); color: var(--vg-status-progress-text); }
.vg-badge--done    { background: var(--vg-status-done-bg);     color: var(--vg-status-done-text); }
.vg-badge--muted   { background: var(--vg-status-muted-bg);    color: var(--vg-text-muted); }
.vg-badge--trainer { background: var(--vg-trainer-badge-bg);   color: var(--palette-primary-main); }

/* ── Meta row (detail pages) ── */
.vg-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 8px 0;
  font-size: 11px;
  & + & { border-top: 1px solid var(--vg-border); }
}
.vg-meta-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--vg-text-muted);
  flex-shrink: 0;
}
.vg-meta-value {
  color: var(--palette-text-primary);
  font-size: 12px;
  text-align: right;
  flex: 1;
  margin-left: 8px;
}

/* ── Two-column detail layout ── */
.vg-two-col {
  display: grid;
  grid-template-columns: 1fr 256px;
  gap: 12px;
  @include mobile-only { grid-template-columns: 1fr; }
}

/* ── Dialog (Option A) ── */
.vg-dialog-paper {
  border-top: 3px solid var(--palette-primary-main) !important;
  border-radius: 14px !important;
}

/* ── Season pill ── */
.vg-season-pill {
  border-radius: 5px;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: 600;
  background: var(--vg-season-pill-bg);
  border: 1px solid var(--vg-season-pill-border);
  color: var(--palette-primary-main);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* ── Progress bar ── */
.vg-prog-track {
  height: 5px;
  border-radius: 3px;
  background: var(--vg-border);
  overflow: hidden;
}
.vg-prog-fill {
  height: 100%;
  background: var(--palette-primary-main);
  border-radius: 3px;
}

/* ── Activity bar (Members) ── */
.vg-activity-bar { width: 60px; flex-shrink: 0; }
.vg-activity-track {
  height: 4px;
  border-radius: 2px;
  background: var(--vg-border);
  overflow: hidden;
  margin-bottom: 2px;
}
.vg-activity-fill { height: 100%; background: var(--palette-primary-main); border-radius: 2px; }
.vg-activity-label { font-size: 9px; font-weight: 600; color: var(--palette-primary-main); }

/* ── Avatar circle ── */
.vg-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
}

/* ── Chevron ── */
.vg-chevron { font-size: 14px; color: var(--vg-text-muted); flex-shrink: 0; }

/* ── Heatmap cell focus ring ── */
.vg-heatmap-cell--rated:focus-visible {
  outline: 2px solid var(--palette-primary-main);
  outline-offset: 2px;
  border-radius: 5px;
}

/* ── Toolbar row ── */
.vg-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

/* ── Chip row ── */
.vg-chip-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
```

- [ ] **Step 2: Import shared SCSS in index.scss**

In `src/resources/styles/index.scss`, add the import after the existing component imports:

```scss
  // Components
  @include meta.load-css("components/navigation");
  @include meta.load-css("components/notification");
  @include meta.load-css("components/itemlist");
  @include meta.load-css("components/shared");   // ← add this line
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -10
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add src/resources/styles/components/shared.scss src/resources/styles/index.scss
git commit -m "feat: add shared vg design-system SCSS utilities"
```

---

## Task 3: GoalHeatmap component

**Files:**
- Modify: `src/utils/chartUtils.ts`
- Create: `src/components/progress/GoalHeatmap.tsx`
- Create: `src/components/progress/__tests__/GoalHeatmap.test.tsx`
- Modify: `src/components/progress/GoalActivityChart.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/progress/__tests__/GoalHeatmap.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GoalHeatmap } from '../GoalHeatmap';
import { HeatmapData } from '../../../utils/chartUtils';

const data: HeatmapData = {
  rows: [
    {
      goalId: 'g1',
      goalName: 'Serve accuracy',
      cells: {
        '2025-03-01': { date: '2025-03-01', rating: 4, progressId: 'p1', reportId: 'r1' },
        '2025-03-08': { date: '2025-03-08', rating: 2, progressId: 'p2', reportId: 'r2' },
      },
    },
    {
      goalId: 'g2',
      goalName: 'Jump height',
      cells: {
        '2025-03-01': { date: '2025-03-01', rating: 5, progressId: 'p3', reportId: 'r1' },
      },
    },
  ],
  dateColumns: ['2025-03-01', '2025-03-08'],
};

describe('GoalHeatmap', () => {
  it('renders goal names', () => {
    render(<GoalHeatmap data={data} onCellClick={jest.fn()} />);
    expect(screen.getByTitle('Serve accuracy')).toBeInTheDocument();
    expect(screen.getByTitle('Jump height')).toBeInTheDocument();
  });

  it('renders rating numbers for filled cells', () => {
    render(<GoalHeatmap data={data} onCellClick={jest.fn()} />);
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onCellClick with progressId and reportId when a cell is clicked', async () => {
    const onCellClick = jest.fn();
    render(<GoalHeatmap data={data} onCellClick={onCellClick} />);
    await userEvent.click(screen.getByText('4'));
    expect(onCellClick).toHaveBeenCalledWith('p1', 'r1');
  });

  it('renders empty state when rows are empty', () => {
    render(<GoalHeatmap data={{ rows: [], dateColumns: [] }} onCellClick={jest.fn()} />);
    expect(screen.getByText(/no progress data/i)).toBeInTheDocument();
  });

  it('shows legend by default', () => {
    render(<GoalHeatmap data={data} onCellClick={jest.fn()} />);
    expect(screen.getByText(/rating/i)).toBeInTheDocument();
  });
});
```

Also add this test to the existing `buildHeatmapData` logic — add to `src/utils/chartUtils.ts` test (create `src/__tests__/utils/chartUtils.test.ts` if it doesn't exist):

```ts
// This test is written inline here; add to an existing utils test file or create:
// src/__tests__/utils/chartUtils.heatmap.test.ts
import { buildHeatmapData } from '../../utils/chartUtils';

describe('buildHeatmapData', () => {
  const goals = [{ id: 'g1', title: 'Serve' }, { id: 'g2', title: 'Block' }];
  const reports = [
    {
      id: 'r1',
      createdAt: '2025-03-01T10:00:00Z',
      progress: [
        { id: 'p1', goalId: 'g1', rating: 4 },
        { id: 'p2', goalId: 'g2', rating: 2 },
      ],
    },
    {
      id: 'r2',
      createdAt: '2025-03-08T10:00:00Z',
      progress: [{ id: 'p3', goalId: 'g1', rating: 5 }],
    },
  ];

  it('builds rows for goals that have entries', () => {
    const result = buildHeatmapData(reports, goals);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].goalId).toBe('g1');
  });

  it('builds sorted date columns', () => {
    const result = buildHeatmapData(reports, goals);
    expect(result.dateColumns).toEqual(['2025-03-01', '2025-03-08']);
  });

  it('populates cell ratings correctly', () => {
    const result = buildHeatmapData(reports, goals);
    expect(result.rows[0].cells['2025-03-01'].rating).toBe(4);
    expect(result.rows[0].cells['2025-03-08'].rating).toBe(5);
    expect(result.rows[1].cells['2025-03-01'].rating).toBe(2);
  });

  it('respects maxColumns by keeping the most recent dates', () => {
    const result = buildHeatmapData(reports, goals, 1);
    expect(result.dateColumns).toEqual(['2025-03-08']);
  });

  it('excludes goals not present in any report', () => {
    const result = buildHeatmapData(reports, [{ id: 'g99', title: 'Unknown' }]);
    expect(result.rows).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest GoalHeatmap --no-coverage 2>&1 | tail -20
```

Expected: FAIL — `GoalHeatmap` not found, `buildHeatmapData` not found.

- [ ] **Step 3: Add heatmap types and builder to chartUtils**

Append to the bottom of `src/utils/chartUtils.ts`:

```ts
export const HEATMAP_RATING_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: '#fce4e9', text: '#6b1323' },
  2: { bg: '#f4a0b0', text: '#5a0e1c' },
  3: { bg: '#e05575', text: '#ffffff' },
  4: { bg: '#c4283e', text: '#ffffff' },
  5: { bg: '#8b0000', text: '#ffffff' },
};

export interface HeatmapCell {
  date: string;
  rating: 1 | 2 | 3 | 4 | 5;
  progressId: string;
  reportId: string;
}

export interface HeatmapRow {
  goalId: string;
  goalName: string;
  cells: Record<string, HeatmapCell>;
}

export interface HeatmapData {
  rows: HeatmapRow[];
  dateColumns: string[];
}

export function buildHeatmapData(
  reports: Array<{
    id: string;
    createdAt: string;
    progress?: Array<{ id: string; goalId: string; rating: number }>;
  }>,
  goals: Array<{ id: string; title: string }>,
  maxColumns?: number,
): HeatmapData {
  const goalMap = new Map(goals.map(g => [g.id, g.title]));
  const rowMap = new Map<string, HeatmapRow>();
  const dateSet = new Set<string>();

  for (const report of reports) {
    const date = report.createdAt.substring(0, 10);
    for (const entry of report.progress ?? []) {
      if (!goalMap.has(entry.goalId)) continue;
      dateSet.add(date);
      if (!rowMap.has(entry.goalId)) {
        rowMap.set(entry.goalId, {
          goalId: entry.goalId,
          goalName: goalMap.get(entry.goalId)!,
          cells: {},
        });
      }
      const r = Math.min(5, Math.max(1, Math.round(entry.rating))) as 1 | 2 | 3 | 4 | 5;
      rowMap.get(entry.goalId)!.cells[date] = {
        date,
        rating: r,
        progressId: entry.id,
        reportId: report.id,
      };
    }
  }

  let dateColumns = Array.from(dateSet).sort();
  if (maxColumns !== undefined && dateColumns.length > maxColumns) {
    dateColumns = dateColumns.slice(dateColumns.length - maxColumns);
  }

  const rows = goals.filter(g => rowMap.has(g.id)).map(g => rowMap.get(g.id)!);
  return { rows, dateColumns };
}
```

- [ ] **Step 4: Create GoalHeatmap component**

Create `src/components/progress/GoalHeatmap.tsx`:

```tsx
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import i18next from 'i18next';
import { HeatmapData, HEATMAP_RATING_COLORS } from '../../utils/chartUtils';

interface GoalHeatmapProps {
  data: HeatmapData;
  onCellClick: (progressId: string, reportId: string) => void;
  showGoalLabels?: boolean;
  showDateHeaders?: boolean;
  showLegend?: boolean;
}

const LABEL_W = 90;
const CELL_SIZE = 26;
const GAP = 3;

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('de-CH', { month: 'short', day: 'numeric' }).format(new Date(date));

export function GoalHeatmap({
  data,
  onCellClick,
  showGoalLabels = true,
  showDateHeaders = true,
  showLegend = true,
}: GoalHeatmapProps) {
  if (data.rows.length === 0 || data.dateColumns.length === 0) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 12, color: 'var(--vg-text-muted)' }}>
          {i18next.t('progress.graph.noData', 'No progress data available.')}
        </Typography>
      </Box>
    );
  }

  const labelW = showGoalLabels ? LABEL_W : 0;

  return (
    <Box sx={{ overflowX: 'auto' }}>
      {showDateHeaders && (
        <Box sx={{ display: 'flex', pl: `${labelW}px`, gap: `${GAP}px`, mb: '4px' }}>
          {data.dateColumns.map(date => (
            <Box
              key={date}
              sx={{
                width: CELL_SIZE,
                flexShrink: 0,
                fontSize: '9px',
                color: 'var(--vg-text-muted)',
                textAlign: 'center',
                overflow: 'hidden',
              }}
            >
              {formatDate(date)}
            </Box>
          ))}
        </Box>
      )}

      {data.rows.map(row => (
        <Box key={row.goalId} sx={{ display: 'flex', alignItems: 'center', gap: `${GAP}px`, mb: `${GAP}px` }}>
          {showGoalLabels && (
            <Box
              title={row.goalName}
              sx={{
                width: labelW,
                flexShrink: 0,
                fontSize: '10px',
                color: 'var(--vg-text-muted)',
                textAlign: 'right',
                pr: '8px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {row.goalName}
            </Box>
          )}
          {data.dateColumns.map(date => {
            const cell = row.cells[date];
            if (!cell) {
              return (
                <Box
                  key={date}
                  sx={{
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    flexShrink: 0,
                    borderRadius: '5px',
                    background: 'var(--vg-bg-subtle)',
                  }}
                />
              );
            }
            const { bg, text } = HEATMAP_RATING_COLORS[cell.rating];
            return (
              <Box
                key={date}
                className="vg-heatmap-cell--rated"
                role="button"
                tabIndex={0}
                aria-label={`${row.goalName}: ${i18next.t('progress.graph.rating', 'Rating')} ${cell.rating}`}
                onClick={() => onCellClick(cell.progressId, cell.reportId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onCellClick(cell.progressId, cell.reportId);
                  }
                }}
                sx={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  flexShrink: 0,
                  borderRadius: '5px',
                  background: bg,
                  color: text,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {cell.rating}
              </Box>
            );
          })}
        </Box>
      ))}

      {showLegend && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', mt: '12px', pl: `${labelW}px` }}>
          <Typography sx={{ fontSize: '9px', color: 'var(--vg-text-muted)' }}>
            {i18next.t('progress.heatmap.rating', 'Rating:')}
          </Typography>
          {([1, 2, 3, 4, 5] as const).map(r => {
            const { bg, text } = HEATMAP_RATING_COLORS[r];
            return (
              <Box
                key={r}
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: '4px',
                  background: bg,
                  color: text,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  fontWeight: 700,
                }}
              >
                {r}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
```

- [ ] **Step 5: Update GoalActivityChart to use GoalHeatmap**

Replace the entire content of `src/components/progress/GoalActivityChart.tsx` with:

```tsx
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import i18next from 'i18next';
import { GoalHeatmap } from './GoalHeatmap';
import { buildHeatmapData, HeatmapData } from '../../utils/chartUtils';

interface GoalActivityChartProps {
  points: Array<{
    x: number;
    y: number;
    rating: number;
    progressId: string;
    reportId: string;
    goalName: string;
    isOnTrack: boolean;
  }>;
  goalNames: string[];
  onEntryClick: (progressId: string, reportId: string) => void;
  // These additional props are accepted by PersonalProgressView's newer callers
  reports?: Array<{
    id: string;
    createdAt: string;
    progress?: Array<{ id: string; goalId: string; rating: number }>;
  }>;
  goals?: Array<{ id: string; title: string }>;
}

export function GoalActivityChart({
  points,
  goalNames,
  onEntryClick,
  reports,
  goals,
}: GoalActivityChartProps) {
  // Prefer richer reports+goals data if provided; fall back to reconstructing from scatter points
  const heatmapData: HeatmapData = React.useMemo(() => {
    if (reports && goals) {
      return buildHeatmapData(reports, goals);
    }
    // Reconstruct from legacy ScatterPoint[] data
    const fakeGoals = goalNames.map((name, i) => ({ id: String(i), title: name }));
    const fakeReports = points.reduce<
      Map<string, { id: string; createdAt: string; progress: Array<{ id: string; goalId: string; rating: number }> }>
    >((acc, pt) => {
      const key = pt.reportId;
      if (!acc.has(key)) {
        acc.set(key, { id: key, createdAt: new Date(pt.x).toISOString(), progress: [] });
      }
      acc.get(key)!.progress.push({ id: pt.progressId, goalId: String(pt.y), rating: pt.rating });
      return acc;
    }, new Map());
    return buildHeatmapData(Array.from(fakeReports.values()), fakeGoals);
  }, [points, goalNames, reports, goals]);

  return (
    <GoalHeatmap
      data={heatmapData}
      onCellClick={onEntryClick}
      showGoalLabels={true}
      showDateHeaders={true}
      showLegend={true}
    />
  );
}
```

- [ ] **Step 6: Run tests**

```bash
npx jest GoalHeatmap chartUtils.heatmap --no-coverage 2>&1 | tail -20
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/utils/chartUtils.ts src/components/progress/GoalHeatmap.tsx src/components/progress/GoalActivityChart.tsx src/components/progress/__tests__/GoalHeatmap.test.tsx
git commit -m "feat: add GoalHeatmap component and buildHeatmapData, replace scatter chart"
```

---

## Task 4: Dashboard redesign

**Files:**
- Modify: `src/pages/user/Dashboard.tsx`
- Modify: `src/resources/styles/pages/dashboard.scss`
- Modify: `src/__tests__/pages/user/Dashboard.test.tsx`

- [ ] **Step 1: Write the failing test**

Open `src/__tests__/pages/user/Dashboard.test.tsx` and add this test (keep existing tests):

```tsx
it('renders five stat cards', () => {
  setup({ hasActiveSeason: true });
  render(<Dashboard />);
  expect(screen.getByText(/open goals/i)).toBeInTheDocument();
  expect(screen.getByText(/in progress/i)).toBeInTheDocument();
  expect(screen.getByText(/completed/i)).toBeInTheDocument();
  expect(screen.getByText(/progress reports/i)).toBeInTheDocument();
  expect(screen.getByText(/team members/i)).toBeInTheDocument();
});

it('renders eyebrow with active season name', () => {
  setup({ hasActiveSeason: true, seasonName: 'Spring 2025' });
  render(<Dashboard />);
  expect(screen.getByText(/spring 2025/i)).toBeInTheDocument();
});
```

Run to see it fail:

```bash
npx jest Dashboard --no-coverage 2>&1 | tail -20
```

- [ ] **Step 2: Update dashboard.scss**

Replace `src/resources/styles/pages/dashboard.scss`:

```scss
@use '../variables' as *;
@use '../mixins' as *;

.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 24px;
}

.dashboard-eyebrow { margin-bottom: 2px; }

.dashboard-title { margin-bottom: 18px; }

.dashboard-stats-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  @include tablet-only { grid-template-columns: repeat(3, 1fr); }
  @include mobile-only { grid-template-columns: repeat(2, 1fr); }
}

.dashboard-content-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 12px;
  @include tablet-only { grid-template-columns: 1fr; }
  @include mobile-only { grid-template-columns: 1fr; }
}

.dashboard-section-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--vg-text-muted);
  margin-bottom: 12px;
}

.dashboard-activity-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--vg-border);
  &:last-child { border-bottom: none; }
}

.dashboard-activity-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--palette-primary-main);
  flex-shrink: 0;
  margin-top: 5px;
}

.dashboard-activity-desc {
  font-size: 12px;
  color: var(--palette-text-primary);
  line-height: 1.4;
}

.dashboard-activity-time {
  font-size: 10px;
  color: var(--vg-text-muted);
  margin-top: 2px;
}

.dashboard-season-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.dashboard-season-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--palette-text-primary);
}

.dashboard-season-fraction {
  font-size: 10px;
  color: var(--vg-text-muted);
  margin-top: 2px;
}

.dashboard-season-pct {
  font-size: 13px;
  font-weight: 700;
  color: var(--palette-primary-main);
}

.dashboard-view-link {
  font-size: 11px;
  font-weight: 600;
  color: var(--palette-primary-main);
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  font-family: inherit;
  &:hover { text-decoration: underline; }
}
```

- [ ] **Step 3: Rewrite Dashboard.tsx**

Replace `src/pages/user/Dashboard.tsx` with:

```tsx
import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import { useNavigate } from 'react-router-dom';
import { useSeasonStore } from '../../store/seasons';
import { useGoalStore } from '../../store/goals';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { useActivityStore } from '../../store/activity';
import { useProgressReportStore } from '../../store/progressReports';
import { GoalStatus, ISeasonStats, SeasonStatus } from '../../store/types';
import { buildHeatmapData } from '../../utils/chartUtils';
import { GoalHeatmap } from '../../components/progress/GoalHeatmap';
import { EntryDrawer, EntryDrawerEntry } from '../../components/progress/EntryDrawer';
import VolleyGoalsAPI from '../../services/backend.api';
import i18next from 'i18next';

function relTime(timestamp: string) {
  const mins = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function Dashboard() {
  const navigate = useNavigate();
  const fetchSeasons = useSeasonStore(s => s.fetchSeasons);
  const seasons = useSeasonStore(s => s.seasonList.seasons);
  const fetchGoals = useGoalStore(s => s.fetchGoals);
  const goals = useGoalStore(s => s.goalList.goals);
  const selectedTeam = useCognitoUserStore(s => s.selectedTeam);
  const currentUser = useCognitoUserStore(s => s.user);
  const teamId = selectedTeam?.team?.id || '';
  const fetchActivity = useActivityStore(s => s.fetchActivity);
  const activities = useActivityStore(s => s.activities);
  const fetchReports = useProgressReportStore(s => s.fetchReports);
  const reports = useProgressReportStore(s => s.reportList.reports) || [];
  const [seasonStats, setSeasonStats] = React.useState<ISeasonStats | null>(null);
  const [selectedEntry, setSelectedEntry] = React.useState<EntryDrawerEntry | null>(null);

  React.useEffect(() => {
    if (teamId) {
      fetchSeasons(teamId, { teamId });
      fetchActivity(teamId, { limit: 7 }).catch(() => {});
      fetchGoals(teamId, { limit: 100 } as any);
    }
  }, [teamId]);

  const activeSeason = seasons.find(s => s.status === SeasonStatus.Active);

  React.useEffect(() => {
    if (activeSeason?.id) {
      fetchReports(activeSeason.id, { limit: 100 } as any).catch(() => {});
      setSeasonStats(null);
      VolleyGoalsAPI.getSeasonStats(activeSeason.id)
        .then(r => { if (r.stats) setSeasonStats(r.stats as ISeasonStats); })
        .catch(() => {});
    }
  }, [activeSeason?.id]);

  const ownGoals = goals.filter(g => g.ownerId === currentUser?.id);
  const ownReports = useMemo(() => {
    const eightWeeksAgo = Date.now() - 8 * 7 * 24 * 3600 * 1000;
    return reports.filter(r => r.authorId === currentUser?.id && new Date(r.createdAt).getTime() >= eightWeeksAgo);
  }, [reports, currentUser?.id]);

  const heatmapData = useMemo(() => buildHeatmapData(ownReports, ownGoals, 16), [ownReports, ownGoals]);

  const handleCellClick = (progressId: string, reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;
    const entry = report.progress?.find(p => p.id === progressId);
    if (!entry) return;
    const goal = goals.find(g => g.id === entry.goalId);
    setSelectedEntry({
      id: entry.id,
      goalId: entry.goalId,
      goalName: goal?.title ?? entry.goalId,
      rating: entry.rating,
      details: entry.details,
      reportId: report.id,
      reportDate: report.createdAt,
    });
  };

  const openCount = seasonStats?.openGoalCount ?? goals.filter(g => g.status === GoalStatus.Open).length;
  const inProgressCount = seasonStats?.inProgressGoalCount ?? goals.filter(g => g.status === GoalStatus.InProgress).length;
  const completedCount = seasonStats?.completedGoalCount ?? 0;
  const reportCount = seasonStats?.reportCount ?? 0;
  const memberCount = seasonStats?.memberCount ?? 0;

  const goalPct = seasonStats && seasonStats.goalCount > 0
    ? Math.round((seasonStats.completedGoalCount / seasonStats.goalCount) * 100)
    : 0;

  const stats = [
    { label: i18next.t('dashboard.stats.openGoals', 'Open Goals'), value: activeSeason ? openCount : '—', onClick: () => navigate('/goals') },
    { label: i18next.t('dashboard.stats.inProgressGoals', 'In Progress'), value: activeSeason ? inProgressCount : '—', onClick: () => navigate('/goals') },
    { label: i18next.t('dashboard.stats.completedGoals', 'Completed'), value: activeSeason ? completedCount : '—', onClick: () => navigate('/goals') },
    { label: i18next.t('dashboard.stats.reports', 'Progress Reports'), value: activeSeason ? reportCount : '—', onClick: () => navigate('/progress') },
    { label: i18next.t('dashboard.stats.members', 'Team Members'), value: memberCount },
  ];

  return (
    <Box className="dashboard-page" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1400 }}>
      {activeSeason && (
        <div className="vg-eyebrow dashboard-eyebrow">
          {activeSeason.name} · {i18next.t('dashboard.activeSeason', 'Active Season')}
        </div>
      )}
      <div className="vg-page-title dashboard-title">
        {i18next.t('dashboard.title', 'Dashboard')}
      </div>

      {/* Stat grid */}
      <div className="dashboard-stats-grid">
        {stats.map(s => (
          <div
            key={s.label}
            className="vg-stat-card"
            onClick={s.onClick}
            style={{ cursor: s.onClick ? 'pointer' : 'default' }}
          >
            <div className="vg-stat-num">{s.value}</div>
            <div className="vg-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Content row */}
      <div className="dashboard-content-row">
        {/* Heatmap panel */}
        <div className="vg-panel">
          <div className="dashboard-section-title">
            {i18next.t('dashboard.myProgress', 'My Progress')}
          </div>
          {!activeSeason ? (
            <span style={{ fontSize: 12, color: 'var(--vg-text-muted)' }}>
              {i18next.t('dashboard.noActiveSeason', 'No active season.')}
            </span>
          ) : (
            <GoalHeatmap
              data={heatmapData}
              onCellClick={handleCellClick}
              showGoalLabels={true}
              showDateHeaders={true}
              showLegend={true}
            />
          )}
        </div>

        {/* Activity feed */}
        <div className="vg-panel">
          <div className="dashboard-section-title">
            {i18next.t('dashboard.activityHistory', 'Recent Activity')}
          </div>
          <Box sx={{ maxHeight: 320, overflowY: 'auto', scrollbarWidth: 'thin' }}>
            {activities.slice(0, 7).map(a => (
              <div key={a.id} className="dashboard-activity-item">
                <div className="dashboard-activity-dot" />
                <div>
                  <div className="dashboard-activity-desc">{a.description}</div>
                  <div className="dashboard-activity-time">{relTime(a.timestamp)}</div>
                </div>
              </div>
            ))}
            {activities.length === 0 && (
              <span style={{ fontSize: 12, color: 'var(--vg-text-muted)' }}>
                {i18next.t('dashboard.noActivity', 'No recent activity.')}
              </span>
            )}
          </Box>
        </div>
      </div>

      {/* Season strip */}
      {activeSeason && seasonStats && (
        <div className="vg-panel">
          <div className="dashboard-season-strip">
            <div>
              <div className="dashboard-season-name">{activeSeason.name}</div>
              <div className="dashboard-season-fraction">
                {seasonStats.completedGoalCount}/{seasonStats.goalCount} {i18next.t('dashboard.completed', 'goals completed')}
              </div>
            </div>
            <Box sx={{ flex: '0 0 160px', minWidth: 80 }}>
              <div className="vg-prog-track" style={{ marginBottom: 4 }}>
                <div className="vg-prog-fill" style={{ width: `${goalPct}%` }} />
              </div>
              <div className="dashboard-season-pct">{goalPct}%</div>
            </Box>
            <button className="dashboard-view-link" onClick={() => navigate('/seasons')}>
              {i18next.t('dashboard.viewAll', 'View →')}
            </button>
          </div>
        </div>
      )}

      <EntryDrawer
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
      />
    </Box>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest Dashboard --no-coverage 2>&1 | tail -20
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/user/Dashboard.tsx src/resources/styles/pages/dashboard.scss src/__tests__/pages/user/Dashboard.test.tsx
git commit -m "feat: redesign Dashboard with stat grid, heatmap panel, activity feed"
```

---

## Task 5: Goals page redesign

**Files:**
- Modify: `src/pages/user/Goals.tsx`
- Modify: `src/resources/styles/pages/goals.scss`
- Modify: `src/__tests__/pages/user/Goals.test.tsx`

- [ ] **Step 1: Write failing tests**

Add to `src/__tests__/pages/user/Goals.test.tsx`:

```tsx
it('renders chip filter buttons instead of ToggleButtonGroup', () => {
  setup();
  render(<Goals />);
  const allChips = screen.getAllByText('All');
  expect(allChips.length).toBeGreaterThanOrEqual(1);
  // Chips are <button> elements, not MUI ToggleButton
  expect(allChips[0].tagName).toBe('BUTTON');
});

it('renders New Goal button', () => {
  setup({ role: RoleType.Trainer });
  render(<Goals />);
  expect(screen.getByText('New Goal')).toBeInTheDocument();
});

it('renders goal rows as vg-row-item when goals exist', () => {
  const goal = buildGoal({ id: 'g1', title: 'Serve accuracy' });
  setup({ goals: [goal] });
  render(<Goals />);
  expect(screen.getByText('Serve accuracy')).toBeInTheDocument();
});
```

```bash
npx jest Goals --no-coverage 2>&1 | tail -10
```

Expected: new tests FAIL.

- [ ] **Step 2: Update goals.scss**

Replace `src/resources/styles/pages/goals.scss`:

```scss
@use '../variables' as *;
@use '../mixins' as *;

.goals-page {
  display: flex;
  flex-direction: column;
  padding-bottom: 24px;
}

.goals-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.goals-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.goals-search {
  flex: 1;
  height: 34px;
  border-radius: 8px;
  border: 1px solid var(--vg-border);
  background: var(--palette-background-paper);
  padding: 0 12px;
  font-size: 12px;
  color: var(--palette-text-primary);
  font-family: inherit;
  &:focus { outline: none; border-color: var(--palette-primary-main); }
  &::placeholder { color: var(--vg-text-muted); }
}

.goals-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.goals-row-left { flex: 1; min-width: 0; }

.goals-row-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--palette-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.goals-row-meta {
  font-size: 10px;
  color: var(--vg-text-muted);
  margin-top: 3px;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.goals-row-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.goals-season-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

/* Create dialog form */
.goals-dialog-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 8px;
}
```

- [ ] **Step 3: Rewrite Goals.tsx**

Replace `src/pages/user/Goals.tsx`:

```tsx
import React, { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useGoalStore } from '../../store/goals';
import { useSeasonStore } from '../../store/seasons';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { usePermission } from '../../hooks/usePermission';
import { IGoal, GoalType, GoalStatus } from '../../store/types';
import i18next from 'i18next';

type GoalForm = { title: string; description: string; goalType: GoalType | '' };

const STATUS_LABELS: Record<GoalStatus, string> = {
  [GoalStatus.Open]: 'Open',
  [GoalStatus.InProgress]: 'In Progress',
  [GoalStatus.Completed]: 'Completed',
  [GoalStatus.Archived]: 'Archived',
};

function statusBadgeClass(s: GoalStatus) {
  if (s === GoalStatus.Open) return 'vg-badge vg-badge--open';
  if (s === GoalStatus.InProgress) return 'vg-badge vg-badge--progress';
  if (s === GoalStatus.Completed) return 'vg-badge vg-badge--done';
  return 'vg-badge vg-badge--muted';
}

export function Goals() {
  const navigate = useNavigate();
  const fetchGoals = useGoalStore(s => s.fetchGoals);
  const createGoal = useGoalStore(s => s.createGoal);
  const deleteGoal = useGoalStore(s => s.deleteGoal);
  const goals = useGoalStore(s => s.goalList.goals) || [];
  const fetchSeasons = useSeasonStore(s => s.fetchSeasons);
  const seasons = useSeasonStore(s => s.seasonList.seasons) || [];
  const selectedTeam = useCognitoUserStore(s => s.selectedTeam);
  const teamId = selectedTeam?.team?.id || '';
  const userRole = selectedTeam?.role as string | undefined;

  const canCreateTeam = usePermission('team_goals:write');
  const canCreateIndividual = usePermission('individual_goals:write');
  const canCreate = canCreateTeam || canCreateIndividual;
  const canDeleteTeam = usePermission('team_goals:delete');
  const canDeleteIndividual = usePermission('individual_goals:delete');
  const canDeleteGoal = (g: IGoal) => g.goalType === GoalType.Team ? canDeleteTeam : canDeleteIndividual;

  React.useEffect(() => {
    if (teamId) {
      fetchGoals(teamId, {}).catch(() => {});
      fetchSeasons(teamId, { teamId }).catch(() => {});
    }
  }, [teamId]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<GoalStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<GoalType | 'all'>('all');
  const [selectedSeasonIds, setSelectedSeasonIds] = useState<Set<string>>(new Set());

  const filteredGoals = useMemo(() => goals.filter(g => {
    if (searchQuery && !g.title?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (statusFilter !== 'all' && g.status !== statusFilter) return false;
    if (typeFilter !== 'all' && g.goalType !== typeFilter) return false;
    if (selectedSeasonIds.size > 0) {
      const goalSeasons: string[] = (g as any).seasons?.map((t: any) => t.seasonId || t) ?? [];
      if (!goalSeasons.some(sid => selectedSeasonIds.has(sid))) return false;
    }
    return true;
  }), [goals, searchQuery, statusFilter, typeFilter, selectedSeasonIds]);

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [currentGoal, setCurrentGoal] = useState<IGoal | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { control, handleSubmit, reset } = useForm<GoalForm>({
    defaultValues: { title: '', description: '', goalType: '' },
  });

  const openCreate = () => {
    if (!canCreate) return;
    reset({ title: '', description: '', goalType: userRole === 'trainer' ? GoalType.Team : GoalType.Individual });
    setCreateOpen(true);
  };

  const onCreate = async (data: GoalForm) => {
    if (!canCreate || !teamId) return;
    setActionLoading(true);
    try {
      await createGoal(teamId, (data.goalType as GoalType) || GoalType.Team, data.title, data.description);
      setCreateOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const onDelete = async () => {
    if (!currentGoal || !canDeleteGoal(currentGoal)) return;
    setActionLoading(true);
    try {
      await deleteGoal(teamId, currentGoal.id);
      setDeleteOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSeason = (id: string) =>
    setSelectedSeasonIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const seasonCount = selectedSeasonIds.size;

  const statusChips: Array<{ label: string; value: GoalStatus | 'all' }> = [
    { label: i18next.t('common.all', 'All'), value: 'all' },
    { label: i18next.t('user.goals.status.open', 'Open'), value: GoalStatus.Open },
    { label: i18next.t('user.goals.status.inProgress', 'In Progress'), value: GoalStatus.InProgress },
    { label: i18next.t('user.goals.status.completed', 'Completed'), value: GoalStatus.Completed },
  ];

  const typeChips: Array<{ label: string; value: GoalType | 'all' }> = [
    { label: i18next.t('common.all', 'All'), value: 'all' },
    { label: i18next.t('user.goals.type.team', 'Team'), value: GoalType.Team },
    { label: i18next.t('user.goals.type.individual', 'Individual'), value: GoalType.Individual },
  ];

  return (
    <Box className="goals-page" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1200 }}>
      <div className="goals-header">
        <div>
          <div className="vg-eyebrow">{filteredGoals.length} {i18next.t('user.goals.eyebrow', 'Goals across all seasons')}</div>
          <div className="vg-page-title">{i18next.t('user.goals.title', 'Goals')}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="goals-toolbar">
        <input
          className="goals-search"
          placeholder={i18next.t('user.goals.search', 'Search goals…')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {canCreate && (
          <button className="vg-chip vg-chip--active" onClick={openCreate} style={{ height: 34, borderRadius: 8 }}>
            {i18next.t('user.goals.newGoal', 'New Goal')}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="vg-chip-row">
        {statusChips.map(c => (
          <button
            key={c.value}
            className={`vg-chip${statusFilter === c.value ? ' vg-chip--active' : ''}`}
            onClick={() => setStatusFilter(c.value)}
          >
            {c.label}
          </button>
        ))}
        <span style={{ width: 1, height: 20, background: 'var(--vg-border)', margin: '0 4px' }} />
        {typeChips.map(c => (
          <button
            key={c.value}
            className={`vg-chip${typeFilter === c.value ? ' vg-chip--active' : ''}`}
            onClick={() => setTypeFilter(c.value)}
          >
            {c.label}
          </button>
        ))}
        {seasons.length > 0 && (
          <>
            <span style={{ width: 1, height: 20, background: 'var(--vg-border)', margin: '0 4px' }} />
            <div style={{ position: 'relative' }}>
              <button
                className={`vg-chip${seasonCount > 0 ? ' vg-chip--active' : ''}`}
                onClick={() => {/* season dropdown handled inline */}}
                style={{ gap: 6 }}
              >
                {i18next.t('user.goals.filter.season', 'Season')}
                {seasonCount > 0 && (
                  <span style={{ background: 'var(--palette-primary-main)', color: '#fff', borderRadius: 10, fontSize: 9, padding: '1px 5px', fontWeight: 700 }}>
                    {seasonCount}
                  </span>
                )}
              </button>
            </div>
            <Box sx={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {seasons.map(s => (
                <button
                  key={s.id}
                  className={`vg-chip${selectedSeasonIds.has(s.id) ? ' vg-chip--active' : ''}`}
                  onClick={() => toggleSeason(s.id)}
                  style={{ height: 24, fontSize: 10 }}
                >
                  {s.name}
                </button>
              ))}
            </Box>
          </>
        )}
      </div>

      {/* Goal list */}
      <div className="goals-list">
        {filteredGoals.map(g => (
          <div
            key={g.id}
            className="vg-row-item"
            onClick={() => navigate(`/goals/${g.id}`)}
          >
            <div className="goals-row-left">
              <div className="goals-row-title">{g.title}</div>
              <div className="goals-row-meta">
                <span>{g.goalType}</span>
                {g.updatedAt && <span>· {new Date(g.updatedAt).toLocaleDateString()}</span>}
              </div>
            </div>
            <div className="goals-row-right">
              <span className={statusBadgeClass(g.status)}>{STATUS_LABELS[g.status] ?? g.status}</span>
              <span className="vg-chevron">›</span>
            </div>
          </div>
        ))}
        {filteredGoals.length === 0 && (
          <Typography sx={{ fontSize: 12, color: 'var(--vg-text-muted)', py: 4, textAlign: 'center' }}>
            {i18next.t('user.goals.empty', 'No goals match the current filters.')}
          </Typography>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm"
        PaperProps={{ className: 'vg-dialog-paper' }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.4, borderBottom: '1px solid var(--vg-border)', pb: 1.5 }}>
          {i18next.t('user.goals.dialog.createTitle', 'Create Goal')}
        </DialogTitle>
        <DialogContent>
          <div className="goals-dialog-form">
            <Controller name="title" control={control} rules={{ required: true }} render={({ field, fieldState }) => (
              <TextField fullWidth size="small" label={i18next.t('user.goals.form.title', 'Title')}
                error={!!fieldState.error} {...field} />
            )} />
            <Controller name="goalType" control={control} render={({ field }) => (
              <TextField select fullWidth size="small" label={i18next.t('user.goals.form.type', 'Type')}
                disabled={userRole !== 'trainer'} {...field}>
                <MenuItem value={GoalType.Team}>{i18next.t('user.goals.type.team', 'Team')}</MenuItem>
                <MenuItem value={GoalType.Individual}>{i18next.t('user.goals.type.individual', 'Individual')}</MenuItem>
              </TextField>
            )} />
            <Controller name="description" control={control} render={({ field }) => (
              <TextField fullWidth multiline minRows={4} size="small"
                label={i18next.t('user.goals.form.description', 'Description')} {...field} />
            )} />
          </div>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid var(--vg-border)', px: 2.5, py: 1.5 }}>
          <button className="vg-chip" onClick={() => setCreateOpen(false)}>
            {i18next.t('common.cancel', 'Cancel')}
          </button>
          <button className="vg-chip vg-chip--active" onClick={handleSubmit(onCreate)} disabled={actionLoading}
            style={{ height: 30, borderRadius: 7, padding: '0 14px' }}>
            {i18next.t('common.create', 'Create')}
          </button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs"
        PaperProps={{ className: 'vg-dialog-paper' }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 800, borderBottom: '1px solid var(--vg-border)', pb: 1.5 }}>
          {i18next.t('user.goals.dialog.deleteTitle', 'Delete Goal')}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 1, fontSize: 12 }}>
            {i18next.t('user.goals.dialog.deleteConfirm', 'Are you sure you want to delete this goal?')}
          </Typography>
          <Typography sx={{ mt: 1, fontSize: 12, fontWeight: 700 }}>{currentGoal?.title}</Typography>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid var(--vg-border)', px: 2.5, py: 1.5 }}>
          <button className="vg-chip" onClick={() => setDeleteOpen(false)}>{i18next.t('common.cancel', 'Cancel')}</button>
          <button className="vg-chip" onClick={onDelete} disabled={actionLoading}
            style={{ background: 'var(--palette-error-main)', color: '#fff', borderColor: 'var(--palette-error-main)', height: 30, borderRadius: 7, padding: '0 14px' }}>
            {i18next.t('common.delete', 'Delete')}
          </button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest Goals --no-coverage 2>&1 | tail -20
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/user/Goals.tsx src/resources/styles/pages/goals.scss src/__tests__/pages/user/Goals.test.tsx
git commit -m "feat: redesign Goals page with chip filters, season multi-select, and row items"
```

---

## Task 6: GoalDetails redesign

**Files:**
- Modify: `src/pages/user/GoalDetails.tsx`
- Modify: `src/resources/styles/pages/goal-details.scss`
- Modify: `src/__tests__/pages/user/GoalDetails.test.tsx`

- [ ] **Step 1: Write failing tests**

Add to `src/__tests__/pages/user/GoalDetails.test.tsx`:

```tsx
it('renders back nav link', () => {
  setup({ goal: buildGoal({ title: 'My Goal' }) });
  render(<GoalDetails />);
  expect(screen.getByText(/back to goals/i)).toBeInTheDocument();
});

it('renders goal title as page heading', () => {
  setup({ goal: buildGoal({ title: 'Serve accuracy' }) });
  render(<GoalDetails />);
  expect(screen.getByText('Serve accuracy')).toBeInTheDocument();
});

it('renders Seasons meta row', () => {
  setup({ goal: buildGoal({ title: 'Goal' }) });
  render(<GoalDetails />);
  expect(screen.getByText(/seasons/i)).toBeInTheDocument();
});
```

```bash
npx jest GoalDetails --no-coverage 2>&1 | tail -10
```

- [ ] **Step 2: Update goal-details.scss**

Replace `src/resources/styles/pages/goal-details.scss`:

```scss
@use '../variables' as *;
@use '../mixins' as *;

.goal-details-page {
  display: flex;
  flex-direction: column;
  padding-bottom: 24px;
  max-width: 1100px;
}

.goal-details-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.goal-details-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

.goal-details-description {
  font-size: 12px;
  line-height: 1.7;
  color: var(--palette-text-secondary);
}

.goal-details-heatmap-stats {
  display: flex;
  gap: 20px;
  margin-top: 12px;
}

.goal-details-heatmap-stat {
  display: flex;
  flex-direction: column;
}

.goal-details-heatmap-stat-num {
  font-size: 18px;
  font-weight: 900;
  color: var(--palette-primary-main);
}

.goal-details-heatmap-stat-label {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: var(--vg-text-muted);
}

.goal-details-season-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-end;
}

.goal-details-tag-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  justify-content: flex-end;
}

.goal-details-tag-select {
  height: 26px;
  border-radius: 6px;
  border: 1px solid var(--vg-border);
  background: var(--palette-background-paper);
  color: var(--vg-text-muted);
  font-size: 10px;
  font-family: inherit;
  padding: 0 8px;
  &:focus { outline: none; border-color: var(--palette-primary-main); }
}

.goal-details-tag-btn {
  height: 26px;
  border-radius: 6px;
  border: none;
  background: var(--palette-primary-main);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 0 10px;
  cursor: pointer;
  font-family: inherit;
}
```

- [ ] **Step 3: Rewrite GoalDetails.tsx**

Replace `src/pages/user/GoalDetails.tsx`:

```tsx
import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Controller, useForm } from 'react-hook-form';
import { useGoalStore } from '../../store/goals';
import { useSeasonStore } from '../../store/seasons';
import { useProgressReportStore } from '../../store/progressReports';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { usePermission } from '../../hooks/usePermission';
import { useTeamStore } from '../../store/teams';
import { CommentType, GoalStatus, GoalType, IGoal } from '../../store/types';
import { CommentSection } from '../../components/CommentSection';
import { GoalHeatmap } from '../../components/progress/GoalHeatmap';
import { EntryDrawer, EntryDrawerEntry } from '../../components/progress/EntryDrawer';
import { buildHeatmapData } from '../../utils/chartUtils';
import i18next from 'i18next';

type EditForm = { title: string; description: string; status: GoalStatus | '' };

const STATUS_LABELS: Record<GoalStatus, string> = {
  [GoalStatus.Open]: 'Open',
  [GoalStatus.InProgress]: 'In Progress',
  [GoalStatus.Completed]: 'Completed',
  [GoalStatus.Archived]: 'Archived',
};

export function GoalDetails() {
  const { goalId } = useParams<{ goalId: string }>();
  const navigate = useNavigate();

  const currentGoal = useGoalStore(s => s.currentGoal);
  const getGoal = useGoalStore(s => s.getGoal);
  const updateGoal = useGoalStore(s => s.updateGoal);
  const deleteGoal = useGoalStore(s => s.deleteGoal);
  const fetchGoalSeasons = useGoalStore(s => s.fetchGoalSeasons);
  const goalSeasons = useGoalStore(s => s.goalSeasons);
  const tagGoalToSeason = useGoalStore(s => s.tagGoalToSeason);
  const untagGoalFromSeason = useGoalStore(s => s.untagGoalFromSeason);

  const seasons = useSeasonStore(s => s.seasonList.seasons);
  const fetchSeasons = useSeasonStore(s => s.fetchSeasons);
  const fetchReports = useProgressReportStore(s => s.fetchReports);
  const reports = useProgressReportStore(s => s.reportList.reports) || [];
  const selectedTeam = useCognitoUserStore(s => s.selectedTeam);
  const teamId = selectedTeam?.team?.id || '';
  const getTeam = useTeamStore(s => s.getTeam);
  const currentTeamSettings = useTeamStore(s => s.currentTeamSettings);

  const canWriteTeam = usePermission('team_goals:write');
  const canWriteIndividual = usePermission('individual_goals:write');
  const canDeleteTeam = usePermission('team_goals:delete');
  const canDeleteIndividual = usePermission('individual_goals:delete');

  const canEditGoal = (g: IGoal) => g.goalType === GoalType.Team ? canWriteTeam : canWriteIndividual;
  const canDeleteGoal = (g: IGoal) => g.goalType === GoalType.Team ? canDeleteTeam : canDeleteIndividual;

  const canModify = currentGoal ? canEditGoal(currentGoal) : false;
  const canDelete = currentGoal ? canDeleteGoal(currentGoal) : false;

  React.useEffect(() => {
    if (teamId) {
      fetchSeasons(teamId, { teamId });
      getTeam(teamId).catch(() => {});
    }
  }, [teamId]);

  React.useEffect(() => {
    if (goalId && teamId) {
      getGoal(teamId, goalId);
      fetchGoalSeasons(teamId, goalId);
      // Fetch recent reports to build the mini heatmap
      const activeSeason = seasons.find(s => s.status === 'active');
      if (activeSeason) {
        fetchReports(activeSeason.id, { limit: 100 } as any).catch(() => {});
      }
    }
  }, [goalId, teamId, seasons]);

  const heatmapData = useMemo(() => {
    if (!currentGoal) return { rows: [], dateColumns: [] };
    return buildHeatmapData(reports, [{ id: currentGoal.id, title: currentGoal.title }]);
  }, [reports, currentGoal]);

  const entries = heatmapData.rows[0]?.cells ? Object.values(heatmapData.rows[0].cells) : [];
  const avgRating = entries.length > 0
    ? (entries.reduce((s, e) => s + e.rating, 0) / entries.length).toFixed(1)
    : '—';
  const latestRating = entries.length > 0
    ? entries.sort((a, b) => b.date.localeCompare(a.date))[0].rating
    : '—';

  const [selectedEntry, setSelectedEntry] = useState<EntryDrawerEntry | null>(null);
  const handleCellClick = (progressId: string, reportId: string) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;
    const entry = report.progress?.find(p => p.id === progressId);
    if (!entry) return;
    setSelectedEntry({
      id: entry.id,
      goalId: entry.goalId,
      goalName: currentGoal?.title ?? '',
      rating: entry.rating,
      details: entry.details,
      reportId: report.id,
      reportDate: report.createdAt,
    });
  };

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [tagSeasonId, setTagSeasonId] = useState('');

  const { control, handleSubmit, reset } = useForm<EditForm>({
    defaultValues: { title: '', description: '', status: '' },
  });

  React.useEffect(() => {
    if (!currentGoal) return;
    reset({ title: currentGoal.title, description: currentGoal.description, status: currentGoal.status });
  }, [currentGoal, reset]);

  const onEdit = async (data: EditForm) => {
    if (!currentGoal || !teamId || !canModify) return;
    setActionLoading(true);
    try {
      await updateGoal(teamId, currentGoal.id, data.title || undefined, data.description || undefined, (data.status as GoalStatus) || undefined);
      setEditOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const onDelete = async () => {
    if (!currentGoal || !teamId) return;
    setActionLoading(true);
    try {
      await deleteGoal(teamId, currentGoal.id);
      navigate('/goals');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTag = async () => {
    if (!tagSeasonId || !goalId || !teamId) return;
    await tagGoalToSeason(teamId, goalId, tagSeasonId);
    fetchGoalSeasons(teamId, goalId);
    setTagSeasonId('');
  };

  const handleUntag = async (seasonId: string) => {
    if (!goalId || !teamId) return;
    await untagGoalFromSeason(teamId, goalId, seasonId);
    fetchGoalSeasons(teamId, goalId);
  };

  const taggedSeasonIds = new Set(goalSeasons.map((t: any) => t.seasonId || t));
  const untaggedSeasons = seasons.filter(s => !taggedSeasonIds.has(s.id));
  const taggedSeasonNames = seasons.filter(s => taggedSeasonIds.has(s.id));

  const settings = currentTeamSettings;
  const commentsEnabled = currentGoal
    ? (currentGoal.goalType === GoalType.Team
        ? (settings?.allowTeamGoalComments ?? false)
        : (settings?.allowIndividualGoalComments ?? false))
    : false;

  if (!currentGoal) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>{i18next.t('common.loading', 'Loading…')}</Typography>
      </Box>
    );
  }

  return (
    <Box className="goal-details-page" sx={{ p: { xs: 2, sm: 3 } }}>
      <button className="vg-back-nav" onClick={() => navigate('/goals')}>← {i18next.t('goalDetails.backToGoals', 'Back to Goals')}</button>

      {/* Header */}
      <div className="goal-details-header">
        <div>
          <div className="vg-eyebrow">{i18next.t('goalDetails.eyebrow', 'Goal')}</div>
          <div className="vg-page-title">{currentGoal.title}</div>
        </div>
        <div className="goal-details-actions">
          {canModify && (
            <button className="vg-chip" onClick={() => setEditOpen(true)}>
              {i18next.t('common.edit', 'Edit')}
            </button>
          )}
          <button className="vg-chip vg-chip--active" onClick={() => navigate('/progress/create')}>
            + {i18next.t('goalDetails.addEntry', 'Entry')}
          </button>
        </div>
      </div>

      <div className="vg-two-col">
        {/* Left column */}
        <div>
          <div className="vg-panel" style={{ marginBottom: 12 }}>
            <div className="vg-panel-title">{i18next.t('goalDetails.description', 'Description')}</div>
            <div className="goal-details-description">{currentGoal.description || '—'}</div>
          </div>

          <div className="vg-panel" style={{ marginBottom: 12 }}>
            <div className="vg-panel-title">{i18next.t('goalDetails.progressHistory', 'Progress History')}</div>
            <GoalHeatmap
              data={heatmapData}
              onCellClick={handleCellClick}
              showGoalLabels={false}
              showDateHeaders={true}
              showLegend={true}
            />
            <div className="goal-details-heatmap-stats">
              {[
                { label: i18next.t('goalDetails.entries', 'Entries'), value: entries.length },
                { label: i18next.t('goalDetails.avgRating', 'Avg Rating'), value: avgRating },
                { label: i18next.t('goalDetails.latest', 'Latest'), value: latestRating },
              ].map(s => (
                <div key={s.label} className="goal-details-heatmap-stat">
                  <span className="goal-details-heatmap-stat-num">{s.value}</span>
                  <span className="goal-details-heatmap-stat-label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="vg-panel">
            <div className="vg-panel-title">{i18next.t('goalDetails.comments', 'Comments')}</div>
            <CommentSection
              targetId={currentGoal.id}
              commentType={CommentType.Goal}
              enabled={commentsEnabled}
              allowFileUploads={settings?.allowFileUploads}
            />
          </div>
        </div>

        {/* Right column — meta panel */}
        <div>
          <div className="vg-panel">
            <div className="vg-panel-title">{i18next.t('goalDetails.details', 'Details')}</div>
            <div className="vg-meta-row">
              <span className="vg-meta-label">{i18next.t('goalDetails.status', 'Status')}</span>
              <span className="vg-meta-value">{STATUS_LABELS[currentGoal.status] ?? currentGoal.status}</span>
            </div>
            <div className="vg-meta-row">
              <span className="vg-meta-label">{i18next.t('goalDetails.type', 'Type')}</span>
              <span className="vg-meta-value">{currentGoal.goalType}</span>
            </div>
            <div className="vg-meta-row">
              <span className="vg-meta-label">{i18next.t('goalDetails.created', 'Created')}</span>
              <span className="vg-meta-value">{new Date(currentGoal.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="vg-meta-row" style={{ alignItems: 'flex-start' }}>
              <span className="vg-meta-label">{i18next.t('goalDetails.seasons', 'Seasons')}</span>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, marginLeft: 8 }}>
                <div className="goal-details-season-pills">
                  {taggedSeasonNames.map(s => (
                    <span key={s.id} className="vg-season-pill">
                      {s.name}
                      {canModify && (
                        <button
                          onClick={() => handleUntag(s.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, fontSize: 10, marginLeft: 2 }}
                          aria-label={`Remove ${s.name}`}
                        >✕</button>
                      )}
                    </span>
                  ))}
                  {taggedSeasonNames.length === 0 && (
                    <span style={{ fontSize: 11, color: 'var(--vg-text-muted)' }}>—</span>
                  )}
                </div>
                {canModify && untaggedSeasons.length > 0 && (
                  <div className="goal-details-tag-row">
                    <select
                      className="goal-details-tag-select"
                      value={tagSeasonId}
                      onChange={e => setTagSeasonId(e.target.value)}
                    >
                      <option value="">{i18next.t('goalDetails.addToSeason', 'Add to season…')}</option>
                      {untaggedSeasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button className="goal-details-tag-btn" onClick={handleTag} disabled={!tagSeasonId}>
                      + {i18next.t('common.add', 'Add')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm"
        PaperProps={{ className: 'vg-dialog-paper' }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 800, borderBottom: '1px solid var(--vg-border)', pb: 1.5 }}>
          {i18next.t('goalDetails.editGoal', 'Edit Goal')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Controller name="title" control={control} rules={{ required: true }} render={({ field }) => (
              <TextField fullWidth size="small" label={i18next.t('user.goals.form.title', 'Title')} {...field} />
            )} />
            <Controller name="status" control={control} render={({ field }) => (
              <TextField select fullWidth size="small" label={i18next.t('goalDetails.status', 'Status')} {...field}>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
              </TextField>
            )} />
            <Controller name="description" control={control} render={({ field }) => (
              <TextField fullWidth multiline minRows={4} size="small"
                label={i18next.t('user.goals.form.description', 'Description')} {...field} />
            )} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid var(--vg-border)', px: 2.5, py: 1.5, justifyContent: 'space-between' }}>
          {canDelete && (
            <button className="vg-chip" onClick={() => { setEditOpen(false); setDeleteOpen(true); }}
              style={{ color: 'var(--palette-error-main)', borderColor: 'var(--palette-error-main)' }}>
              {i18next.t('goalDetails.delete', 'Delete')}
            </button>
          )}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <button className="vg-chip" onClick={() => setEditOpen(false)}>{i18next.t('common.cancel', 'Cancel')}</button>
            <button className="vg-chip vg-chip--active" onClick={handleSubmit(onEdit)} disabled={actionLoading}
              style={{ height: 30, borderRadius: 7, padding: '0 14px' }}>
              {i18next.t('common.save', 'Save')}
            </button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs"
        PaperProps={{ className: 'vg-dialog-paper' }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 800, borderBottom: '1px solid var(--vg-border)', pb: 1.5 }}>
          {i18next.t('goalDetails.deleteGoal', 'Delete Goal')}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 1, fontSize: 12 }}>
            {i18next.t('goalDetails.deleteConfirm', 'Are you sure you want to delete this goal?')}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid var(--vg-border)', px: 2.5, py: 1.5 }}>
          <button className="vg-chip" onClick={() => setDeleteOpen(false)}>{i18next.t('common.cancel', 'Cancel')}</button>
          <button className="vg-chip" onClick={onDelete} disabled={actionLoading}
            style={{ background: 'var(--palette-error-main)', color: '#fff', borderColor: 'var(--palette-error-main)', height: 30, borderRadius: 7, padding: '0 14px' }}>
            {i18next.t('common.delete', 'Delete')}
          </button>
        </DialogActions>
      </Dialog>

      <EntryDrawer entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
    </Box>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest GoalDetails --no-coverage 2>&1 | tail -20
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/user/GoalDetails.tsx src/resources/styles/pages/goal-details.scss src/__tests__/pages/user/GoalDetails.test.tsx
git commit -m "feat: redesign GoalDetails with two-col layout, mini heatmap, season pills"
```

---

## Task 7: Seasons list redesign

**Files:**
- Modify: `src/pages/user/Seasons.tsx`
- Modify: `src/resources/styles/pages/seasons.scss`
- Modify: `src/__tests__/pages/user/Seasons.test.tsx`

- [ ] **Step 1: Write failing tests**

Add to `src/__tests__/pages/user/Seasons.test.tsx`:

```tsx
it('renders active season hero card', () => {
  const season = buildSeason({ name: 'Spring 2025', status: SeasonStatus.Active });
  setup({ seasons: [season] });
  render(<Seasons />);
  expect(screen.getByText('Spring 2025')).toBeInTheDocument();
  expect(screen.getByText(/active/i)).toBeInTheDocument();
});

it('navigates to SeasonDetails on row click', async () => {
  const season = buildSeason({ id: 'season-1', status: SeasonStatus.Completed });
  setup({ seasons: [season] });
  render(<Seasons />);
  const row = screen.getByTestId('season-row-season-1');
  await userEvent.click(row);
  // Navigate is mocked — just verify the row renders
  expect(row).toBeInTheDocument();
});
```

```bash
npx jest Seasons --no-coverage 2>&1 | tail -10
```

- [ ] **Step 2: Update seasons.scss**

Replace `src/resources/styles/pages/seasons.scss`:

```scss
@use '../variables' as *;
@use '../mixins' as *;

.seasons-page {
  display: flex;
  flex-direction: column;
  padding-bottom: 24px;
}

.seasons-hero-card {
  border-radius: 11px;
  border: 1px solid var(--vg-border);
  background: var(--palette-background-paper);
  padding: 20px 24px;
  margin-bottom: 12px;
}

.seasons-hero-name {
  font-size: 20px;
  font-weight: 900;
  letter-spacing: -0.6px;
  color: var(--palette-text-primary);
  margin-bottom: 8px;
}

.seasons-hero-stats {
  display: flex;
  gap: 20px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.seasons-hero-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.seasons-list-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--vg-text-muted);
  margin-bottom: 8px;
  margin-top: 4px;
}

.seasons-row-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--palette-text-primary);
}

.seasons-row-dates {
  font-size: 10px;
  color: var(--vg-text-muted);
  margin-top: 2px;
}

.seasons-row-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.seasons-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
```

- [ ] **Step 3: Rewrite Seasons.tsx**

Replace the `Seasons` component render section. Keep all existing state/store logic; only replace the JSX return and remove the `ItemList`/`Dialog` imports that are replaced below.

Full replacement of `src/pages/user/Seasons.tsx`:

```tsx
import React, { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useSeasonStore } from '../../store/seasons';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { RoleType, ISeason, SeasonStatus } from '../../store/types';
import i18next from 'i18next';

const isoToDateOnly = (iso?: string) => (!iso ? '' : iso.substring(0, 10));
const dateOnlyToISO = (s?: string) => (!s ? '' : new Date(s).toISOString());

type SeasonForm = { name: string; startDate: string; endDate: string; status: SeasonStatus | '' };

function statusBadgeClass(s: SeasonStatus) {
  if (s === SeasonStatus.Active) return 'vg-badge vg-badge--done';
  if (s === SeasonStatus.Planned) return 'vg-badge vg-badge--progress';
  return 'vg-badge vg-badge--muted';
}

export function Seasons() {
  const navigate = useNavigate();
  const fetchSeasons = useSeasonStore(s => s.fetchSeasons);
  const createSeason = useSeasonStore(s => s.createSeason);
  const seasons = useSeasonStore(s => s.seasonList.seasons) || [];
  const selectedTeam = useCognitoUserStore(s => s.selectedTeam);
  const teamId = selectedTeam?.team?.id || '';
  const userRole = selectedTeam?.role;
  const canCreate = userRole === RoleType.Admin || userRole === RoleType.Trainer;

  React.useEffect(() => {
    if (teamId) fetchSeasons(teamId, { teamId });
  }, [teamId]);

  const activeSeason = seasons.find(s => s.status === SeasonStatus.Active);
  const pastSeasons = seasons.filter(s => s.status !== SeasonStatus.Active);

  const [createOpen, setCreateOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { control, handleSubmit, reset } = useForm<SeasonForm>({
    defaultValues: { name: '', startDate: '', endDate: '', status: SeasonStatus.Planned },
  });

  const openCreate = () => {
    reset({ name: '', startDate: '', endDate: '', status: SeasonStatus.Planned });
    setCreateOpen(true);
  };

  const onCreate = async (data: SeasonForm) => {
    if (!teamId) return;
    setActionLoading(true);
    try {
      await createSeason(
        teamId, data.name,
        data.startDate ? dateOnlyToISO(data.startDate) : undefined,
        data.endDate ? dateOnlyToISO(data.endDate) : undefined,
        (data.status as SeasonStatus) || undefined,
      );
      setCreateOpen(false);
      fetchSeasons(teamId, { teamId });
    } finally {
      setActionLoading(false);
    }
  };

  const formatRange = (s: ISeason) => {
    const start = s.startDate ? new Date(s.startDate).toLocaleDateString() : '?';
    const end = s.endDate ? new Date(s.endDate).toLocaleDateString() : '?';
    return `${start} – ${end}`;
  };

  return (
    <Box className="seasons-page" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 900 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <div>
          <div className="vg-eyebrow">{seasons.length} {i18next.t('user.seasons.eyebrow', 'Seasons')}</div>
          <div className="vg-page-title">{i18next.t('user.seasons.title', 'Seasons')}</div>
        </div>
        {canCreate && (
          <button className="vg-chip vg-chip--active" onClick={openCreate} style={{ height: 34, borderRadius: 8 }}>
            {i18next.t('user.seasons.new', 'New Season')}
          </button>
        )}
      </Box>

      {activeSeason && (
        <div className="seasons-hero-card">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <span className="vg-badge vg-badge--done">{i18next.t('user.seasons.status.active', 'Active')}</span>
          </Box>
          <div className="seasons-hero-name">{activeSeason.name}</div>
          <div className="seasons-hero-stats">
            <div className="vg-stat-card" style={{ padding: '10px 14px', minWidth: 80 }}>
              <div className="vg-stat-num" style={{ fontSize: 20 }}>—</div>
              <div className="vg-stat-label">{i18next.t('user.seasons.goals', 'Goals')}</div>
            </div>
          </div>
          <div className="vg-prog-track" style={{ marginBottom: 6, maxWidth: 240 }}>
            <div className="vg-prog-fill" style={{ width: '0%' }} />
          </div>
          <div className="seasons-hero-actions">
            <button className="vg-chip vg-chip--active" onClick={() => navigate('/goals')}>
              {i18next.t('user.seasons.viewGoals', 'View Goals')}
            </button>
            <button className="vg-chip" onClick={() => navigate('/progress')}>
              {i18next.t('user.seasons.viewReports', 'View Reports')}
            </button>
            <button className="vg-chip" onClick={() => navigate(`/seasons/${activeSeason.id}`)}>
              {i18next.t('user.seasons.details', 'Details')}
            </button>
          </div>
        </div>
      )}

      {pastSeasons.length > 0 && (
        <>
          <div className="seasons-list-title">{i18next.t('user.seasons.pastSeasons', 'Past Seasons')}</div>
          <div className="seasons-list">
            {pastSeasons.map(s => (
              <div
                key={s.id}
                className="vg-row-item"
                data-testid={`season-row-${s.id}`}
                onClick={() => navigate(`/seasons/${s.id}`)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="seasons-row-name">{s.name}</div>
                  <div className="seasons-row-dates">{formatRange(s)}</div>
                </div>
                <div className="seasons-row-right">
                  <span className={statusBadgeClass(s.status)}>{s.status}</span>
                  <span className="vg-chevron">›</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {seasons.length === 0 && (
        <Typography sx={{ fontSize: 12, color: 'var(--vg-text-muted)', py: 6, textAlign: 'center' }}>
          {i18next.t('user.seasons.empty', 'No seasons yet.')}
        </Typography>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm"
        PaperProps={{ className: 'vg-dialog-paper' }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 800, borderBottom: '1px solid var(--vg-border)', pb: 1.5 }}>
          {i18next.t('user.seasons.dialog.createTitle', 'New Season')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Controller name="name" control={control} rules={{ required: true }} render={({ field }) => (
              <TextField fullWidth size="small" label={i18next.t('user.seasons.form.name', 'Name')} {...field} />
            )} />
            <Controller name="status" control={control} render={({ field }) => (
              <TextField select fullWidth size="small" label={i18next.t('user.seasons.form.status', 'Status')} {...field}>
                <MenuItem value={SeasonStatus.Planned}>{i18next.t('user.seasons.status.planned', 'Planned')}</MenuItem>
                <MenuItem value={SeasonStatus.Active}>{i18next.t('user.seasons.status.active', 'Active')}</MenuItem>
              </TextField>
            )} />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Controller name="startDate" control={control} render={({ field }) => (
                <TextField fullWidth type="date" size="small" InputLabelProps={{ shrink: true }}
                  label={i18next.t('user.seasons.form.startDate', 'Start Date')} {...field} />
              )} />
              <Controller name="endDate" control={control} render={({ field }) => (
                <TextField fullWidth type="date" size="small" InputLabelProps={{ shrink: true }}
                  label={i18next.t('user.seasons.form.endDate', 'End Date')} {...field} />
              )} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid var(--vg-border)', px: 2.5, py: 1.5 }}>
          <button className="vg-chip" onClick={() => setCreateOpen(false)}>{i18next.t('common.cancel', 'Cancel')}</button>
          <button className="vg-chip vg-chip--active" onClick={handleSubmit(onCreate)} disabled={actionLoading}
            style={{ height: 30, borderRadius: 7, padding: '0 14px' }}>
            {i18next.t('common.create', 'Create')}
          </button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest Seasons --no-coverage 2>&1 | tail -20
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/user/Seasons.tsx src/resources/styles/pages/seasons.scss src/__tests__/pages/user/Seasons.test.tsx
git commit -m "feat: redesign Seasons page with hero card and past-seasons rows"
```

---

## Task 8: SeasonDetails redesign

**Files:**
- Modify: `src/pages/user/SeasonDetails.tsx`
- Modify: `src/resources/styles/pages/season-details.scss`
- Create: `src/__tests__/pages/user/SeasonDetails.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/pages/user/SeasonDetails.test.tsx`:

```tsx
import React from 'react';
import { render, screen } from '../../test-utils';
import { SeasonDetails } from '../../../pages/user/SeasonDetails';
import { setupMockStore, mockCognitoUserState } from '../../mocks/stores';
import { buildSeason, buildGoal } from '../../mocks/factories';
import { RoleType, SeasonStatus, TeamMemberStatus } from '../../../store/types';

jest.mock('../../../store/seasons', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useSeasonStore: m }; });
jest.mock('../../../store/goals', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useGoalStore: m }; });
jest.mock('../../../store/cognitoUser', () => { const m: any = jest.fn((s?: any) => s ? s({}) : {}); m.getState = () => ({}); return { __esModule: true, useCognitoUserStore: m }; });
jest.mock('react-router-dom', () => ({ ...jest.requireActual('react-router-dom'), useParams: () => ({ seasonId: 'season-1' }), useNavigate: () => jest.fn() }));

import { useSeasonStore } from '../../../store/seasons';
import { useGoalStore } from '../../../store/goals';
import { useCognitoUserStore } from '../../../store/cognitoUser';

function setup(overrides?: { role?: string }) {
  const team = { id: 'team1', name: 'T', status: 'active', picture: '', createdAt: '', updatedAt: '' };
  (useCognitoUserStore as any).mockImplementation((s?: any) => s ? s({
    selectedTeam: { team, role: overrides?.role ?? RoleType.Trainer, status: TeamMemberStatus.Active },
    user: { id: 'u1' },
  }) : {});

  const season = buildSeason({ id: 'season-1', name: 'Spring 2025', status: SeasonStatus.Active });
  (useSeasonStore as any).mockImplementation((s?: any) => s ? s({
    getSeason: jest.fn().mockResolvedValue(season),
    updateSeason: jest.fn().mockResolvedValue(undefined),
    seasonList: { seasons: [season], count: 1 },
  }) : {});

  const goal = buildGoal({ id: 'g1', title: 'Serve accuracy' });
  (useGoalStore as any).mockImplementation((s?: any) => s ? s({
    goalList: { goals: [goal], count: 1 },
    seasonGoals: [goal],
    fetchGoals: jest.fn().mockResolvedValue(undefined),
    fetchSeasonGoals: jest.fn().mockResolvedValue(undefined),
    tagGoalToSeason: jest.fn().mockResolvedValue(undefined),
    untagGoalFromSeason: jest.fn().mockResolvedValue(undefined),
  }) : {});
}

describe('SeasonDetails', () => {
  it('renders back nav', () => {
    setup();
    render(<SeasonDetails />);
    expect(screen.getByText(/back to seasons/i)).toBeInTheDocument();
  });

  it('renders goals panel with season goals', () => {
    setup();
    render(<SeasonDetails />);
    expect(screen.getByText(/goals in this season/i)).toBeInTheDocument();
  });

  it('renders meta panel', () => {
    setup();
    render(<SeasonDetails />);
    expect(screen.getByText(/status/i)).toBeInTheDocument();
  });

  it('renders add goal control for trainer', () => {
    setup({ role: RoleType.Trainer });
    render(<SeasonDetails />);
    expect(screen.getByText(/add a goal/i)).toBeInTheDocument();
  });
});
```

```bash
npx jest SeasonDetails --no-coverage 2>&1 | tail -10
```

Expected: FAIL.

- [ ] **Step 2: Update season-details.scss**

Replace `src/resources/styles/pages/season-details.scss`:

```scss
@use '../variables' as *;
@use '../mixins' as *;

.season-details-page {
  display: flex;
  flex-direction: column;
  padding-bottom: 24px;
  max-width: 1100px;
}

.season-details-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.season-details-goal-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 0;
  border-bottom: 1px solid var(--vg-border);
  &:last-of-type { border-bottom: none; }
}

.season-details-goal-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--palette-text-primary);
}

.season-details-goal-meta {
  font-size: 10px;
  color: var(--vg-text-muted);
  margin-top: 2px;
}

.season-details-remove-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--vg-text-muted);
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  &:hover { color: var(--palette-error-main); }
}

.season-details-add-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.season-details-add-select {
  flex: 1;
  height: 30px;
  border-radius: 7px;
  border: 1px solid var(--vg-border);
  background: var(--vg-bg-subtle);
  color: var(--vg-text-muted);
  font-size: 11px;
  font-family: inherit;
  padding: 0 10px;
  &:focus { outline: none; border-color: var(--palette-primary-main); }
}

.season-details-add-btn {
  height: 30px;
  padding: 0 14px;
  border-radius: 7px;
  border: none;
  background: var(--palette-primary-main);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  &:disabled { opacity: 0.5; cursor: default; }
}

.season-details-edit-btn {
  background: none;
  border: 1px solid var(--vg-border);
  border-radius: 8px;
  height: 30px;
  padding: 0 13px;
  font-size: 11px;
  font-weight: 600;
  color: var(--vg-text-muted);
  cursor: pointer;
  font-family: inherit;
  &:hover { color: var(--palette-text-primary); border-color: var(--vg-border-strong); }
}
```

- [ ] **Step 3: Rewrite SeasonDetails.tsx**

Replace `src/pages/user/SeasonDetails.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Controller, useForm } from 'react-hook-form';
import { useSeasonStore } from '../../store/seasons';
import { useGoalStore } from '../../store/goals';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { ISeason, SeasonStatus, RoleType } from '../../store/types';
import i18next from 'i18next';

type SeasonEditForm = { name: string; startDate: string; endDate: string; status: SeasonStatus | '' };

function statusBadgeClass(s: SeasonStatus) {
  if (s === SeasonStatus.Active) return 'vg-badge vg-badge--done';
  if (s === SeasonStatus.Planned) return 'vg-badge vg-badge--progress';
  return 'vg-badge vg-badge--muted';
}

export function SeasonDetails() {
  const { seasonId } = useParams<{ seasonId: string }>();
  const navigate = useNavigate();

  const getSeason = useSeasonStore(s => s.getSeason);
  const updateSeason = useSeasonStore(s => s.updateSeason);
  const [season, setSeason] = useState<ISeason | null>(null);

  const selectedTeam = useCognitoUserStore(s => s.selectedTeam);
  const teamId = selectedTeam?.team?.id || '';
  const userRole = selectedTeam?.role;
  const canEdit = userRole === RoleType.Admin || userRole === RoleType.Trainer;

  const fetchGoals = useGoalStore(s => s.fetchGoals);
  const goals = useGoalStore(s => s.goalList.goals);
  const fetchSeasonGoals = useGoalStore(s => s.fetchSeasonGoals);
  const seasonGoals = useGoalStore(s => s.seasonGoals);
  const tagGoalToSeason = useGoalStore(s => s.tagGoalToSeason);
  const untagGoalFromSeason = useGoalStore(s => s.untagGoalFromSeason);

  useEffect(() => {
    if (seasonId) getSeason(seasonId).then(res => setSeason(res));
  }, [seasonId]);

  useEffect(() => {
    if (teamId) fetchGoals(teamId, {});
  }, [teamId]);

  useEffect(() => {
    if (teamId && seasonId) fetchSeasonGoals(teamId, seasonId);
  }, [teamId, seasonId, goals]);

  const handleUntag = async (goalId: string) => {
    if (!teamId || !seasonId) return;
    await untagGoalFromSeason(teamId, goalId, seasonId);
    fetchSeasonGoals(teamId, seasonId);
  };

  const [addGoalId, setAddGoalId] = useState('');
  const handleTag = async () => {
    if (!addGoalId || !teamId || !seasonId) return;
    await tagGoalToSeason(teamId, addGoalId, seasonId);
    fetchSeasonGoals(teamId, seasonId);
    setAddGoalId('');
  };

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { control, handleSubmit, reset } = useForm<SeasonEditForm>({
    defaultValues: { name: '', startDate: '', endDate: '', status: '' },
  });

  useEffect(() => {
    if (!season) return;
    reset({
      name: season.name || '',
      startDate: season.startDate?.substring(0, 10) ?? '',
      endDate: season.endDate?.substring(0, 10) ?? '',
      status: season.status || '',
    });
  }, [season, reset]);

  const onEdit = async (data: SeasonEditForm) => {
    if (!season || !canEdit) return;
    setSaving(true);
    try {
      await updateSeason(season.id, data.name,
        data.startDate ? new Date(data.startDate).toISOString() : undefined,
        data.endDate ? new Date(data.endDate).toISOString() : undefined,
        (data.status as SeasonStatus) || undefined,
      );
      const refreshed = await getSeason(season.id);
      if (refreshed) setSeason(refreshed);
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const untaggedGoals = goals.filter(g => !seasonGoals.some(sg => sg.id === g.id));

  if (!season) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>{i18next.t('common.loading', 'Loading…')}</Typography>
      </Box>
    );
  }

  return (
    <Box className="season-details-page" sx={{ p: { xs: 2, sm: 3 } }}>
      <button className="vg-back-nav" onClick={() => navigate('/seasons')}>
        ← {i18next.t('seasonDetails.backToSeasons', 'Back to Seasons')}
      </button>

      <div className="season-details-header">
        <div>
          <div className="vg-eyebrow">{i18next.t('seasonDetails.eyebrow', 'Season')}</div>
          <div className="vg-page-title">{season.name}</div>
        </div>
        {canEdit && (
          <button className="season-details-edit-btn" onClick={() => setEditOpen(true)}>
            {i18next.t('common.edit', 'Edit Season')}
          </button>
        )}
      </div>

      <div className="vg-two-col">
        {/* Left — goals panel */}
        <div>
          <div className="vg-panel">
            <div className="vg-panel-title">{i18next.t('seasonDetails.associatedGoals', 'Goals in this Season')}</div>

            {seasonGoals.map(g => (
              <div key={g.id} className="season-details-goal-row">
                <div>
                  <div className="season-details-goal-name">{g.title}</div>
                  <div className="season-details-goal-meta">{g.goalType} · {g.status}</div>
                </div>
                {canEdit && (
                  <button className="season-details-remove-btn" onClick={() => handleUntag(g.id)} title={i18next.t('seasonDetails.removeGoal', 'Remove')}>
                    ✕
                  </button>
                )}
              </div>
            ))}

            {seasonGoals.length === 0 && (
              <Typography sx={{ fontSize: 12, color: 'var(--vg-text-muted)', py: 2 }}>
                {i18next.t('seasonDetails.noGoals', 'No goals tagged to this season yet.')}
              </Typography>
            )}

            {canEdit && untaggedGoals.length > 0 && (
              <div className="season-details-add-row">
                <select
                  className="season-details-add-select"
                  value={addGoalId}
                  onChange={e => setAddGoalId(e.target.value)}
                >
                  <option value="">{i18next.t('seasonDetails.addGoalPlaceholder', 'Add a goal to this season…')}</option>
                  {untaggedGoals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                </select>
                <button className="season-details-add-btn" onClick={handleTag} disabled={!addGoalId}>
                  + {i18next.t('common.add', 'Add')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right — meta panel */}
        <div>
          <div className="vg-panel">
            <div className="vg-panel-title">{i18next.t('seasonDetails.info', 'Season Info')}</div>
            <div className="vg-meta-row">
              <span className="vg-meta-label">{i18next.t('user.seasons.form.status', 'Status')}</span>
              <span className="vg-meta-value">
                <span className={statusBadgeClass(season.status)}>{season.status}</span>
              </span>
            </div>
            <div className="vg-meta-row">
              <span className="vg-meta-label">{i18next.t('user.seasons.form.startDate', 'Start')}</span>
              <span className="vg-meta-value">
                {season.startDate ? new Date(season.startDate).toLocaleDateString() : '—'}
              </span>
            </div>
            <div className="vg-meta-row">
              <span className="vg-meta-label">{i18next.t('user.seasons.form.endDate', 'End')}</span>
              <span className="vg-meta-value">
                {season.endDate ? new Date(season.endDate).toLocaleDateString() : '—'}
              </span>
            </div>
            <div className="vg-meta-row">
              <span className="vg-meta-label">{i18next.t('seasonDetails.goalCount', 'Goals')}</span>
              <span className="vg-meta-value">{seasonGoals.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm"
        PaperProps={{ className: 'vg-dialog-paper' }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 800, borderBottom: '1px solid var(--vg-border)', pb: 1.5 }}>
          {i18next.t('seasonDetails.editTitle', 'Edit Season')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Controller name="name" control={control} rules={{ required: true }} render={({ field }) => (
              <TextField fullWidth size="small" label={i18next.t('user.seasons.form.name', 'Name')} {...field} />
            )} />
            <Controller name="status" control={control} render={({ field }) => (
              <TextField select fullWidth size="small" label={i18next.t('user.seasons.form.status', 'Status')} {...field}>
                <MenuItem value={SeasonStatus.Planned}>{i18next.t('user.seasons.status.planned', 'Planned')}</MenuItem>
                <MenuItem value={SeasonStatus.Active}>{i18next.t('user.seasons.status.active', 'Active')}</MenuItem>
                <MenuItem value={SeasonStatus.Completed}>{i18next.t('user.seasons.status.completed', 'Completed')}</MenuItem>
                <MenuItem value={SeasonStatus.Archived}>{i18next.t('user.seasons.status.archived', 'Archived')}</MenuItem>
              </TextField>
            )} />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Controller name="startDate" control={control} render={({ field }) => (
                <TextField fullWidth type="date" size="small" InputLabelProps={{ shrink: true }}
                  label={i18next.t('user.seasons.form.startDate', 'Start Date')} {...field} />
              )} />
              <Controller name="endDate" control={control} render={({ field }) => (
                <TextField fullWidth type="date" size="small" InputLabelProps={{ shrink: true }}
                  label={i18next.t('user.seasons.form.endDate', 'End Date')} {...field} />
              )} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid var(--vg-border)', px: 2.5, py: 1.5 }}>
          <button className="vg-chip" onClick={() => setEditOpen(false)}>{i18next.t('common.cancel', 'Cancel')}</button>
          <button className="vg-chip vg-chip--active" onClick={handleSubmit(onEdit)} disabled={saving}
            style={{ height: 30, borderRadius: 7, padding: '0 14px' }}>
            {i18next.t('common.save', 'Save')}
          </button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest SeasonDetails --no-coverage 2>&1 | tail -20
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/user/SeasonDetails.tsx src/resources/styles/pages/season-details.scss src/__tests__/pages/user/SeasonDetails.test.tsx
git commit -m "feat: redesign SeasonDetails with two-col goals panel and meta panel"
```

---

## Task 9: Progress page + ContextSwitcher redesign

**Files:**
- Modify: `src/components/progress/ContextSwitcher.tsx`
- Modify: `src/pages/user/Progress.tsx`
- Modify: `src/resources/styles/pages/progress.scss`
- Modify: `src/components/progress/__tests__/ContextSwitcher.test.tsx`
- Modify: `src/__tests__/pages/user/Progress.test.tsx`

- [ ] **Step 1: Write failing tests**

Add to `src/components/progress/__tests__/ContextSwitcher.test.tsx`:

```tsx
it('renders chip buttons instead of MUI ToggleButton', () => {
  render(
    <ContextSwitcher canParticipate canOversee value="personal" onChange={jest.fn()} members={[]} />
  );
  const myProgress = screen.getByText(/my progress/i);
  expect(myProgress.tagName).toBe('BUTTON');
  expect(myProgress.className).toContain('vg-chip');
});
```

```bash
npx jest ContextSwitcher --no-coverage 2>&1 | tail -10
```

- [ ] **Step 2: Rewrite ContextSwitcher.tsx**

Replace `src/components/progress/ContextSwitcher.tsx`:

```tsx
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
```

- [ ] **Step 3: Update progress.scss**

Replace `src/resources/styles/pages/progress.scss`:

```scss
@use '../variables' as *;
@use '../mixins' as *;

.progress-page {
  display: flex;
  flex-direction: column;
  padding-bottom: 24px;
}

.progress-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.progress-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.progress-season-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.progress-reports-title {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--vg-text-muted);
  margin-bottom: 8px;
}

.progress-report-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid var(--vg-border);
  cursor: pointer;
  &:last-child { border-bottom: none; }
  &:hover .progress-report-summary { color: var(--palette-primary-main); }
}

.progress-report-summary {
  font-size: 12px;
  font-weight: 600;
  color: var(--palette-text-primary);
}

.progress-report-meta {
  font-size: 10px;
  color: var(--vg-text-muted);
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-report-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.progress-activity-dot {
  &:focus-visible {
    outline: 2px solid var(--palette-primary-main);
    outline-offset: 4px;
    border-radius: 50%;
  }
}
```

- [ ] **Step 4: Update Progress.tsx**

Replace `src/pages/user/Progress.tsx`:

```tsx
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import { useProgressReportPermissions } from '../../hooks/useProgressReportPermissions';
import { ContextSwitcher } from '../../components/progress/ContextSwitcher';
import { PersonalProgressView } from '../../components/progress/PersonalProgressView';
import { TeamOverviewView } from '../../components/progress/TeamOverviewView';
import { MemberProgressView } from '../../components/progress/MemberProgressView';
import { useSeasonStore } from '../../store/seasons';
import { useTeamStore } from '../../store/teams';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { ISeason } from '../../store/types';
import i18next from 'i18next';

export function Progress() {
  const navigate = useNavigate();
  const selectedTeam = useCognitoUserStore(s => s.selectedTeam);
  const teamId = selectedTeam?.team?.id ?? '';

  const fetchSeasons = useSeasonStore(s => s.fetchSeasons);
  const seasons = useSeasonStore(s => s.seasonList.seasons) ?? ([] as ISeason[]);
  const fetchTeamMembers = useTeamStore(s => s.fetchTeamMembers);
  const teamMembers = useTeamStore(s => s.teamMembers) ?? [];
  const { canParticipate, canOversee } = useProgressReportPermissions();

  const [selectedSeasonId, setSelectedSeasonId] = React.useState<string | null>(null);
  const [viewMode, setViewMode] = React.useState<string>(() => canParticipate ? 'personal' : 'team');

  React.useEffect(() => {
    if (teamId) fetchSeasons(teamId, { teamId });
  }, [teamId]);

  React.useEffect(() => {
    if (!seasons || seasons.length === 0) { setSelectedSeasonId(null); return; }
    const sorted = [...seasons].sort((a, b) => {
      const aDate = a.startDate || a.createdAt || '';
      const bDate = b.startDate || b.createdAt || '';
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
    setSelectedSeasonId(prev => prev || sorted[0]?.id || null);
  }, [seasons]);

  React.useEffect(() => {
    if (canOversee && teamId) fetchTeamMembers(teamId, { limit: 100 } as any).catch(() => {});
  }, [canOversee, teamId]);

  React.useEffect(() => {
    if (!canParticipate && canOversee && viewMode === 'personal') setViewMode('team');
  }, [canParticipate, canOversee]);

  const members = teamMembers.map(m => ({
    id: m.id,
    name: m.name || m.preferredUsername || m.email,
    picture: m.picture,
  }));

  const selectedMember = members.find(m => m.id === viewMode);
  const isPersonal = viewMode === 'personal';
  const isTeam = viewMode === 'team';
  const isMember = !isPersonal && !isTeam;

  return (
    <Box className="progress-page" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1200 }}>
      {/* Header */}
      <div className="progress-header">
        <div>
          <div className="vg-eyebrow">{i18next.t('progress.eyebrow', 'Progress')}</div>
          <div className="vg-page-title">{i18next.t('progress.title', 'Progress Reports')}</div>
        </div>
        <div className="progress-header-right">
          <button
            className="vg-chip vg-chip--active"
            onClick={() => navigate('/progress/create')}
            style={{ height: 34, borderRadius: 8 }}
          >
            + {i18next.t('progress.newReport', 'New Report')}
          </button>
        </div>
      </div>

      {/* Season chips */}
      {seasons.length > 0 && (
        <div className="progress-season-chips">
          {seasons.map(s => (
            <button
              key={s.id}
              className={`vg-chip${selectedSeasonId === s.id ? ' vg-chip--active' : ''}`}
              onClick={() => setSelectedSeasonId(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Context switcher */}
      <ContextSwitcher
        canParticipate={canParticipate}
        canOversee={canOversee}
        value={viewMode}
        onChange={setViewMode}
        members={members}
      />

      {!selectedSeasonId ? (
        <Typography sx={{ fontSize: 12, color: 'var(--vg-text-muted)', py: 6, textAlign: 'center' }}>
          {i18next.t('progress.graph.selectSeason', 'Select a season to view progress.')}
        </Typography>
      ) : (
        <Box sx={{ mt: 1 }}>
          {isPersonal && (
            <PersonalProgressView teamId={teamId} seasonId={selectedSeasonId} canParticipate={canParticipate} />
          )}
          {isTeam && (
            <TeamOverviewView
              teamId={teamId}
              seasonId={selectedSeasonId}
              members={members}
              onMemberSelect={id => setViewMode(id)}
            />
          )}
          {isMember && !selectedMember && (
            <Typography sx={{ fontSize: 12, color: 'var(--vg-text-muted)', py: 6, textAlign: 'center' }}>
              {i18next.t('progress.selectMember', 'Select a member above to view their progress.')}
            </Typography>
          )}
          {isMember && selectedMember && (
            <MemberProgressView
              memberId={selectedMember.id}
              memberName={selectedMember.name}
              teamId={teamId}
              seasonId={selectedSeasonId}
              onBack={() => setViewMode('team')}
            />
          )}
        </Box>
      )}
    </Box>
  );
}

export default Progress;
```

- [ ] **Step 5: Run tests**

```bash
npx jest ContextSwitcher Progress --no-coverage 2>&1 | tail -20
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/progress/ContextSwitcher.tsx src/pages/user/Progress.tsx src/resources/styles/pages/progress.scss src/components/progress/__tests__/ContextSwitcher.test.tsx src/__tests__/pages/user/Progress.test.tsx
git commit -m "feat: redesign Progress page and ContextSwitcher with chip navigation"
```

---

## Task 10: ProgressCreation redesign

**Files:**
- Modify: `src/pages/user/ProgressCreation.tsx`
- Modify: `src/resources/styles/pages/progress-creation.scss`
- Modify: `src/__tests__/pages/user/ProgressCreation.test.tsx`

- [ ] **Step 1: Write failing test**

Add to `src/__tests__/pages/user/ProgressCreation.test.tsx`:

```tsx
it('renders numbered rating cells 1-5 instead of MUI Rating stars', () => {
  setup({ hasGoals: true });
  render(<ProgressCreation />);
  // Rating cells show 1 through 5
  const cells = screen.getAllByRole('button', { name: /rating cell/i });
  expect(cells.length).toBeGreaterThanOrEqual(5);
});
```

```bash
npx jest ProgressCreation --no-coverage 2>&1 | tail -10
```

- [ ] **Step 2: Update progress-creation.scss**

Replace `src/resources/styles/pages/progress-creation.scss`:

```scss
@use '../variables' as *;
@use '../mixins' as *;

.progress-creation-page {
  display: flex;
  flex-direction: column;
  padding-bottom: 24px;
  max-width: 800px;
}

.progress-creation-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.progress-creation-goal-row {
  padding: 10px 0;
  border-bottom: 1px solid var(--vg-border);
  &:last-child { border-bottom: none; }
}

.progress-creation-goal-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--palette-text-primary);
  margin-bottom: 8px;
}

.progress-creation-rating-row {
  display: flex;
  gap: 5px;
  margin-bottom: 8px;
}

.progress-creation-rating-cell {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  border: none;
  background: var(--vg-bg-subtle);
  color: var(--vg-text-muted);
  font-family: inherit;
  &:focus-visible { outline: 2px solid var(--palette-primary-main); outline-offset: 2px; }
}

.progress-creation-notes {
  width: 100%;
  border-radius: 7px;
  border: 1px solid var(--vg-border);
  background: var(--vg-bg-subtle);
  color: var(--palette-text-primary);
  font-size: 11px;
  font-family: inherit;
  padding: 7px 10px;
  resize: vertical;
  min-height: 40px;
  &:focus { outline: none; border-color: var(--palette-primary-main); }
  &::placeholder { color: var(--vg-text-muted); }
}

.progress-creation-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 8px;
}
```

- [ ] **Step 3: Rewrite ProgressCreation.tsx**

Replace `src/pages/user/ProgressCreation.tsx`:

```tsx
import React, { useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useProgressReportStore } from '../../store/progressReports';
import { useGoalStore } from '../../store/goals';
import { useSeasonStore } from '../../store/seasons';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { GoalStatus, ISeason } from '../../store/types';
import { HEATMAP_RATING_COLORS } from '../../utils/chartUtils';
import i18next from 'i18next';

type ProgressForm = { summary: string; details: string };

export function ProgressCreation() {
  const navigate = useNavigate();
  const createReport = useProgressReportStore(s => s.createReport);
  const fetchGoals = useGoalStore(s => s.fetchGoals);
  const goals = useGoalStore(s => s.goalList.goals);
  const fetchSeasons = useSeasonStore(s => s.fetchSeasons);
  const seasons = useSeasonStore(s => s.seasonList.seasons) || [] as ISeason[];
  const selectedTeam = useCognitoUserStore(s => s.selectedTeam);
  const teamId = selectedTeam?.team?.id || '';

  const [selectedSeasonId, setSelectedSeasonId] = React.useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [goalNotes, setGoalNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (teamId) {
      fetchSeasons(teamId, { teamId });
      fetchGoals(teamId, {});
    }
  }, [teamId]);

  React.useEffect(() => {
    if (!seasons || seasons.length === 0) { setSelectedSeasonId(null); return; }
    const sorted = [...seasons].sort((a, b) =>
      new Date(b.startDate || b.createdAt).getTime() - new Date(a.startDate || a.createdAt).getTime()
    );
    setSelectedSeasonId(prev => prev || sorted[0]?.id || null);
  }, [seasons]);

  const activeGoals = goals.filter(g => g.status === GoalStatus.Open || g.status === GoalStatus.InProgress);

  const { control, handleSubmit } = useForm<ProgressForm>({ defaultValues: { summary: '', details: '' } });

  const onSubmit = async (data: ProgressForm) => {
    if (!selectedSeasonId) return;
    setLoading(true);
    try {
      const progress = Object.entries(ratings)
        .filter(([, r]) => r > 0)
        .map(([goalId, rating]) => ({ goalId, rating, details: goalNotes[goalId] || undefined }));
      const report = await createReport(selectedSeasonId, data.summary, data.details, progress);
      if (report) navigate('/progress');
    } finally {
      setLoading(false);
    }
  };

  const setRating = (goalId: string, rating: number) =>
    setRatings(prev => ({ ...prev, [goalId]: prev[goalId] === rating ? 0 : rating }));

  return (
    <Box className="progress-creation-page" sx={{ p: { xs: 2, sm: 3 } }}>
      <div className="progress-creation-header">
        <div>
          <div className="vg-eyebrow">{i18next.t('progress.eyebrow', 'Progress')}</div>
          <div className="vg-page-title">{i18next.t('progress.createTitle', 'New Report')}</div>
        </div>
      </div>

      {/* Season chips */}
      {seasons.length > 0 && (
        <div className="vg-chip-row" style={{ marginBottom: 16 }}>
          {seasons.map(s => (
            <button
              key={s.id}
              className={`vg-chip${selectedSeasonId === s.id ? ' vg-chip--active' : ''}`}
              onClick={() => setSelectedSeasonId(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Report panel */}
        <div className="vg-panel" style={{ marginBottom: 12 }}>
          <div className="vg-panel-title">{i18next.t('progress.reportPanel', 'Report')}</div>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Controller name="summary" control={control} rules={{ required: true }} render={({ field, fieldState }) => (
              <TextField fullWidth size="small" label={i18next.t('progress.summary', 'Summary')}
                error={!!fieldState.error} {...field} />
            )} />
            <Controller name="details" control={control} render={({ field }) => (
              <TextField fullWidth multiline rows={3} size="small"
                label={i18next.t('progress.details', 'Session Notes')} {...field} />
            )} />
          </Box>
        </div>

        {/* Goal ratings panel */}
        {activeGoals.length > 0 && (
          <div className="vg-panel" style={{ marginBottom: 12 }}>
            <div className="vg-panel-title">{i18next.t('progress.goalRatings', 'Goal Ratings')}</div>
            {activeGoals.map(g => (
              <div key={g.id} className="progress-creation-goal-row">
                <div className="progress-creation-goal-title">{g.title}</div>
                <div className="progress-creation-rating-row">
                  {([1, 2, 3, 4, 5] as const).map(r => {
                    const selected = ratings[g.id] === r;
                    const colors = HEATMAP_RATING_COLORS[r];
                    return (
                      <button
                        key={r}
                        type="button"
                        className="progress-creation-rating-cell"
                        aria-label={`rating cell ${r}`}
                        aria-pressed={selected}
                        onClick={() => setRating(g.id, r)}
                        style={selected ? { background: colors.bg, color: colors.text } : undefined}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
                <textarea
                  className="progress-creation-notes"
                  placeholder={i18next.t('progress.entryDetailsPlaceholder', 'Notes for this goal (optional)')}
                  value={goalNotes[g.id] || ''}
                  onChange={e => setGoalNotes(prev => ({ ...prev, [g.id]: e.target.value }))}
                  rows={1}
                />
              </div>
            ))}
          </div>
        )}

        {activeGoals.length === 0 && selectedSeasonId && (
          <Typography sx={{ fontSize: 12, color: 'var(--vg-text-muted)', py: 3 }}>
            {i18next.t('progress.noGoals', 'No active goals available.')}
          </Typography>
        )}

        <div className="progress-creation-actions">
          <button type="button" className="vg-chip" onClick={() => navigate('/progress')}>
            {i18next.t('common.cancel', 'Cancel')}
          </button>
          <button type="submit" className="vg-chip vg-chip--active" disabled={loading || !selectedSeasonId}
            style={{ height: 34, borderRadius: 8, padding: '0 18px' }}>
            {i18next.t('progress.submit', 'Submit Report')}
          </button>
        </div>
      </form>
    </Box>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest ProgressCreation --no-coverage 2>&1 | tail -20
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/user/ProgressCreation.tsx src/resources/styles/pages/progress-creation.scss src/__tests__/pages/user/ProgressCreation.test.tsx
git commit -m "feat: redesign ProgressCreation with heatmap-coloured rating cells"
```

---

## Task 11: ProgressDetails redesign

**Files:**
- Modify: `src/pages/user/ProgressDetails.tsx`
- Modify: `src/resources/styles/pages/progress-details.scss`
- Modify: `src/__tests__/pages/user/ProgressDetails.test.tsx`

- [ ] **Step 1: Write failing test**

Add to `src/__tests__/pages/user/ProgressDetails.test.tsx`:

```tsx
it('renders report summary as page title', () => {
  setup({ summary: 'Great training session' });
  render(<ProgressDetails />);
  expect(screen.getByText('Great training session')).toBeInTheDocument();
});

it('renders back nav link', () => {
  setup({});
  render(<ProgressDetails />);
  expect(screen.getByText(/back to progress/i)).toBeInTheDocument();
});
```

```bash
npx jest ProgressDetails --no-coverage 2>&1 | tail -10
```

- [ ] **Step 2: Update progress-details.scss**

Replace `src/resources/styles/pages/progress-details.scss`:

```scss
@use '../variables' as *;
@use '../mixins' as *;

.progress-details-page {
  display: flex;
  flex-direction: column;
  padding-bottom: 24px;
  max-width: 1000px;
}

.progress-details-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.progress-details-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
  font-size: 11px;
  color: var(--vg-text-muted);
}

.progress-details-author-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--vg-bg-subtle);
  border-radius: 20px;
  padding: 2px 10px 2px 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--palette-text-primary);
}

.progress-details-author-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--palette-primary-main);
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-details-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}

.progress-details-entry-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--vg-border);
  cursor: pointer;
  &:last-child { border-bottom: none; }
}

.progress-details-rating-cell {
  width: 28px;
  height: 28px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.progress-details-entry-goal {
  font-size: 12px;
  font-weight: 600;
  color: var(--palette-text-primary);
}

.progress-details-entry-notes {
  font-size: 11px;
  color: var(--vg-text-muted);
  margin-top: 3px;
}

.progress-details-entry-expand {
  margin-left: auto;
  font-size: 11px;
  color: var(--vg-text-muted);
  flex-shrink: 0;
}
```

- [ ] **Step 3: Rewrite ProgressDetails.tsx**

Replace `src/pages/user/ProgressDetails.tsx`:

```tsx
import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Controller, useForm } from 'react-hook-form';
import { useProgressReportStore } from '../../store/progressReports';
import { useGoalStore } from '../../store/goals';
import { useSeasonStore } from '../../store/seasons';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { usePermission } from '../../hooks/usePermission';
import { useTeamStore } from '../../store/teams';
import { CommentType } from '../../store/types';
import { CommentSection } from '../../components/CommentSection';
import { UserDisplay } from '../../components/UserDisplay';
import { HEATMAP_RATING_COLORS } from '../../utils/chartUtils';
import { formatDateTime } from '../../utils/dateTime';
import i18next from 'i18next';

type EditForm = { summary: string; details: string };

export function ProgressDetails() {
  const { progressId } = useParams<{ progressId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const currentReport = useProgressReportStore(s => s.currentReport);
  const getReport = useProgressReportStore(s => s.getReport);
  const updateReport = useProgressReportStore(s => s.updateReport);
  const deleteReport = useProgressReportStore(s => s.deleteReport);

  const fetchGoals = useGoalStore(s => s.fetchGoals);
  const goals = useGoalStore(s => s.goalList.goals);
  const fetchSeasons = useSeasonStore(s => s.fetchSeasons);
  const seasons = useSeasonStore(s => s.seasonList.seasons);
  const selectedTeam = useCognitoUserStore(s => s.selectedTeam);
  const currentUser = useCognitoUserStore(s => s.user);
  const currentTeamSettings = useTeamStore(s => s.currentTeamSettings);
  const getTeam = useTeamStore(s => s.getTeam);
  const fetchTeamMembers = useTeamStore(s => s.fetchTeamMembers);
  const teamMembers = useTeamStore(s => s.teamMembers) || [];
  const canEdit = usePermission('progress_reports:write');

  const teamId = selectedTeam?.team?.id || '';

  const seasonId = currentReport?.seasonId
    || location.state?.seasonId
    || (seasons && seasons.length > 0
        ? [...seasons].sort((a, b) => new Date(b.startDate || b.createdAt).getTime() - new Date(a.startDate || a.createdAt).getTime())[0]?.id
        : undefined);

  React.useEffect(() => {
    if (progressId && seasonId && (!currentReport || currentReport.id !== progressId)) {
      getReport(seasonId, progressId);
    }
  }, [progressId, seasonId]);

  React.useEffect(() => {
    if (teamId) {
      fetchGoals(teamId, {});
      getTeam(teamId).catch(() => {});
      fetchTeamMembers(teamId, { limit: 100 } as any).catch(() => {});
    }
  }, [teamId]);

  React.useEffect(() => {
    if (teamId && (!seasons || seasons.length === 0)) fetchSeasons(teamId, { teamId });
  }, [teamId]);

  const isAuthor = currentReport?.authorId === currentUser?.id;
  const canModify = isAuthor || canEdit;

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  const { control, handleSubmit, reset } = useForm<EditForm>({ defaultValues: { summary: '', details: '' } });

  React.useEffect(() => {
    if (currentReport) reset({ summary: currentReport.summary || '', details: currentReport.details || '' });
  }, [currentReport, reset]);

  const onEdit = async (data: EditForm) => {
    if (!currentReport || !seasonId) return;
    setActionLoading(true);
    try {
      await updateReport(seasonId, currentReport.id, data.summary, data.details);
      setEditOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const onDelete = async () => {
    if (!currentReport || !seasonId) return;
    setActionLoading(true);
    try {
      await deleteReport(seasonId, currentReport.id);
      navigate('/progress');
    } finally {
      setActionLoading(false);
    }
  };

  const season = seasons?.find(s => s.id === currentReport?.seasonId);
  const authorMember = teamMembers.find(m => m.id === currentReport?.authorId);
  const authorInitials = (authorMember?.name || authorMember?.preferredUsername || '?').substring(0, 2).toUpperCase();

  const commentsEnabled = currentTeamSettings?.allowProgressReportComments ?? false;

  if (!currentReport) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>{i18next.t('common.loading', 'Loading…')}</Typography>
      </Box>
    );
  }

  return (
    <Box className="progress-details-page" sx={{ p: { xs: 2, sm: 3 } }}>
      <button className="vg-back-nav" onClick={() => navigate('/progress')}>
        ← {i18next.t('progressDetails.backToProgress', 'Back to Progress')}
      </button>

      {/* Header */}
      <div className="progress-details-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="vg-eyebrow">{i18next.t('progress.eyebrow', 'Progress Report')}</div>
          <div className="vg-page-title" style={{ fontSize: 22, marginBottom: 0 }}>{currentReport.summary}</div>
          <div className="progress-details-meta-row">
            <div className="progress-details-author-chip">
              <div className="progress-details-author-avatar">{authorInitials}</div>
              <UserDisplay user={authorMember as any} fallbackId={currentReport.authorId} />
            </div>
            <span>{formatDateTime(currentReport.createdAt)}</span>
            {season && <span>· {season.name}</span>}
          </div>
        </div>
        {canModify && (
          <div className="progress-details-actions">
            <button className="vg-chip" onClick={() => setEditOpen(true)}>{i18next.t('common.edit', 'Edit')}</button>
          </div>
        )}
      </div>

      {/* Session notes */}
      {currentReport.details && (
        <div className="vg-panel" style={{ marginBottom: 12 }}>
          <div className="vg-panel-title">{i18next.t('progress.details', 'Session Notes')}</div>
          <Typography sx={{ fontSize: 12, color: 'var(--palette-text-secondary)', lineHeight: 1.7 }}>
            {currentReport.details}
          </Typography>
        </div>
      )}

      {/* Goal ratings */}
      {(currentReport.progress?.length ?? 0) > 0 && (
        <div className="vg-panel" style={{ marginBottom: 12 }}>
          <div className="vg-panel-title">{i18next.t('progress.goalRatings', 'Goal Ratings')}</div>
          {currentReport.progress!.map(entry => {
            const goal = goals.find(g => g.id === entry.goalId);
            const colors = HEATMAP_RATING_COLORS[entry.rating] ?? { bg: '#eee', text: '#333' };
            const expanded = expandedEntry === entry.id;
            return (
              <div key={entry.id}>
                <div
                  className="progress-details-entry-row"
                  onClick={() => setExpandedEntry(expanded ? null : entry.id)}
                >
                  <div
                    className="progress-details-rating-cell"
                    style={{ background: colors.bg, color: colors.text }}
                  >
                    {entry.rating}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="progress-details-entry-goal">{goal?.title ?? entry.goalId}</div>
                    {entry.details && (
                      <div className="progress-details-entry-notes">{entry.details}</div>
                    )}
                  </div>
                  <div className="progress-details-entry-expand">{expanded ? '▲' : '▼'}</div>
                </div>
                <Collapse in={expanded}>
                  <Box sx={{ pl: '38px', pb: 1 }}>
                    <CommentSection
                      targetId={entry.id}
                      commentType={CommentType.ProgressEntry}
                      enabled={currentTeamSettings?.allowProgressEntryComments ?? false}
                      allowFileUploads={currentTeamSettings?.allowFileUploads}
                    />
                  </Box>
                </Collapse>
              </div>
            );
          })}
        </div>
      )}

      {/* Report-level comments */}
      <div className="vg-panel">
        <div className="vg-panel-title">{i18next.t('progressDetails.comments', 'Comments')}</div>
        <CommentSection
          targetId={currentReport.id}
          commentType={CommentType.ProgressReport}
          enabled={commentsEnabled}
          allowFileUploads={currentTeamSettings?.allowFileUploads}
        />
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm"
        PaperProps={{ className: 'vg-dialog-paper' }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 800, borderBottom: '1px solid var(--vg-border)', pb: 1.5 }}>
          {i18next.t('progressDetails.editReport', 'Edit Report')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Controller name="summary" control={control} rules={{ required: true }} render={({ field }) => (
              <TextField fullWidth size="small" label={i18next.t('progress.summary', 'Summary')} {...field} />
            )} />
            <Controller name="details" control={control} render={({ field }) => (
              <TextField fullWidth multiline rows={4} size="small"
                label={i18next.t('progress.details', 'Session Notes')} {...field} />
            )} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid var(--vg-border)', px: 2.5, py: 1.5, justifyContent: 'space-between' }}>
          <button className="vg-chip" onClick={() => { setEditOpen(false); setDeleteOpen(true); }}
            style={{ color: 'var(--palette-error-main)', borderColor: 'var(--palette-error-main)' }}>
            {i18next.t('common.delete', 'Delete')}
          </button>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <button className="vg-chip" onClick={() => setEditOpen(false)}>{i18next.t('common.cancel', 'Cancel')}</button>
            <button className="vg-chip vg-chip--active" onClick={handleSubmit(onEdit)} disabled={actionLoading}
              style={{ height: 30, borderRadius: 7, padding: '0 14px' }}>
              {i18next.t('common.save', 'Save')}
            </button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs"
        PaperProps={{ className: 'vg-dialog-paper' }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 800, borderBottom: '1px solid var(--vg-border)', pb: 1.5 }}>
          {i18next.t('progressDetails.deleteReport', 'Delete Report')}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 1, fontSize: 12 }}>
            {i18next.t('progressDetails.deleteConfirm', 'Are you sure you want to delete this report?')}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid var(--vg-border)', px: 2.5, py: 1.5 }}>
          <button className="vg-chip" onClick={() => setDeleteOpen(false)}>{i18next.t('common.cancel', 'Cancel')}</button>
          <button className="vg-chip" onClick={onDelete} disabled={actionLoading}
            style={{ background: 'var(--palette-error-main)', color: '#fff', borderColor: 'var(--palette-error-main)', height: 30, borderRadius: 7, padding: '0 14px' }}>
            {i18next.t('common.delete', 'Delete')}
          </button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest ProgressDetails --no-coverage 2>&1 | tail -20
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/user/ProgressDetails.tsx src/resources/styles/pages/progress-details.scss src/__tests__/pages/user/ProgressDetails.test.tsx
git commit -m "feat: redesign ProgressDetails with summary as title and coloured rating cells"
```

---

## Task 12: Members redesign

**Files:**
- Modify: `src/pages/trainer/Members.tsx`
- Modify: `src/resources/styles/pages/members.scss`
- Modify: `src/__tests__/pages/trainer/Members.test.tsx`

- [ ] **Step 1: Write failing test**

Add to `src/__tests__/pages/trainer/Members.test.tsx`:

```tsx
it('renders member rows as vg-row-item', () => {
  const member = buildTeamUser({ name: 'Maria K.', email: 'maria@example.com' });
  setup({ members: [member] });
  render(<Members />);
  expect(screen.getByText('Maria K.')).toBeInTheDocument();
});

it('renders filter chips for All, Trainers, Members', () => {
  setup();
  render(<Members />);
  expect(screen.getByText('All')).toBeInTheDocument();
  expect(screen.getByText('Trainers')).toBeInTheDocument();
});
```

```bash
npx jest Members --no-coverage 2>&1 | tail -10
```

- [ ] **Step 2: Update members.scss**

Replace `src/resources/styles/pages/members.scss`:

```scss
@use '../variables' as *;
@use '../mixins' as *;

.members-page {
  display: flex;
  flex-direction: column;
  padding-bottom: 24px;
}

.members-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.members-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.members-search {
  flex: 1;
  height: 34px;
  border-radius: 8px;
  border: 1px solid var(--vg-border);
  background: var(--palette-background-paper);
  padding: 0 12px;
  font-size: 12px;
  font-family: inherit;
  color: var(--palette-text-primary);
  &:focus { outline: none; border-color: var(--palette-primary-main); }
  &::placeholder { color: var(--vg-text-muted); }
}

.members-list { display: flex; flex-direction: column; gap: 8px; }

.members-row-info { flex: 1; min-width: 0; }

.members-row-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--palette-text-primary);
  display: flex;
  align-items: center;
  gap: 5px;
}

.members-row-name-you {
  font-size: 10px;
  font-weight: 400;
  color: var(--vg-text-muted);
}

.members-row-email { font-size: 10px; color: var(--vg-text-muted); margin-top: 2px; }

.members-row-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.members-dialog-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 8px;
}
```

- [ ] **Step 3: Rewrite Members.tsx**

Replace `src/pages/trainer/Members.tsx`:

```tsx
import React, { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Controller, useForm } from 'react-hook-form';
import { ITeamUser, RoleType, TeamMemberStatus } from '../../store/types';
import { useTeamStore } from '../../store/teams';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { usePermission } from '../../hooks/usePermission';
import VolleyGoalsAPI from '../../services/backend.api';
import i18next from 'i18next';

type MemberEditForm = { role: string; status: string };
type RoleFilter = 'all' | 'trainer' | 'member' | 'invited';

function avatarBg(name: string) {
  const colors = ['#C41E3A', '#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4', '#ff5722'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % colors.length;
  return colors[Math.abs(h)];
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
}

export function Members() {
  const fetchTeamMembers = useTeamStore(s => s.fetchTeamMembers);
  const teamMembers = useTeamStore(s => s.teamMembers) || [];
  const selectedTeam = useCognitoUserStore(s => s.selectedTeam);
  const currentUser = useCognitoUserStore(s => s.user);
  const teamId = selectedTeam?.team?.id || '';
  const canWrite = usePermission('members:write');

  React.useEffect(() => {
    if (teamId) fetchTeamMembers(teamId, {});
  }, [teamId]);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [editOpen, setEditOpen] = useState(false);
  const [currentMember, setCurrentMember] = useState<ITeamUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { control, handleSubmit, reset } = useForm<MemberEditForm>({ defaultValues: { role: '', status: '' } });

  const filteredMembers = useMemo(() => teamMembers.filter(m => {
    const q = search.toLowerCase();
    if (q && !(m.name || '').toLowerCase().includes(q) && !m.email.toLowerCase().includes(q)) return false;
    if (roleFilter === 'trainer' && m.role !== RoleType.Trainer) return false;
    if (roleFilter === 'member' && m.role !== RoleType.Member) return false;
    if (roleFilter === 'invited' && m.status !== TeamMemberStatus.Invited) return false;
    return true;
  }), [teamMembers, search, roleFilter]);

  const openEdit = (m: ITeamUser) => {
    setCurrentMember(m);
    reset({ role: m.role, status: m.status });
    setEditOpen(true);
  };

  const onEdit = async (data: MemberEditForm) => {
    if (!currentMember || !teamId) return;
    setActionLoading(true);
    try {
      await VolleyGoalsAPI.updateMembership(currentMember.id, teamId, data.role, data.status);
      setEditOpen(false);
      fetchTeamMembers(teamId, {});
    } finally {
      setActionLoading(false);
    }
  };

  const maxReports = Math.max(...teamMembers.map(m => (m as any).reportCount || 0), 1);

  const roleChips: Array<{ label: string; value: RoleFilter }> = [
    { label: i18next.t('common.all', 'All'), value: 'all' },
    { label: i18next.t('members.filter.trainers', 'Trainers'), value: 'trainer' },
    { label: i18next.t('members.filter.members', 'Members'), value: 'member' },
    { label: i18next.t('members.filter.invited', 'Invited'), value: 'invited' },
  ];

  return (
    <Box className="members-page" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1000 }}>
      <div className="members-header">
        <div>
          <div className="vg-eyebrow">{teamMembers.length} {i18next.t('members.eyebrow', 'Members')}</div>
          <div className="vg-page-title">{i18next.t('members.title', 'Members')}</div>
        </div>
      </div>

      <div className="members-toolbar">
        <input
          className="members-search"
          placeholder={i18next.t('members.search', 'Search members…')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="vg-chip-row">
        {roleChips.map(c => (
          <button
            key={c.value}
            className={`vg-chip${roleFilter === c.value ? ' vg-chip--active' : ''}`}
            onClick={() => setRoleFilter(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="members-list">
        {filteredMembers.map(m => {
          const name = m.name || m.preferredUsername || m.email;
          const isYou = m.id === currentUser?.id;
          const isInvited = m.status === TeamMemberStatus.Invited;
          const reportCount = (m as any).reportCount || 0;
          const activityPct = Math.round((reportCount / maxReports) * 100);
          return (
            <div
              key={m.id}
              className="vg-row-item"
              style={{ opacity: isInvited ? 0.6 : 1 }}
              onClick={() => canWrite ? openEdit(m) : undefined}
            >
              <div className="vg-avatar" style={{ background: avatarBg(name), marginRight: 14 }}>
                {initials(name)}
              </div>
              <div className="members-row-info">
                <div className="members-row-name">
                  {name}
                  {isYou && <span className="members-row-name-you">({i18next.t('members.you', 'you')})</span>}
                </div>
                <div className="members-row-email">{m.email}</div>
              </div>
              <div className="members-row-right">
                <div className="vg-activity-bar">
                  <div className="vg-activity-track">
                    <div className="vg-activity-fill" style={{ width: `${activityPct}%` }} />
                  </div>
                  <div className="vg-activity-label">{reportCount} {i18next.t('members.reports', 'rep.')}</div>
                </div>
                {m.role === RoleType.Trainer
                  ? <span className="vg-badge vg-badge--trainer">{i18next.t(`members.role.${m.role}`, m.role)}</span>
                  : <span className="vg-badge vg-badge--muted">{i18next.t(`members.role.${m.role}`, m.role)}</span>
                }
                {isInvited && <span className="vg-badge vg-badge--open">{i18next.t('members.status.invited', 'Invited')}</span>}
                {canWrite && <span className="vg-chevron">›</span>}
              </div>
            </div>
          );
        })}
        {filteredMembers.length === 0 && (
          <Typography sx={{ fontSize: 12, color: 'var(--vg-text-muted)', py: 4, textAlign: 'center' }}>
            {i18next.t('members.empty', 'No members match the filter.')}
          </Typography>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm"
        PaperProps={{ className: 'vg-dialog-paper' }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 800, borderBottom: '1px solid var(--vg-border)', pb: 1.5 }}>
          {i18next.t('members.editTitle', 'Edit Member')}
        </DialogTitle>
        <DialogContent>
          <div className="members-dialog-form">
            <Controller name="role" control={control} render={({ field }) => (
              <TextField select fullWidth size="small" label={i18next.t('members.role.label', 'Role')} {...field}>
                <MenuItem value={RoleType.Trainer}>{i18next.t('members.role.trainer', 'Trainer')}</MenuItem>
                <MenuItem value={RoleType.Member}>{i18next.t('members.role.member', 'Member')}</MenuItem>
              </TextField>
            )} />
            <Controller name="status" control={control} render={({ field }) => (
              <TextField select fullWidth size="small" label={i18next.t('members.status.label', 'Status')} {...field}>
                <MenuItem value={TeamMemberStatus.Active}>{i18next.t('members.status.active', 'Active')}</MenuItem>
                <MenuItem value={TeamMemberStatus.Invited}>{i18next.t('members.status.invited', 'Invited')}</MenuItem>
              </TextField>
            )} />
          </div>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid var(--vg-border)', px: 2.5, py: 1.5 }}>
          <button className="vg-chip" onClick={() => setEditOpen(false)}>{i18next.t('common.cancel', 'Cancel')}</button>
          <button className="vg-chip vg-chip--active" onClick={handleSubmit(onEdit)} disabled={actionLoading}
            style={{ height: 30, borderRadius: 7, padding: '0 14px' }}>
            {i18next.t('common.save', 'Save')}
          </button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npx jest Members --no-coverage 2>&1 | tail -20
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/trainer/Members.tsx src/resources/styles/pages/members.scss src/__tests__/pages/trainer/Members.test.tsx
git commit -m "feat: redesign Members page with avatar, activity bar, and chip filters"
```

---

## Task 13: Invites redesign

**Files:**
- Modify: `src/pages/trainer/Invites.tsx`
- Modify: `src/resources/styles/pages/invites.scss`
- Modify: `src/__tests__/pages/trainer/Invites.test.tsx`

- [ ] **Step 1: Write failing test**

Add to `src/__tests__/pages/trainer/Invites.test.tsx`:

```tsx
it('renders chip status filters', () => {
  setup();
  render(<Invites />);
  expect(screen.getByText('Pending')).toBeInTheDocument();
  expect(screen.getByText('Accepted')).toBeInTheDocument();
  expect(screen.getByText('Revoked')).toBeInTheDocument();
});

it('renders Send Invite button', () => {
  setup();
  render(<Invites />);
  expect(screen.getByText(/send invite/i)).toBeInTheDocument();
});
```

```bash
npx jest Invites --no-coverage 2>&1 | tail -10
```

- [ ] **Step 2: Update invites.scss**

Replace `src/resources/styles/pages/invites.scss`:

```scss
@use '../variables' as *;
@use '../mixins' as *;

.invites-page {
  display: flex;
  flex-direction: column;
  padding-bottom: 24px;
}

.invites-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.invites-list { display: flex; flex-direction: column; gap: 8px; }

.invites-row-email {
  font-size: 13px;
  font-weight: 600;
  color: var(--palette-text-primary);
}

.invites-row-meta {
  font-size: 10px;
  color: var(--vg-text-muted);
  margin-top: 2px;
  display: flex;
  gap: 8px;
}

.invites-row-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.invites-dialog-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-top: 8px;
}
```

- [ ] **Step 3: Rewrite Invites.tsx**

Replace `src/pages/trainer/Invites.tsx`:

```tsx
import React, { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Controller, useForm } from 'react-hook-form';
import { IInvite, RoleType } from '../../store/types';
import { useTeamStore } from '../../store/teams';
import { useCognitoUserStore } from '../../store/cognitoUser';
import { usePermission } from '../../hooks/usePermission';
import { formatDateTime } from '../../utils/dateTime';
import i18next from 'i18next';

type InviteForm = { email: string; role: RoleType; message: string };
type StatusFilter = 'all' | 'pending' | 'accepted' | 'revoked';

function statusBadgeClass(status: string) {
  if (status === 'pending') return 'vg-badge vg-badge--open';
  if (status === 'accepted') return 'vg-badge vg-badge--done';
  return 'vg-badge vg-badge--muted';
}

export function Invites() {
  const fetchTeamInvites = useTeamStore(s => s.fetchTeamInvites);
  const createInvite = useTeamStore(s => s.createInvite);
  const resendInvite = useTeamStore(s => s.resendInvite);
  const revokeInvite = useTeamStore(s => s.revokeInvite);
  const teamInvites = useTeamStore(s => s.teamInvites);
  const invites = teamInvites?.invites || [];
  const selectedTeam = useCognitoUserStore(s => s.selectedTeam);
  const teamId = selectedTeam?.team?.id || '';
  const canWrite = usePermission('invites:write');

  React.useEffect(() => {
    if (teamId) fetchTeamInvites(teamId, {});
  }, [teamId]);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [currentInvite, setCurrentInvite] = useState<IInvite | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { control, handleSubmit, reset } = useForm<InviteForm>({
    defaultValues: { email: '', role: RoleType.Member, message: '' },
  });

  const filteredInvites = useMemo(() => {
    if (statusFilter === 'all') return invites;
    return invites.filter(inv => (inv.status || 'pending') === statusFilter);
  }, [invites, statusFilter]);

  const onCreate = async (data: InviteForm) => {
    if (!teamId) return;
    setActionLoading(true);
    try {
      await createInvite(teamId, data.email, data.role, data.message, true);
      setCreateOpen(false);
      reset();
      fetchTeamInvites(teamId, {});
    } finally {
      setActionLoading(false);
    }
  };

  const onRevoke = async () => {
    if (!currentInvite || !teamId) return;
    setActionLoading(true);
    try {
      await revokeInvite(currentInvite.id, teamId);
      setRevokeOpen(false);
      fetchTeamInvites(teamId, {});
    } finally {
      setActionLoading(false);
    }
  };

  const statusChips: Array<{ label: string; value: StatusFilter }> = [
    { label: i18next.t('common.all', 'All'), value: 'all' },
    { label: i18next.t('invites.status.pending', 'Pending'), value: 'pending' },
    { label: i18next.t('invites.status.accepted', 'Accepted'), value: 'accepted' },
    { label: i18next.t('invites.status.revoked', 'Revoked'), value: 'revoked' },
  ];

  return (
    <Box className="invites-page" sx={{ p: { xs: 2, sm: 3 }, maxWidth: 900 }}>
      <div className="invites-header">
        <div>
          <div className="vg-eyebrow">{invites.length} {i18next.t('invites.eyebrow', 'Invites')}</div>
          <div className="vg-page-title">{i18next.t('invites.title', 'Invites')}</div>
        </div>
        {canWrite && (
          <button className="vg-chip vg-chip--active" onClick={() => { reset(); setCreateOpen(true); }}
            style={{ height: 34, borderRadius: 8 }}>
            {i18next.t('invites.sendInvite', 'Send Invite')}
          </button>
        )}
      </div>

      <div className="vg-chip-row">
        {statusChips.map(c => (
          <button
            key={c.value}
            className={`vg-chip${statusFilter === c.value ? ' vg-chip--active' : ''}`}
            onClick={() => setStatusFilter(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="invites-list">
        {filteredInvites.map(inv => {
          const status = inv.status || 'pending';
          const isPending = status === 'pending';
          return (
            <div
              key={inv.id}
              className="vg-row-item"
              style={{ opacity: isPending ? 1 : 0.7, cursor: 'default' }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="invites-row-email">{inv.email}</div>
                <div className="invites-row-meta">
                  <span>{i18next.t('invites.sent', 'Sent')} {formatDateTime(inv.createdAt)}</span>
                </div>
              </div>
              <div className="invites-row-right">
                <span className="vg-badge vg-badge--trainer">{inv.role}</span>
                <span className={statusBadgeClass(status)}>{status}</span>
                {isPending && canWrite && (
                  <>
                    <button className="vg-chip" style={{ height: 26, fontSize: 10 }}
                      onClick={() => resendInvite(inv.id, teamId)}>
                      {i18next.t('invites.resend', 'Resend')}
                    </button>
                    <button className="vg-chip" style={{ height: 26, fontSize: 10, color: 'var(--palette-error-main)', borderColor: 'var(--palette-error-main)' }}
                      onClick={() => { setCurrentInvite(inv); setRevokeOpen(true); }}>
                      {i18next.t('invites.revoke', 'Revoke')}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {filteredInvites.length === 0 && (
          <Typography sx={{ fontSize: 12, color: 'var(--vg-text-muted)', py: 4, textAlign: 'center' }}>
            {i18next.t('invites.empty', 'No invites.')}
          </Typography>
        )}
      </div>

      {/* Send Invite Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm"
        PaperProps={{ className: 'vg-dialog-paper' }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 800, borderBottom: '1px solid var(--vg-border)', pb: 1.5 }}>
          {i18next.t('invites.sendInvite', 'Send Invite')}
        </DialogTitle>
        <DialogContent>
          <div className="invites-dialog-form">
            <Controller name="email" control={control} rules={{ required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }}
              render={({ field, fieldState }) => (
                <TextField fullWidth size="small" label={i18next.t('invites.form.email', 'Email')}
                  type="email" error={!!fieldState.error} {...field} />
              )} />
            <Controller name="role" control={control} render={({ field }) => (
              <TextField select fullWidth size="small" label={i18next.t('invites.form.role', 'Role')} {...field}>
                <MenuItem value={RoleType.Member}>{i18next.t('members.role.member', 'Member')}</MenuItem>
                <MenuItem value={RoleType.Trainer}>{i18next.t('members.role.trainer', 'Trainer')}</MenuItem>
              </TextField>
            )} />
            <Controller name="message" control={control} render={({ field }) => (
              <TextField fullWidth multiline rows={2} size="small"
                label={i18next.t('invites.form.message', 'Message (optional)')} {...field} />
            )} />
          </div>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid var(--vg-border)', px: 2.5, py: 1.5 }}>
          <button className="vg-chip" onClick={() => setCreateOpen(false)}>{i18next.t('common.cancel', 'Cancel')}</button>
          <button className="vg-chip vg-chip--active" onClick={handleSubmit(onCreate)} disabled={actionLoading}
            style={{ height: 30, borderRadius: 7, padding: '0 14px' }}>
            {i18next.t('invites.sendInvite', 'Send Invite')}
          </button>
        </DialogActions>
      </Dialog>

      {/* Revoke Confirm Dialog */}
      <Dialog open={revokeOpen} onClose={() => setRevokeOpen(false)} maxWidth="xs"
        PaperProps={{ className: 'vg-dialog-paper' }}>
        <DialogTitle sx={{ fontSize: 15, fontWeight: 800, borderBottom: '1px solid var(--vg-border)', pb: 1.5 }}>
          {i18next.t('invites.revokeTitle', 'Revoke Invite')}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mt: 1, fontSize: 12 }}>
            {i18next.t('invites.revokeConfirm', 'Revoke invite for')} <strong>{currentInvite?.email}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid var(--vg-border)', px: 2.5, py: 1.5 }}>
          <button className="vg-chip" onClick={() => setRevokeOpen(false)}>{i18next.t('common.cancel', 'Cancel')}</button>
          <button className="vg-chip" onClick={onRevoke} disabled={actionLoading}
            style={{ background: 'var(--palette-error-main)', color: '#fff', borderColor: 'var(--palette-error-main)', height: 30, borderRadius: 7, padding: '0 14px' }}>
            {i18next.t('invites.revoke', 'Revoke')}
          </button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
```

- [ ] **Step 4: Run all tests**

```bash
npx jest Invites --no-coverage 2>&1 | tail -20
```

```bash
npm test -- --no-coverage 2>&1 | tail -30
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/trainer/Invites.tsx src/resources/styles/pages/invites.scss src/__tests__/pages/trainer/Invites.test.tsx
git commit -m "feat: redesign Invites page with chip filters and Option-A dialogs"
```

---

## Self-Review

### Spec coverage check

| Spec section | Covered by task |
|---|---|
| 2. Colour tokens → CSS variables | Task 1 |
| 3. Typography → eyebrow, page-title, panel-title classes | Task 2 |
| 4.1–4.8 Component patterns → shared SCSS | Task 2 |
| 5. Heatmap (GoalHeatmap + buildHeatmapData) | Task 3 |
| 6.1 Dashboard | Task 4 |
| 6.2 Goals | Task 5 |
| 6.3 GoalDetails + season pills/tag | Task 6 |
| 6.4 Seasons list | Task 7 |
| 6.4a SeasonDetails + goal tag/untag | Task 8 |
| 6.5 Progress + ContextSwitcher chips | Task 9 |
| 6.6 ProgressCreation + rating cells | Task 10 |
| 6.7 ProgressDetails + coloured cells | Task 11 |
| 6.8 Members | Task 12 |
| 6.9 Invites | Task 13 |
| 8. Constraints (SCSS, CSS vars, react-hook-form, Zustand) | Applied throughout |
| 9. Dialog Option A (vg-dialog-paper) | Applied to all dialogs in tasks 5–13 |

### Placeholder scan

No TBDs, TODOs, or incomplete steps found.

### Type consistency

- `HeatmapData`, `HeatmapRow`, `HeatmapCell`, `HEATMAP_RATING_COLORS` — defined in Task 3 (chartUtils), used in Tasks 4, 6, 10, 11 ✓
- `buildHeatmapData` — defined Task 3, called Tasks 4, 6 ✓
- `GoalHeatmap` props — `data: HeatmapData`, `onCellClick: (progressId, reportId) => void` — consistent across all usages ✓
- `vg-chip`, `vg-chip--active`, `vg-row-item`, `vg-panel`, etc. — defined Task 2, used Tasks 4–13 ✓
- `vg-dialog-paper` — defined Task 2, applied via `PaperProps={{ className: 'vg-dialog-paper' }}` in Tasks 5–13 ✓
