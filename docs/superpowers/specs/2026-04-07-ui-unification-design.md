# UI Unification Design

**Date:** 2026-04-07  
**Status:** Approved  
**Branch:** develop

---

## Overview

Unify styling, translations, and state handling across the entire volleygoals-frontend application. The goal is a consistent, maintainable codebase where:
- All styles live in SCSS files with a 3-part class naming convention
- All labels are translated via i18next in both English and German
- All persistent state flows through Zustand stores
- All user displays show a human-readable name (never a UUID)

---

## Approach

**Option B — Infrastructure First, then Systematic Page-by-Page.**

Build shared foundations first (SCSS variables, settings store, UserDisplay component, translation gaps), then fix each page in one pass using those foundations. Each page is fully finished before moving to the next.

---

## Section 1: SCSS Foundation

### New files

| File | Purpose |
|------|---------|
| `src/resources/styles/_variables.scss` | Breakpoints, shared tokens |
| `src/resources/styles/_mixins.scss` | Responsive mixins |

### Breakpoints

```scss
$bp-sm: 600px;   // mobile → tablet
$bp-md: 960px;   // tablet → desktop
$bp-lg: 1280px;  // desktop → wide
```

### Responsive mixins

```scss
@mixin mobile-only { @media (max-width: #{$bp-sm - 1px}) { @content; } }
@mixin tablet-up   { @media (min-width: $bp-sm)           { @content; } }
@mixin desktop-up  { @media (min-width: $bp-md)           { @content; } }
```

### Class naming convention

All CSS classes follow the 3-part `[namespace]-[block]-[element]` pattern:
- `users-list-header`, `users-list-row`, `users-filter-email`
- `tenants-list-header`, `tenants-dialog-form`
- `members-list-row`, `members-search-field`

Existing `item-list-*` classes already follow this convention and are kept as-is.

### SCSS load strategy

All styles are loaded centrally through `src/resources/styles/index.scss`, which is compiled to `index.css` and imported in `public/index.html`. No SCSS imports in component or page `.tsx` files.

**Files to remove SCSS imports from:**
- `src/pages/user/Seasons.tsx`
- `src/pages/user/Goals.tsx`

### Partial usage

`_variables.scss` and `_mixins.scss` are SCSS partials. Each page SCSS file that needs them opens with:

```scss
@use '../variables' as *;
@use '../mixins' as *;
```

They are not loaded via `meta.load-css` in `index.scss`.

### New SCSS files to create

All new page SCSS files are added to the `@include meta.load-css(...)` list in `index.scss`.

**Pages (currently missing SCSS):**
- `pages/users.scss`
- `pages/tenants.scss`
- `pages/tenant-details.scss`
- `pages/members.scss`
- `pages/invites.scss`
- `pages/team-settings.scss`
- `pages/tenant-roles.scss`
- `pages/tenant-policies.scss`
- `pages/season-details.scss`
- `pages/goal-details.scss`
- `pages/progress-details.scss`
- `pages/progress-creation.scss`
- `pages/dashboard.scss`

### Dark/Light mode

Styles use existing MUI CSS variables (`var(--palette-background-paper)`, `var(--palette-text-primary)`, `var(--palette-divider)`, etc.) for theme-aware colors. No hardcoded color values in SCSS.

### Mobile/Desktop

All new SCSS files use the responsive mixins for layout differences. Pages with lists collapse to single-column on mobile. Dialogs use `fullScreen` on mobile.

---

## Section 2: `useSettingsStore`

### New file: `src/store/settings.ts`

```ts
type SettingsState = {
  theme: 'light' | 'dark';
  language: 'en' | 'de';
}
type SettingsActions = {
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (language: 'en' | 'de') => void;
}
```

Uses Zustand `persist` middleware with `localStorage` as storage backend.

### Migration

| Current location | Current behavior | New behavior |
|-----------------|-----------------|-------------|
| `src/index.tsx` | Direct `localStorage.getItem/setItem('theme')` | Read from `useSettingsStore` |
| `src/utils/i18nHelpers.ts` | Direct `localStorage.setItem(LANG_KEY, lang)` | Call `useSettingsStore.getState().setLanguage(lang)` |
| `src/i18n/config.ts` | Direct `localStorage.getItem(LANG_KEY)` | Read from `useSettingsStore` |

### `selectedTeam` persistence fix

`selectedTeam` is currently stored in `sessionStorage` (lost on tab close). Fix: swap `sessionStorage` → `localStorage` in `src/store/util.ts` (`getSessionItem`, `setSessionItem`, `removeSessionItem`). The key `vg:selectedTeamId` and the cognitoUser store remain unchanged — only the storage backend changes.

---

## Section 3: `UserDisplay` Component

### New file: `src/components/UserDisplay.tsx`

```tsx
interface UserDisplayProps {
  user?: {
    id?: string;
    name?: string;
    preferredUsername?: string;
    email?: string;
    picture?: string;
  };
  fallbackId?: string;   // shown as '?' placeholder if no user object, never as raw UUID
  size?: 'small' | 'medium';
  showAvatar?: boolean;  // default true
}
```

### Display logic

- `displayName = preferredUsername ?? name ?? email ?? '?'`
- Never shows a UUID
- If `user` is undefined and `fallbackId` is provided, renders a `?` placeholder (not the ID)
- Avatar: uses `picture` if available, otherwise first character of `displayName`

### Usage sites (replacing ad-hoc user rendering)

