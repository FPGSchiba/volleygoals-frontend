# Backend API Migration — Phases 1 & 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the frontend to match the new backend API contract — response envelope unwrapping, goal/season decoupling, field renames, and a dynamic permission model replacing hardcoded role checks.

**Architecture:** All data flows through the singleton `VolleyGoalsAPIV1` class; a new `unwrap<T>()` helper handles the envelope in one place. Goal state moves from season-scoped to team-scoped throughout the store and pages. A new `src/utils/permissions.ts` module provides permission resolution, consumed by a `usePermission` hook used across all pages and navigation.

**Tech Stack:** TypeScript, React, Zustand, MUI, Jest/jsdom, react-hook-form

---

## File Structure

| File | Status | Responsibility |
|------|--------|----------------|
| `src/store/types.ts` | Modify | Core domain types — rename fields, add new types |
| `src/services/types.ts` | Modify | Filter options — add `seasonId?` to `IGoalFilterOption` |
| `src/__tests__/mocks/factories.ts` | Modify | Test factories — `buildGoal` uses `teamId` |
| `src/services/backend.api.ts` | Modify | API client — unwrap helper, goal paths, leave team, activity |
| `src/store/goals.ts` | Modify | Goal store — all actions use `teamId` not `seasonId` |
| `src/store/activity.ts` | Modify | Activity store — pagination state + filter object |
| `src/utils/permissions.ts` | Create | Permission constants, `resolvePermissions` |
| `src/hooks/usePermission.ts` | Create | `usePermission` hook |
| `src/store/cognitoUser.ts` | Modify | Add `currentPermissions: Permission[]`, recompute on team select |
| `src/components/Navigation.tsx` | Modify | `readPermission` model replaces `roles` |
| `src/__tests__/store/goals.test.ts` | Modify | Tests use `teamId` |
| `src/__tests__/utils/permissions.test.ts` | Create | Tests for `resolvePermissions` |
| `src/pages/user/Goals.tsx` | Modify | Team-scoped fetch, season as optional filter |
| `src/pages/user/GoalDetails.tsx` | Modify | Season tagging section, `usePermission` |
| `src/pages/user/Progress.tsx` | Modify | `usePermission` |
| `src/pages/user/ProgressDetails.tsx` | Modify | `usePermission` |
| `src/pages/trainer/Members.tsx` | Modify | `usePermission` |
| `src/pages/trainer/TeamSettings.tsx` | Modify | `usePermission` |
| `src/pages/trainer/Invites.tsx` | Modify | `usePermission` |
| `src/components/CommentSection.tsx` | Modify | `usePermission` |
| `src/pages/help/Profile.tsx` | Modify | Language field replaces picture in form |

---

## Task 1: Update Core Type Definitions

**Files:**
- Modify: `src/store/types.ts`
- Modify: `src/services/types.ts`
- Modify: `src/__tests__/mocks/factories.ts`

- [ ] **Step 1: Open `src/store/types.ts` and make the following changes**

  **1a. Rename `ITeamMember.cognitoSub` → `userId`:**
  ```ts
  export interface ITeamMember {
    id: string;
    userId: string;       // was: cognitoSub
    teamId: string;
    role: RoleType;
    status: TeamMemberStatus;
    createdAt: string;
    updatedAt: string;
    joinedAt?: string;
    leftAt?: string;
  }
  ```

  **1b. Add `tenantId?` to `ITeam`:**
  ```ts
  export interface ITeam {
    id: string;
    name: string;
    status: 'active' | 'inactive';
    picture: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
    tenantId?: string;
  }
  ```

  **1c. Update `IProfileUpdate` — remove `picture`, add `language`:**
  ```ts
  export interface IProfileUpdate {
    name?: string;
    preferredUsername?: string;
    birthdate?: string;
    language?: string;
  }
  ```

  **1d. Update `IGoal` — replace `seasonId` with `teamId`:**
  ```ts
  export interface IGoal {
    id: string;
    teamId: string;       // was: seasonId
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
  }
  ```

  **1e. Add `IGoalSeasonTag` after `IGoal`:**
  ```ts
  export interface IGoalSeasonTag {
    goalId: string;
    seasonId: string;
  }
  ```

  **1f. Add four tenant types at the end of the file:**
  ```ts
  // Tenants
  export interface ITenant {
    id: string;
    name: string;
    ownerId: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface ITenantMember {
    id: string;
    tenantId: string;
    userId: string;
    role: 'admin' | 'member';
    status: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface IRoleDefinition {
    id: string;
    tenantId: string;
    name: string;
    permissions: string[];
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
  }

  export interface IOwnershipPolicy {
    id: string;
    tenantId: string;
    resourceType: string;
    ownerPermissions: string[];
    parentOwnerPermissions: string[];
    createdAt: string;
    updatedAt: string;
  }
  ```

- [ ] **Step 2: Update `src/services/types.ts` — add `seasonId?` to `IGoalFilterOption`**

  ```ts
  export interface IGoalFilterOption extends IFilterOption {
    ownerId?: string;
    goalType?: GoalType;
    status?: GoalStatus;
    title?: string;
    seasonId?: string;   // added — filter goals tagged to this season
  }
  ```

- [ ] **Step 3: Update `src/__tests__/mocks/factories.ts` — fix `buildGoal`**

  Change `seasonId: uid()` to `teamId: uid()` in `buildGoal`:
  ```ts
  export function buildGoal(overrides?: Partial<IGoal>): IGoal {
    const id = uid();
    return {
      id,
      teamId: uid(),    // was: seasonId: uid()
      ownerId: uid(),
      goalType: GoalType.Team,
      title: `Goal ${id}`,
      description: `Description for ${id}`,
      status: GoalStatus.Open,
      createdBy: uid(),
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }
  ```

  Also add the four new builder functions at the end of the file:
  ```ts
  import {
    IUser, ITeam, ITeamAssignment, ISeason, IGoal, IProgressReport,
    IProgressEntry, IComment, IInvite, IActivityEntry, ISeasonStats,
    ITeamSettings, ITeamUser, ICommentFile,
    ITenant, ITenantMember, IRoleDefinition, IOwnershipPolicy,
    UserType, RoleType, TeamMemberStatus, SeasonStatus, GoalType, GoalStatus, CommentType,
  } from '../../store/types';
  ```

  Add at the bottom:
  ```ts
  export function buildTenant(overrides?: Partial<ITenant>): ITenant {
    const id = uid();
    return {
      id,
      name: `Tenant ${id}`,
      ownerId: uid(),
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }

  export function buildRoleDefinition(overrides?: Partial<IRoleDefinition>): IRoleDefinition {
    const id = uid();
    return {
      id,
      tenantId: uid(),
      name: `Role ${id}`,
      permissions: ['goals:read'],
      isDefault: false,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }
  ```

- [ ] **Step 4: Run the TypeScript compiler to verify no type errors**

  Run: `npx tsc --noEmit 2>&1 | head -40`

  Expected: errors only about `seasonId` usages in files we haven't updated yet (goals.ts, goals.test.ts, Goals.tsx, GoalDetails.tsx). No other new errors. Record the list of `seasonId` errors — we'll fix them in later tasks.

