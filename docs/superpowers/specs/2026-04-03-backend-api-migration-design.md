# Backend API Migration Design

**Date:** 2026-04-03
**Branch:** develop
**Status:** Approved

---

## Overview

The VolleyGoals backend has undergone extensive API changes. This document specifies the frontend migration plan across four phases:

1. **Envelope Fix** — unwrap the new `data` response wrapper
2. **Breaking Model Fixes** — rename fields, fix endpoint paths, extend types, add dynamic permission model
3. **Tenant API Layer** — new types, API methods, and store for the Tenant resource group
4. **Tenant Management UI** — new admin screens for tenants, role definitions, and ownership policies

---

## Context

### Response Envelope Change (Critical)

Every API response now wraps its payload under a `data` key:

```json
// Old
{ "message": "Success", "user": {...}, "items": [...] }

// New
{ "message": "Success", "data": { "user": {...}, "items": [...] } }
```

This affects every method in `src/services/backend.api.ts` (~25 methods).

### New Tenant System

The backend introduces a full Tenant API at `/v1/tenants` covering:
- Tenant CRUD
- Tenant member management
- Custom role definitions (with permission arrays)
- Ownership policies (per resource type)
- Tenanted team creation

### Current Permission Model Problem

Navigation and pages gate functionality using hardcoded role-name checks:
```ts
// Navigation.tsx
{ key: 'invites', roles: [RoleType.Admin, RoleType.Trainer], ... }

// CommentSection.tsx
const canEdit = userRole === 'admin' || userRole === 'trainer';
```

This model is incompatible with tenant-managed custom roles that carry arbitrary permission sets.

---

## Phase 1: Response Envelope Unwrapping

**Files:** `src/services/backend.api.ts`

### Design

Add a private static helper that extracts the `data` property from the new envelope:

```ts
private static unwrap<T>(axiosData: { message: string; data: T }): T {
  return axiosData.data;
}
```

Each method is updated from:
```ts
const response = await VolleyGoalsAPI.endpoint.get('/self');
return response.data;
// was: { message, user, assignments }
```
to:
```ts
const response = await VolleyGoalsAPI.endpoint.get('/self');
return { message: response.data.message, ...VolleyGoalsAPI.unwrap(response.data) };
```

The public method signatures remain unchanged — callers (stores) are unaffected.

The `extractError` helper and `requestDeduped` are unchanged since errors don't use the new envelope.

### Scope

All ~25 public methods in `VolleyGoalsAPI`: `getSelf`, `updateSelf`, `getPresignedSelfAvatarUploadUrl`, `listTeams`, `getTeam`, `createTeam`, `updateTeam`, `deleteTeam`, `updateTeamSettings`, `getPresignedTeamAvatarUploadUrl`, `listTeamInvites`, `fetchUsers`, `getUser`, `deleteUser`, `updateUser`, `listTeamMembers`, `deleteMembership`, `updateMembership`, `createMembership`, `completeInvite`, `getInvite`, `createInvite`, `resendInvite`, `revokeInvite`, `listSeasons`, `getSeason`, `createSeason`, `updateSeason`, `deleteSeason`, `getSeasonStats`, `listGoals`, `getGoal`, `createGoal`, `updateGoal`, `deleteGoal`, `getPresignedGoalAvatarUploadUrl`, `listProgressReports`, `getProgressReport`, `createProgressReport`, `updateProgressReport`, `deleteProgressReport`, `listComments`, `createComment`, `updateComment`, `deleteComment`, `getPresignedCommentFileUploadUrl`, `getTeamActivity`, `leaveTeam`.

---

## Phase 2: Breaking Model Fixes

### 2a. `ITeamMember.cognitoSub` → `userId`

**Files:** `src/store/types.ts`, all stores and components using `ITeamMember`

The new API returns `userId` (not `cognitoSub`) on team member records.

```ts
// Before
interface ITeamMember {
  cognitoSub: string;
  ...
}

// After
interface ITeamMember {
  userId: string;
  ...
}
```

All usages across stores and components are renamed accordingly.

### 2b. Leave Team Endpoint Path

**Files:** `src/services/backend.api.ts`

```ts
// Before
DELETE /teams/${teamId}/members

// After
DELETE /teams/${teamId}/members/leave
```

### 2c. `ITeam.tenantId` Field

**Files:** `src/store/types.ts`

Add optional field — additive, no component changes required:

```ts
interface ITeam {
  tenantId?: string;
  // ...existing fields
}
```