| File | Current violation | Fix |
|------|------------------|-----|
| `Tenants.tsx` | `tenant.ownerId` raw UUID | `<UserDisplay fallbackId={tenant.ownerId} />` |
| `Goals.tsx` | Falls back to `g.ownerId` UUID | `<UserDisplay user={g.owner} fallbackId={g.ownerId} />` |
| `Members.tsx` | `m.name \|\| m.preferredUsername \|\| m.email` inline | `<UserDisplay user={m} />` |
| `Users.tsx` | `Avatar` + name inline | `<UserDisplay user={user} />` |
| Any other `renderRow` that builds user cells manually | Inline avatar+name | `<UserDisplay user={...} />` |

All usages are within `renderRow` callbacks passed to `ItemList` — `ItemList` itself stays generic.

---

## Section 4: Translation Gaps

### Missing keys — add to both `en/translation.json` and `de/translation.json`

| Key path | Used in |
|----------|---------|
| `admin.tenants.title` | `Tenants.tsx` |
| `admin.tenants.columns.name` | `Tenants.tsx` |
| `admin.tenants.columns.owner` | `Tenants.tsx` |
| `admin.tenants.columns.created` | `Tenants.tsx` |
| `admin.tenants.filter.name` | `Tenants.tsx` |
| `admin.tenants.dialog.createTitle` | `Tenants.tsx` |
| `admin.tenants.dialog.name` | `Tenants.tsx` |
| `admin.tenants.dialog.nameRequired` | `Tenants.tsx` |
| `admin.actions.activate` | `Users.tsx` |
| `admin.users.title` | `Users.tsx` (hard-coded) |
| `admin.users.columns.avatar` | `Users.tsx` (hard-coded) |
| `admin.users.columns.email` | `Users.tsx` (hard-coded) |
| `admin.users.columns.name` | `Users.tsx` (hard-coded) |
| `admin.users.columns.type` | `Users.tsx` (hard-coded) |
| `admin.users.columns.status` | `Users.tsx` (hard-coded) |
| `admin.users.columns.created` | `Users.tsx` (hard-coded) |
| `admin.users.columns.updated` | `Users.tsx` (hard-coded) |
| `admin.tenantDetails.members.title` | `TenantDetails.tsx` (hard-coded) |

### German file fixes

The following keys exist in the German file with English strings — add proper German translations:
- `success.ok.title`, `success.ok.message`
- `success.team.created.title`, `success.team.created.message`
- `success.team.deleted.title`, `success.team.deleted.message`

---

## Section 5: Page-by-Page Fixes

For each page, one full pass applies all four concerns: SCSS, translations, state, and UserDisplay. Order follows stated priorities within categories.

### Pages to fix

| Page | SCSS | i18n hard-coded | State fix | UserDisplay |
|------|------|-----------------|-----------|-------------|
| `admin/Users.tsx` | New `users.scss` | title + all columns | — | Avatar+name → UserDisplay |
| `admin/Tenants.tsx` | New `tenants.scss` | sortable labels | — | ownerId → UserDisplay |
| `admin/TenantDetails.tsx` | New `tenant-details.scss` | `title="Members"` + empty title | Direct API calls → store | ownerId → UserDisplay |
| `trainer/Members.tsx` | New `members.scss` | — | — | Inline user → UserDisplay |
| `trainer/Invites.tsx` | New `invites.scss` | Audit for hard-coded strings | — | Any user fields → UserDisplay |
| `trainer/TeamSettings.tsx` | New `team-settings.scss` | Audit | — | Any user fields → UserDisplay |
| `admin/TenantRoles.tsx` | New `tenant-roles.scss` | Audit | — | — |
| `admin/TenantPolicies.tsx` | New `tenant-policies.scss` | Audit | — | — |
| `user/Goals.tsx` | Extend existing `goals.scss` | Audit | — | ownerId → UserDisplay |
| `user/GoalDetails.tsx` | New `goal-details.scss` | Audit | — | owner → UserDisplay |
| `user/SeasonDetails.tsx` | New `season-details.scss` | Audit | — | — |
| `user/ProgressDetails.tsx` | New `progress-details.scss` | Audit | — | author → UserDisplay |
| `user/ProgressCreation.tsx` | New `progress-creation.scss` | Audit | — | — |
| `user/Dashboard.tsx` | New `dashboard.scss` | Audit | — | — |

### `TenantDetails.tsx` direct API calls → store

Currently calls `VolleyGoalsAPI.fetchUsers()` and `VolleyGoalsAPI.listTeams()` directly for Autocomplete search. These move to new store actions:
- `usersStore.searchUsers(query)` — added to `src/store/users.ts`
- `useTeamStore.searchTeams(query)` — added to `src/store/teams.ts`

---

## Constraints

- MUI `sx` props for MUI-specific layout concerns (flex, gap, padding on MUI components) are acceptable and stay
- All custom visual styles (colors, borders, hover, shadows, responsive layout) go in SCSS
- No color values hardcoded in SCSS — use `var(--palette-*)` CSS variables
- All dialog/modal fields must be validated (react-hook-form `rules` or Zod); no UUID input fields anywhere
- `useSettingsStore` uses Zustand `persist` middleware — no raw `localStorage` calls outside the store

---

## Out of Scope

- Adding new features or business logic
- Changing the MUI theme configuration
- Migrating from MUI to another component library
- Test coverage for styling changes