- [ ] **Step 5: Commit**

  ```bash
  git add src/store/types.ts src/services/types.ts src/__tests__/mocks/factories.ts
  git commit -m "feat: update type definitions for API v2 (IGoal.teamId, ITeamMember.userId, tenant types)"
  ```

---

## Task 2: Add `unwrap` Helper and Update All Existing API Methods

**Files:**
- Modify: `src/services/backend.api.ts`

The new API wraps all response payloads under a `data` key:
- Old: `{ message, user, assignments }`
- New: `{ message, data: { user, assignments } }`

We add one private helper and update every public method's success path.

- [ ] **Step 1: Add the `unwrap` helper immediately after the `extractError` static method** (after line 44):

  ```ts
  private static unwrap<T>(envelope: { message: string; data: T }): T {
    return envelope.data;
  }
  ```

- [ ] **Step 2: Update all non-deduped methods to use `unwrap`**

  The pattern is: replace `return response.data;` with `return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };`

  Apply this to every method that currently does `return response.data`. The methods are:

  - `getSelf` — returns `{ message, user?, assignments? }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.get('/self');
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `updateSelf` — returns `{ message, user? }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.patch('/self', data);
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `getPresignedSelfAvatarUploadUrl` — returns `{ message, uploadUrl?, key?, fileUrl? }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.get('/self/picture/presign', { params: { filename, contentType }});
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `listTeams` — returns `{ message, count?, hasMore?, items?, nextToken? }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.get('/teams', { params: filter });
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `getTeam` — returns `{ message, team?, teamSettings? }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.get(`/teams/${id}`);
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `createTeam` — returns `{ message, team? }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.post('/teams', data);
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `updateTeam` — returns `{ message, team? }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.patch(`/teams/${id}`, data);
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `deleteTeam` — returns `{ message }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.delete(`/teams/${id}`);
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `updateTeamSettings` — returns `{ message, teamSettings? }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.patch(`/teams/${teamId}/settings`, settings);
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `getPresignedTeamAvatarUploadUrl` — returns `{ message, uploadUrl?, key?, fileUrl? }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.get(`/teams/${teamId}/picture/presign`, { params: { filename, contentType }});
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `fetchUsers` — returns `{ message, paginationToken?, users? }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.get('/users', { params: filter });
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `getUser` — returns `{ message, user?, memberships? }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.get(`/users/${id}`);
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `deleteUser` — returns `{ message }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.delete(`/users/${id}`);
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `updateUser` — returns `{ message, user? }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.patch(`/users/${id}`, data);
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `deleteMembership` — returns `{ message }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.delete(`/teams/${teamId}/members/${id}`);
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `updateMembership` — returns `{ message, teamMember? }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.patch(`/teams/${teamId}/members/${id}`, { role, status });
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `createMembership` — returns `{ message, teamMember? }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.post(`/teams/${teamId}/members`, { role, userId });
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `completeInvite` — returns `{ message, member?, invite?, userCreated?, temporaryPassword? }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.post('/invites/complete', { token, email, accepted });
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `getInvite` — returns `{ message, invite? }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.get(`/invites/${token}`);
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `createInvite` — returns `{ message, invite? }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.post(`/invites`, { teamId, email, role, message, sendEmail });
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `resendInvite` — returns `{ message }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.patch(`/invites/${inviteId}`);
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `revokeInvite` — returns `{ message }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.delete(`/invites/${inviteId}`);
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `getSeason` — returns `{ message, season? }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.get(`/seasons/${id}`);
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `createSeason` — returns `{ message, season? }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.post('/seasons', data);
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `updateSeason` — returns `{ message, season? }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.patch(`/seasons/${id}`, data);
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `deleteSeason` — returns `{ message }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.delete(`/seasons/${id}`);
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `getSeasonStats` — returns `{ message, stats? }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.get(`/seasons/${seasonId}/stats`);
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `createComment` — returns `{ message, comment? }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.post(`/comments`, data);
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `updateComment` — returns `{ message, comment? }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.patch(`/comments/${commentId}`, { content });
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `deleteComment` — returns `{ message }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.delete(`/comments/${commentId}`);
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `getPresignedCommentFileUploadUrl` — returns `{ message, uploadUrl?, commentFile? }`:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.get(`/comments/${commentId}/file/presign`, { params: { filename, contentType } });
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

  - `leaveTeam` — fix path AND apply unwrap. Change from:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.delete(`/teams/${teamId}/members`);
    return response.data;
    ```
    to:
    ```ts
    const response = await VolleyGoalsAPIV1.endpoint.delete(`/teams/${teamId}/members/leave`);
    return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    ```

- [ ] **Step 3: Update `listSeasons` — apply unwrap**

  ```ts
  const response = await VolleyGoalsAPIV1.endpoint.get(`/seasons`, { params: normFilter });
  return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
  ```

- [ ] **Step 4: Update `listComments` — apply unwrap**

  ```ts
  const response = await VolleyGoalsAPIV1.endpoint.get(`/comments`, { params: normFilter });
  return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
  ```

- [ ] **Step 5: Update `listTeamMembers` (uses `requestDeduped`) — the axiosFn must pre-unwrap**

  The `requestDeduped` helper returns `resp.data` as `T`. Because the new envelope wraps data, we unwrap inside the `axiosFn` so `requestDeduped` still receives a flat response. Change the axiosFn from returning the raw axios promise to returning a pre-unwrapped result:

  ```ts
  public async listTeamMembers(teamId: string, filter?: ITeamMemberFilterOption): Promise<{ message: string, error?: string, count?: number, items?: ITeamUser[] }> {
    try {
      const normFilter = { ...(filter || {}), limit: filter?.limit ?? 10, sortOrder: filter?.sortOrder ?? 'asc', sortBy: filter?.sortBy };
      const data = await this.requestDeduped<{ message: string; error?: string; count?: number; items?: ITeamUser[] }>('GET', `/teams/${teamId}/members`, async () => {
        await this.ensureEndpoints();
        const response = await VolleyGoalsAPIV1.endpoint.get(`/teams/${teamId}/members`, { params: normFilter });
        const unwrapped = { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
        return { data: unwrapped };
      }, normFilter as unknown as Record<string, unknown>, 1000);
      return data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }
  ```

- [ ] **Step 6: Update `listTeamInvites` (uses `requestDeduped`) — same pre-unwrap pattern**

  ```ts
  public async listTeamInvites(teamId: string, filter?: ITeamInviteFilterOption): Promise<{ message: string, error?: string, count?: number, items?: IInvite[], nextToken?: string, hasMore?: boolean }> {
    try {
      const normFilter = { ...(filter || {}), limit: filter?.limit ?? 10, sortOrder: filter?.sortOrder ?? 'asc', sortBy: filter?.sortBy } as ITeamInviteFilterOption;
      const data = await this.requestDeduped<{ message: string; error?: string; count?: number; items?: IInvite[]; nextToken?: string; hasMore?: boolean }>('GET', `/teams/${teamId}/invites`, async () => {
        await this.ensureEndpoints();
        const response = await VolleyGoalsAPIV1.endpoint.get(`/teams/${teamId}/invites`, { params: normFilter });
        const unwrapped = { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
        return { data: unwrapped };
      }, normFilter as unknown as Record<string, unknown>, 1000);
      return data;
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }
  ```

- [ ] **Step 7: Update `getTeamActivity` — new filter object signature + unwrap**

  Replace the old `getTeamActivity(teamId: string, limit: number = 20)` with:

  ```ts
  public async getTeamActivity(teamId: string, filter?: { limit?: number; nextToken?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }): Promise<{ message: string, error?: string, items?: IActivityEntry[], nextToken?: string, hasMore?: boolean }> {
    try {
      await this.ensureEndpoints();
      const params = { limit: filter?.limit ?? 20, ...(filter?.nextToken ? { nextToken: filter.nextToken } : {}), ...(filter?.sortBy ? { sortBy: filter.sortBy } : {}), ...(filter?.sortOrder ? { sortOrder: filter.sortOrder } : {}) };
      const response = await VolleyGoalsAPIV1.endpoint.get(`/teams/${teamId}/activity`, { params });
      return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }
  ```

- [ ] **Step 8: Run TypeScript check**

  Run: `npx tsc --noEmit 2>&1 | head -40`

  Expected: errors about goal methods still using `seasonId` (in `listGoals`, `getGoal`, `createGoal`, `updateGoal`, `deleteGoal`, `getPresignedGoalAvatarUploadUrl`, `uploadGoalAvatar`) — these are addressed in Task 3. No new errors from the unwrap changes.

- [ ] **Step 9: Commit**

  ```bash
  git add src/services/backend.api.ts
  git commit -m "feat: add response envelope unwrap helper; fix leaveTeam path; update getTeamActivity signature"
  ```

---

## Task 3: Update Goal API Methods

**Files:**
- Modify: `src/services/backend.api.ts`

Goals now live at `/teams/{teamId}/goals`, use `PUT` for updates, and the picture upload is a direct `POST` (no presign). Three new season-tagging methods are added.

- [ ] **Step 1: Replace `listGoals` — `seasonId` → `teamId`, new path**

  ```ts
  public async listGoals(teamId: string, filter: IGoalFilterOption): Promise<{ message: string, error?: string, count?: number, items?: IGoal[], nextToken?: string, hasMore?: boolean}> {
    try {
      await this.ensureEndpoints();
      const normFilter = { ...(filter || {}), limit: filter?.limit ?? 10, sortOrder: filter?.sortOrder ?? 'asc', sortBy: filter?.sortBy } as IGoalFilterOption;
      const response = await VolleyGoalsAPIV1.endpoint.get(`/teams/${teamId}/goals`, { params: normFilter });
      return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }
  ```

- [ ] **Step 2: Replace `getGoal` — `seasonId` → `teamId`, new path**

  ```ts
  public async getGoal(teamId: string, id: string): Promise<{message: string, error?: string, goal?: IGoal}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.get(`/teams/${teamId}/goals/${id}`);
      return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }
  ```

- [ ] **Step 3: Replace `createGoal` — `seasonId` → `teamId`, new path**

  ```ts
  public async createGoal(teamId: string, data: {type: GoalType, title: string, description: string}): Promise<{message: string, error?: string, goal?: IGoal}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.post(`/teams/${teamId}/goals`, data);
      return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }
  ```

- [ ] **Step 4: Replace `updateGoal` — `seasonId` → `teamId`, `PATCH` → `PUT`, new path**

  ```ts
  public async updateGoal(teamId: string, id: string, data: Partial<{title: string, description: string, status: GoalStatus, ownerId: string}>): Promise<{ message: string, error?: string, goal?: IGoal}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.put(`/teams/${teamId}/goals/${id}`, data);
      return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }
  ```

- [ ] **Step 5: Replace `deleteGoal` — `seasonId` → `teamId`, new path**

  ```ts
  public async deleteGoal(teamId: string, id: string): Promise<{ message: string, error?: string}> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.delete(`/teams/${teamId}/goals/${id}`);
      return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }
  ```

- [ ] **Step 6: Replace `getPresignedGoalAvatarUploadUrl` + `uploadGoalAvatar` with `uploadGoalPicture`**

  Remove both old methods and add:
  ```ts
  public async uploadGoalPicture(teamId: string, goalId: string, data: { filename: string; contentType: string }): Promise<{ message: string, error?: string, fileUrl?: string }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.post(`/teams/${teamId}/goals/${goalId}/picture`, data);
      return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }
  ```

- [ ] **Step 7: Add three season-tagging methods after `uploadGoalPicture`**

  ```ts
  public async tagGoalToSeason(teamId: string, goalId: string, seasonId: string): Promise<{ message: string, error?: string }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.post(`/teams/${teamId}/goals/${goalId}/seasons/${seasonId}`);
      return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async untagGoalFromSeason(teamId: string, goalId: string, seasonId: string): Promise<{ message: string, error?: string }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.delete(`/teams/${teamId}/goals/${goalId}/seasons/${seasonId}`);
      return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async listGoalSeasons(teamId: string, goalId: string): Promise<{ message: string, error?: string, items?: IGoalSeasonTag[] }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.get(`/teams/${teamId}/goals/${goalId}/seasons`);
      return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }
  ```

  Add the `IGoalSeasonTag` import at the top of the file:
  ```ts
  import {
    IInvite, ITeam, ITeamAssignment, ITeamMember, ITeamSettings, ITeamUser,
    IUser, IProfileUpdate, IUserUpdate, RoleType, ISeason, SeasonStatus, IGoal, GoalType, GoalStatus,
    IProgressReport, IComment, ICommentFile, IActivityEntry, IGoalSeasonTag
  } from "../store/types";
  ```

- [ ] **Step 8: Run TypeScript check**

  Run: `npx tsc --noEmit 2>&1 | head -40`

  Expected: errors only in `src/store/goals.ts` (still uses old `seasonId` params). Goal-related errors in `Goals.tsx` and `GoalDetails.tsx` are also expected.

- [ ] **Step 9: Commit**

  ```bash
  git add src/services/backend.api.ts
  git commit -m "feat: update goal API methods to /teams/:teamId/goals; add season tagging methods"
  ```

---

## Task 4: Update Goal Store

**Files:**
- Modify: `src/store/goals.ts`
- Modify: `src/__tests__/store/goals.test.ts`

- [ ] **Step 1: Write the failing tests first — update `src/__tests__/store/goals.test.ts`**

  Replace all occurrences of `'season-1'` and `'s1'` with `'team-1'`/`'t1'`. Also add `tagGoalToSeason`, `untagGoalFromSeason`, `listGoalSeasons` to the mock. The full updated file:

  ```ts
  import { useGoalStore } from '../../store/goals';
  import { useNotificationStore } from '../../store/notification';
  import { buildGoal } from '../mocks/factories';
  import { GoalType, GoalStatus } from '../../store/types';

  jest.mock('../../services/backend.api', () => ({
    __esModule: true,
    default: {
      listGoals: jest.fn(),
      createGoal: jest.fn(),
      updateGoal: jest.fn(),
      deleteGoal: jest.fn(),
      getGoal: jest.fn(),
      tagGoalToSeason: jest.fn(),
      untagGoalFromSeason: jest.fn(),
      listGoalSeasons: jest.fn(),
      setToken: jest.fn(),
    },
  }));

  import VolleyGoalsAPIV1 from '../../services/backend.api';
  const api = jest.mocked(VolleyGoalsAPIV1);

  beforeEach(() => {
    useGoalStore.setState({
      goalList: { goals: [], count: 0, hasMore: false, nextToken: '', filter: {} },
      currentGoal: undefined,
    });
    useNotificationStore.setState({ notifications: [] });
    jest.clearAllMocks();
  });

  describe('goal store', () => {
    describe('fetchGoals', () => {
      it('updates goalList from API response', async () => {
        const goals = [buildGoal(), buildGoal()];
        api.listGoals.mockResolvedValue({ message: 'ok', items: goals, count: 2 });

        await useGoalStore.getState().fetchGoals('team-1', {});

        const { goalList } = useGoalStore.getState();
        expect(goalList.goals).toHaveLength(2);
        expect(goalList.count).toBe(2);
      });

      it('triggers notification on error', async () => {
        api.listGoals.mockResolvedValue({ message: 'error.goals', error: 'fail' });

        await useGoalStore.getState().fetchGoals('team-1', {});

        const { notifications } = useNotificationStore.getState();
        expect(notifications).toHaveLength(1);
        expect(notifications[0].level).toBe('error');
      });
    });

    describe('createGoal', () => {
      it('adds goal to list on success', async () => {
        const existing = buildGoal();
        useGoalStore.setState({
          goalList: { goals: [existing], count: 1, hasMore: false, nextToken: '', filter: {} },
        });

        const newGoal = buildGoal({ title: 'New Goal' });
        api.createGoal.mockResolvedValue({ message: 'ok', goal: newGoal });

        await useGoalStore.getState().createGoal('t1', GoalType.Team, 'New Goal', 'desc');

        const { goalList } = useGoalStore.getState();
        expect(goalList.goals).toHaveLength(2);
        expect(goalList.goals[0].title).toBe('New Goal');
        expect(goalList.count).toBe(2);
      });

      it('triggers notification on error', async () => {
        api.createGoal.mockResolvedValue({ message: 'error.create', error: 'fail' });

        await useGoalStore.getState().createGoal('t1', GoalType.Team, 'title', 'desc');

        expect(useNotificationStore.getState().notifications).toHaveLength(1);
      });
    });

    describe('updateGoal', () => {
      it('replaces the updated goal in the list', async () => {
        const goal = buildGoal({ id: 'g1', title: 'Old' });
        useGoalStore.setState({
          goalList: { goals: [goal], count: 1, hasMore: false, nextToken: '', filter: {} },
        });

        const updated = { ...goal, title: 'New Title' };
        api.updateGoal.mockResolvedValue({ message: 'ok', goal: updated });

        await useGoalStore.getState().updateGoal('t1', 'g1', 'New Title');

        expect(useGoalStore.getState().goalList.goals[0].title).toBe('New Title');
      });
    });

    describe('deleteGoal', () => {
      it('removes goal from the list', async () => {
        const goal = buildGoal({ id: 'g1' });
        useGoalStore.setState({
          goalList: { goals: [goal], count: 1, hasMore: false, nextToken: '', filter: {} },
        });

        api.deleteGoal.mockResolvedValue({ message: 'ok' });

        await useGoalStore.getState().deleteGoal('t1', 'g1');

        const { goalList } = useGoalStore.getState();
        expect(goalList.goals).toHaveLength(0);
        expect(goalList.count).toBe(0);
      });

      it('triggers notification on error', async () => {
        api.deleteGoal.mockResolvedValue({ message: 'error.delete', error: 'fail' });

        await useGoalStore.getState().deleteGoal('t1', 'g1');

        expect(useNotificationStore.getState().notifications).toHaveLength(1);
      });
    });
  });
  ```

- [ ] **Step 2: Run the tests — expect failures**

  Run: `npx jest --testPathPattern=goals.test -t "goal store" 2>&1 | tail -20`

  Expected: FAIL — `fetchGoals('season-1', ...)` still uses the old signature in the store.

- [ ] **Step 3: Update `src/store/goals.ts` — rename `seasonId` to `teamId` throughout**

  Replace the full file content:

  ```ts
  import {GoalStatus, GoalType, IGoal, IGoalSeasonTag} from "./types";
  import {create} from "zustand";
  import {IGoalFilterOption} from "../services/types";
  import {useCognitoUserStore} from "./cognitoUser";
  import VolleyGoalsAPIV1 from "../services/backend.api";
  import {useNotificationStore} from "./notification";
  import i18next from "i18next";

  type GoalState = {
    goalList: {
      goals: IGoal[];
      count: number;
      hasMore: boolean;
      nextToken: string;
      filter: IGoalFilterOption;
    };
    currentGoal?: IGoal;
    goalSeasons: IGoalSeasonTag[];
  }

  type GoalActions = {
    createGoal: (teamId: string, type: GoalType, title: string, description: string) => Promise<void>;
    updateGoal: (teamId: string, id: string, title?: string, description?: string, status?: GoalStatus, ownerId?: string) => Promise<void>;
    deleteGoal: (teamId: string, id: string) => Promise<void>;
    fetchGoals: (teamId: string, filter: IGoalFilterOption) => Promise<void>;
    getGoal:    (teamId: string, id: string) => Promise<IGoal | null>;
    tagGoalToSeason: (teamId: string, goalId: string, seasonId: string) => Promise<void>;
    untagGoalFromSeason: (teamId: string, goalId: string, seasonId: string) => Promise<void>;
    fetchGoalSeasons: (teamId: string, goalId: string) => Promise<void>;
  }

  const useGoalStore = create<GoalState & GoalActions>((set) => ({
    goalList: {
      goals: [],
      count: 0,
      hasMore: false,
      nextToken: '',
      filter: {}
    },
    currentGoal: undefined,
    goalSeasons: [],
    createGoal: async (teamId: string, type: GoalType, title: string, description: string) => {
      const response = await VolleyGoalsAPIV1.createGoal(teamId, {type, title, description});
      if (!response.goal) {
        useNotificationStore.getState().notify({
          level: 'error',
          message: i18next.t(`${response.message}.message`, "Something went wrong while creating the goal."),
          title: i18next.t(`${response.message}.title`, "Something went wrong"),
          details: response.error
        });
      } else {
        set((state) => ({
          goalList: {
            goals: [response.goal!, ...state.goalList.goals],
            count: state.goalList.count + 1,
            hasMore: state.goalList.hasMore,
            nextToken: state.goalList.nextToken,
            filter: state.goalList.filter
          }
        }));
      }
    },
    updateGoal: async (teamId: string, id: string, title?: string, description?: string, status?: GoalStatus, ownerId?: string) => {
      const response = await VolleyGoalsAPIV1.updateGoal(teamId, id, {title, description, status, ownerId});
      if (!response.goal) {
        useNotificationStore.getState().notify({
          level: 'error',
          message: i18next.t(`${response.message}.message`, "Something went wrong while updating the goal."),
          title: i18next.t(`${response.message}.title`, "Something went wrong"),
          details: response.error
        });
      } else {
        set((state) => ({
          goalList: {
            goals: state.goalList.goals.map(goal => goal.id === id ? response.goal! : goal),
            count: state.goalList.count,
            hasMore: state.goalList.hasMore,
            nextToken: state.goalList.nextToken,
            filter: state.goalList.filter
          },
          currentGoal: state.currentGoal?.id === id ? response.goal! : state.currentGoal
        }));
      }
    },
    deleteGoal: async (teamId: string, id: string) => {
      const response = await VolleyGoalsAPIV1.deleteGoal(teamId, id);
      if (response.error) {
        useNotificationStore.getState().notify({
          level: 'error',
          message: i18next.t(`${response.message}.message`, "Something went wrong while deleting the goal."),
          title: i18next.t(`${response.message}.title`, "Something went wrong"),
          details: response.error
        });
      } else {
        set((state) => ({
          goalList: {
            goals: state.goalList.goals.filter(goal => goal.id !== id),
            count: state.goalList.count - 1,
            hasMore: state.goalList.hasMore,
            nextToken: state.goalList.nextToken,
            filter: state.goalList.filter
          }
        }));
      }
    },
    fetchGoals: async (teamId: string, filter: IGoalFilterOption) => {
      const response = await VolleyGoalsAPIV1.listGoals(teamId, filter);
      if (response.items) {
        set(() => ({
          goalList: {
            goals: response.items!,
            count: response.count || response.items!.length,
            hasMore: !!response.nextToken,
            nextToken: response.nextToken || '',
            filter: filter
          }
        }))
      } else {
        useNotificationStore.getState().notify({
          level: 'error',
          message: i18next.t(`${response.message}.message`, "Something went wrong while fetching goals."),
          title: i18next.t(`${response.message}.title`, "Something went wrong"),
          details: response.error
        });
      }
    },
    getGoal: async (teamId: string, id: string) => {
      const response = await VolleyGoalsAPIV1.getGoal(teamId, id);
      if (response.goal) {
        set(() => ({ currentGoal: response.goal }));
        return response.goal;
      } else {
        useNotificationStore.getState().notify({
          level: 'error',
          message: i18next.t(`${response.message}.message`, "Something went wrong while fetching the goal."),
          title: i18next.t(`${response.message}.title`, "Something went wrong"),
          details: response.error
        });
        return null;
      }
    },
    tagGoalToSeason: async (teamId: string, goalId: string, seasonId: string) => {
      const response = await VolleyGoalsAPIV1.tagGoalToSeason(teamId, goalId, seasonId);
      if (response.error) {
        useNotificationStore.getState().notify({
          level: 'error',
          message: i18next.t(`${response.message}.message`, "Something went wrong while tagging the goal."),
          title: i18next.t(`${response.message}.title`, "Something went wrong"),
          details: response.error
        });
      } else {
        set((state) => ({
          goalSeasons: [...state.goalSeasons, { goalId, seasonId }]
        }));
      }
    },
    untagGoalFromSeason: async (teamId: string, goalId: string, seasonId: string) => {
      const response = await VolleyGoalsAPIV1.untagGoalFromSeason(teamId, goalId, seasonId);
      if (response.error) {
        useNotificationStore.getState().notify({
          level: 'error',
          message: i18next.t(`${response.message}.message`, "Something went wrong while untagging the goal."),
          title: i18next.t(`${response.message}.title`, "Something went wrong"),
          details: response.error
        });
      } else {
        set((state) => ({
          goalSeasons: state.goalSeasons.filter(t => !(t.goalId === goalId && t.seasonId === seasonId))
        }));
      }
    },
    fetchGoalSeasons: async (teamId: string, goalId: string) => {
      const response = await VolleyGoalsAPIV1.listGoalSeasons(teamId, goalId);
      if (response.items) {
        set(() => ({ goalSeasons: response.items! }));
      } else {
        useNotificationStore.getState().notify({
          level: 'error',
          message: i18next.t(`${response.message}.message`, "Something went wrong while fetching goal seasons."),
          title: i18next.t(`${response.message}.title`, "Something went wrong"),
          details: response.error
        });
      }
    },
  }))

  export {useGoalStore};
  ```

- [ ] **Step 4: Run the tests — expect PASS**

  Run: `npx jest --testPathPattern=goals.test 2>&1 | tail -20`

  Expected: PASS — all goal store tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add src/store/goals.ts src/__tests__/store/goals.test.ts
  git commit -m "feat: update goal store — seasonId to teamId; add tagGoalToSeason/untagGoalFromSeason/fetchGoalSeasons"
  ```