### 2d. `IProfileUpdate` Language Field

**Files:** `src/store/types.ts`, `src/pages/help/Profile.tsx`

```ts
// Before
interface IProfileUpdate {
  name?: string;
  picture?: string;
  preferredUsername?: string;
  birthdate?: string;
}

// After
interface IProfileUpdate {
  name?: string;
  preferredUsername?: string;
  birthdate?: string;
  language?: string;  // replaces locale; picture upload uses presign flow only
}
```

Remove `picture` from `IProfileUpdate` (picture upload always goes through the presign endpoint, never PATCH /self). Update profile edit form to use `language` field.

### 2e. Activity Feed Pagination

**Files:** `src/services/backend.api.ts`, `src/store/activity.ts`

Extend `getTeamActivity` signature:

```ts
// Before
getTeamActivity(teamId: string, limit?: number)

// After
getTeamActivity(teamId: string, filter?: { limit?: number; nextToken?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' })
```

Update the activity store to store `nextToken` and `hasMore` for pagination support.

### 2f. Dynamic Permission Model

**Files:** `src/utils/permissions.ts` (new), `src/hooks/usePermission.ts` (new), `src/store/cognitoUser.ts`, `src/components/Navigation.tsx`, all pages with inline role checks

#### Permission Constants

`src/utils/permissions.ts`:

```ts
export const ALL_PERMISSIONS = [
  'goals:read', 'goals:write', 'goals:delete',
  'progress_reports:read', 'progress_reports:write', 'progress_reports:delete',
  'comments:read', 'comments:write', 'comments:delete',
  'members:read', 'members:write',
  'seasons:read', 'seasons:write',
  'invites:read', 'invites:write',
  'team_settings:read', 'team_settings:write',
] as const;

export type Permission = typeof ALL_PERMISSIONS[number];

const DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  admin: [...ALL_PERMISSIONS],
  trainer: [
    'goals:read', 'goals:write',
    'members:read',
    'seasons:read',
    'invites:read', 'invites:write',
    'comments:read', 'comments:write',
    'progress_reports:read', 'progress_reports:write',
    'team_settings:read',
  ],
  member: [
    'goals:read',
    'comments:read', 'comments:write',
    'seasons:read',
    'progress_reports:read', 'progress_reports:write',
  ],
};

export function resolvePermissions(role: string, roleDefinitions: IRoleDefinition[]): Permission[] {
  const custom = roleDefinitions.find(r => r.name.toLowerCase() === role.toLowerCase());
  return (custom?.permissions ?? DEFAULT_PERMISSIONS[role] ?? []) as Permission[];
}
```

#### `cognitoUser` Store Extension

Add `currentPermissions: Permission[]` to the store state. Recomputed whenever `selectedTeam` or `roleDefinitions` (from the tenant store) change.

#### `usePermission` Hook

`src/hooks/usePermission.ts`:

```ts
export function usePermission(permission: Permission): boolean {
  return useCognitoUserStore(s => s.currentPermissions.includes(permission));
}
```

#### Two-Tier Permission Model

Permissions gate two distinct concerns:

1. **Page access / nav visibility** — controlled by the `read` permission for that resource. If a user has `goals:read`, the Goals nav item is visible and the Goals page is accessible.
2. **Action buttons** — create/update buttons gated on `resource:write`; delete buttons gated on `resource:delete` where it exists, otherwise `resource:write`.

This means a user with only `goals:read` can visit the Goals page and see goals, but all create/edit/delete buttons are hidden or disabled.

#### Navigation Update

`NavItem` type changes:
```ts
type NavItem = {
  key: string;
  labelKey: string;
  path: string;
  icon?: React.ReactNode;
  userType: UserType;
  readPermission?: Permission;  // replaces roles?: RoleType[]; gates page access
};
```

Updated items — nav item visible when the user has the `readPermission`:
```ts
{ key: 'goals',        readPermission: 'goals:read',             ... }
{ key: 'progress',     readPermission: 'progress_reports:read',  ... }
{ key: 'members',      readPermission: 'members:read',           ... }
{ key: 'seasons',      readPermission: 'seasons:read',           ... }
{ key: 'teamSettings', readPermission: 'team_settings:read',     ... }
{ key: 'invites',      readPermission: 'invites:read',           ... }
// Admin-only items keep userType gating, no readPermission needed:
{ key: 'teams',        userType: UserType.Admin, ... }
{ key: 'users',        userType: UserType.Admin, ... }
{ key: 'tenants',      userType: UserType.Admin, ... }
```

