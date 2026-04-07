# UI Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify SCSS styling (3-part class names, breakpoints), translations (no hard-coded labels, both EN/DE complete), state (Zustand + localStorage), and user display (never show UUIDs) across the entire app.

**Architecture:** Infrastructure-first — SCSS partials, `useSettingsStore`, and `UserDisplay` are built once and shared. Pages are then fixed one-by-one in a single pass each covering styling, i18n, state, and user display.

**Tech Stack:** React 18, TypeScript, MUI v5, SCSS (sass), Zustand v5 + persist middleware, react-hook-form v7, i18next, Jest + React Testing Library

**Spec:** `docs/superpowers/specs/2026-04-07-ui-unification-design.md`

---

## File Map

### New files
| File | Purpose |
|------|---------|
| `src/resources/styles/_variables.scss` | SCSS breakpoint variables |
| `src/resources/styles/_mixins.scss` | Responsive mixins |
| `src/resources/styles/pages/users.scss` | Admin Users page styles |
| `src/resources/styles/pages/tenants.scss` | Admin Tenants page styles |
| `src/resources/styles/pages/tenant-details.scss` | Admin TenantDetails styles |
| `src/resources/styles/pages/members.scss` | Trainer Members page styles |
| `src/resources/styles/pages/invites.scss` | Trainer Invites page styles |
| `src/resources/styles/pages/team-settings.scss` | Trainer TeamSettings styles |
| `src/resources/styles/pages/tenant-roles.scss` | Admin TenantRoles styles |
| `src/resources/styles/pages/tenant-policies.scss` | Admin TenantPolicies styles |
| `src/resources/styles/pages/season-details.scss` | User SeasonDetails styles |
| `src/resources/styles/pages/goal-details.scss` | User GoalDetails styles |
| `src/resources/styles/pages/progress-details.scss` | User ProgressDetails styles |
| `src/resources/styles/pages/progress-creation.scss` | User ProgressCreation styles |
| `src/resources/styles/pages/dashboard.scss` | User Dashboard styles |
| `src/store/settings.ts` | Zustand settings store (theme + language) |
| `src/components/UserDisplay.tsx` | Reusable user avatar + name component |
| `src/__tests__/store/settings.test.ts` | Settings store unit tests |
| `src/__tests__/components/UserDisplay.test.tsx` | UserDisplay component tests |

### Modified files
| File | Change |
|------|--------|
| `src/resources/styles/index.scss` | Add new page imports; update existing SCSS to use `@use` for partials |
| `src/store/util.ts` | Rename `*SessionItem` → `*StorageItem`; swap to `localStorage` |
| `src/store/cognitoUser.ts` | Use renamed storage helpers |
| `src/store/users.ts` | Add `searchUsers` action |
| `src/store/teams.ts` | Add `searchTeams` action |
| `src/index.tsx` | Read theme from `useSettingsStore` |
| `src/utils/i18nHelpers.ts` | Use `useSettingsStore` for language |
| `src/i18n/config.ts` | Read language from `useSettingsStore` |
| `src/i18n/en/translation.json` | Add missing keys |
| `src/i18n/de/translation.json` | Add missing keys + fix English strings |
| `src/__tests__/mocks/stores.ts` | Add `mockSettingsState` |
| `src/pages/admin/Users.tsx` | SCSS classes, i18n, UserDisplay |
| `src/pages/admin/Tenants.tsx` | SCSS classes, i18n, UserDisplay |
| `src/pages/admin/TenantDetails.tsx` | SCSS classes, i18n, UserDisplay, store actions |
| `src/pages/admin/TenantRoles.tsx` | SCSS classes, i18n audit |
| `src/pages/admin/TenantPolicies.tsx` | SCSS classes, i18n audit |
| `src/pages/trainer/Members.tsx` | SCSS classes, UserDisplay |
| `src/pages/trainer/Invites.tsx` | SCSS classes |
| `src/pages/trainer/TeamSettings.tsx` | SCSS classes, UserDisplay |
| `src/pages/user/Goals.tsx` | Remove direct SCSS import, UserDisplay |
| `src/pages/user/GoalDetails.tsx` | SCSS classes, UserDisplay |
| `src/pages/user/SeasonDetails.tsx` | SCSS classes |
| `src/pages/user/ProgressDetails.tsx` | SCSS classes, UserDisplay |
| `src/pages/user/ProgressCreation.tsx` | SCSS classes |
| `src/pages/user/Dashboard.tsx` | SCSS classes |
| `src/pages/user/Seasons.tsx` | Remove direct SCSS import |

---

## Task 1: SCSS Variables and Mixins

**Files:**
- Create: `src/resources/styles/_variables.scss`
- Create: `src/resources/styles/_mixins.scss`

- [ ] **Step 1: Create `_variables.scss`**

```scss
// src/resources/styles/_variables.scss

// Breakpoints
$bp-sm: 600px;   // mobile → tablet boundary
$bp-md: 960px;   // tablet → desktop boundary
$bp-lg: 1280px;  // desktop → wide boundary

// Spacing scale (multiples of 4px)
$space-1: 4px;
$space-2: 8px;
$space-3: 12px;
$space-4: 16px;
$space-5: 20px;
$space-6: 24px;
$space-8: 32px;

// Border radius
$radius-sm: 4px;
$radius-md: 8px;
$radius-lg: 12px;
```

- [ ] **Step 2: Create `_mixins.scss`**

```scss
// src/resources/styles/_mixins.scss
@use 'variables' as *;

// Respond to mobile-only viewport (< 600px)
@mixin mobile-only {
  @media (max-width: #{$bp-sm - 1px}) {
    @content;
  }
}

// Respond from tablet width and above (>= 600px)
@mixin tablet-up {
  @media (min-width: $bp-sm) {
    @content;
  }
}

// Respond from desktop width and above (>= 960px)
@mixin desktop-up {
  @media (min-width: $bp-md) {
    @content;
  }
}

// Respond from wide desktop and above (>= 1280px)
@mixin wide-up {
  @media (min-width: $bp-lg) {
    @content;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/resources/styles/_variables.scss src/resources/styles/_mixins.scss
git commit -m "feat: add SCSS variables and responsive mixins"
```

---

## Task 2: Update index.scss — Remove TSX SCSS Imports

**Files:**
- Modify: `src/resources/styles/index.scss`
- Modify: `src/pages/user/Goals.tsx` (remove SCSS import)
- Modify: `src/pages/user/Seasons.tsx` (remove SCSS import)
- Modify: `src/resources/styles/pages/goals.scss` (fix debug color + use mixin)
- Modify: `src/resources/styles/pages/seasons.scss` (use mixin)

- [ ] **Step 1: Update `index.scss` to add placeholder imports for all new page SCSS files**

Replace the existing `index.scss` body section with:

```scss
@use "sass:meta";

/* Reset margins and ensure root fills the viewport */
html, body, #root {
  height: 100%;
}

html, body {
  margin: 0;
  padding: 0;
}

html {
  height: 100%;
}

body {
  height: 100%;
  background-color: var(--palette-background-default);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  // Components
  @include meta.load-css("components/navigation");
  @include meta.load-css("components/notification");
  @include meta.load-css("components/itemlist");

  // Pages — user
  @include meta.load-css("pages/login");
  @include meta.load-css("pages/accept-invite");
  @include meta.load-css("pages/user-details");
  @include meta.load-css("pages/invite-error");
  @include meta.load-css("pages/not-found");
  @include meta.load-css("pages/complete-invite");
  @include meta.load-css("pages/select-team");
  @include meta.load-css("pages/profile");
  @include meta.load-css("pages/teams");
  @include meta.load-css("pages/seasons");
  @include meta.load-css("pages/goals");
  @include meta.load-css("pages/goal-details");
  @include meta.load-css("pages/season-details");
  @include meta.load-css("pages/progress-details");
  @include meta.load-css("pages/progress-creation");
  @include meta.load-css("pages/dashboard");
  @include meta.load-css("pages/team-details");

  // Pages — admin / trainer
  @include meta.load-css("pages/users");
  @include meta.load-css("pages/tenants");
  @include meta.load-css("pages/tenant-details");
  @include meta.load-css("pages/tenant-roles");
  @include meta.load-css("pages/tenant-policies");
  @include meta.load-css("pages/members");
  @include meta.load-css("pages/invites");
  @include meta.load-css("pages/team-settings");

  .app {
    &.app-container {
      display: flex;
      flex-direction: row;
      min-height: 100vh;
    }
  }

  /* Make the main region size via flex */
  .app.app-container main {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: visible;
    padding: 20px;
    max-height: 100%;
  }

  /* ItemList flex layout */
  .item-list {
    display: flex;
    flex-direction: column;
    min-height: 0;

    .item-list-header {
      flex: 0 0 auto;
    }

    .item-list-filter {
      flex: 0 0 auto;
    }

    .item-list-table {
      flex: 0 1 auto;
      min-height: 0;
      max-height: calc(100vh - 220px);
      overflow: auto;
    }

    .item-list-pagination {
      flex: 0 0 auto;
    }
  }

  main > * {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  /* Override generated MUI class to remove unwanted padding */
  .css-19kzrtu {
    padding: 0 !important;
  }
}
```

- [ ] **Step 2: Remove SCSS import from `src/pages/user/Goals.tsx`**

Remove line 19:
```diff
-import '../../resources/styles/pages/goals.scss';
```

- [ ] **Step 3: Remove SCSS import from `src/pages/user/Seasons.tsx`**

Find and remove:
```diff
-import '../../resources/styles/pages/seasons.scss';
```

- [ ] **Step 4: Fix debug red scrollbar color in `goals.scss`**

In `src/resources/styles/pages/goals.scss`, replace the two occurrences of hardcoded `red` with the CSS variable:

```scss
// scrollbar-color line — change from:
scrollbar-color: red transparent !important;
// to:
scrollbar-color: var(--palette-primary-main) transparent !important;

// webkit scrollbar-thumb background — change from:
background: red !important;
// to:
background: var(--palette-primary-main) !important;
```

- [ ] **Step 5: Run the build to verify no errors**

```bash
npm run build
```

Expected: build completes without errors (new empty SCSS files don't exist yet — create stubs for them now so the build passes):

```bash
touch src/resources/styles/pages/users.scss src/resources/styles/pages/tenants.scss src/resources/styles/pages/tenant-details.scss src/resources/styles/pages/members.scss src/resources/styles/pages/invites.scss src/resources/styles/pages/team-settings.scss src/resources/styles/pages/tenant-roles.scss src/resources/styles/pages/tenant-policies.scss src/resources/styles/pages/season-details.scss src/resources/styles/pages/goal-details.scss src/resources/styles/pages/progress-details.scss src/resources/styles/pages/progress-creation.scss src/resources/styles/pages/dashboard.scss
```

Then run `npm run build` again.

- [ ] **Step 6: Commit**

```bash
git add src/resources/styles/ src/pages/user/Goals.tsx src/pages/user/Seasons.tsx
git commit -m "feat: centralise SCSS loading — remove direct TSX imports, add page stubs"
```

---

## Task 3: useSettingsStore

**Files:**
- Create: `src/store/settings.ts`
- Create: `src/__tests__/store/settings.test.ts`
- Modify: `src/__tests__/mocks/stores.ts` (add `mockSettingsState`)

- [ ] **Step 1: Write the failing tests**

```ts
// src/__tests__/store/settings.test.ts
import { useSettingsStore } from '../../store/settings';

beforeEach(() => {
  localStorage.clear();
  // Reset store to defaults between tests
  useSettingsStore.setState({ theme: 'dark', language: 'en' });
});

describe('useSettingsStore', () => {
  it('has default theme of dark', () => {
    expect(useSettingsStore.getState().theme).toBe('dark');
  });

  it('has default language of en', () => {
    expect(useSettingsStore.getState().language).toBe('en');
  });

  it('setTheme updates theme state', () => {
    useSettingsStore.getState().setTheme('light');
    expect(useSettingsStore.getState().theme).toBe('light');
  });

  it('setLanguage updates language state', () => {
    useSettingsStore.getState().setLanguage('de');
    expect(useSettingsStore.getState().language).toBe('de');
  });

  it('theme persists to localStorage under vg-settings', () => {
    useSettingsStore.getState().setTheme('light');
    const raw = localStorage.getItem('vg-settings');
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw!);
    expect(stored.state.theme).toBe('light');
  });

  it('language persists to localStorage under vg-settings', () => {
    useSettingsStore.getState().setLanguage('de');
    const raw = localStorage.getItem('vg-settings');
    const stored = JSON.parse(raw!);
    expect(stored.state.language).toBe('de');
  });

  it('migrates old theme key from localStorage on first load', () => {
    localStorage.setItem('theme', 'light');
    // Simulate fresh store creation by reading the migration function result
    // (tested indirectly: store defaults read old keys when vg-settings absent)
    localStorage.removeItem('vg-settings');
    // Re-import would re-run migrations — here we verify the migration fn logic
    // by checking the exported helper directly
    const { getInitialTheme } = require('../../store/settings');
    expect(getInitialTheme()).toBe('light');
  });

  it('migrates old vg_lang key from localStorage on first load', () => {
    localStorage.setItem('vg_lang', 'de');
    localStorage.removeItem('vg-settings');
    const { getInitialLanguage } = require('../../store/settings');
    expect(getInitialLanguage()).toBe('de');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest src/__tests__/store/settings.test.ts --no-coverage
```

Expected: `Cannot find module '../../store/settings'`

- [ ] **Step 3: Create `src/store/settings.ts`**

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';
type Language = 'en' | 'de';

type SettingsState = {
  theme: Theme;
  language: Language;
};

type SettingsActions = {
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
};

// Exported so tests can verify migration logic independently
export function getInitialTheme(): Theme {
  try {
    const v = localStorage.getItem('theme');
    if (v === 'light' || v === 'dark') return v;
    const sys = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return sys ? 'dark' : 'light';
  } catch {
    return 'dark';
  }
}

export function getInitialLanguage(): Language {
  try {
    const v = localStorage.getItem('vg_lang');
    if (v === 'en' || v === 'de') return v;
  } catch {}
  return 'en';
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      theme: getInitialTheme(),
      language: getInitialLanguage(),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'vg-settings',
    }
  )
);
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx jest src/__tests__/store/settings.test.ts --no-coverage
```

Expected: all 8 tests pass.

- [ ] **Step 5: Add `mockSettingsState` to `src/__tests__/mocks/stores.ts`**

Append to the bottom of the file (before the final closing):

```ts
// ---- Settings Store ----
export function mockSettingsState(overrides?: Record<string, any>) {
  return {
    theme: 'dark' as 'dark' | 'light',
    language: 'en' as 'en' | 'de',
    setTheme: jest.fn(),
    setLanguage: jest.fn(),
    ...overrides,
  };
}
```

- [ ] **Step 6: Commit**

```bash
git add src/store/settings.ts src/__tests__/store/settings.test.ts src/__tests__/mocks/stores.ts
git commit -m "feat: add useSettingsStore with localStorage persistence"
```

---

## Task 4: Migrate Theme to useSettingsStore

**Files:**
- Modify: `src/index.tsx`

- [ ] **Step 1: Update `src/index.tsx` to read theme from settings store**

Replace the `useState` initialiser and `toggleTheme` function. The full updated `Root` component:

```tsx
import { useSettingsStore } from './store/settings';

// inside Root component — replace the useState and useEffect blocks:

const Root = () => {
  // Read initial theme from settings store (already hydrated from localStorage)
  const storedTheme = useSettingsStore.getState().theme;
  const [mode, setMode] = useState<'dark' | 'light'>(storedTheme);

  // Track system preference only when user has no persisted preference
  useEffect(() => {
    // If a preference is already stored, don't override it with system preference
    const persisted = localStorage.getItem('vg-settings');
    if (persisted) return;

    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const matches = 'matches' in e ? e.matches : (e as MediaQueryList).matches;
      setMode(matches ? 'dark' : 'light');
    };
    if ('addEventListener' in mql) {
      (mql as MediaQueryList).addEventListener('change', onChange as EventListener);
    } else {
      (mql as MediaQueryList).addListener(onChange as any);
    }
    return () => {
      if ('removeEventListener' in mql) {
        (mql as MediaQueryList).removeEventListener('change', onChange as EventListener);
      } else {
        (mql as MediaQueryList).removeListener(onChange as any);
      }
    };
  }, []);

  // ... theme useMemo stays unchanged ...

  const toggleTheme = () => {
    setMode((prevMode) => {
      const next = prevMode === 'dark' ? 'light' : 'dark';
      useSettingsStore.getState().setTheme(next);
      return next;
    });
  };

  // ... rest of JSX unchanged ...
};
```

Remove the two direct `localStorage` calls that were previously there:
- `localStorage.getItem('theme')` in the `useState` initialiser
- `localStorage.getItem('theme')` in the `useEffect`
- `localStorage.setItem('theme', next)` in `toggleTheme`

- [ ] **Step 2: Run build to verify no TypeScript errors**

```bash
npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/index.tsx
git commit -m "feat: migrate theme persistence to useSettingsStore"
```

---

## Task 5: Migrate i18n Config to useSettingsStore

**Files:**
- Modify: `src/utils/i18nHelpers.ts`
- Modify: `src/i18n/config.ts`

- [ ] **Step 1: Update `src/utils/i18nHelpers.ts`**

```ts
import i18next from 'i18next';
import { useSettingsStore } from '../store/settings';

export const changeLanguage = (lang: 'en' | 'de') => {
  useSettingsStore.getState().setLanguage(lang);
  i18next.changeLanguage(lang);
};

export const getSavedLanguage = (): 'en' | 'de' | null =>
  useSettingsStore.getState().language ?? null;
```

- [ ] **Step 2: Update `src/i18n/config.ts`**

```ts
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './en/translation.json';
import deTranslation from './de/translation.json';
import { getInitialLanguage } from '../store/settings';

const defaultLng = getInitialLanguage();

i18next.use(initReactI18next).init({
  lng: defaultLng,
  debug: false,
  resources: {
    en: { translation: enTranslation },
    de: { translation: deTranslation },
  },
});
```

- [ ] **Step 3: Run build to verify no TypeScript errors**

```bash
npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/utils/i18nHelpers.ts src/i18n/config.ts
git commit -m "feat: migrate language persistence to useSettingsStore"
```

---

## Task 6: Fix selectedTeam Persistence

**Files:**
- Modify: `src/store/util.ts`
- Modify: `src/store/cognitoUser.ts`

- [ ] **Step 1: Rename and update `src/store/util.ts`**

Replace the entire file:

```ts
// Storage helpers — use localStorage so data persists across browser sessions.

export const setStorageItem = (key: string, value: string | null): void => {
  try {
    if (value === null || value === undefined) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  } catch {
    // ignore storage errors (e.g. private browsing with full storage)
  }
};

export const getStorageItem = (key: string): string | undefined => {
  try {
    const v = localStorage.getItem(key);
    return v ?? undefined;
  } catch {
    return undefined;
  }
};

export const removeStorageItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
};
```

- [ ] **Step 2: Update `src/store/cognitoUser.ts` to use renamed helpers**

Replace the three import names and their usages:

```ts
// Change import from:
import {getSessionItem, setSessionItem} from "./util";
// to:
import { getStorageItem, setStorageItem } from "./util";
```

Then replace all usages in the file:
- `getSessionItem(SELECTED_TEAM_KEY)` → `getStorageItem(SELECTED_TEAM_KEY)`
- `setSessionItem(SELECTED_TEAM_KEY, teamId)` → `setStorageItem(SELECTED_TEAM_KEY, teamId)`
- `sessionStorage.removeItem(SELECTED_TEAM_KEY)` → `removeStorageItem(SELECTED_TEAM_KEY)` (also add `removeStorageItem` to the import)

There are three spots total in `cognitoUser.ts`:
1. `loadUserStore()` — `getStorageItem(SELECTED_TEAM_KEY)`
2. `fetchSelf` action — `getStorageItem(SELECTED_TEAM_KEY)`
3. `setSelectedTeam` action — `setStorageItem(SELECTED_TEAM_KEY, teamId)`
4. `leaveTeam` action — `sessionStorage.removeItem(SELECTED_TEAM_KEY)` → `removeStorageItem(SELECTED_TEAM_KEY)`

- [ ] **Step 3: Run build to verify no TypeScript errors**

```bash
npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 4: Run existing tests to confirm nothing broke**

```bash
npx jest --no-coverage 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/store/util.ts src/store/cognitoUser.ts
git commit -m "fix: persist selectedTeam to localStorage instead of sessionStorage"
```

---

## Task 7: Translation Gaps

**Files:**
- Modify: `src/i18n/en/translation.json`
- Modify: `src/i18n/de/translation.json`

- [ ] **Step 1: Add missing keys to `en/translation.json`**

Add the following inside the `"admin"` object (after the existing `"actions"` entry, add the `"activate"` key and new objects):

```json
"actions": {
  "goToUsers": "Go to Users",
  "deactivate": "Deactivate",
  "activate": "Activate",
  "delete": "Delete"
},
"users": {
  "title": "Users",
  "columns": {
    "avatar": "",
    "email": "Email",
    "name": "Name",
    "type": "Type",
    "status": "Status",
    "created": "Created",
    "updated": "Updated"
  }
},
"tenants": {
  "title": "Tenants",
  "columns": {
    "name": "Name",
    "owner": "Owner",
    "created": "Created"
  },
  "filter": {
    "name": "Name"
  },
  "dialog": {
    "createTitle": "Create Tenant",
    "name": "Tenant Name",
    "nameRequired": "Name is required"
  }
},
"tenantDetails": {
  "members": {
    "title": "Members",
    "columns": {
      "member": "Member",
      "role": "Role",
      "status": "Status",
      "createdAt": "Created At"
    },
    "searchLabel": "Search Member"
  },
  "teams": {
    "title": "Teams",
    "columns": {
      "name": "Name",
      "status": "Status",
      "created": "Created"
    }
  }
}
```

- [ ] **Step 2: Add the same keys to `de/translation.json` with German strings**

Same structure, German values:

```json
"actions": {
  "goToUsers": "Zu Benutzern",
  "deactivate": "Deaktivieren",
  "activate": "Aktivieren",
  "delete": "Löschen"
},
"users": {
  "title": "Benutzer",
  "columns": {
    "avatar": "",
    "email": "E-Mail",
    "name": "Name",
    "type": "Typ",
    "status": "Status",
    "created": "Erstellt",
    "updated": "Aktualisiert"
  }
},
"tenants": {
  "title": "Mandanten",
  "columns": {
    "name": "Name",
    "owner": "Eigentümer",
    "created": "Erstellt"
  },
  "filter": {
    "name": "Name"
  },
  "dialog": {
    "createTitle": "Mandant erstellen",
    "name": "Mandantenname",
    "nameRequired": "Name ist erforderlich"
  }
},
"tenantDetails": {
  "members": {
    "title": "Mitglieder",
    "columns": {
      "member": "Mitglied",
      "role": "Rolle",
      "status": "Status",
      "createdAt": "Erstellt am"
    },
    "searchLabel": "Mitglied suchen"
  },
  "teams": {
    "title": "Teams",
    "columns": {
      "name": "Name",
      "status": "Status",
      "created": "Erstellt"
    }
  }
}
```

