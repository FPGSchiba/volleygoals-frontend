# UI Redesign & Progress Heatmap — Design Spec
**Date:** 2026-04-26  
**Scope:** All Normal-user pages (Dashboard, Goals, Goal Details, Seasons, Progress, Progress Creation, Progress Details, Members, Invites). Tenant/user admin pages are out of scope. Navigation shell is structurally unchanged.

---

## 1. Design Principles

- **Bold & minimal.** Large, high-contrast typography and crimson numbers carry the hierarchy. Borders and backgrounds do the rest — no heavy shadows or coloured left-borders.
- **Consistent pattern language.** Every list page uses the same toolbar (search + action button), filter chips, and row structure. Users only learn the pattern once.
- **One accent colour.** `#C41E3A` is the single accent used identically in both modes. Status colours (green, amber, blue) are used sparingly for semantic badges only.
- **Dark/Light parity.** Both modes use the same component shapes and token names — only the background/border/muted-text values differ.

---

## 2. Colour Tokens

| Token | Dark | Light |
|---|---|---|
| `bg-default` | `#0d0d0d` | `#f2f2f2` |
| `bg-paper` | `#1a1a1a` | `#ffffff` |
| `bg-subtle` | `#141414` | `#fafafa` |
| `border` | `#252525` | `#e4e4e4` |
| `border-strong` | `#2a2a2a` | `#dddddd` |
| `text-primary` | `#ffffff` | `#111111` |
| `text-secondary` | `#aaaaaa` | `#555555` |
| `text-muted` | `#555555` | `#aaaaaa` |
| `text-disabled` | `#333333` | `#cccccc` |
| `accent` | `#C41E3A` | `#C41E3A` |
| `rail-bg` | `#161616` | `#e8e8e8` |
| `rail-border` | `#222222` | `#dddddd` |

Status badge colours are the same in both modes (using low-opacity backgrounds):

| Status | Background | Text |
|---|---|---|
| Open / Pending | `rgba(255,152,0,0.12)` | `#f09800` |
| In Progress | `rgba(33,150,243,0.12)` | `#2196f3` |
| Done / Accepted | `rgba(76,175,80,0.12)` | `#4caf50` |
| Trainer role | `rgba(196,30,58,0.12)` | `#C41E3A` |
| Revoked / Archived | `rgba(128,128,128,0.10)` | muted text |

---

## 3. Typography

| Element | Size | Weight | Letter-spacing |
|---|---|---|---|
| Page title | 26px | 900 | -1px |
| Page eyebrow | 10px | 700 | +1px (uppercase) |
| Section heading (panel-title) | 10px | 700 | +0.8px (uppercase) |
| Card title / row title | 13px | 700 | — |
| Body / field text | 12px | 400 | — |
| Meta / caption | 10–11px | 400–600 | — |
| Badge | 9px | 700 | +0.4px (uppercase) |

---

## 4. Component Patterns

### 4.1 Cards / Panels
- `border-radius: 11px`
- `border: 1px solid <border>`
- Background: `bg-paper`
- No box-shadow in dark mode; `0 2px 8px rgba(0,0,0,0.07)` in light mode (optional)

### 4.2 Stat Cards
- Same card style as panels
- Number: 22–28px, weight 900, colour `accent`
- Label: 9–10px, weight 600, colour `text-muted`

### 4.3 Filter Chips
Used on every list page for status, type, and other filters.
- Height: 26–28px, `border-radius: 6–7px`, `padding: 0 10–12px`
- Default: `bg-paper` background, `border`, `text-muted` colour
- Active: `rgba(196,30,58,0.15)` background, `rgba(196,30,58,0.3)` border, `accent` colour

### 4.4 Row Items (Goals, Reports, Members, Invites)
- `border-radius: 11px`, `border: 1px solid <border>`, `bg-paper`
- Hover: border transitions to `rgba(196,30,58,0.25)`
- Padding: `12–14px 16px`
- Right side: badges + chevron `›`

### 4.5 Buttons
- **Primary:** `background: #C41E3A`, `color: #fff`, `border-radius: 8px`, height 32–34px
- **Ghost:** transparent background, `border: 1px solid <border>`, `text-muted` colour

### 4.6 Text Inputs & Textareas
- `border-radius: 8px`, `border: 1px solid <border>`, `bg-subtle` background
- Font size 12px, padding `9px 12px`

