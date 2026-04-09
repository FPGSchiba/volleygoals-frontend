# Progress Report — Permission-Aware Views

**Date:** 2026-04-08
**Status:** Draft
**Scope:** Refactor the ProgressReport page to render different views based on the user's permissions, not their role name.

---

## Problem

All users currently see the same ProgressReport view: a personal progress graph and a list of entries. Users with oversight responsibilities (trainers, admins) have no way to see team-level progress or inspect individual members.

---

## Permission Detection

The frontend derives two boolean flags from the current team's permission set. No role name is ever read.

```ts
const canParticipate = permissions.includes('individual_goals:write')
const canOversee     = permissions.includes('members:read')
```

These flags are computed in a `useProgressReportPermissions()` hook and determine the entire view tree.

| `canParticipate` | `canOversee` | View Mode |
|---|---|---|
| ✓ | ✗ | Personal only — no switcher |
| ✗ | ✓ | Team only — lands on Team Overview, no personal section |
| ✓ | ✓ | Both — Context Switcher visible, defaults to "My Progress" |

---

## UI Design: Context Switcher (Option B)

### Navigation

A 3-segment MUI `ToggleButtonGroup` renders **only when both `canParticipate` and `canOversee` are true**:

```
[ 👤 My Progress ] [ 👥 Team Overview ] [ 👤 Member ▾ ]
```

- **My Progress** — switches to personal graph
- **Team Overview** — switches to team aggregate view
- **Member ▾** — activates a MUI `Autocomplete` next to the toggle group for selecting any team member (searchable, scales to 16+ members)

When only one flag is true, the toggle group does not render — the correct view loads directly:
- `canParticipate` only → personal view, no navigation needed
- `canOversee` only → Team Overview loads directly; member drill-down is accessed by clicking a member card (see Team Overview View)

### Component Tree

```tsx
<ProgressReportPage>
  {/* Permission hook */}
  const { canParticipate, canOversee } = useProgressReportPermissions()

  {/* Switcher — only when user has both */}
  {canParticipate && canOversee && <ContextSwitcher />}

  {/* View routing */}
  {view === 'personal' && <PersonalProgressView />}
  {view === 'team'     && <TeamOverviewView />}
  {view === memberId   && <MemberProgressView memberId={view} />}
</ProgressReportPage>
```

---

## Personal Progress View

### Goal × Date Scatter Chart

The primary visual element is a Recharts `ScatterChart` showing goal activity over time:

- **X axis** — dates (report dates across the current season)
- **Y axis** — goals (categorical, one row per individual goal)
- **Dots** — one dot per `Progress` entry (a goal rating within a report)
  - Number inside dot = rating value (1–5)
  - Color = performance threshold (blue = on track, orange = needs work)
- **Interactivity** — clicking a dot opens a MUI Drawer with the entry detail (read/edit depending on ownership)

### Entries List

Below the chart, a scrollable list of `ProgressReport` rows. Clicking a row navigates to the full report detail page.

### Controls

- `+ New Report` button only renders if `canParticipate`

---

## Team Overview View

Rendered when `view === 'team'` (requires `canOversee`):

- Aggregate progress chart across all members
- Member cards grid: name, report count for the season, progress indicator bar
- Member search/filter input
- **Clicking a member card** switches to that member's progress view (replaces the toggle group's "Member ▾" flow for oversight-only users)

No create or edit controls — oversight users cannot create reports on behalf of others.

---

## Member Progress View

Rendered when `view === memberId` (requires `canOversee`):

- Identical layout to PersonalProgressView but for the selected member
- Always read-only — no `+ New Report`, no Edit/Delete controls regardless of any permission
- Drawer opens on dot click (read-only entry detail)
- Report row click navigates to report detail page (read-only)

---

## Interaction Patterns

| Interaction | Result |
|---|---|
| Click dot on graph | MUI Drawer — entry detail |
| Click report row in list | Navigate to `/teams/:id/progress-reports/:reportId` |
| Edit/Delete on report | Only shown if `report.authorId === currentUserId` |
| Member autocomplete | MUI Autocomplete, searchable, all team members |

---

## Ownership & Permissions Impact on UI

The backend enforces access via a 5-layer evaluation chain. The frontend reflects this without duplicating logic:

| Situation | UX consequence |
|---|---|
| Viewing own report (`authorId === currentUserId`) | Edit + Delete buttons visible |
| Oversight user viewing another member's report | Read-only — no edit controls rendered |
| User without `progress_reports:write` | No `+ New Report` button |
| Oversight user opening entry Drawer for another member | Always read-only mode |

The frontend never hides data based on role name. Controls are shown/hidden based on:
1. `authorId === currentUserId` — ownership
2. `canParticipate` / `canOversee` — permission flags

The API is the authoritative enforcer. The UI avoids rendering controls that would result in a 403.

---

## Data Flow

```
Mount ProgressReportPage
  └─ useProgressReportPermissions()
       ├─ canParticipate = permissions.includes('individual_goals:write')
       └─ canOversee     = permissions.includes('members:read')

  if canOversee     → GET /teams/:id/members
  if view personal  → GET /teams/:id/progress-reports (own reports)
  if view team      → GET /teams/:id/progress-reports (all reports)
  if view memberId  → GET /teams/:id/progress-reports (filtered by authorId)
```

### Zustand Store Shape

```ts
{
  viewMode: 'personal' | 'team' | string,  // string = memberId
  reports: ProgressReportWithProgress[],
  members: TeamMember[],
  selectedEntryId: string | null,          // drives Drawer open/closed
}
```

- View switches are instant if data already cached; refetch only on first switch to a new `memberId`
- `selectedEntryId` drives the Drawer — setting it opens the Drawer, clearing it closes it
- Scatter chart data is derived from `reports` — no separate fetch

---

## Role Flows (Permission-Derived)

### Member (canParticipate ✓ · canOversee ✗)
1. Lands on personal graph — no switcher
2. Reads goal-activity chart; dots show which goals were logged on which dates
3. Clicks a dot → Drawer opens with entry detail (editable — own report)
4. Clicks a report row → navigates to full report page (Edit/Delete visible)
5. Creates new report via `+ New Report`

### Trainer (canParticipate ✗ · canOversee ✓)
1. Lands on Team Overview directly — no switcher, no personal section
2. Sees aggregate team chart and member cards
3. Clicks a member card → switches to that member's goal-activity graph (read-only)
4. Clicks a dot → read-only Drawer; clicks a row → read-only report detail
5. Uses browser back / a back button to return to Team Overview

### Admin/playing (canParticipate ✓ · canOversee ✓)
1. Lands on personal graph (default) — full switcher visible
2. Uses personal view exactly like a Member (graph, drawer, navigate, create)
3. Switches to Team Overview — same as Trainer team view
4. Switches to Member ▾ → inspects any member read-only
5. Switches back to My Progress — context preserved

---

## Tech Stack Notes

- **Chart:** Recharts `ScatterChart` with categorical Y axis for goals
- **Navigation:** MUI `ToggleButtonGroup` + MUI `Autocomplete` for member picker
- **Drawer:** MUI `Drawer` (anchor right) for entry detail
- **State:** Zustand store; React Router v7 for navigation
- **Forms:** React Hook Form + Zod for any editable fields in Drawer
- **Permissions:** Read from existing permissions store — no new API call needed