---

## Task 5: Update Activity Store

**Files:**
- Modify: `src/store/activity.ts`

- [ ] **Step 1: Update `src/store/activity.ts` — add pagination state and filter object**

  ```ts
  import { IActivityEntry } from './types';
  import { create } from 'zustand';
  import VolleyGoalsAPIV1 from '../services/backend.api';
  import { useNotificationStore } from './notification';
  import i18next from 'i18next';

  type ActivityState = {
    activities: IActivityEntry[];
    nextToken: string | null;
    hasMore: boolean;
    loading: boolean;
  };

  type ActivityActions = {
    fetchActivity: (teamId: string, filter?: { limit?: number; nextToken?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' }) => Promise<IActivityEntry[]>;
  };

  const useActivityStore = create<ActivityState & ActivityActions>((set) => ({
    activities: [],
    nextToken: null,
    hasMore: false,
    loading: false,
    fetchActivity: async (teamId: string, filter?) => {
      set({ loading: true });
      try {
        const response = await VolleyGoalsAPIV1.getTeamActivity(teamId, filter);
        if (response.items) {
          set({ activities: response.items, nextToken: response.nextToken ?? null, hasMore: !!response.hasMore });
          return response.items;
        } else {
          useNotificationStore.getState().notify({
            level: 'error',
            message: i18next.t(`${response.message}.message`, 'Something went wrong while fetching activity.'),
            title: i18next.t(`${response.message}.title`, 'Something went wrong'),
            details: response.error
          });
          return [];
        }
      } finally {
        set({ loading: false });
      }
    },
  }));

  export { useActivityStore };
  ```