### 4.7 Back Navigation
- `← Back to [Page]`, 11px, weight 600, `text-muted` colour, cursor pointer
- Margin bottom 16px before the page header

### 4.8 Page Header Pattern
All detail pages follow:
```
[back nav]
[eyebrow]     [actions]
[page title]
```
List pages follow:
```
[eyebrow]
[page title]
---
[search box]  [primary action button]
[filter chips row]
[list]
```

---

## 5. Progress Heatmap

Replaces the existing scatter chart in `GoalActivityChart` and on the Dashboard.

### Cell colour scale (rating 1–5)

| Rating | Background | Text colour |
|---|---|---|
| 1 | `#fce4e9` | `#6b1323` |
| 2 | `#f4a0b0` | `#5a0e1c` |
| 3 | `#e05575` | `#ffffff` |
| 4 | `#c4283e` | `#ffffff` |
| 5 | `#8b0000` | `#ffffff` |
| Empty | `bg-subtle` / muted | — |

### Layout
- Grid: `goal-name column (90px) + date columns (1fr each)`
- Cell size: 26px height, `border-radius: 5px`
- Gap: 3–4px between cells
- Date headers: 9–10px, `text-muted`, above the grid
- Goal labels: 10px, `text-muted`, right-aligned, truncated
- Each cell shows the rating number
- Cells are clickable — open the progress entry (existing `EntryDrawer` behaviour)

### Legend
Shown below the grid: `Rating: [1][2][3][4][5]` with labelled cells matching the scale.

---

## 6. Page Designs

### 6.1 Dashboard
- **Eyebrow:** `[Season name] · Active Season`
- **Stat grid:** 5 columns — Open Goals, In Progress, Completed, Reports, Members. All numbers in `accent`.
- **Content row (2 columns):**
  - Left: "My Progress" panel — heatmap (recent entries, last ~8 weeks)
  - Right: "Recent Activity" panel — dot + description + relative time, no avatars
- **Season strip** at the bottom: season name, goal completion fraction, progress bar, percentage in `accent`, "View →" link.

### 6.2 Goals
- **Eyebrow:** `[N] Goals across all seasons`
- **Toolbar:** search box (flex 1) + "New Goal" primary button
- **Filter row:** Status chips (All / Open / In Progress / Done) · Type chips (All / Individual / Team) · Season multi-select dropdown (checkboxes per season, badge showing count of selected)
- **Goal rows:** icon · title · owner + type + last-entry meta · season tags · status badge · chevron

### 6.3 Goal Details
- **Two-column layout:** left (description, mini heatmap, comments) · right (meta panel)
- **Mini heatmap:** all entries for this goal across time, linear row of cells, summary stats below (count, avg, latest)
- **Meta panel fields:** Owner, Type, Status, Created, Last entry, Seasons
- **Seasons field:** season pills (accent colour, rounded) listing all seasons this goal belongs to. Below the pills, Trainers see a compact inline "Add to season…" dropdown + "Add" button. Removing a season association uses an ✕ on the pill (Trainer-only, visible on hover).
- **Actions:** Edit (ghost) + Add Entry (primary) in the page header

### 6.4 Seasons (list)
- **Active season hero card:** "Active Season" green label, season name (20px/900), 4 stat counters, progress bar + percentage, "View Goals" (primary) + "View Reports" (ghost) buttons
- **Past seasons list:** season row with icon, name, date range, goal/report count meta, mini progress bar, completion status badge
- Each row is clickable and navigates to Season Details

### 6.4a Season Details
- **Back nav:** `← Back to Seasons`
- **Eyebrow:** `Season`
- **Page title:** season name
- **Header actions:** Edit Season (ghost) — opens inline edit or dialog for name/status/dates (Trainer-only)
- **Two-column layout:**
  - **Left — Goals panel:** lists all goals currently tagged to this season, each as a row with goal name, type + status meta, and an ✕ remove button (Trainer-only). Below the list: "Add a goal to this season…" dropdown + "Add" button (Trainer-only).
  - **Right — Meta panel:** Status badge, Start date, End date, goal count, report count, completion percentage with progress bar