#### Pages Updated

All inline role checks replaced with `usePermission`. Each page has two layers:

| File | Page access (nav + route) | Action buttons |
|------|--------------------------|----------------|
| `Goals.tsx` | `goals:read` | Create → `goals:write` |
| `GoalDetails.tsx` | `goals:read` | Edit → `goals:write`, Delete → `goals:delete` |
| `Progress.tsx` | `progress_reports:read` | Create → `progress_reports:write` |
| `ProgressDetails.tsx` | `progress_reports:read` | Edit → `progress_reports:write`, Delete → `progress_reports:delete` |
| `Members.tsx` | `members:read` | Add/Remove/Edit → `members:write` |
| `Seasons.tsx` | `seasons:read` | Create/Edit/Delete → `seasons:write` |
| `CommentSection.tsx` | `comments:read` (renders at all) | Post/Edit → `comments:write`, Delete → `comments:delete` |
| `TeamSettings.tsx` | `team_settings:read` | Edit/Save controls → `team_settings:write` |
| `Invites.tsx` | `invites:read` | Create/Revoke → `invites:write` |

Role definitions are loaded from the tenant store (using `team.tenantId`) when a team is selected. If the user lacks tenant admin access the fetch fails gracefully, and `resolvePermissions` falls back to defaults.

### 2g. Goals–Season Decoupling

**Files:** `src/services/backend.api.ts`, `src/store/types.ts`, `src/store/goals.ts`, `src/pages/user/Goals.tsx`, `src/pages/user/GoalDetails.tsx`

Goals are no longer nested under seasons. They are now owned by a **team** and can be *tagged* to zero or more seasons via a join relationship. This is confirmed by the Terraform route definitions in `routes_goals.tf`.

#### Endpoint changes

| Old | New |
|-----|-----|
| `POST /seasons/{seasonId}/goals` | `POST /teams/{teamId}/goals` |
| `GET /seasons/{seasonId}/goals` | `GET /teams/{teamId}/goals` + optional `?seasonId=` query param |
| `GET /seasons/{seasonId}/goals/{goalId}` | `GET /teams/{teamId}/goals/{goalId}` |
| `PATCH /seasons/{seasonId}/goals/{goalId}` | `PUT /teams/{teamId}/goals/{goalId}` (**PUT, not PATCH**) |
| `DELETE /seasons/{seasonId}/goals/{goalId}` | `DELETE /teams/{teamId}/goals/{goalId}` |
| `GET /seasons/{seasonId}/goals/{goalId}/picture/presign` | `POST /teams/{teamId}/goals/{goalId}/picture` (**POST to endpoint, not GET presign**) |

Three new season-tagging endpoints:

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/teams/{teamId}/goals/{goalId}/seasons/{seasonId}` | Tag goal to a season |
| `DELETE` | `/teams/{teamId}/goals/{goalId}/seasons/{seasonId}` | Untag goal from a season |
| `GET` | `/teams/{teamId}/goals/{goalId}/seasons` | List all seasons a goal is tagged to |

#### Type changes (`src/store/types.ts`)

`IGoal` is now team-scoped. `seasonId` is removed as a required top-level field:

```ts
interface IGoal {
  id: string;
  teamId: string;        // replaces seasonId at top level
  ownerId: string;
  owner?: { id: string; name?: string; preferredUsername?: string; picture?: string };
  goalType: GoalType;
  title: string;
  description: string;
  status: GoalStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  picture?: string;
  completionPercentage?: number;
  // seasonId removed — use IGoalSeasonTag for the relationship
}

interface IGoalSeasonTag {
  goalId: string;
  seasonId: string;
}
```

#### API method changes (`src/services/backend.api.ts`)

```ts
// Signatures change from (seasonId, ...) to (teamId, ...)
listGoals(teamId: string, filter: IGoalFilterOption): Promise<...>
getGoal(teamId: string, id: string): Promise<...>
createGoal(teamId: string, data: {...}): Promise<...>
updateGoal(teamId: string, id: string, data: Partial<{...}>): Promise<...>  // uses PUT internally
deleteGoal(teamId: string, id: string): Promise<...>
uploadGoalPicture(teamId: string, goalId: string, data: { filename: string; contentType: string }): Promise<...>