- [ ] **Step 2: Run TypeScript check**

  Run: `npx tsc --noEmit 2>&1 | grep activity`

  Expected: no errors related to activity.ts.

- [ ] **Step 3: Commit**

  ```bash
  git add src/store/activity.ts
  git commit -m "feat: add pagination state to activity store; filter object signature"
  ```

---

## Task 6: Create Permission Utilities

**Files:**
- Create: `src/utils/permissions.ts`
- Create: `src/hooks/usePermission.ts`
- Create: `src/__tests__/utils/permissions.test.ts`

- [ ] **Step 1: Write the failing tests first**

  Create `src/__tests__/utils/permissions.test.ts`:

  ```ts
  import { resolvePermissions, ALL_PERMISSIONS } from '../../utils/permissions';
  import { IRoleDefinition } from '../../store/types';

  const now = '2026-01-01T00:00:00Z';

  function makeRoleDef(name: string, permissions: string[]): IRoleDefinition {
    return { id: 'r1', tenantId: 't1', name, permissions, isDefault: false, createdAt: now, updatedAt: now };
  }

  describe('resolvePermissions', () => {
    it('returns all permissions for admin role with no custom definitions', () => {
      const perms = resolvePermissions('admin', []);
      expect(perms).toEqual(expect.arrayContaining(['goals:read', 'goals:write', 'goals:delete']));
      expect(perms.length).toBe(ALL_PERMISSIONS.length);
    });

    it('returns subset for trainer role with no custom definitions', () => {
      const perms = resolvePermissions('trainer', []);
      expect(perms).toContain('goals:read');
      expect(perms).toContain('goals:write');
      expect(perms).not.toContain('goals:delete');
    });

    it('returns limited set for member role with no custom definitions', () => {
      const perms = resolvePermissions('member', []);
      expect(perms).toContain('goals:read');
      expect(perms).not.toContain('goals:write');
      expect(perms).not.toContain('members:write');
    });

    it('returns custom role permissions when a matching IRoleDefinition exists', () => {
      const custom = makeRoleDef('coach', ['goals:read', 'seasons:read', 'seasons:write']);
      const perms = resolvePermissions('coach', [custom]);
      expect(perms).toEqual(['goals:read', 'seasons:read', 'seasons:write']);
    });

    it('custom role match is case-insensitive', () => {
      const custom = makeRoleDef('Coach', ['goals:read']);
      const perms = resolvePermissions('coach', [custom]);
      expect(perms).toContain('goals:read');
    });

    it('returns empty array for unknown role with no matching definition', () => {
      const perms = resolvePermissions('unknown_role', []);
      expect(perms).toHaveLength(0);
    });
  });
  ```

