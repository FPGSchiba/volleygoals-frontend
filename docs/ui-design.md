# VolleyGoals UI Design Reference

> This file is the canonical UI design reference for the Normal-user interface redesign.  
> Full spec with rationale: `docs/superpowers/specs/2026-04-26-ui-redesign-design.md`

---

## Colour Tokens

| Token | Dark | Light |
|---|---|---|
| `bg-default` | `#0d0d0d` | `#f2f2f2` |
| `bg-paper` | `#1a1a1a` | `#ffffff` |
| `bg-subtle` | `#141414` | `#fafafa` |
| `border` | `#252525` | `#e4e4e4` |
| `text-primary` | `#ffffff` | `#111111` |
| `text-secondary` | `#aaaaaa` | `#555555` |
| `text-muted` | `#555555` | `#aaaaaa` |
| `accent` | `#C41E3A` | `#C41E3A` |

## Progress Heatmap Cell Colours

| Rating | Background | Text |
|---|---|---|
| 1 | `#fce4e9` | `#6b1323` |
| 2 | `#f4a0b0` | `#5a0e1c` |
| 3 | `#e05575` | `#ffffff` |
| 4 | `#c4283e` | `#ffffff` |
| 5 | `#8b0000` | `#ffffff` |

## Key Component Rules

- **Cards / panels:** `border-radius: 11px`, `border: 1px solid <border>`, `bg-paper`
- **Filter chips:** `border-radius: 7px`, active = `rgba(196,30,58,0.15)` bg + `accent` text
- **Row items:** same card style, hover border → `rgba(196,30,58,0.25)`
- **Primary button:** `background: #C41E3A`, `border-radius: 8px`
- **Page title:** 26px, weight 900, letter-spacing -1px
- **Eyebrow:** 10px, weight 700, uppercase, letter-spacing +1px, `text-muted`

## Pages in Scope

| Page | Key design notes |
|---|---|
| Dashboard | 5-col stat grid (all numbers in accent), heatmap panel, activity feed, season progress strip |
| Goals | Search + New Goal toolbar, status/type/season filter chips, goal rows with season tags |
| Goal Details | Two-column: content left, meta panel right; mini heatmap, comments; Seasons row with pills + Trainer add/remove |
| Seasons | Active season hero card + past seasons list with mini progress bars; rows navigate to Season Details |
| Season Details | Two-column: left = goals list with Trainer add/remove; right = meta panel (status, dates, counts, completion bar) |
| Progress Reports | Season chip + context switcher chips; heatmap replaces scatter chart; report rows |
| Progress Creation | Season chip, summary/notes fields, goal rating cells (numbered 1–5, heatmap colours) |
| Progress Details | Report summary as title, expandable goal entry rows, comments |
| Members | Member rows with activity bar, role/status badges, invited rows dimmed |
| Invites | Status filter chips, invite rows with Resend/Revoke actions on pending only |

## Dialog / Modal Design

**Option A — Elevated panel with crimson top border:**
- `border-top: 3px solid #C41E3A`, `border-radius: 14px`, `border: 1px solid <border>`
- Background: `bg-paper`; shadow: `0 24px 48px rgba(0,0,0,0.7)` dark / `rgba(0,0,0,0.18)` light
- Header: `border-bottom: 1px solid <border>`; title 15px/800; close button right (opacity 0.4)
- Body: fields with `bg-subtle` background, 10px uppercase muted labels
- Footer: right-aligned Cancel (ghost) + primary button, `border-top: 1px solid <border>`
- Backdrop: `rgba(0,0,0,0.85)` dark / `rgba(0,0,0,0.25)` light + `backdrop-filter: blur(2px)`
- Width: `320px` max, `90vw` mobile

## Navigation Shell

Structurally unchanged. Cosmetic token updates only (rail bg, icon colours, active highlight).