- [ ] **Step 3: Fix German `success.*` keys that have English strings**

In `de/translation.json`, replace the `"success"` block:

```json
"success": {
  "ok": {
    "title": "Erfolgreich",
    "message": "Der Vorgang wurde erfolgreich abgeschlossen."
  },
  "team": {
    "created": {
      "title": "Team erstellt",
      "message": "Das Team wurde erfolgreich erstellt."
    },
    "deleted": {
      "title": "Team gelöscht",
      "message": "Das Team wurde erfolgreich gelöscht."
    }
  }
}
```

- [ ] **Step 4: Run build to verify JSON is valid**

```bash
npm run build 2>&1 | grep -i "error\|warning" | head -10
```

Expected: no JSON parse errors.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/
git commit -m "feat: fill translation gaps — admin keys, German success strings"
```

---

## Task 8: UserDisplay Component

**Files:**
- Create: `src/components/UserDisplay.tsx`
- Create: `src/__tests__/components/UserDisplay.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/__tests__/components/UserDisplay.test.tsx
import React from 'react';
import { render, screen } from '../test-utils';
import { UserDisplay } from '../../components/UserDisplay';

describe('UserDisplay', () => {
  it('shows preferredUsername when available', () => {
    render(<UserDisplay user={{ preferredUsername: 'johndoe', name: 'John Doe', email: 'john@example.com' }} />);
    expect(screen.getByText('johndoe')).toBeInTheDocument();
  });

  it('falls back to name when no preferredUsername', () => {
    render(<UserDisplay user={{ name: 'John Doe', email: 'john@example.com' }} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('falls back to email when no preferredUsername and no name', () => {
    render(<UserDisplay user={{ email: 'john@example.com' }} />);
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('shows ? when user is undefined and no fallbackId', () => {
    render(<UserDisplay />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('never shows a UUID as display name', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    render(<UserDisplay fallbackId={uuid} />);
    expect(screen.queryByText(uuid)).not.toBeInTheDocument();
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('renders an avatar when showAvatar is true (default)', () => {
    render(<UserDisplay user={{ email: 'a@b.com' }} />);
    // MUI Avatar renders with role="img" or an img element
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
  });

  it('does not render avatar when showAvatar is false', () => {
    render(<UserDisplay user={{ email: 'a@b.com' }} showAvatar={false} />);
    expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest src/__tests__/components/UserDisplay.test.tsx --no-coverage
```

Expected: `Cannot find module '../../components/UserDisplay'`

- [ ] **Step 3: Create `src/components/UserDisplay.tsx`**

```tsx
import React from 'react';
import { Avatar, Box, Typography } from '@mui/material';

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
          src={user?.picture}
          alt={displayName}
          sx={{ width: avatarSize, height: avatarSize, fontSize: avatarSize * 0.5 }}
        >
          {!user?.picture && displayName.charAt(0).toUpperCase()}
        </Avatar>
      )}
      <Typography variant="body2" className="user-display-name">
        {displayName}
      </Typography>
    </Box>
  );
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx jest src/__tests__/components/UserDisplay.test.tsx --no-coverage
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/UserDisplay.tsx src/__tests__/components/UserDisplay.test.tsx
git commit -m "feat: add UserDisplay component — always shows human-readable name, never UUID"
```

---

## Task 9: Store Search Actions

**Files:**
- Modify: `src/store/users.ts`
- Modify: `src/store/teams.ts`
- Modify: `src/__tests__/mocks/stores.ts`

- [ ] **Step 1: Add `searchUsers` to `UsersActions` type and store in `src/store/users.ts`**

Add to the `UsersActions` type:
```ts
searchUsers: (query: string) => Promise<IUser[]>;
```

Add the implementation inside `create(...)`:
```ts
searchUsers: async (query: string): Promise<IUser[]> => {
  const isEmail = query.includes('@');
  const filterStr = isEmail ? `email ^= "${query}"` : `name ^= "${query}"`;
  const response = await VolleyGoalsAPI.fetchUsers({ filter: filterStr, limit: 10 });
  return response.users || [];
},
```

- [ ] **Step 2: Add `searchTeams` to `TeamActions` type and store in `src/store/teams.ts`**

Add to the `TeamActions` type:
```ts
searchTeams: (query: string) => Promise<ITeam[]>;
```

Add the implementation inside `create(...)`:
```ts
searchTeams: async (query: string): Promise<ITeam[]> => {
  const response = await VolleyGoalsAPI.listTeams({ name: query, limit: 10 });
  return response.items || [];
},
```

- [ ] **Step 3: Add `searchUsers` and `searchTeams` to the mock store helpers**

In `src/__tests__/mocks/stores.ts`, update `mockUsersState` to include:
```ts
searchUsers: jest.fn().mockResolvedValue([]),
```

Update `mockTeamState` to include:
```ts
searchTeams: jest.fn().mockResolvedValue([]),
```

- [ ] **Step 4: Run build and tests**

```bash
npm run build 2>&1 | tail -5
npx jest --no-coverage 2>&1 | tail -10
```

Expected: no TypeScript errors, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/store/users.ts src/store/teams.ts src/__tests__/mocks/stores.ts
git commit -m "feat: add searchUsers and searchTeams store actions"
```

---

## Task 10: Admin Users Page

**Files:**
- Modify: `src/resources/styles/pages/users.scss` (fill stub)
- Modify: `src/pages/admin/Users.tsx`

- [ ] **Step 1: Write `users.scss`**

```scss
@use '../variables' as *;
@use '../mixins' as *;

.users-page-root {
  width: 100%;
}

.users-list-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  @include mobile-only {
    flex-direction: column;
    align-items: flex-start;
  }
}

.users-filter-email,
.users-filter-name {
  min-width: 160px;

  @include mobile-only {
    width: 100%;
  }
}

.users-list-row {
  cursor: pointer;
}

.users-list-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
```

- [ ] **Step 2: Update `src/pages/admin/Users.tsx`**

Replace the hard-coded `title`, `columns` and filter labels with i18n keys; add `UserDisplay` to the avatar+name column. Key changes:

```tsx
import { UserDisplay } from '../../components/UserDisplay';

// Replace hard-coded title/columns:
return (
  <div className="users-page-root">
    <ItemList<IUser, IUserFilterOption>
      title={i18next.t('admin.users.title', 'Users')}
      columns={[
        i18next.t('admin.users.columns.avatar', ''),
        i18next.t('admin.users.columns.email', 'Email'),
        i18next.t('admin.users.columns.name', 'Name'),
        i18next.t('admin.users.columns.type', 'Type'),
        i18next.t('admin.users.columns.status', 'Status'),
        i18next.t('admin.users.columns.created', 'Created'),
        i18next.t('admin.users.columns.updated', 'Updated'),
      ]}
      // ... rest unchanged
    />
  </div>
);
```

Replace the `renderRow` avatar+name cells:
```tsx
const renderRow = (user: IUser) => {
  const userTypeLabel = user.userType === UserType.Admin
    ? 'Admin'
    : i18next.t('common.user', 'User');
  return [
    <TableCell key="avatar">
      <UserDisplay user={user} showAvatar size="small" />
    </TableCell>,
    <TableCell key="email">{user.email}</TableCell>,
    <TableCell key="name">
      <UserDisplay user={user} showAvatar={false} />
    </TableCell>,
    <TableCell key="type"><Chip label={userTypeLabel} color={user.userType === UserType.Admin ? 'primary' : 'default'} /></TableCell>,
    <TableCell key="status"><Chip label={user.enabled ? i18next.t('common.active', 'active') : i18next.t('common.inactive', 'inactive')} color={user.enabled ? 'success' : 'default'} /></TableCell>,
    <TableCell key="created">{new Date(user.createdAt).toLocaleString('de-CH')}</TableCell>,
    <TableCell key="updated">{user.updatedAt ? new Date(user.updatedAt).toLocaleString('de-CH') : '-'}</TableCell>,
  ];
};
```

Replace hard-coded filter field labels:
```tsx
const renderFilterFields = (filter: IUserFilterOption, setFilter: (f: IUserFilterOption) => void) => [
  <Grid key="email">
    <TextField
      fullWidth
      className="users-filter-email"
      label={i18next.t('admin.users.columns.email', 'Email')}
      value={filter.email ?? ''}
      onChange={(e) => setFilter({ ...filter, email: e.target.value })}
    />
  </Grid>,
  <Grid key="name">
    <TextField
      fullWidth
      className="users-filter-name"
      label={i18next.t('admin.users.columns.name', 'Name')}
      value={filter.name ?? ''}
      onChange={(e) => setFilter({ ...filter, name: e.target.value })}
    />
  </Grid>,
];
```

- [ ] **Step 3: Run build**

```bash
npm run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/resources/styles/pages/users.scss src/pages/admin/Users.tsx
git commit -m "feat: Users page — SCSS classes, i18n columns, UserDisplay"
```

---

## Task 11: Admin Tenants Page

**Files:**
- Modify: `src/resources/styles/pages/tenants.scss`
- Modify: `src/pages/admin/Tenants.tsx`

- [ ] **Step 1: Write `tenants.scss`**

```scss
@use '../variables' as *;
@use '../mixins' as *;

.tenants-page-root {
  width: 100%;
}

.tenants-list-header {
  display: flex;
  align-items: center;
  gap: 8px;

  @include mobile-only {
    flex-direction: column;
    align-items: flex-start;
  }
}

.tenants-filter-name {
  min-width: 160px;

  @include mobile-only {
    width: 100%;
  }
}

.tenants-dialog-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tenants-list-row {
  cursor: pointer;
}

.tenants-list-actions {
  display: flex;
  gap: 8px;
}
```

- [ ] **Step 2: Update `src/pages/admin/Tenants.tsx`**

Replace hard-coded title, columns, sortable labels; add `UserDisplay` for the owner column. Key changes:

```tsx
import { UserDisplay } from '../../components/UserDisplay';

// sortableFields — replace hard-coded 'Name':
const sortableFields = [
  { field: 'name', label: i18next.t('admin.tenants.columns.name', 'Name') },
];

// renderRow — replace raw ownerId:
const renderRow = (tenant: ITenant) => [
  <TableCell key="name">{tenant.name}</TableCell>,
  <TableCell key="owner">
    <UserDisplay fallbackId={tenant.ownerId} />
  </TableCell>,
  <TableCell key="created">{new Date(tenant.createdAt).toLocaleDateString()}</TableCell>,
];

// ItemList title and columns:
<div className="tenants-page-root">
  <ItemList<ITenant, ITenantFilterOption>
    title={i18next.t('admin.tenants.title', 'Tenants')}
    columns={[
      i18next.t('admin.tenants.columns.name', 'Name'),
      i18next.t('admin.tenants.columns.owner', 'Owner'),
      i18next.t('admin.tenants.columns.created', 'Created'),
    ]}
    // ...
  />
</div>

// renderFilterFields — already uses i18next, just add className:
<TextField
  fullWidth
  className="tenants-filter-name"
  label={i18next.t('admin.tenants.filter.name', 'Name')}
  // ...
/>

// Dialog — already uses i18next.t for dialog keys
```

- [ ] **Step 3: Run build**

```bash
npm run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/resources/styles/pages/tenants.scss src/pages/admin/Tenants.tsx
git commit -m "feat: Tenants page — SCSS classes, i18n, UserDisplay for owner"
```

---

## Task 12: Admin TenantDetails Page

**Files:**
- Modify: `src/resources/styles/pages/tenant-details.scss`
- Modify: `src/pages/admin/TenantDetails.tsx`

- [ ] **Step 1: Write `tenant-details.scss`**

```scss
@use '../variables' as *;
@use '../mixins' as *;

.tenant-details-section {
  margin-bottom: 32px;
}

.tenant-details-section-title {
  font-weight: 600;
  margin-bottom: 16px;
}

.tenant-details-members-list {
  width: 100%;
}

.tenant-details-teams-list {
  width: 100%;
}

.tenant-details-dialog-search {
  width: 100%;
  margin-bottom: 16px;
}

.tenant-details-dialog-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 8px;
}

.tenant-details-list-row {
  cursor: default;
}

.tenant-details-actions {
  display: flex;
  gap: 8px;

  @include mobile-only {
    flex-direction: column;
  }
}
```

- [ ] **Step 2: Replace direct `VolleyGoalsAPI` calls in `TenantDetails.tsx` with store actions**

At the top of `TenantDetails.tsx`, add imports:
```tsx
import { useUsersStore } from '../../store/users';
// useTeamStore is already imported
```

Replace the user search `useEffect` (currently calling `VolleyGoalsAPI.fetchUsers` directly):
```tsx
// Remove the console.log calls and replace direct API call:
const searchUsers = useUsersStore(s => s.searchUsers);

useEffect(() => {
  if (!addMemberOpen || userSearchText.length < 2) return;
  const timer = setTimeout(() => {
    setLoadingUsers(true);
    searchUsers(userSearchText)
      .then(users => setUserOptions(users))
      .finally(() => setLoadingUsers(false));
  }, 300);
  return () => clearTimeout(timer);
}, [userSearchText, addMemberOpen, searchUsers]);
```

Replace the team search `useEffect` (currently calling `VolleyGoalsAPI.listTeams` directly):
```tsx
const searchTeams = useTeamStore(s => s.searchTeams);

useEffect(() => {
  if (!associateTeamOpen || teamSearchText.length < 2) return;
  const timer = setTimeout(() => {
    setLoadingTeams(true);
    searchTeams(teamSearchText)
      .then(teams => setTeamOptions(teams.filter(t => !t.tenantId)))
      .finally(() => setLoadingTeams(false));
  }, 300);
  return () => clearTimeout(timer);
}, [teamSearchText, associateTeamOpen, searchTeams]);
```

- [ ] **Step 3: Replace hard-coded `title="Members"` and i18n fixes**

```tsx
<ItemList<ITenantMember, DummyMemberFilter>
  title={i18next.t('admin.tenantDetails.members.title', 'Members')}
  columns={[
    i18next.t('admin.tenantDetails.members.columns.member', 'Member'),
    i18next.t('admin.tenantDetails.members.columns.role', 'Role'),
    i18next.t('admin.tenantDetails.members.columns.status', 'Status'),
    i18next.t('admin.tenantDetails.members.columns.createdAt', 'Created At'),
  ]}
  // ...
```

Replace the second `ItemList` (teams, currently `title=""`):
```tsx
// Find the teams ItemList — it has title="" — replace with:
title={i18next.t('admin.tenantDetails.teams.title', 'Teams')}
columns={[
  i18next.t('admin.tenantDetails.teams.columns.name', 'Name'),
  i18next.t('admin.tenantDetails.teams.columns.status', 'Status'),
  i18next.t('admin.tenantDetails.teams.columns.created', 'Created'),
]}
```

- [ ] **Step 4: Replace ad-hoc user rendering in members `renderRow` with `UserDisplay`**

```tsx
import { UserDisplay } from '../../components/UserDisplay';

// In renderRow for members:
renderRow={(m) => [
  <TableCell key="userId">
    <UserDisplay
      user={m.user}
      fallbackId={m.userId}
      size="medium"
    />
  </TableCell>,
  <TableCell key="role">{m.role}</TableCell>,
  <TableCell key="status"><Chip size="small" label={m.status} color={m.status === 'active' ? 'success' : 'default'} /></TableCell>,
  <TableCell key="created">{m.createdAt ? new Date(m.createdAt).toLocaleString('de-CH') : '-'}</TableCell>,
]}
```

- [ ] **Step 5: Add SCSS class names to the page containers**

```tsx
<Box className="tenant-details-section" mb={4}>
  {/* members ItemList */}
</Box>
<Box className="tenant-details-section">
  {/* teams ItemList */}
</Box>
```

- [ ] **Step 6: Run build**

```bash
npm run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/resources/styles/pages/tenant-details.scss src/pages/admin/TenantDetails.tsx
git commit -m "feat: TenantDetails — SCSS, i18n, UserDisplay, move API calls to store"
```

---

## Task 13: Admin TenantRoles Page

**Files:**
- Modify: `src/resources/styles/pages/tenant-roles.scss`
- Modify: `src/pages/admin/TenantRoles.tsx`

- [ ] **Step 1: Write `tenant-roles.scss`**

```scss
@use '../variables' as *;
@use '../mixins' as *;

.tenant-roles-page {
  width: 100%;
}

.tenant-roles-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  @include mobile-only {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}

.tenant-roles-title {
  font-weight: 600;
}

.tenant-roles-list-item {
  border: 1px solid var(--palette-divider);
  border-radius: 8px;
  margin-bottom: 8px;
  background: var(--palette-background-paper);
}

.tenant-roles-dialog-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 8px;
}

.tenant-roles-permissions-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--palette-divider);
  border-radius: 4px;
  padding: 8px;
}

.tenant-roles-actions {
  display: flex;
  gap: 8px;
}
```

- [ ] **Step 2: Audit `TenantRoles.tsx` for hard-coded strings and add i18n + class names**

Add to `en/translation.json` under `"admin"`:
```json
"tenantRoles": {
  "title": "Roles",
  "createButton": "Create Role",
  "editTitle": "Edit Role",
  "createTitle": "Create Role",
  "deleteConfirm": "Delete this role?",
  "nameLabel": "Role Name",
  "nameRequired": "Role name is required",
  "permissionsLabel": "Permissions"
}
```

Add to `de/translation.json` under `"admin"`:
```json
"tenantRoles": {
  "title": "Rollen",
  "createButton": "Rolle erstellen",
  "editTitle": "Rolle bearbeiten",
  "createTitle": "Rolle erstellen",
  "deleteConfirm": "Diese Rolle löschen?",
  "nameLabel": "Rollenname",
  "nameRequired": "Rollenname ist erforderlich",
  "permissionsLabel": "Berechtigungen"
}
```

In `TenantRoles.tsx`, replace hard-coded strings with `i18next.t(...)`. Key replacements:
- `"Roles"` → `i18next.t('admin.tenantRoles.title', 'Roles')`
- `"Create Role"` button → `i18next.t('admin.tenantRoles.createButton', 'Create Role')`
- Dialog title for new role → `i18next.t('admin.tenantRoles.createTitle', 'Create Role')`
- Dialog title for edit → `i18next.t('admin.tenantRoles.editTitle', 'Edit Role')`
- Delete confirm text → `i18next.t('admin.tenantRoles.deleteConfirm', 'Delete this role?')`
- Role name label → `i18next.t('admin.tenantRoles.nameLabel', 'Role Name')`
- Name required validation → `i18next.t('admin.tenantRoles.nameRequired', 'Role name is required')`
- Permissions section heading → `i18next.t('admin.tenantRoles.permissionsLabel', 'Permissions')`

Add `className="tenant-roles-page"` to the outer container.

- [ ] **Step 3: Run build**

```bash
npm run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/resources/styles/pages/tenant-roles.scss src/pages/admin/TenantRoles.tsx src/i18n/
git commit -m "feat: TenantRoles — SCSS classes, i18n"
```

---

## Task 14: Admin TenantPolicies Page

**Files:**
- Modify: `src/resources/styles/pages/tenant-policies.scss`
- Modify: `src/pages/admin/TenantPolicies.tsx`

- [ ] **Step 1: Write `tenant-policies.scss`**

```scss
@use '../variables' as *;
@use '../mixins' as *;

.tenant-policies-page {
  display: flex;
  gap: 16px;

  @include mobile-only {
    flex-direction: column;
  }
}

.tenant-policies-sidebar {
  min-width: 200px;
  max-width: 260px;
  flex-shrink: 0;

  @include mobile-only {
    max-width: 100%;
    width: 100%;
  }
}

.tenant-policies-sidebar-title {
  font-weight: 600;
  padding: 8px 16px;
}

.tenant-policies-sidebar-item {
  border-radius: 4px;
}

.tenant-policies-sidebar-item--active {
  background-color: var(--palette-primary-main);
  color: var(--palette-text-primary);
}

.tenant-policies-content {
  flex: 1;
  min-width: 0;
}
```

- [ ] **Step 2: Audit `TenantPolicies.tsx` for hard-coded strings**

Add to both translation files under `"admin"`:
```json
// en
"tenantPolicies": {
  "title": "Policies",
  "selectResource": "Select a resource type to configure its policy.",
  "noResource": "No resource selected"
}

// de
"tenantPolicies": {
  "title": "Richtlinien",
  "selectResource": "Ressourcentyp auswählen, um die Richtlinie zu konfigurieren.",
  "noResource": "Keine Ressource ausgewählt"
}
```

In `TenantPolicies.tsx`, replace hard-coded strings and add class names:
```tsx
// outer container
<Box className="tenant-policies-page">
  <Paper className="tenant-policies-sidebar">
    <Typography className="tenant-policies-sidebar-title">
      {i18next.t('admin.tenantPolicies.title', 'Policies')}
    </Typography>
    <List>
      {normalizedPolicies.map((policy) => (
        <ListItemButton
          key={policy.resourceType}
          className={`tenant-policies-sidebar-item${selectedResource === policy.resourceType ? ' tenant-policies-sidebar-item--active' : ''}`}
          selected={selectedResource === policy.resourceType}
          onClick={() => setSelectedResource(policy.resourceType)}
        >
          <ListItemText primary={policy.resourceType} />
        </ListItemButton>
      ))}
    </List>
  </Paper>
  <Box className="tenant-policies-content">
    {/* PermissionEditor or placeholder */}
  </Box>
</Box>
```

- [ ] **Step 3: Run build**

```bash
npm run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/resources/styles/pages/tenant-policies.scss src/pages/admin/TenantPolicies.tsx src/i18n/
git commit -m "feat: TenantPolicies — SCSS classes, i18n"
```

---

## Task 15: Trainer Members Page

**Files:**
- Modify: `src/resources/styles/pages/members.scss`
- Modify: `src/pages/trainer/Members.tsx`

- [ ] **Step 1: Write `members.scss`**

```scss
@use '../variables' as *;
@use '../mixins' as *;

.members-page-root {
  border-radius: 12px;
  background: var(--palette-background-paper);
  border: 1px solid var(--palette-divider);
}

.members-page-header {
  padding: 16px 24px 0;
}

.members-page-title {
  font-weight: 600;
}

.members-search-wrapper {
  padding: 12px 24px 0;
}

.members-search-field {
  max-width: 400px;

  @include mobile-only {
    max-width: 100%;
    width: 100%;
  }
}

.members-list-wrapper {
  padding: 8px 24px 16px;
}

.members-filter-role,
.members-filter-status {
  min-width: 140px;

  @include mobile-only {
    width: 100%;
  }
}

.members-dialog-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 8px;
}

.members-list-actions {
  display: flex;
  gap: 8px;
}
```

- [ ] **Step 2: Update `Members.tsx` — add class names and `UserDisplay`**

```tsx
import { UserDisplay } from '../../components/UserDisplay';

// Replace Paper with div + className:
return (
  <div className="members-page-root">
    <Box className="members-page-header">
      <Typography variant="h5" className="members-page-title">
        {i18next.t('members.title', 'Team Members')}
      </Typography>
    </Box>

    <Box className="members-search-wrapper">
      <TextField
        size="small"
        className="members-search-field"
        // ...rest unchanged
      />
    </Box>

    <Box className="members-list-wrapper">
      <ItemList<ITeamUser, ITeamMemberFilterOption>
        // ...
      />
    </Box>
    {/* dialogs unchanged */}
  </div>
);

// renderRow — replace inline name display with UserDisplay:
const renderRow = (m: ITeamUser) => [
  <TableCell key="name">
    <UserDisplay user={m} size="small" />
  </TableCell>,
  <TableCell key="email">{m.email}</TableCell>,
  <TableCell key="role"><Chip label={m.role} size="small" /></TableCell>,
  <TableCell key="status"><Chip label={m.status} size="small" color={m.status === 'active' ? 'success' : 'default'} /></TableCell>,
  <TableCell key="joined">{m.joinedAt ? new Intl.DateTimeFormat('de-CH', { dateStyle: 'short' }).format(new Date(m.joinedAt)) : '-'}</TableCell>,
];
```

- [ ] **Step 3: Run build**

```bash
npm run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/resources/styles/pages/members.scss src/pages/trainer/Members.tsx
git commit -m "feat: Members page — SCSS classes, UserDisplay"
```

---

## Task 16: Trainer Invites Page

**Files:**
- Modify: `src/resources/styles/pages/invites.scss`
- Modify: `src/pages/trainer/Invites.tsx`

- [ ] **Step 1: Write `invites.scss`**

```scss
@use '../variables' as *;
@use '../mixins' as *;

.invites-page-root {
  width: 100%;
}

.invites-tab-bar {
  margin-bottom: 16px;
}

.invites-filter-status {
  min-width: 140px;

  @include mobile-only {
    width: 100%;
  }
}

.invites-dialog-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 8px;
}

.invites-dialog-send-email {
  margin-top: 4px;
}

.invites-list-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.invites-status-chip {
  text-transform: capitalize;
}
```

- [ ] **Step 2: Update `Invites.tsx` — add class names**

Wrap the root in a `<div className="invites-page-root">`.

Add `className="invites-dialog-form"` to the Dialog's inner `Box`.

Add `className="invites-list-actions"` to the action button container in `renderActions`.

All text is already using `i18next.t()` — verify there are no hard-coded English strings by searching the file for string literals that are human-readable labels.

- [ ] **Step 3: Run build**

```bash
npm run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/resources/styles/pages/invites.scss src/pages/trainer/Invites.tsx
git commit -m "feat: Invites page — SCSS classes"
```

---

## Task 17: Trainer TeamSettings Page

**Files:**
- Modify: `src/resources/styles/pages/team-settings.scss`
- Modify: `src/pages/trainer/TeamSettings.tsx`

- [ ] **Step 1: Write `team-settings.scss`**

```scss
@use '../variables' as *;
@use '../mixins' as *;

.team-settings-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.team-settings-section {
  padding: 20px 24px;
  background: var(--palette-background-paper);
  border: 1px solid var(--palette-divider);
  border-radius: 8px;
}

.team-settings-section-title {
  font-weight: 600;
  margin-bottom: 16px;
}

.team-settings-avatar-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;

  @include mobile-only {
    flex-direction: column;
    align-items: flex-start;
  }
}

.team-settings-field {
  margin-bottom: 16px;
}

.team-settings-members-search {
  margin-bottom: 12px;
  max-width: 400px;

  @include mobile-only {
    max-width: 100%;
  }
}

.team-settings-member-item {
  border-bottom: 1px solid var(--palette-divider);

  &:last-child {
    border-bottom: none;
  }
}

.team-settings-dialog-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 8px;
}

.team-settings-danger-section {
  border-color: var(--palette-error-main);
}

.team-settings-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;

  @include mobile-only {
    flex-direction: column;
  }
}
```

- [ ] **Step 2: Update `TeamSettings.tsx` — add class names and `UserDisplay`**

Wrap the root `Box` or `Paper` with `className="team-settings-page"`.

For each card/section, add `className="team-settings-section"`.

In the members list, replace the `ListItem` name display with `UserDisplay`:
```tsx
import { UserDisplay } from '../../components/UserDisplay';

// In the members list renderRow or ListItem:
<UserDisplay user={member} size="small" />
```

Add `className="team-settings-members-search"` to the search `TextField`.

- [ ] **Step 3: Run build**

```bash
npm run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/resources/styles/pages/team-settings.scss src/pages/trainer/TeamSettings.tsx
git commit -m "feat: TeamSettings page — SCSS classes, UserDisplay"
```

---

## Task 18: User Goals Page

**Files:**
- Modify: `src/pages/user/Goals.tsx` (UserDisplay for owner, SCSS class names already partially there)

No new SCSS file needed — `goals.scss` already exists and was updated in Task 2.

- [ ] **Step 1: Update `Goals.tsx` — replace `resolveOwner` with `UserDisplay`**

Replace the `resolveOwner` function and its usage:

```tsx
import { UserDisplay } from '../../components/UserDisplay';

// Remove the resolveOwner function entirely.

// In renderRow, replace:
// <TableCell key="owner">{resolveOwner(item)}</TableCell>
// with:
<TableCell key="owner">
  <UserDisplay user={item.owner} fallbackId={item.ownerId} />
</TableCell>
```

- [ ] **Step 2: Run build**

```bash
npm run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/user/Goals.tsx
git commit -m "feat: Goals page — UserDisplay for owner, never show UUID"
```

---

## Task 19: User GoalDetails Page

**Files:**
- Modify: `src/resources/styles/pages/goal-details.scss`
- Modify: `src/pages/user/GoalDetails.tsx`

- [ ] **Step 1: Write `goal-details.scss`**

```scss
@use '../variables' as *;
@use '../mixins' as *;

.goal-details-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 900px;
}

.goal-details-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
}

.goal-details-avatar {
  flex-shrink: 0;
}

.goal-details-info {
  flex: 1;
  min-width: 0;
}

.goal-details-title {
  font-weight: 600;
  margin-bottom: 8px;
}

.goal-details-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.goal-details-meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.goal-details-meta-label {
  font-size: 0.75rem;
  color: var(--palette-text-secondary);
}

.goal-details-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;

  @include mobile-only {
    flex-direction: column;
  }
}

.goal-details-section {
  padding: 16px;
  background: var(--palette-background-paper);
  border: 1px solid var(--palette-divider);
  border-radius: 8px;
}
```

- [ ] **Step 2: Update `GoalDetails.tsx` — add class names, add `UserDisplay` for owner**

Add `className="goal-details-page"` to the root container.

Add `UserDisplay` for goal owner display:
```tsx
import { UserDisplay } from '../../components/UserDisplay';

// Wherever the goal owner is displayed (in the meta section):
<Box className="goal-details-meta-item">
  <Typography className="goal-details-meta-label">
    {i18next.t('goalDetails.owner', 'Owner')}
  </Typography>
  <UserDisplay user={currentGoal?.owner} fallbackId={currentGoal?.ownerId} />
</Box>
```

Add `className` props to the header, meta row, and action button groups.

- [ ] **Step 3: Run build**

```bash
npm run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/resources/styles/pages/goal-details.scss src/pages/user/GoalDetails.tsx
git commit -m "feat: GoalDetails page — SCSS classes, UserDisplay for owner"
```

---

## Task 20: User SeasonDetails Page

**Files:**
- Modify: `src/resources/styles/pages/season-details.scss`
- Modify: `src/pages/user/SeasonDetails.tsx`

- [ ] **Step 1: Write `season-details.scss`**

```scss
@use '../variables' as *;
@use '../mixins' as *;

.season-details-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1000px;
}

.season-details-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;

  @include mobile-only {
    flex-direction: column;
    align-items: flex-start;
  }
}

.season-details-title {
  font-weight: 600;
}

.season-details-meta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: center;
}

.season-details-section {
  padding: 16px;
  background: var(--palette-background-paper);
  border: 1px solid var(--palette-divider);
  border-radius: 8px;
}

.season-details-section-title {
  font-weight: 600;
  margin-bottom: 12px;
}

.season-details-goal-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px solid var(--palette-divider);

  &:last-child {
    border-bottom: none;
  }
}

.season-details-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
```

- [ ] **Step 2: Update `SeasonDetails.tsx` — add class names**

Add `className="season-details-page"` to the root container. Add `className` props to the header, meta row, sections, and action buttons.

Verify all string labels use `i18next.t()` — fix any hard-coded strings found. Add missing keys to both translation files if needed.

- [ ] **Step 3: Run build**

```bash
npm run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/resources/styles/pages/season-details.scss src/pages/user/SeasonDetails.tsx
git commit -m "feat: SeasonDetails page — SCSS classes"
```

---

## Task 21: User ProgressDetails Page

**Files:**
- Modify: `src/resources/styles/pages/progress-details.scss`
- Modify: `src/pages/user/ProgressDetails.tsx`

- [ ] **Step 1: Write `progress-details.scss`**

```scss
@use '../variables' as *;
@use '../mixins' as *;

.progress-details-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1000px;
}

.progress-details-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;

  @include mobile-only {
    flex-direction: column;
  }
}

.progress-details-title {
  font-weight: 600;
}

.progress-details-author {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.progress-details-author-label {
  font-size: 0.75rem;
  color: var(--palette-text-secondary);
}

.progress-details-section {
  padding: 16px;
  background: var(--palette-background-paper);
  border: 1px solid var(--palette-divider);
  border-radius: 8px;
}

.progress-details-section-title {
  font-weight: 600;
  margin-bottom: 12px;
}

.progress-details-entry-item {
  border: 1px solid var(--palette-divider);
  border-radius: 6px;
  margin-bottom: 8px;
  overflow: hidden;
}

.progress-details-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;

  @include mobile-only {
    flex-direction: column;
  }
}
```

- [ ] **Step 2: Update `ProgressDetails.tsx` — add class names, add `UserDisplay` for author**

Add `className="progress-details-page"` to root.

Add `UserDisplay` for the report author. `IProgressReport` has no nested `author` object — use the flat fields `authorName`, `authorPicture`, and `authorId`:
```tsx
import { UserDisplay } from '../../components/UserDisplay';

// In the report header / author section:
<Box className="progress-details-author">
  <Typography className="progress-details-author-label">
    {i18next.t('progress.author', 'Author')}
  </Typography>
  <UserDisplay
    user={{
      name: currentReport?.authorName,
      picture: currentReport?.authorPicture ?? undefined,
    }}
    fallbackId={currentReport?.authorId}
  />
</Box>
```

Add class names to sections, entry items, and action buttons.

- [ ] **Step 3: Run build**

```bash
npm run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/resources/styles/pages/progress-details.scss src/pages/user/ProgressDetails.tsx
git commit -m "feat: ProgressDetails page — SCSS classes, UserDisplay for author"
```

---

## Task 22: User ProgressCreation Page

**Files:**
- Modify: `src/resources/styles/pages/progress-creation.scss`
- Modify: `src/pages/user/ProgressCreation.tsx`

- [ ] **Step 1: Write `progress-creation.scss`**

```scss
@use '../variables' as *;
@use '../mixins' as *;

.progress-creation-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 800px;
}

.progress-creation-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.progress-creation-title {
  font-weight: 600;
}

.progress-creation-section {
  padding: 16px;
  background: var(--palette-background-paper);
  border: 1px solid var(--palette-divider);
  border-radius: 8px;
}

.progress-creation-section-title {
  font-weight: 600;
  margin-bottom: 12px;
}

.progress-creation-field {
  margin-bottom: 12px;
}

.progress-creation-goal-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--palette-divider);
  border-radius: 6px;
  margin-top: 8px;
}

.progress-creation-goal-title {
  font-weight: 500;
}

.progress-creation-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;

  @include mobile-only {
    flex-direction: column;
  }
}
```

- [ ] **Step 2: Update `ProgressCreation.tsx` — add class names**

Add `className="progress-creation-page"` to the root, `className="progress-creation-section"` to each card section, and `className="progress-creation-goal-item"` to each goal entry in the form.

Verify all labels use `i18next.t()`.

- [ ] **Step 3: Run build**

```bash
npm run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/resources/styles/pages/progress-creation.scss src/pages/user/ProgressCreation.tsx
git commit -m "feat: ProgressCreation page — SCSS classes"
```

---

## Task 23: User Dashboard Page

**Files:**
- Modify: `src/resources/styles/pages/dashboard.scss`
- Modify: `src/pages/user/Dashboard.tsx`

- [ ] **Step 1: Write `dashboard.scss`**

```scss
@use '../variables' as *;
@use '../mixins' as *;

.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.dashboard-title {
  font-weight: 600;
}

.dashboard-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;

  @include mobile-only {
    grid-template-columns: repeat(2, 1fr);
  }
}

.dashboard-stat-card {
  padding: 16px;
  background: var(--palette-background-paper);
  border: 1px solid var(--palette-divider);
  border-radius: 8px;
  text-align: center;
}

.dashboard-stat-card-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--palette-primary-main);
}

.dashboard-stat-card-label {
  font-size: 0.85rem;
  color: var(--palette-text-secondary);
  margin-top: 4px;
}

.dashboard-section {
  padding: 16px;
  background: var(--palette-background-paper);
  border: 1px solid var(--palette-divider);
  border-radius: 8px;
}

.dashboard-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.dashboard-section-title {
  font-weight: 600;
}

.dashboard-activity-item {
  display: flex;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--palette-divider);

  &:last-child {
    border-bottom: none;
  }
}

.dashboard-activity-text {
  font-size: 0.875rem;
}

.dashboard-goal-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--palette-divider);

  &:last-child {
    border-bottom: none;
  }
}

@include mobile-only {
  .dashboard-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
```

- [ ] **Step 2: Update `Dashboard.tsx` — add class names**

Add `className="dashboard-page"` to root container.

Replace all `sx={{ ... background, border, borderRadius }}` style props on card elements with the appropriate SCSS class name.

Add `className="dashboard-section"` to each card section. Add `className="dashboard-stat-card"` to each stat chip/card.

Verify all labels use `i18next.t()`.

- [ ] **Step 3: Run build**

```bash
npm run build 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 4: Run full test suite**

```bash
npx jest --no-coverage 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/resources/styles/pages/dashboard.scss src/pages/user/Dashboard.tsx
git commit -m "feat: Dashboard page — SCSS classes"
```

---

## Final Verification

- [ ] **Run full build**

```bash
npm run build
```

Expected: no errors, no warnings about missing translation keys.

- [ ] **Run full test suite**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Verify localStorage persistence**

In the browser:
1. Toggle dark/light mode — `localStorage.getItem('vg-settings')` should update `state.theme`
2. Change language — `localStorage.getItem('vg-settings')` should update `state.language`
3. Select a team, close and reopen the browser tab — the team should still be selected

- [ ] **Verify no UUID displays**

Visit: Tenants list, Goals list, TenantDetails members. All user/owner columns should show avatar + name or `?`, never a UUID string.