- [ ] **Step 2: Run the tests — expect failure**

  Run: `npx jest --testPathPattern=permissions.test 2>&1 | tail -10`

  Expected: FAIL — `Cannot find module '../../utils/permissions'`.

- [ ] **Step 3: Create `src/utils/permissions.ts`**

  ```ts
  import { IRoleDefinition } from '../store/types';

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
    if (custom) {
      return custom.permissions.filter((p): p is Permission =>
        ALL_PERMISSIONS.includes(p as Permission)
      );
    }
    return DEFAULT_PERMISSIONS[role] ?? [];
  }
  ```

- [ ] **Step 4: Run the tests — expect PASS**

  Run: `npx jest --testPathPattern=permissions.test 2>&1 | tail -10`

  Expected: PASS — all 6 tests pass.

- [ ] **Step 5: Create `src/hooks/usePermission.ts`**

  ```ts
  import { useCognitoUserStore } from '../store/cognitoUser';
  import { Permission } from '../utils/permissions';

  export function usePermission(permission: Permission): boolean {
    return useCognitoUserStore(s => s.currentPermissions.includes(permission));
  }
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add src/utils/permissions.ts src/hooks/usePermission.ts src/__tests__/utils/permissions.test.ts
  git commit -m "feat: add permission utilities (ALL_PERMISSIONS, resolvePermissions) and usePermission hook"
  ```