// New tagging methods
tagGoalToSeason(teamId: string, goalId: string, seasonId: string): Promise<...>
untagGoalFromSeason(teamId: string, goalId: string, seasonId: string): Promise<...>
listGoalSeasons(teamId: string, goalId: string): Promise<{ message: string; error?: string; items?: IGoalSeasonTag[] }>
```

`IGoalFilterOption` gains an optional `seasonId` field (now a query param, not a path param):
```ts
interface IGoalFilterOption extends IFilterOption {
  ownerId?: string;
  goalType?: GoalType;
  status?: GoalStatus;
  title?: string;
  seasonId?: string;   // added — filters goals tagged to this season
}
```

The old `getPresignedGoalAvatarUploadUrl` and `uploadGoalAvatar` pair is replaced by a single `uploadGoalPicture` method that POSTs to the endpoint (which handles S3 internally and returns the file URL directly).

#### Store changes (`src/store/goals.ts`)

Remove `seasonId` from all goal store actions that previously took it as a required param. The selected team's ID (from `cognitoUser` store) is used instead.

#### UI changes

**`Goals.tsx`:** Season is now an optional filter, not a routing prerequisite. The page loads goals for `selectedTeam.team.id` and passes `seasonId` as a query filter when the user selects a season from a dropdown.

**`GoalDetails.tsx`:** Add a "Seasons" section showing which seasons this goal is tagged to, with add/remove controls (calls `tagGoalToSeason` / `untagGoalFromSeason`). Gated on `goals:write`.

---

## Phase 3: Tenant API Layer

### New Types (`src/store/types.ts`)

```ts
interface ITenant {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

interface ITenantMember {
  id: string;
  tenantId: string;
  userId: string;
  role: 'admin' | 'member';
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface IRoleDefinition {
  id: string;
  tenantId: string;
  name: string;
  permissions: string[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface IOwnershipPolicy {
  id: string;
  tenantId: string;
  resourceType: string;
  ownerPermissions: string[];
  parentOwnerPermissions: string[];
  createdAt: string;
  updatedAt: string;
}
```

### New API Methods (`src/services/backend.api.ts`)

| Group | Method | Endpoint |
|-------|--------|----------|
| Tenants | `createTenant(name)` | `POST /v1/tenants` |
| | `getTenant(id)` | `GET /v1/tenants/{id}` |
| | `updateTenant(id, name)` | `PATCH /v1/tenants/{id}` |
| | `deleteTenant(id)` | `DELETE /v1/tenants/{id}` |
| Tenant Members | `addTenantMember(tenantId, userId, role)` | `POST /v1/tenants/{id}/members` |
| | `removeTenantMember(tenantId, memberId)` | `DELETE /v1/tenants/{id}/members/{memberId}` |
| Role Definitions | `listRoleDefinitions(tenantId)` | `GET /v1/tenants/{id}/roles` |
| | `createRoleDefinition(tenantId, name, permissions)` | `POST /v1/tenants/{id}/roles` |
| | `updateRoleDefinition(tenantId, roleId, permissions)` | `PATCH /v1/tenants/{id}/roles/{roleId}` |
| | `deleteRoleDefinition(tenantId, roleId)` | `DELETE /v1/tenants/{id}/roles/{roleId}` |
| Ownership Policies | `listOwnershipPolicies(tenantId)` | `GET /v1/tenants/{id}/ownership-policies` |
| | `updateOwnershipPolicy(tenantId, resourceType, ownerPerms, parentOwnerPerms)` | `PATCH /v1/tenants/{id}/ownership-policies/{resourceType}` |
| Tenanted Teams | `createTenantedTeam(tenantId, name)` | `POST /v1/tenants/{id}/teams` |

All methods follow the same pattern as existing methods: `ensureEndpoints`, axios call, `unwrap` response, `extractError` on catch.

### New Store (`src/store/tenants.ts`)

State shape:
```ts
{
  tenants: ITenant[];
  currentTenant: ITenant | null;
  tenantMembers: ITenantMember[];
  roleDefinitions: IRoleDefinition[];
  ownershipPolicies: IOwnershipPolicy[];
  loading: boolean;
  error: string | null;
}
```

Actions mirror the API methods. Store follows the existing Zustand pattern used by all other stores in this project.

`roleDefinitions` is consumed by `cognitoUser` store's `resolvePermissions` call when a team is selected (Phase 2f).

---

## Phase 4: Tenant Management UI

### New Routes (`src/App.tsx`)

All gated to `UserType.Admin`:

```
/tenants                          Tenants list
/tenants/:tenantId                Tenant detail (members + create team)
/tenants/:tenantId/roles          Role definitions editor
/tenants/:tenantId/policies       Ownership policies editor
```

Add `'tenants'` to `HeaderVisibleSegments`.

### New Pages (`src/pages/admin/`)

**`Tenants.tsx`**
- Table of all tenants (name, owner, created date)
- "Create Tenant" button → inline dialog with name field
- Row click → navigate to `TenantDetails`
- Delete button per row (with confirmation)

**`TenantDetails.tsx`**
- Tenant name header with inline edit
- Member list table: userId, role, status, remove button
- "Add Member" button → dialog with userId + role fields
- "Create Team" button → dialog with team name field (calls `createTenantedTeam`)
- Navigation tabs to Roles and Policies sub-pages

**`TenantRoles.tsx`**
- List of role definitions as cards/rows
- Each row shows: name, permission chips, isDefault badge
- "Add Role" button → form with name field + permission multiselect (using `ALL_PERMISSIONS`)
- Edit button per role (opens same form pre-filled) — disabled for `isDefault: true` roles
- Delete button per role — disabled for `isDefault: true` roles

**`TenantPolicies.tsx`**
- One card per resource type (`goals`, `progress_reports`, `comments`)
- Each card shows two multiselects: "Owner Permissions" and "Parent Owner Permissions"
- Save button per card — calls `updateOwnershipPolicy` (upsert)
- Uses `ALL_PERMISSIONS` constant for the selectable options

### Navigation Update (`src/components/Navigation.tsx`)

Add "Tenants" nav item visible to `UserType.Admin` only:

```ts
{ key: 'tenants', labelKey: 'nav.tenants', path: '/tenants', icon: <BusinessIcon />, userType: UserType.Admin }
```

---

## Implementation Order

The phases must be implemented sequentially — each depends on the previous:

```
Phase 1 (envelope fix)
  → Phase 2 (model fixes + permissions) 
    → Phase 3 (tenant API layer)
      → Phase 4 (tenant UI)
```

Within Phase 2, sub-items 2a–2e and 2g can be done in any order. Phase 2f (permissions) requires `IRoleDefinition` to exist. The resolution: add the four new tenant types (`ITenant`, `ITenantMember`, `IRoleDefinition`, `IOwnershipPolicy`) to `src/store/types.ts` at the start of Phase 2 (alongside 2a–2e), so that `permissions.ts` can import `IRoleDefinition` immediately. The tenant store and API methods that use these types come in Phase 3 as planned.

## Files Added / Modified Summary

| File | Change |
|------|--------|
| `src/services/backend.api.ts` | Envelope unwrap + goal path/method changes + 3 new goal-season tagging methods + 13 new tenant methods + activity pagination + leave team path |
| `src/store/types.ts` | `ITeamMember.userId`, `ITeam.tenantId`, `IProfileUpdate.language`, `IGoal.teamId`, new `IGoalSeasonTag`, 4 new tenant types |
| `src/store/tenants.ts` | New store |
| `src/utils/permissions.ts` | New — permission constants + resolver |
| `src/hooks/usePermission.ts` | New — `usePermission` hook |
| `src/store/cognitoUser.ts` | Add `currentPermissions`, integrate tenant role resolution |
| `src/store/goals.ts` | Remove `seasonId` param from all actions; use `teamId` instead |
| `src/store/activity.ts` | Pagination state |
| `src/components/Navigation.tsx` | Permission-based nav items + Tenants item |
| `src/pages/admin/Tenants.tsx` | New |
| `src/pages/admin/TenantDetails.tsx` | New |
| `src/pages/admin/TenantRoles.tsx` | New |
| `src/pages/admin/TenantPolicies.tsx` | New |
| `src/App.tsx` | New tenant routes + HeaderVisibleSegments |
| `src/pages/help/Profile.tsx` | Language field |
| `src/components/CommentSection.tsx` | `usePermission` |
| `src/pages/trainer/Members.tsx` | `usePermission` |
| `src/pages/trainer/TeamSettings.tsx` | `usePermission` |
| `src/pages/trainer/Invites.tsx` | `usePermission` |
| `src/pages/user/Goals.tsx` | `usePermission` |
| `src/pages/user/GoalDetails.tsx` | `usePermission` |
| `src/pages/user/ProgressDetails.tsx` | `usePermission` |