### 6.5 Progress Reports
- **Header:** page title + season chip selector (right) + "New Report" primary button
- **Context switcher:** chips — 👤 My Progress · 👥 Team Overview · 🔍 Member ▾ (same chip pattern as Goals filters, replacing MUI ToggleButtonGroup)
- **Personal view:** heatmap panel + reports list (summary · entry count · date · chevron)
- **Team Overview:** 3-column member card grid — avatar, name, report count, relative activity bar

### 6.6 Progress Report Creation
- **Season chip selector** (top, before the form)
- **Report panel:** Summary (text input) + Notes (textarea)
- **Goal Ratings panel:** one row per active goal — goal name + 5 numbered rating cells (heatmap colours, click to select) + optional notes input. Goals without a rating are simply skipped on submit.
- **Actions:** "Submit Report" (primary) + "Cancel" (ghost)

### 6.7 Progress Report Details
- **Heading:** report summary as the large title
- **Meta row:** author chip (avatar + name) · date · season · Edit (ghost) · Delete (danger)
- **Session Notes panel:** `details` field
- **Goal Ratings panel:** one entry per goal — coloured rating cell + goal name, expandable to show notes + per-entry comments (existing `CommentSection` behaviour)
- **Report Comments panel:** report-level `CommentSection` at the bottom

### 6.8 Members
- **Eyebrow:** `[N] Members`
- **Toolbar:** search box + filter chips (All / Trainers / Members / Invited)
- **Member rows:** avatar (coloured by name hash) · name (with "(you)" suffix for current user) · email · activity bar (reports this season, relative to most active member) · role badge · status badge · chevron
- **Invited members** rendered at reduced opacity (0.6)

### 6.9 Invites
- **Header:** page title + "Send Invite" primary button
- **Filter chips:** All / Pending / Accepted / Revoked
- **Invite rows:** email · sent/accepted/revoked date · role badge · status badge · Resend + Revoke action buttons (shown only on Pending rows)
- **Accepted and Revoked rows** rendered at reduced opacity

---

## 7. Navigation Shell (unchanged)

The existing navigation is preserved structurally:
- **Desktop:** permanent collapsible sidebar — icon rail (52px collapsed) with tooltips, expands to show labels
- **Mobile:** fixed top bar + bottom navigation bar
- **Global search**, theme toggle, profile menu, and team switcher remain in their current positions

Minor cosmetic updates to match new tokens (rail background, icon colours, active item highlight) but no structural changes.

---

## 8. Implementation Constraints

- **MUI `sx` props** are acceptable for MUI-specific layout concerns (flex, gap, padding on MUI components) and stay as-is.
- **All custom visual styles** (colours, borders, hover states, shadows, responsive layout) go in SCSS — not inline styles or `sx`.
- **No hardcoded colour values in SCSS** — use `var(--palette-*)` CSS variables exclusively.
- **All dialog/modal fields must be validated** using `react-hook-form` rules or Zod schemas. No UUID input fields anywhere in forms.
- **`useSettingsStore`** uses Zustand persist middleware — no raw `localStorage` calls outside the store.

---

## 9. Dialog / Modal Design

**Approved style: Option A — Elevated panel with crimson top border.**

- **Top border:** `3px solid #C41E3A` — the only accent element on the dialog, making it instantly identifiable
- **Background:** `bg-paper` (`#1a1a1a` dark / `#ffffff` light)
- **Border:** `1px solid <border>`, `border-radius: 14px`
- **Box shadow:** `0 24px 48px rgba(0,0,0,0.7)` dark / `0 24px 48px rgba(0,0,0,0.18)` light
- **Header:** `border-bottom: 1px solid <border>`, padding `16px 18px 12px`; title 15px weight 800; close button at right (opacity 0.4)
- **Body:** padding `0 18px 16px`, gap `10px` between fields; field labels 10px weight 700 uppercase `text-muted`; inputs use `bg-subtle` background, `border` border-color, `border-radius: 7px`
- **Footer:** `border-top: 1px solid <border>`, padding `12px 18px`; flex row, right-aligned; Cancel (ghost) + primary action button
- **Backdrop:** `rgba(0,0,0,0.85)` dark / `rgba(0,0,0,0.25)` light, with `backdrop-filter: blur(2px)` on the overlay
- Dialog width: `320px` max, responsive to `90vw` on mobile

---

## 10. Out of Scope

- Tenant administration pages
- User administration pages  
- Reporting page (already satisfactory)
- Auth / onboarding pages