---

## Task 7: Add `currentPermissions` to `cognitoUser` Store

**Files:**
- Modify: `src/store/cognitoUser.ts`

- [ ] **Step 1: Add `currentPermissions` to the store**

  Add the import at the top of the file:
  ```ts
  import { Permission, resolvePermissions } from '../utils/permissions';
  import { IRoleDefinition } from './types';
  ```

  Add `currentPermissions: Permission[]` to `UserState`:
  ```ts
  type UserState = {
    cognitoUser: AuthUser | undefined;
    user?: IUser;
    session: AuthSession | undefined;
    userType: UserType | undefined;
    availableTeams: ITeamAssignment[];
    selectedTeam?: ITeamAssignment;
    currentPermissions: Permission[];
  }
  ```

  Add `currentPermissions: []` to the initial state (inside `create`):
  ```ts
  return {
    cognitoUser: undefined,
    session: undefined,
    userType: undefined,
    availableTeams: [],
    selectedTeam: undefined,
    currentPermissions: [],
    // ...actions
  ```

- [ ] **Step 2: Update `setSelectedTeam` to resolve permissions**

  Replace the existing `setSelectedTeam` action:
  ```ts
  setSelectedTeam: (teamId: string) => {
    const { availableTeams } = get();
    const selected = availableTeams?.find(t => t.team.id === teamId);
    setSessionItem(SELECTED_TEAM_KEY, teamId);
    const roleDefinitions: IRoleDefinition[] = [];  // Phase 3 will inject tenant role defs here
    const currentPermissions = selected
      ? resolvePermissions(selected.role as string, roleDefinitions)
      : [];
    set({ selectedTeam: selected, currentPermissions });
  },
  ```

- [ ] **Step 3: Update `fetchSelf` to also recompute permissions**

  Replace the existing `fetchSelf` action:
  ```ts
  fetchSelf: async () => {
    const { user, assignments } = await loadSelf();
    const selectedTeamId = getSessionItem(SELECTED_TEAM_KEY);
    const selectedTeam = assignments?.find(t => t.team.id === selectedTeamId);
    const roleDefinitions: IRoleDefinition[] = [];
    const currentPermissions = selectedTeam
      ? resolvePermissions(selectedTeam.role as string, roleDefinitions)
      : [];
    set({ user, availableTeams: assignments, selectedTeam, currentPermissions });
  },
  ```

- [ ] **Step 4: Update `loadUserStore` call at the top of `create` to also set initial permissions**

  In the line that calls `loadUserStore().then(...)`:
  ```ts
  loadUserStore().then(({ cognitoUser, session, userType, user, availableTeams, selectedTeam }) => {
    const roleDefinitions: IRoleDefinition[] = [];
    const currentPermissions = selectedTeam
      ? resolvePermissions(selectedTeam.role as string, roleDefinitions)
      : [];
    set({ cognitoUser, session, userType, availableTeams, user, selectedTeam, currentPermissions });
  });
  ```

- [ ] **Step 5: Run TypeScript check**

  Run: `npx tsc --noEmit 2>&1 | grep cognitoUser`

  Expected: no errors.

- [ ] **Step 6: Run all tests**

  Run: `npx jest 2>&1 | tail -20`

  Expected: all existing tests pass.

- [ ] **Step 7: Commit**

  ```bash
  git add src/store/cognitoUser.ts
  git commit -m "feat: add currentPermissions to cognitoUser store; recompute on setSelectedTeam/fetchSelf"
  ```

---

## Task 8: Update Navigation to `readPermission` Model

**Files:**
- Modify: `src/components/Navigation.tsx`

- [ ] **Step 1: Update the `NavItem` type and `NAV_ITEMS`**

  At the top of the file, add the import:
  ```ts
  import { Permission } from '../utils/permissions';
  import { useCognitoUserStore } from '../store/cognitoUser';
  ```
  (useCognitoUserStore is already imported; just add Permission)

  Replace the `NavItem` type:
  ```ts
  type NavItem = {
    key: string;
    labelKey: string;
    labelDefault?: string;
    path: string;
    icon?: React.ReactNode;
    userType: UserType;
    readPermission?: Permission;
  };
  ```

  Replace `NAV_ITEMS`:
  ```ts
  const NAV_ITEMS: NavItem[] = [
    // Admin View
    { key: 'teams',        labelKey: 'nav.teams',        path: '/teams',         icon: <GroupIcon />,              userType: UserType.Admin },
    { key: 'users',        labelKey: 'nav.users',        path: '/users',         icon: <PersonIcon />,             userType: UserType.Admin },
    { key: 'tenants',      labelKey: 'nav.tenants',      path: '/tenants',       icon: <BusinessIcon />,           userType: UserType.Admin },
    // Users Only
    { key: 'dashboard',    labelKey: 'nav.dashboard',    path: '/dashboard',     icon: <DashboardIcon />,          userType: UserType.User },
    { key: 'seasons',      labelKey: 'nav.seasons',      path: '/seasons',       icon: <DateRangeIcon />,          userType: UserType.User, readPermission: 'seasons:read' },
    { key: 'goals',        labelKey: 'nav.goals',        path: '/goals',         icon: <TrackChangesIcon />,       userType: UserType.User, readPermission: 'goals:read' },
    { key: 'progress',     labelKey: 'nav.progress',     path: '/progress',      icon: <PublishedWithChangesIcon />, userType: UserType.User, readPermission: 'progress_reports:read' },
    { key: 'members',      labelKey: 'nav.members',      path: '/members',       icon: <GroupIcon />,              userType: UserType.User, readPermission: 'members:read' },
    { key: 'teamSettings', labelKey: 'nav.teamSettings', path: '/team-settings', icon: <SettingsIcon />,           userType: UserType.User, readPermission: 'team_settings:read' },
    { key: 'invites',      labelKey: 'nav.invites',      path: '/invites',       icon: <EmailIcon />,              userType: UserType.User, readPermission: 'invites:read' },
  ];
  ```

  Add the `BusinessIcon` import at the top of the MUI icons block:
  ```ts
  import BusinessIcon from '@mui/icons-material/Business';
  ```

  Note: `GroupIcon` is already imported; it's reused for `members`. The `members` nav item did not previously exist — it's new. Add it to `BOTTOM_NAV_KEYS`:
  ```ts
  const BOTTOM_NAV_KEYS = ['dashboard', 'goals', 'progress', 'teamSettings', 'invites'];
  ```
  (Leave BOTTOM_NAV_KEYS as is — members is desktop-only.)

- [ ] **Step 2: Update the `visibleItems` filter logic inside `useEffect`**

  Replace the existing `useEffect` that sets `visibleItems`:
  ```ts
  useEffect(() => {
    const currentPermissions = useCognitoUserStore.getState().currentPermissions;
    const items = NAV_ITEMS.filter(item => {
      if (item.userType !== userType) return false;
      if (!item.readPermission) return true;
      return currentPermissions.includes(item.readPermission);
    });
    setVisibleItems(items);
  }, [userType, selectedTeam]);
  ```

  Also remove the import of `RoleType` from `'../store/types'` if it's no longer used in this file (it was only used in the old `NavItem.roles` type). Check: `RoleType` is imported in the current file — after this change it's unused. Remove it from the import line:

  ```ts
  import {
    UserType, IGoal, IProgressReport,
  } from '../store/types';
  ```

- [ ] **Step 3: Run TypeScript check**

  Run: `npx tsc --noEmit 2>&1 | grep Navigation`

  Expected: no errors in Navigation.tsx.

- [ ] **Step 4: Commit**

  ```bash
  git add src/components/Navigation.tsx
  git commit -m "feat: replace role-based nav with readPermission model; add tenants nav item"
  ```

---

## Task 9: Update Pages for Permission-Based Action Gating

**Files:**
- Modify: `src/pages/user/Goals.tsx`
- Modify: `src/pages/user/GoalDetails.tsx`
- Modify: `src/pages/user/Progress.tsx`
- Modify: `src/pages/user/ProgressDetails.tsx`
- Modify: `src/pages/trainer/Members.tsx`
- Modify: `src/pages/trainer/TeamSettings.tsx`
- Modify: `src/pages/trainer/Invites.tsx`
- Modify: `src/components/CommentSection.tsx`

For each page, replace the inline role check with `usePermission`. The pattern is:

**Before:**
```ts
const userRole = selectedTeam?.role as string | undefined;
const canEdit = userRole === 'admin' || userRole === 'trainer';
```

**After:**
```ts
import { usePermission } from '../../hooks/usePermission';
const canWrite = usePermission('goals:write');
const canDelete = usePermission('goals:delete');
```

- [ ] **Step 1: Update `src/pages/user/Goals.tsx`**

  Add import:
  ```ts
  import { usePermission } from '../../hooks/usePermission';
  ```

  Replace:
  ```ts
  const userRole = selectedTeam?.role as string | undefined;
  const canEdit = userRole === 'admin' || userRole === 'trainer';
  const canCreate = canEdit || userRole === 'member';
  ```
  With:
  ```ts
  const canCreate = usePermission('goals:write');
  const canEdit = usePermission('goals:write');
  const canDelete = usePermission('goals:delete');
  ```

  Search the file for all uses of `canEdit` and `canCreate` and ensure they now refer to the correct permission. Any `canDelete` usage (if none exists yet, add it to delete button logic if present).

  Also update the `fetchGoals` call: Goals.tsx currently calls `fetchGoals(seasonId, filter)` — it needs to call `fetchGoals(teamId, filter)`. Look for `fetchGoals(selectedSeasonId` or similar and change to use `teamId`:
  ```ts
  // the ItemList or useEffect that triggers fetchGoals:
  // Change: fetchGoals(selectedSeasonId || '', filter)
  // To:     fetchGoals(teamId, { ...filter, seasonId: selectedSeasonId || undefined })
  ```
  
  The full Goals.tsx changes to how `fetchGoals` is called depend on the current code structure. Read the existing Goals.tsx fetch logic and update it so:
  1. The primary fetch uses `teamId` as first param
  2. `selectedSeasonId` becomes an optional `seasonId` query filter passed in the filter object

- [ ] **Step 2: Update `src/pages/user/GoalDetails.tsx`**

  Add import:
  ```ts
  import { usePermission } from '../../hooks/usePermission';
  ```

  Replace any inline role-based `canEdit` logic with:
  ```ts
  const canWrite = usePermission('goals:write');
  const canDelete = usePermission('goals:delete');
  ```

  Update the `getGoal` call — it previously took `(seasonId, id)`. It now takes `(teamId, id)`. Get `teamId` from:
  ```ts
  const selectedTeam = useCognitoUserStore(s => s.selectedTeam);
  const teamId = selectedTeam?.team?.id || '';
  ```

  And call: `getGoal(teamId, goalId)`.

  Add a "Seasons" panel showing `goalSeasons` with tag/untag:
  ```ts
  const goalSeasons = useGoalStore(s => s.goalSeasons);
  const fetchGoalSeasons = useGoalStore(s => s.fetchGoalSeasons);
  const tagGoalToSeason = useGoalStore(s => s.tagGoalToSeason);
  const untagGoalFromSeason = useGoalStore(s => s.untagGoalFromSeason);
  const seasons = useSeasonStore(s => s.seasonList.seasons);
  ```

  In the `useEffect` where `getGoal` is called, also call `fetchGoalSeasons(teamId, goalId)`.

  Add a seasons section in the JSX (below existing content):
  ```tsx
  <Box mt={2}>
    <Typography variant="subtitle1">Seasons</Typography>
    {goalSeasons.map(tag => {
      const season = seasons.find(s => s.id === tag.seasonId);
      return (
        <Box key={tag.seasonId} display="flex" alignItems="center" gap={1}>
          <Typography variant="body2">{season?.name ?? tag.seasonId}</Typography>
          {canWrite && (
            <IconButton size="small" onClick={() => untagGoalFromSeason(teamId, goalId, tag.seasonId)}>
              <ClearIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      );
    })}
    {canWrite && (
      <Box mt={1}>
        <TextField
          select
          size="small"
          label="Tag to season"
          value=""
          onChange={(e) => { if (e.target.value) tagGoalToSeason(teamId, goalId, e.target.value); }}
        >
          {seasons
            .filter(s => !goalSeasons.some(t => t.seasonId === s.id))
            .map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)
          }
        </TextField>
      </Box>
    )}
  </Box>
  ```

- [ ] **Step 3: Update `src/pages/user/Progress.tsx`**

  Add import:
  ```ts
  import { usePermission } from '../../hooks/usePermission';
  ```

  Replace role-based `canCreate`/`canEdit` with:
  ```ts
  const canCreate = usePermission('progress_reports:write');
  const canEdit   = usePermission('progress_reports:write');
  const canDelete = usePermission('progress_reports:delete');
  ```

- [ ] **Step 4: Update `src/pages/user/ProgressDetails.tsx`**

  Add import:
  ```ts
  import { usePermission } from '../../hooks/usePermission';
  ```

  Replace role checks with:
  ```ts
  const canEdit   = usePermission('progress_reports:write');
  const canDelete = usePermission('progress_reports:delete');
  ```

- [ ] **Step 5: Update `src/pages/trainer/Members.tsx`**

  Add import:
  ```ts
  import { usePermission } from '../../hooks/usePermission';
  ```

  Replace role checks with:
  ```ts
  const canWrite = usePermission('members:write');
  ```

- [ ] **Step 6: Update `src/pages/trainer/TeamSettings.tsx`**

  Add import:
  ```ts
  import { usePermission } from '../../hooks/usePermission';
  ```

  Replace role checks with:
  ```ts
  const canWrite = usePermission('team_settings:write');
  ```

- [ ] **Step 7: Update `src/pages/trainer/Invites.tsx`**

  Add import:
  ```ts
  import { usePermission } from '../../hooks/usePermission';
  ```

  Replace role checks with:
  ```ts
  const canWrite = usePermission('invites:write');
  ```

- [ ] **Step 8: Update `src/components/CommentSection.tsx`** (if it exists and contains role checks)

  Search for inline role check:
  ```bash
  grep -n "userRole\|canEdit\|isAdmin\|role.*admin\|role.*trainer" src/components/CommentSection.tsx
  ```

  Replace any found role checks with:
  ```ts
  import { usePermission } from '../hooks/usePermission';
  const canWriteComments = usePermission('comments:write');
  const canDeleteComments = usePermission('comments:delete');
  ```

- [ ] **Step 9: Run TypeScript check**

  Run: `npx tsc --noEmit 2>&1 | head -40`

  Expected: no errors (or only pre-existing unrelated ones). Fix any type errors that appear.

- [ ] **Step 10: Commit**

  ```bash
  git add src/pages/user/Goals.tsx src/pages/user/GoalDetails.tsx \
    src/pages/user/Progress.tsx src/pages/user/ProgressDetails.tsx \
    src/pages/trainer/Members.tsx src/pages/trainer/TeamSettings.tsx \
    src/pages/trainer/Invites.tsx src/components/CommentSection.tsx
  git commit -m "feat: replace inline role checks with usePermission across all pages"
  ```

---

## Task 10: Update Profile Page — Language Field

**Files:**
- Modify: `src/pages/help/Profile.tsx`

- [ ] **Step 1: Read the current Profile form**

  The form currently uses `{ name, preferredUsername, birthdate }`. The `IProfileUpdate` type no longer has `picture` (picture goes through the presign flow, unchanged). We need to add `language`.

- [ ] **Step 2: Update the form type and add language field**

  Change the `useForm` type from:
  ```ts
  useForm<{ name?: string; preferredUsername?: string; birthdate?: string }>
  ```
  to:
  ```ts
  useForm<{ name?: string; preferredUsername?: string; birthdate?: string; language?: string }>
  ```

  Update `defaultValues` to include `language`:
  ```ts
  defaultValues: {
    name: user?.name || '',
    preferredUsername: user?.preferredUsername || '',
    birthdate: user?.birthdate ? user.birthdate.slice(0, 10) : '',
    language: '',
  }
  ```

  Update `reset` call in `useEffect`:
  ```ts
  reset({
    name: user?.name || '',
    preferredUsername: user?.preferredUsername || '',
    birthdate: user?.birthdate ? user.birthdate.slice(0, 10) : '',
    language: '',
  });
  ```

  Add a language field in the form JSX (after the birthdate field):
  ```tsx
  <Controller
    name="language"
    control={control}
    render={({ field }) => (
      <TextField
        {...field}
        select
        fullWidth
        label={t('profile.language', 'Language')}
        size="small"
      >
        <MenuItem value="">{t('profile.languageDefault', 'Default')}</MenuItem>
        <MenuItem value="en">English</MenuItem>
        <MenuItem value="de">Deutsch</MenuItem>
      </TextField>
    )}
  />
  ```

- [ ] **Step 3: Run TypeScript check**

  Run: `npx tsc --noEmit 2>&1 | grep Profile`

  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add src/pages/help/Profile.tsx
  git commit -m "feat: add language field to profile form; remove picture from IProfileUpdate"
  ```

---

## Task 11: Final Integration Check

- [ ] **Step 1: Run all tests**

  Run: `npx jest 2>&1 | tail -30`

  Expected: PASS — all tests pass.

- [ ] **Step 2: Run full TypeScript check**

  Run: `npx tsc --noEmit 2>&1`

  Expected: no errors.

- [ ] **Step 3: Commit any remaining fixes, then final commit**

  ```bash
  git add -p   # stage only intentional changes
  git commit -m "chore: final Phase 1-2 type and integration fixes"
  ```

---

## Self-Review

**Spec coverage check:**

| Spec item | Task |
|-----------|------|
| Response envelope unwrap (all ~25 methods) | Task 2 |
| `leaveTeam` path fix (`/members/leave`) | Task 2, Step 2 |
| `ITeamMember.cognitoSub` → `userId` | Task 1 |
| `ITeam.tenantId?` | Task 1 |
| `IProfileUpdate.language`, remove `picture` | Task 1, Task 10 |
| `IGoal.teamId` (was `seasonId`) | Task 1 |
| `IGoalSeasonTag` type | Task 1 |
| Four tenant types | Task 1 |
| `IGoalFilterOption.seasonId?` | Task 1 |
| Goal API: all methods `seasonId` → `teamId`, new paths | Task 3 |
| Goal API: `updateGoal` uses `PUT` | Task 3 |
| Goal API: `uploadGoalPicture` replaces presign pair | Task 3 |
| Goal API: `tagGoalToSeason`, `untagGoalFromSeason`, `listGoalSeasons` | Task 3 |
| `getTeamActivity` filter object | Task 2 |
| Goal store: `seasonId` → `teamId` | Task 4 |
| Activity store: pagination | Task 5 |
| `resolvePermissions` + `ALL_PERMISSIONS` + `DEFAULT_PERMISSIONS` | Task 6 |
| `usePermission` hook | Task 6 |
| `cognitoUser.currentPermissions` | Task 7 |
| Navigation `readPermission` model | Task 8 |
| Tenants nav item (admin only) | Task 8 |
| All pages: `usePermission` replaces role checks | Task 9 |
| `GoalDetails` season tagging UI | Task 9 |
| Profile language field | Task 10 |
| Test updates (goals.test.ts, new permissions.test.ts) | Tasks 4, 6 |
