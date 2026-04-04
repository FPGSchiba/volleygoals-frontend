# Tenant System — Phases 3 & 4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Tenant API layer and admin UI — allowing platform admins to create tenants, manage members, define custom roles with permission arrays, and configure ownership policies.

**Architecture:** A new Zustand store (`src/store/tenants.ts`) mirrors the tenant API group. Four admin pages are added under `src/pages/admin/`. Routes are registered in `App.tsx` and the navigation gains a "Tenants" item. The `cognitoUser` store's `resolvePermissions` call is wired to the tenant store's `roleDefinitions` so custom roles take effect immediately on team selection.

**Tech Stack:** TypeScript, React, Zustand, MUI, react-hook-form, Jest/jsdom

**Prerequisite:** Phases 1 & 2 must be complete (`2026-04-03-api-migration-phases-1-2.md`). The types `ITenant`, `ITenantMember`, `IRoleDefinition`, `IOwnershipPolicy` already exist in `src/store/types.ts`. The `resolvePermissions` function and `Permission` type are already in `src/utils/permissions.ts`.

---

## File Structure

| File | Status | Responsibility |
|------|--------|----------------|
| `src/services/backend.api.ts` | Modify | Add 13 new tenant API methods |
| `src/store/tenants.ts` | Create | Tenant store — CRUD, members, roles, policies |
| `src/store/cognitoUser.ts` | Modify | Wire `resolvePermissions` to tenant store role defs |
| `src/pages/admin/Tenants.tsx` | Create | List tenants, create, delete |
| `src/pages/admin/TenantDetails.tsx` | Create | Tenant detail — edit name, manage members, create team |
| `src/pages/admin/TenantRoles.tsx` | Create | Role definitions CRUD with permission multi-select |
| `src/pages/admin/TenantPolicies.tsx` | Create | Ownership policies editor per resource type |
| `src/App.tsx` | Modify | New `/tenants` routes + `'tenants'` in HeaderVisibleSegments |
| `src/__tests__/store/tenants.test.ts` | Create | Tests for the tenant store actions |

---

## Task 1: Add Tenant API Methods to `backend.api.ts`

**Files:**
- Modify: `src/services/backend.api.ts`

Add all 13 tenant API methods. They follow the same pattern as every other method in this class: `ensureEndpoints`, axios call, `unwrap`, `extractError` on catch.

Add the missing type imports at the top of the file:
```ts
import {
  IInvite, ITeam, ITeamAssignment, ITeamMember, ITeamSettings, ITeamUser,
  IUser, IProfileUpdate, IUserUpdate, RoleType, ISeason, SeasonStatus, IGoal, GoalType, GoalStatus,
  IProgressReport, IComment, ICommentFile, IActivityEntry, IGoalSeasonTag,
  ITenant, ITenantMember, IRoleDefinition, IOwnershipPolicy
} from "../store/types";
```

- [ ] **Step 1: Add tenant CRUD methods**

  Add after `leaveTeam` (at end of class, before the closing `}`):

  ```ts
  // ─── Tenants ─────────────────────────────────────────────────────────────────

  public async createTenant(name: string): Promise<{ message: string; error?: string; tenant?: ITenant }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.post('/v1/tenants', { name });
      return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async getTenant(id: string): Promise<{ message: string; error?: string; tenant?: ITenant }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.get(`/v1/tenants/${id}`);
      return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async updateTenant(id: string, name: string): Promise<{ message: string; error?: string; tenant?: ITenant }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.patch(`/v1/tenants/${id}`, { name });
      return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async deleteTenant(id: string): Promise<{ message: string; error?: string }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.delete(`/v1/tenants/${id}`);
      return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }
  ```

- [ ] **Step 2: Add tenant member methods**

  ```ts
  public async addTenantMember(tenantId: string, userId: string, role: 'admin' | 'member'): Promise<{ message: string; error?: string; member?: ITenantMember }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.post(`/v1/tenants/${tenantId}/members`, { userId, role });
      return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async removeTenantMember(tenantId: string, memberId: string): Promise<{ message: string; error?: string }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.delete(`/v1/tenants/${tenantId}/members/${memberId}`);
      return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }
  ```

- [ ] **Step 3: Add role definition methods**

  ```ts
  public async listRoleDefinitions(tenantId: string): Promise<{ message: string; error?: string; items?: IRoleDefinition[] }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.get(`/v1/tenants/${tenantId}/roles`);
      return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async createRoleDefinition(tenantId: string, name: string, permissions: string[]): Promise<{ message: string; error?: string; roleDefinition?: IRoleDefinition }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.post(`/v1/tenants/${tenantId}/roles`, { name, permissions });
      return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async updateRoleDefinition(tenantId: string, roleId: string, permissions: string[]): Promise<{ message: string; error?: string; roleDefinition?: IRoleDefinition }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.patch(`/v1/tenants/${tenantId}/roles/${roleId}`, { permissions });
      return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async deleteRoleDefinition(tenantId: string, roleId: string): Promise<{ message: string; error?: string }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.delete(`/v1/tenants/${tenantId}/roles/${roleId}`);
      return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }
  ```

- [ ] **Step 4: Add ownership policy methods**

  ```ts
  public async listOwnershipPolicies(tenantId: string): Promise<{ message: string; error?: string; items?: IOwnershipPolicy[] }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.get(`/v1/tenants/${tenantId}/ownership-policies`);
      return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }

  public async updateOwnershipPolicy(tenantId: string, resourceType: string, ownerPermissions: string[], parentOwnerPermissions: string[]): Promise<{ message: string; error?: string; policy?: IOwnershipPolicy }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.patch(`/v1/tenants/${tenantId}/ownership-policies/${resourceType}`, { ownerPermissions, parentOwnerPermissions });
      return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }
  ```

- [ ] **Step 5: Add tenanted team creation method**

  ```ts
  public async createTenantedTeam(tenantId: string, name: string): Promise<{ message: string; error?: string; team?: ITeam }> {
    try {
      await this.ensureEndpoints();
      const response = await VolleyGoalsAPIV1.endpoint.post(`/v1/tenants/${tenantId}/teams`, { name });
      return { message: response.data.message, ...VolleyGoalsAPIV1.unwrap(response.data) };
    } catch (reason: unknown) {
      return VolleyGoalsAPIV1.extractError(reason);
    }
  }
  ```

- [ ] **Step 6: Run TypeScript check**

  Run: `npx tsc --noEmit 2>&1 | grep "backend.api"`

  Expected: no errors in backend.api.ts.

- [ ] **Step 7: Commit**

  ```bash
  git add src/services/backend.api.ts
  git commit -m "feat: add 13 tenant API methods (CRUD, members, roles, policies, tenanted team)"
  ```

---

## Task 2: Create the Tenant Store

**Files:**
- Create: `src/store/tenants.ts`
- Create: `src/__tests__/store/tenants.test.ts`

- [ ] **Step 1: Write the failing tests first**

  Create `src/__tests__/store/tenants.test.ts`:

  ```ts
  import { useTenantStore } from '../../store/tenants';
  import { useNotificationStore } from '../../store/notification';
  import { buildTenant, buildRoleDefinition } from '../mocks/factories';

  jest.mock('../../services/backend.api', () => ({
    __esModule: true,
    default: {
      createTenant: jest.fn(),
      getTenant: jest.fn(),
      updateTenant: jest.fn(),
      deleteTenant: jest.fn(),
      addTenantMember: jest.fn(),
      removeTenantMember: jest.fn(),
      listRoleDefinitions: jest.fn(),
      createRoleDefinition: jest.fn(),
      updateRoleDefinition: jest.fn(),
      deleteRoleDefinition: jest.fn(),
      listOwnershipPolicies: jest.fn(),
      updateOwnershipPolicy: jest.fn(),
      createTenantedTeam: jest.fn(),
      setToken: jest.fn(),
    },
  }));

  import VolleyGoalsAPIV1 from '../../services/backend.api';
  const api = jest.mocked(VolleyGoalsAPIV1);

  beforeEach(() => {
    useTenantStore.setState({
      tenants: [],
      currentTenant: null,
      tenantMembers: [],
      roleDefinitions: [],
      ownershipPolicies: [],
      loading: false,
      error: null,
    });
    useNotificationStore.setState({ notifications: [] });
    jest.clearAllMocks();
  });

  describe('tenant store', () => {
    describe('createTenant', () => {
      it('adds tenant to list on success', async () => {
        const tenant = buildTenant({ name: 'Acme' });
        api.createTenant.mockResolvedValue({ message: 'ok', tenant });

        await useTenantStore.getState().createTenant('Acme');

        expect(useTenantStore.getState().tenants).toHaveLength(1);
        expect(useTenantStore.getState().tenants[0].name).toBe('Acme');
      });

      it('triggers notification on error', async () => {
        api.createTenant.mockResolvedValue({ message: 'error.create', error: 'fail' });

        await useTenantStore.getState().createTenant('Acme');

        expect(useNotificationStore.getState().notifications).toHaveLength(1);
        expect(useNotificationStore.getState().notifications[0].level).toBe('error');
      });
    });

    describe('deleteTenant', () => {
      it('removes tenant from list on success', async () => {
        const t = buildTenant({ id: 't1' });
        useTenantStore.setState({ tenants: [t] });
        api.deleteTenant.mockResolvedValue({ message: 'ok' });

        await useTenantStore.getState().deleteTenant('t1');

        expect(useTenantStore.getState().tenants).toHaveLength(0);
      });

      it('triggers notification on error', async () => {
        api.deleteTenant.mockResolvedValue({ message: 'error.delete', error: 'fail' });

        await useTenantStore.getState().deleteTenant('t1');

        expect(useNotificationStore.getState().notifications).toHaveLength(1);
      });
    });

    describe('fetchRoleDefinitions', () => {
      it('stores role definitions on success', async () => {
        const roles = [buildRoleDefinition(), buildRoleDefinition()];
        api.listRoleDefinitions.mockResolvedValue({ message: 'ok', items: roles });

        await useTenantStore.getState().fetchRoleDefinitions('tenant-1');

        expect(useTenantStore.getState().roleDefinitions).toHaveLength(2);
      });
    });

    describe('createRoleDefinition', () => {
      it('adds role definition on success', async () => {
        const role = buildRoleDefinition({ name: 'coach' });
        api.createRoleDefinition.mockResolvedValue({ message: 'ok', roleDefinition: role });

        await useTenantStore.getState().createRoleDefinition('tenant-1', 'coach', ['goals:read']);

        expect(useTenantStore.getState().roleDefinitions).toHaveLength(1);
        expect(useTenantStore.getState().roleDefinitions[0].name).toBe('coach');
      });
    });

    describe('deleteRoleDefinition', () => {
      it('removes role definition from list', async () => {
        const role = buildRoleDefinition({ id: 'r1' });
        useTenantStore.setState({ roleDefinitions: [role] });
        api.deleteRoleDefinition.mockResolvedValue({ message: 'ok' });

        await useTenantStore.getState().deleteRoleDefinition('tenant-1', 'r1');

        expect(useTenantStore.getState().roleDefinitions).toHaveLength(0);
      });
    });
  });
  ```

- [ ] **Step 2: Run the tests — expect failure**

  Run: `npx jest --testPathPattern=tenants.test 2>&1 | tail -10`

  Expected: FAIL — `Cannot find module '../../store/tenants'`.

- [ ] **Step 3: Create `src/store/tenants.ts`**

  ```ts
  import { create } from 'zustand';
  import { ITenant, ITenantMember, IRoleDefinition, IOwnershipPolicy } from './types';
  import VolleyGoalsAPIV1 from '../services/backend.api';
  import { useNotificationStore } from './notification';
  import i18next from 'i18next';

  type TenantState = {
    tenants: ITenant[];
    currentTenant: ITenant | null;
    tenantMembers: ITenantMember[];
    roleDefinitions: IRoleDefinition[];
    ownershipPolicies: IOwnershipPolicy[];
    loading: boolean;
    error: string | null;
  };

  type TenantActions = {
    fetchTenants: () => Promise<void>;
    createTenant: (name: string) => Promise<void>;
    getTenant: (id: string) => Promise<void>;
    updateTenant: (id: string, name: string) => Promise<void>;
    deleteTenant: (id: string) => Promise<void>;
    addTenantMember: (tenantId: string, userId: string, role: 'admin' | 'member') => Promise<void>;
    removeTenantMember: (tenantId: string, memberId: string) => Promise<void>;
    fetchRoleDefinitions: (tenantId: string) => Promise<void>;
    createRoleDefinition: (tenantId: string, name: string, permissions: string[]) => Promise<void>;
    updateRoleDefinition: (tenantId: string, roleId: string, permissions: string[]) => Promise<void>;
    deleteRoleDefinition: (tenantId: string, roleId: string) => Promise<void>;
    fetchOwnershipPolicies: (tenantId: string) => Promise<void>;
    updateOwnershipPolicy: (tenantId: string, resourceType: string, ownerPermissions: string[], parentOwnerPermissions: string[]) => Promise<void>;
    createTenantedTeam: (tenantId: string, name: string) => Promise<void>;
  };

  const useTenantStore = create<TenantState & TenantActions>((set, get) => ({
    tenants: [],
    currentTenant: null,
    tenantMembers: [],
    roleDefinitions: [],
    ownershipPolicies: [],
    loading: false,
    error: null,

    fetchTenants: async () => {
      set({ loading: true });
      try {
        // No list-all-tenants endpoint yet; this is a placeholder.
        // Individual tenants are loaded via getTenant.
        set({ loading: false });
      } catch {
        set({ loading: false });
      }
    },

    createTenant: async (name: string) => {
      const response = await VolleyGoalsAPIV1.createTenant(name);
      if (!response.tenant) {
        useNotificationStore.getState().notify({
          level: 'error',
          message: i18next.t(`${response.message}.message`, 'Something went wrong while creating the tenant.'),
          title: i18next.t(`${response.message}.title`, 'Something went wrong'),
          details: response.error,
        });
      } else {
        set((state) => ({ tenants: [response.tenant!, ...state.tenants] }));
      }
    },

    getTenant: async (id: string) => {
      set({ loading: true });
      try {
        const response = await VolleyGoalsAPIV1.getTenant(id);
        if (response.tenant) {
          set({ currentTenant: response.tenant });
        } else {
          useNotificationStore.getState().notify({
            level: 'error',
            message: i18next.t(`${response.message}.message`, 'Something went wrong while loading the tenant.'),
            title: i18next.t(`${response.message}.title`, 'Something went wrong'),
            details: response.error,
          });
        }
      } finally {
        set({ loading: false });
      }
    },

    updateTenant: async (id: string, name: string) => {
      const response = await VolleyGoalsAPIV1.updateTenant(id, name);
      if (!response.tenant) {
        useNotificationStore.getState().notify({
          level: 'error',
          message: i18next.t(`${response.message}.message`, 'Something went wrong while updating the tenant.'),
          title: i18next.t(`${response.message}.title`, 'Something went wrong'),
          details: response.error,
        });
      } else {
        set((state) => ({
          currentTenant: state.currentTenant?.id === id ? response.tenant! : state.currentTenant,
          tenants: state.tenants.map(t => t.id === id ? response.tenant! : t),
        }));
      }
    },

    deleteTenant: async (id: string) => {
      const response = await VolleyGoalsAPIV1.deleteTenant(id);
      if (response.error) {
        useNotificationStore.getState().notify({
          level: 'error',
          message: i18next.t(`${response.message}.message`, 'Something went wrong while deleting the tenant.'),
          title: i18next.t(`${response.message}.title`, 'Something went wrong'),
          details: response.error,
        });
      } else {
        set((state) => ({ tenants: state.tenants.filter(t => t.id !== id) }));
      }
    },

    addTenantMember: async (tenantId: string, userId: string, role: 'admin' | 'member') => {
      const response = await VolleyGoalsAPIV1.addTenantMember(tenantId, userId, role);
      if (!response.member) {
        useNotificationStore.getState().notify({
          level: 'error',
          message: i18next.t(`${response.message}.message`, 'Something went wrong while adding the member.'),
          title: i18next.t(`${response.message}.title`, 'Something went wrong'),
          details: response.error,
        });
      } else {
        set((state) => ({ tenantMembers: [...state.tenantMembers, response.member!] }));
      }
    },

    removeTenantMember: async (tenantId: string, memberId: string) => {
      const response = await VolleyGoalsAPIV1.removeTenantMember(tenantId, memberId);
      if (response.error) {
        useNotificationStore.getState().notify({
          level: 'error',
          message: i18next.t(`${response.message}.message`, 'Something went wrong while removing the member.'),
          title: i18next.t(`${response.message}.title`, 'Something went wrong'),
          details: response.error,
        });
      } else {
        set((state) => ({ tenantMembers: state.tenantMembers.filter(m => m.id !== memberId) }));
      }
    },

    fetchRoleDefinitions: async (tenantId: string) => {
      const response = await VolleyGoalsAPIV1.listRoleDefinitions(tenantId);
      if (response.items) {
        set({ roleDefinitions: response.items });
      } else {
        useNotificationStore.getState().notify({
          level: 'error',
          message: i18next.t(`${response.message}.message`, 'Something went wrong while loading role definitions.'),
          title: i18next.t(`${response.message}.title`, 'Something went wrong'),
          details: response.error,
        });
      }
    },

    createRoleDefinition: async (tenantId: string, name: string, permissions: string[]) => {
      const response = await VolleyGoalsAPIV1.createRoleDefinition(tenantId, name, permissions);
      if (!response.roleDefinition) {
        useNotificationStore.getState().notify({
          level: 'error',
          message: i18next.t(`${response.message}.message`, 'Something went wrong while creating the role.'),
          title: i18next.t(`${response.message}.title`, 'Something went wrong'),
          details: response.error,
        });
      } else {
        set((state) => ({ roleDefinitions: [...state.roleDefinitions, response.roleDefinition!] }));
      }
    },

    updateRoleDefinition: async (tenantId: string, roleId: string, permissions: string[]) => {
      const response = await VolleyGoalsAPIV1.updateRoleDefinition(tenantId, roleId, permissions);
      if (!response.roleDefinition) {
        useNotificationStore.getState().notify({
          level: 'error',
          message: i18next.t(`${response.message}.message`, 'Something went wrong while updating the role.'),
          title: i18next.t(`${response.message}.title`, 'Something went wrong'),
          details: response.error,
        });
      } else {
        set((state) => ({
          roleDefinitions: state.roleDefinitions.map(r => r.id === roleId ? response.roleDefinition! : r),
        }));
      }
    },

    deleteRoleDefinition: async (tenantId: string, roleId: string) => {
      const response = await VolleyGoalsAPIV1.deleteRoleDefinition(tenantId, roleId);
      if (response.error) {
        useNotificationStore.getState().notify({
          level: 'error',
          message: i18next.t(`${response.message}.message`, 'Something went wrong while deleting the role.'),
          title: i18next.t(`${response.message}.title`, 'Something went wrong'),
          details: response.error,
        });
      } else {
        set((state) => ({ roleDefinitions: state.roleDefinitions.filter(r => r.id !== roleId) }));
      }
    },

    fetchOwnershipPolicies: async (tenantId: string) => {
      const response = await VolleyGoalsAPIV1.listOwnershipPolicies(tenantId);
      if (response.items) {
        set({ ownershipPolicies: response.items });
      } else {
        useNotificationStore.getState().notify({
          level: 'error',
          message: i18next.t(`${response.message}.message`, 'Something went wrong while loading ownership policies.'),
          title: i18next.t(`${response.message}.title`, 'Something went wrong'),
          details: response.error,
        });
      }
    },

    updateOwnershipPolicy: async (tenantId: string, resourceType: string, ownerPermissions: string[], parentOwnerPermissions: string[]) => {
      const response = await VolleyGoalsAPIV1.updateOwnershipPolicy(tenantId, resourceType, ownerPermissions, parentOwnerPermissions);
      if (!response.policy) {
        useNotificationStore.getState().notify({
          level: 'error',
          message: i18next.t(`${response.message}.message`, 'Something went wrong while saving the policy.'),
          title: i18next.t(`${response.message}.title`, 'Something went wrong'),
          details: response.error,
        });
      } else {
        set((state) => ({
          ownershipPolicies: state.ownershipPolicies.some(p => p.resourceType === resourceType)
            ? state.ownershipPolicies.map(p => p.resourceType === resourceType ? response.policy! : p)
            : [...state.ownershipPolicies, response.policy!],
        }));
      }
    },

    createTenantedTeam: async (tenantId: string, name: string) => {
      const response = await VolleyGoalsAPIV1.createTenantedTeam(tenantId, name);
      if (!response.team) {
        useNotificationStore.getState().notify({
          level: 'error',
          message: i18next.t(`${response.message}.message`, 'Something went wrong while creating the team.'),
          title: i18next.t(`${response.message}.title`, 'Something went wrong'),
          details: response.error,
        });
      }
      // Team creation success: the user will be redirected to teams page to see the new team
    },
  }));

  export { useTenantStore };
  ```

- [ ] **Step 4: Run the tests — expect PASS**

  Run: `npx jest --testPathPattern=tenants.test 2>&1 | tail -20`

  Expected: PASS — all 7 tenant store tests pass.

- [ ] **Step 5: Run full test suite**

  Run: `npx jest 2>&1 | tail -20`

  Expected: all tests pass.

- [ ] **Step 6: Commit**

  ```bash
  git add src/store/tenants.ts src/__tests__/store/tenants.test.ts
  git commit -m "feat: add tenant store with CRUD, members, role definitions, and ownership policies"
  ```

---

## Task 3: Wire Tenant `roleDefinitions` into `cognitoUser` Store

**Files:**
- Modify: `src/store/cognitoUser.ts`

After Phase 2, `setSelectedTeam` calls `resolvePermissions(role, [])` with an empty roleDefinitions array. Now we wire it to the tenant store so custom roles take effect.

- [ ] **Step 1: Import the tenant store in `cognitoUser.ts`**

  Add at the top of `src/store/cognitoUser.ts`:
  ```ts
  import { useTenantStore } from './tenants';
  ```

- [ ] **Step 2: Update `setSelectedTeam` to pull `roleDefinitions` from the tenant store**

  ```ts
  setSelectedTeam: (teamId: string) => {
    const { availableTeams } = get();
    const selected = availableTeams?.find(t => t.team.id === teamId);
    setSessionItem(SELECTED_TEAM_KEY, teamId);
    const roleDefinitions = useTenantStore.getState().roleDefinitions;
    const currentPermissions = selected
      ? resolvePermissions(selected.role as string, roleDefinitions)
      : [];
    set({ selectedTeam: selected, currentPermissions });

    // If the team belongs to a tenant, load role definitions so custom roles work
    if (selected?.team?.tenantId) {
      useTenantStore.getState().fetchRoleDefinitions(selected.team.tenantId).catch(() => {
        // Graceful fallback: if fetch fails, default permissions remain in effect
      });
    }
  },
  ```

- [ ] **Step 3: Subscribe to `roleDefinitions` changes so permissions recompute automatically**

  In `cognitoUser.ts`, outside the `create` call, add a subscription after the store is defined:

  ```ts
  // After: export { useCognitoUserStore };
  // Add:
  useTenantStore.subscribe((state, prev) => {
    if (state.roleDefinitions !== prev.roleDefinitions) {
      const { selectedTeam } = useCognitoUserStore.getState();
      if (selectedTeam) {
        const currentPermissions = resolvePermissions(selectedTeam.role as string, state.roleDefinitions);
        useCognitoUserStore.setState({ currentPermissions });
      }
    }
  });
  ```

  Note: This subscription line must appear AFTER both stores are defined. Since `cognitoUser.ts` imports `tenants.ts` and vice-versa would create a circular dependency, keep the import in `cognitoUser.ts` only (one-directional). The tenant store does NOT import cognitoUser.

- [ ] **Step 4: Update `fetchSelf` to also pull live role definitions**

  ```ts
  fetchSelf: async () => {
    const { user, assignments } = await loadSelf();
    const selectedTeamId = getSessionItem(SELECTED_TEAM_KEY);
    const selectedTeam = assignments?.find(t => t.team.id === selectedTeamId);
    const roleDefinitions = useTenantStore.getState().roleDefinitions;
    const currentPermissions = selectedTeam
      ? resolvePermissions(selectedTeam.role as string, roleDefinitions)
      : [];
    set({ user, availableTeams: assignments, selectedTeam, currentPermissions });
  },
  ```

- [ ] **Step 5: Run TypeScript check**

  Run: `npx tsc --noEmit 2>&1 | grep cognitoUser`

  Expected: no errors.

- [ ] **Step 6: Commit**

  ```bash
  git add src/store/cognitoUser.ts
  git commit -m "feat: wire tenant roleDefinitions into permission resolution on team select"
  ```

---

## Task 4: Register Tenant Routes in `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add `'tenants'` to `HeaderVisibleSegments`**

  Change:
  ```ts
  const HeaderVisibleSegments = [
    '', 'dashboard', 'teams', 'users', 'profile',
    'seasons', 'goals', 'progress', 'members', 'team-settings', 'invites', 'no-access'
  ];
  ```
  To:
  ```ts
  const HeaderVisibleSegments = [
    '', 'dashboard', 'teams', 'users', 'tenants', 'profile',
    'seasons', 'goals', 'progress', 'members', 'team-settings', 'invites', 'no-access'
  ];
  ```

- [ ] **Step 2: Add imports for the four new tenant pages**

  ```ts
  import { Tenants } from './pages/admin/Tenants';
  import { TenantDetails } from './pages/admin/TenantDetails';
  import { TenantRoles } from './pages/admin/TenantRoles';
  import { TenantPolicies } from './pages/admin/TenantPolicies';
  ```

  (These pages don't exist yet; add the imports now so TypeScript errors guide you — resolve them in Tasks 5–8.)

- [ ] **Step 3: Add the tenant routes**

  After the `/users` route group, add:
  ```tsx
  <Route path={"/tenants"} element={<PrivateRoute userTypes={[UserType.Admin]} />} >
    <Route path={""} element={<Tenants />} />
    <Route path={":tenantId"} element={<TenantDetails />} />
    <Route path={":tenantId/roles"} element={<TenantRoles />} />
    <Route path={":tenantId/policies"} element={<TenantPolicies />} />
  </Route>
  ```

- [ ] **Step 4: Commit after all four page files exist**

  (Commit deferred until pages are created — do this at the end of Task 8.)

---

## Task 5: Create `Tenants.tsx` — Tenant List Page

**Files:**
- Create: `src/pages/admin/Tenants.tsx`

This page lists all tenants. The tenant list is maintained locally in the store: tenants are added when created and removed when deleted. There is no list-all API endpoint, so the page starts empty and the admin creates tenants via this UI.

- [ ] **Step 1: Create `src/pages/admin/Tenants.tsx`**

  ```tsx
  import React, { useState } from 'react';
  import {
    Box, Typography, Button, Table, TableHead, TableBody, TableRow, TableCell,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton,
    CircularProgress,
  } from '@mui/material';
  import DeleteIcon from '@mui/icons-material/Delete';
  import { useNavigate } from 'react-router-dom';
  import { useTenantStore } from '../../store/tenants';
  import { useForm, Controller } from 'react-hook-form';
  import { formatDateTime } from '../../utils/dateTime';

  export function Tenants() {
    const tenants = useTenantStore(s => s.tenants);
    const createTenant = useTenantStore(s => s.createTenant);
    const deleteTenant = useTenantStore(s => s.deleteTenant);
    const navigate = useNavigate();

    const [createOpen, setCreateOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const { control, handleSubmit, reset } = useForm<{ name: string }>({ defaultValues: { name: '' } });

    const onCreateSubmit = async (data: { name: string }) => {
      setLoading(true);
      try {
        await createTenant(data.name);
        setCreateOpen(false);
        reset({ name: '' });
      } finally {
        setLoading(false);
      }
    };

    const onDeleteConfirm = async () => {
      if (!deleteId) return;
      setLoading(true);
      try {
        await deleteTenant(deleteId);
        setDeleteId(null);
      } finally {
        setLoading(false);
      }
    };

    return (
      <Box p={3}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h5">Tenants</Typography>
          <Button variant="contained" onClick={() => { reset({ name: '' }); setCreateOpen(true); }}>
            Create Tenant
          </Button>
        </Box>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Owner</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tenants.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  <Typography variant="body2" color="text.secondary">No tenants yet.</Typography>
                </TableCell>
              </TableRow>
            )}
            {tenants.map(tenant => (
              <TableRow
                key={tenant.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => navigate(`/tenants/${tenant.id}`)}
              >
                <TableCell>{tenant.name}</TableCell>
                <TableCell>{tenant.ownerId}</TableCell>
                <TableCell>{formatDateTime(tenant.createdAt)}</TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); setDeleteId(tenant.id); }}
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Create Dialog */}
        <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
          <form onSubmit={handleSubmit(onCreateSubmit)}>
            <DialogTitle>Create Tenant</DialogTitle>
            <DialogContent>
              <Controller
                name="name"
                control={control}
                rules={{ required: 'Name is required' }}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    autoFocus
                    fullWidth
                    label="Tenant Name"
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    sx={{ mt: 1 }}
                  />
                )}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={loading}>
                {loading ? <CircularProgress size={18} /> : 'Create'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
          <DialogTitle>Delete Tenant</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete this tenant? This action cannot be undone.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button onClick={onDeleteConfirm} color="error" variant="contained" disabled={loading}>
              {loading ? <CircularProgress size={18} /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }
  ```

- [ ] **Step 2: Run TypeScript check**

  Run: `npx tsc --noEmit 2>&1 | grep Tenants`

  Expected: no errors (or only import errors from TenantDetails/TenantRoles/TenantPolicies not yet existing).

- [ ] **Step 3: Commit (deferred — commit together with remaining pages in Task 8)**

---

## Task 6: Create `TenantDetails.tsx` — Members and Team Creation

**Files:**
- Create: `src/pages/admin/TenantDetails.tsx`

- [ ] **Step 1: Create `src/pages/admin/TenantDetails.tsx`**

  ```tsx
  import React, { useEffect, useState } from 'react';
  import {
    Box, Typography, Button, Table, TableHead, TableBody, TableRow, TableCell,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
    IconButton, Tabs, Tab, CircularProgress, Paper,
  } from '@mui/material';
  import DeleteIcon from '@mui/icons-material/Delete';
  import EditIcon from '@mui/icons-material/Edit';
  import { useParams, useNavigate } from 'react-router-dom';
  import { useTenantStore } from '../../store/tenants';
  import { useForm, Controller } from 'react-hook-form';

  export function TenantDetails() {
    const { tenantId } = useParams<{ tenantId: string }>();
    const navigate = useNavigate();

    const currentTenant = useTenantStore(s => s.currentTenant);
    const tenantMembers = useTenantStore(s => s.tenantMembers);
    const loading = useTenantStore(s => s.loading);
    const getTenant = useTenantStore(s => s.getTenant);
    const updateTenant = useTenantStore(s => s.updateTenant);
    const addTenantMember = useTenantStore(s => s.addTenantMember);
    const removeTenantMember = useTenantStore(s => s.removeTenantMember);
    const createTenantedTeam = useTenantStore(s => s.createTenantedTeam);

    const [editingName, setEditingName] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [addMemberOpen, setAddMemberOpen] = useState(false);
    const [createTeamOpen, setCreateTeamOpen] = useState(false);
    const [removeMemberId, setRemoveMemberId] = useState<string | null>(null);

    const { control: nameControl, handleSubmit: handleNameSubmit, reset: resetName } = useForm<{ name: string }>({ defaultValues: { name: '' } });
    const { control: memberControl, handleSubmit: handleMemberSubmit, reset: resetMember } = useForm<{ userId: string; role: 'admin' | 'member' }>({ defaultValues: { userId: '', role: 'member' } });
    const { control: teamControl, handleSubmit: handleTeamSubmit, reset: resetTeam } = useForm<{ name: string }>({ defaultValues: { name: '' } });

    useEffect(() => {
      if (tenantId) {
        getTenant(tenantId);
      }
    }, [tenantId]);

    useEffect(() => {
      if (currentTenant) {
        resetName({ name: currentTenant.name });
      }
    }, [currentTenant]);

    const onNameSave = async (data: { name: string }) => {
      if (!tenantId) return;
      setActionLoading(true);
      try {
        await updateTenant(tenantId, data.name);
        setEditingName(false);
      } finally {
        setActionLoading(false);
      }
    };

    const onAddMember = async (data: { userId: string; role: 'admin' | 'member' }) => {
      if (!tenantId) return;
      setActionLoading(true);
      try {
        await addTenantMember(tenantId, data.userId, data.role);
        setAddMemberOpen(false);
        resetMember({ userId: '', role: 'member' });
      } finally {
        setActionLoading(false);
      }
    };

    const onRemoveMemberConfirm = async () => {
      if (!tenantId || !removeMemberId) return;
      setActionLoading(true);
      try {
        await removeTenantMember(tenantId, removeMemberId);
        setRemoveMemberId(null);
      } finally {
        setActionLoading(false);
      }
    };

    const onCreateTeam = async (data: { name: string }) => {
      if (!tenantId) return;
      setActionLoading(true);
      try {
        await createTenantedTeam(tenantId, data.name);
        setCreateTeamOpen(false);
        resetTeam({ name: '' });
      } finally {
        setActionLoading(false);
      }
    };

    if (loading && !currentTenant) {
      return <Box p={3}><CircularProgress /></Box>;
    }

    return (
      <Box p={3}>
        {/* Header */}
        <Box display="flex" alignItems="center" gap={1} mb={3}>
          {editingName ? (
            <form onSubmit={handleNameSubmit(onNameSave)} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Controller
                name="name"
                control={nameControl}
                rules={{ required: true }}
                render={({ field }) => <TextField {...field} size="small" label="Name" autoFocus />}
              />
              <Button type="submit" variant="contained" size="small" disabled={actionLoading}>Save</Button>
              <Button size="small" onClick={() => setEditingName(false)}>Cancel</Button>
            </form>
          ) : (
            <>
              <Typography variant="h5">{currentTenant?.name ?? 'Tenant'}</Typography>
              <IconButton size="small" onClick={() => setEditingName(true)}><EditIcon fontSize="small" /></IconButton>
            </>
          )}
        </Box>

        {/* Navigation tabs */}
        <Tabs value={0} sx={{ mb: 2 }}>
          <Tab label="Members & Teams" />
          <Tab label="Role Definitions" onClick={() => navigate(`/tenants/${tenantId}/roles`)} />
          <Tab label="Ownership Policies" onClick={() => navigate(`/tenants/${tenantId}/policies`)} />
        </Tabs>

        {/* Members Table */}
        <Box mb={3}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="h6">Members</Typography>
            <Button variant="outlined" size="small" onClick={() => { resetMember({ userId: '', role: 'member' }); setAddMemberOpen(true); }}>
              Add Member
            </Button>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>User ID</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tenantMembers.length === 0 && (
                <TableRow><TableCell colSpan={4} align="center"><Typography variant="body2" color="text.secondary">No members.</Typography></TableCell></TableRow>
              )}
              {tenantMembers.map(m => (
                <TableRow key={m.id}>
                  <TableCell>{m.userId}</TableCell>
                  <TableCell>{m.role}</TableCell>
                  <TableCell>{m.status}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" color="error" onClick={() => setRemoveMemberId(m.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

        {/* Create Team */}
        <Box>
          <Button variant="outlined" onClick={() => { resetTeam({ name: '' }); setCreateTeamOpen(true); }}>
            Create Team under this Tenant
          </Button>
        </Box>

        {/* Add Member Dialog */}
        <Dialog open={addMemberOpen} onClose={() => setAddMemberOpen(false)} maxWidth="sm" fullWidth>
          <form onSubmit={handleMemberSubmit(onAddMember)}>
            <DialogTitle>Add Member</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              <Controller
                name="userId"
                control={memberControl}
                rules={{ required: 'User ID is required' }}
                render={({ field, fieldState }) => (
                  <TextField {...field} fullWidth label="User ID" error={!!fieldState.error} helperText={fieldState.error?.message} />
                )}
              />
              <Controller
                name="role"
                control={memberControl}
                render={({ field }) => (
                  <TextField {...field} select fullWidth label="Role">
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="member">Member</MenuItem>
                  </TextField>
                )}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setAddMemberOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={actionLoading}>Add</Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Remove Member Confirmation */}
        <Dialog open={!!removeMemberId} onClose={() => setRemoveMemberId(null)}>
          <DialogTitle>Remove Member</DialogTitle>
          <DialogContent><Typography>Remove this member from the tenant?</Typography></DialogContent>
          <DialogActions>
            <Button onClick={() => setRemoveMemberId(null)}>Cancel</Button>
            <Button color="error" variant="contained" onClick={onRemoveMemberConfirm} disabled={actionLoading}>Remove</Button>
          </DialogActions>
        </Dialog>

        {/* Create Team Dialog */}
        <Dialog open={createTeamOpen} onClose={() => setCreateTeamOpen(false)} maxWidth="sm" fullWidth>
          <form onSubmit={handleTeamSubmit(onCreateTeam)}>
            <DialogTitle>Create Team</DialogTitle>
            <DialogContent>
              <Controller
                name="name"
                control={teamControl}
                rules={{ required: 'Team name is required' }}
                render={({ field, fieldState }) => (
                  <TextField {...field} autoFocus fullWidth label="Team Name" error={!!fieldState.error} helperText={fieldState.error?.message} sx={{ mt: 1 }} />
                )}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setCreateTeamOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={actionLoading}>Create</Button>
            </DialogActions>
          </form>
        </Dialog>
      </Box>
    );
  }
  ```

- [ ] **Step 2: Run TypeScript check**

  Run: `npx tsc --noEmit 2>&1 | grep TenantDetails`

  Expected: no errors.

---

## Task 7: Create `TenantRoles.tsx` — Role Definitions Editor

**Files:**
- Create: `src/pages/admin/TenantRoles.tsx`

- [ ] **Step 1: Create `src/pages/admin/TenantRoles.tsx`**

  ```tsx
  import React, { useEffect, useState } from 'react';
  import {
    Box, Typography, Button, Paper, Chip, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, IconButton, Tabs, Tab,
    FormGroup, FormControlLabel, Checkbox, CircularProgress,
  } from '@mui/material';
  import DeleteIcon from '@mui/icons-material/Delete';
  import EditIcon from '@mui/icons-material/Edit';
  import { useParams, useNavigate } from 'react-router-dom';
  import { useTenantStore } from '../../store/tenants';
  import { ALL_PERMISSIONS, Permission } from '../../utils/permissions';
  import { useForm, Controller } from 'react-hook-form';

  type RoleForm = { name: string; permissions: Permission[] };

  export function TenantRoles() {
    const { tenantId } = useParams<{ tenantId: string }>();
    const navigate = useNavigate();

    const roleDefinitions = useTenantStore(s => s.roleDefinitions);
    const fetchRoleDefinitions = useTenantStore(s => s.fetchRoleDefinitions);
    const createRoleDefinition = useTenantStore(s => s.createRoleDefinition);
    const updateRoleDefinition = useTenantStore(s => s.updateRoleDefinition);
    const deleteRoleDefinition = useTenantStore(s => s.deleteRoleDefinition);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([]);

    const { control, handleSubmit, reset, setValue } = useForm<RoleForm>({
      defaultValues: { name: '', permissions: [] },
    });

    useEffect(() => {
      if (tenantId) fetchRoleDefinitions(tenantId);
    }, [tenantId]);

    const openCreate = () => {
      setEditingId(null);
      setSelectedPermissions([]);
      reset({ name: '', permissions: [] });
      setDialogOpen(true);
    };

    const openEdit = (roleId: string) => {
      const role = roleDefinitions.find(r => r.id === roleId);
      if (!role) return;
      setEditingId(roleId);
      const perms = role.permissions.filter((p): p is Permission => ALL_PERMISSIONS.includes(p as Permission));
      setSelectedPermissions(perms);
      reset({ name: role.name, permissions: perms });
      setDialogOpen(true);
    };

    const togglePermission = (p: Permission) => {
      const next = selectedPermissions.includes(p)
        ? selectedPermissions.filter(x => x !== p)
        : [...selectedPermissions, p];
      setSelectedPermissions(next);
      setValue('permissions', next);
    };

    const onSubmit = async (data: RoleForm) => {
      if (!tenantId) return;
      setActionLoading(true);
      try {
        if (editingId) {
          await updateRoleDefinition(tenantId, editingId, selectedPermissions);
        } else {
          await createRoleDefinition(tenantId, data.name, selectedPermissions);
        }
        setDialogOpen(false);
      } finally {
        setActionLoading(false);
      }
    };

    const onDeleteConfirm = async () => {
      if (!tenantId || !deleteId) return;
      setActionLoading(true);
      try {
        await deleteRoleDefinition(tenantId, deleteId);
        setDeleteId(null);
      } finally {
        setActionLoading(false);
      }
    };

    return (
      <Box p={3}>
        <Tabs value={1} sx={{ mb: 2 }}>
          <Tab label="Members & Teams" onClick={() => navigate(`/tenants/${tenantId}`)} />
          <Tab label="Role Definitions" />
          <Tab label="Ownership Policies" onClick={() => navigate(`/tenants/${tenantId}/policies`)} />
        </Tabs>

        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6">Role Definitions</Typography>
          <Button variant="contained" onClick={openCreate}>Add Role</Button>
        </Box>

        {roleDefinitions.map(role => (
          <Paper key={role.id} variant="outlined" sx={{ p: 2, mb: 1 }}>
            <Box display="flex" alignItems="flex-start" justifyContent="space-between">
              <Box>
                <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                  <Typography variant="subtitle1">{role.name}</Typography>
                  {role.isDefault && <Chip label="default" size="small" color="primary" />}
                </Box>
                <Box display="flex" flexWrap="wrap" gap={0.5}>
                  {role.permissions.map(p => (
                    <Chip key={p} label={p} size="small" variant="outlined" />
                  ))}
                  {role.permissions.length === 0 && (
                    <Typography variant="caption" color="text.secondary">No permissions</Typography>
                  )}
                </Box>
              </Box>
              <Box display="flex" gap={0.5}>
                <IconButton size="small" onClick={() => openEdit(role.id)} disabled={role.isDefault}>
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" color="error" onClick={() => setDeleteId(role.id)} disabled={role.isDefault}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </Paper>
        ))}

        {roleDefinitions.length === 0 && (
          <Typography variant="body2" color="text.secondary">No custom roles defined.</Typography>
        )}

        {/* Create / Edit Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogTitle>{editingId ? 'Edit Role' : 'Add Role'}</DialogTitle>
            <DialogContent>
              {!editingId && (
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: 'Role name is required' }}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      fullWidth
                      label="Role Name"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      sx={{ mb: 2, mt: 1 }}
                    />
                  )}
                />
              )}
              <Typography variant="subtitle2" mb={1}>Permissions</Typography>
              <FormGroup>
                {ALL_PERMISSIONS.map(p => (
                  <FormControlLabel
                    key={p}
                    control={
                      <Checkbox
                        size="small"
                        checked={selectedPermissions.includes(p)}
                        onChange={() => togglePermission(p)}
                      />
                    }
                    label={p}
                  />
                ))}
              </FormGroup>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={actionLoading}>
                {actionLoading ? <CircularProgress size={18} /> : (editingId ? 'Save' : 'Create')}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
          <DialogTitle>Delete Role</DialogTitle>
          <DialogContent><Typography>Delete this role definition?</Typography></DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button color="error" variant="contained" onClick={onDeleteConfirm} disabled={actionLoading}>Delete</Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  }
  ```

- [ ] **Step 2: Run TypeScript check**

  Run: `npx tsc --noEmit 2>&1 | grep TenantRoles`

  Expected: no errors.

---

## Task 8: Create `TenantPolicies.tsx` — Ownership Policies Editor

**Files:**
- Create: `src/pages/admin/TenantPolicies.tsx`

- [ ] **Step 1: Create `src/pages/admin/TenantPolicies.tsx`**

  ```tsx
  import React, { useEffect, useState } from 'react';
  import {
    Box, Typography, Button, Paper, Tabs, Tab, CircularProgress,
    FormGroup, FormControlLabel, Checkbox,
  } from '@mui/material';
  import { useParams, useNavigate } from 'react-router-dom';
  import { useTenantStore } from '../../store/tenants';
  import { ALL_PERMISSIONS, Permission } from '../../utils/permissions';

  const RESOURCE_TYPES = ['goals', 'progress_reports', 'comments'];

  export function TenantPolicies() {
    const { tenantId } = useParams<{ tenantId: string }>();
    const navigate = useNavigate();

    const ownershipPolicies = useTenantStore(s => s.ownershipPolicies);
    const fetchOwnershipPolicies = useTenantStore(s => s.fetchOwnershipPolicies);
    const updateOwnershipPolicy = useTenantStore(s => s.updateOwnershipPolicy);

    const [savingType, setSavingType] = useState<string | null>(null);
    // Local editable state per resource type
    const [draft, setDraft] = useState<Record<string, { ownerPerms: Permission[]; parentOwnerPerms: Permission[] }>>({});

    useEffect(() => {
      if (tenantId) fetchOwnershipPolicies(tenantId);
    }, [tenantId]);

    // When policies load, populate draft
    useEffect(() => {
      const initial: typeof draft = {};
      RESOURCE_TYPES.forEach(rt => {
        const existing = ownershipPolicies.find(p => p.resourceType === rt);
        initial[rt] = {
          ownerPerms: (existing?.ownerPermissions ?? []).filter((p): p is Permission => ALL_PERMISSIONS.includes(p as Permission)),
          parentOwnerPerms: (existing?.parentOwnerPermissions ?? []).filter((p): p is Permission => ALL_PERMISSIONS.includes(p as Permission)),
        };
      });
      setDraft(initial);
    }, [ownershipPolicies]);

    const togglePerm = (resourceType: string, field: 'ownerPerms' | 'parentOwnerPerms', perm: Permission) => {
      setDraft(prev => {
        const current = prev[resourceType] ?? { ownerPerms: [], parentOwnerPerms: [] };
        const list = current[field];
        const next = list.includes(perm) ? list.filter(p => p !== perm) : [...list, perm];
        return { ...prev, [resourceType]: { ...current, [field]: next } };
      });
    };

    const onSave = async (resourceType: string) => {
      if (!tenantId) return;
      const d = draft[resourceType];
      if (!d) return;
      setSavingType(resourceType);
      try {
        await updateOwnershipPolicy(tenantId, resourceType, d.ownerPerms, d.parentOwnerPerms);
      } finally {
        setSavingType(null);
      }
    };

    return (
      <Box p={3}>
        <Tabs value={2} sx={{ mb: 2 }}>
          <Tab label="Members & Teams" onClick={() => navigate(`/tenants/${tenantId}`)} />
          <Tab label="Role Definitions" onClick={() => navigate(`/tenants/${tenantId}/roles`)} />
          <Tab label="Ownership Policies" />
        </Tabs>

        <Typography variant="h6" mb={2}>Ownership Policies</Typography>

        {RESOURCE_TYPES.map(rt => {
          const d = draft[rt] ?? { ownerPerms: [], parentOwnerPerms: [] };
          return (
            <Paper key={rt} variant="outlined" sx={{ p: 2, mb: 2 }}>
              <Typography variant="subtitle1" mb={1} sx={{ textTransform: 'capitalize' }}>{rt.replace('_', ' ')}</Typography>
              <Box display="flex" gap={4} flexWrap="wrap">
                <Box flex={1} minWidth={240}>
                  <Typography variant="subtitle2" mb={0.5}>Owner Permissions</Typography>
                  <FormGroup>
                    {ALL_PERMISSIONS.map(p => (
                      <FormControlLabel
                        key={p}
                        control={
                          <Checkbox
                            size="small"
                            checked={d.ownerPerms.includes(p)}
                            onChange={() => togglePerm(rt, 'ownerPerms', p)}
                          />
                        }
                        label={p}
                      />
                    ))}
                  </FormGroup>
                </Box>
                <Box flex={1} minWidth={240}>
                  <Typography variant="subtitle2" mb={0.5}>Parent Owner Permissions</Typography>
                  <FormGroup>
                    {ALL_PERMISSIONS.map(p => (
                      <FormControlLabel
                        key={p}
                        control={
                          <Checkbox
                            size="small"
                            checked={d.parentOwnerPerms.includes(p)}
                            onChange={() => togglePerm(rt, 'parentOwnerPerms', p)}
                          />
                        }
                        label={p}
                      />
                    ))}
                  </FormGroup>
                </Box>
              </Box>
              <Box mt={1}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => onSave(rt)}
                  disabled={savingType === rt}
                >
                  {savingType === rt ? <CircularProgress size={18} /> : 'Save'}
                </Button>
              </Box>
            </Paper>
          );
        })}
      </Box>
    );
  }
  ```

- [ ] **Step 2: Run full TypeScript check**

  Run: `npx tsc --noEmit 2>&1`

  Expected: no errors. If errors appear, resolve them before continuing.

- [ ] **Step 3: Commit all four pages + App.tsx**

  ```bash
  git add src/App.tsx \
    src/pages/admin/Tenants.tsx \
    src/pages/admin/TenantDetails.tsx \
    src/pages/admin/TenantRoles.tsx \
    src/pages/admin/TenantPolicies.tsx
  git commit -m "feat: add tenant management UI (Tenants, TenantDetails, TenantRoles, TenantPolicies) with routes"
  ```

---

## Task 9: Final Integration Check

- [ ] **Step 1: Run all tests**

  Run: `npx jest 2>&1 | tail -30`

  Expected: PASS — all tests pass.

- [ ] **Step 2: Run full TypeScript check**

  Run: `npx tsc --noEmit 2>&1`

  Expected: no errors.

- [ ] **Step 3: Verify navigation renders the Tenants item for admin users**

  Check `src/components/Navigation.tsx` — ensure it imports `BusinessIcon` and the `tenants` NAV_ITEM has `userType: UserType.Admin`. The item was added in Phase 2 Task 8.

- [ ] **Step 4: Commit any remaining fixes**

  ```bash
  git add -p
  git commit -m "chore: final Phase 3-4 integration fixes"
  ```

---

## Self-Review

**Spec coverage check:**

| Spec item | Task |
|-----------|------|
| `createTenant`, `getTenant`, `updateTenant`, `deleteTenant` | Task 1 |
| `addTenantMember`, `removeTenantMember` | Task 1 |
| `listRoleDefinitions`, `createRoleDefinition`, `updateRoleDefinition`, `deleteRoleDefinition` | Task 1 |
| `listOwnershipPolicies`, `updateOwnershipPolicy` | Task 1 |
| `createTenantedTeam` | Task 1 |
| Tenant store state shape | Task 2 |
| Tenant store actions mirror API | Task 2 |
| `roleDefinitions` consumed by `resolvePermissions` in cognitoUser | Task 3 |
| Permissions recompute when `roleDefinitions` changes | Task 3 |
| `'tenants'` added to `HeaderVisibleSegments` | Task 4 |
| `/tenants`, `/tenants/:tenantId`, `/tenants/:tenantId/roles`, `/tenants/:tenantId/policies` routes | Task 4 |
| `Tenants.tsx` — list, create, delete | Task 5 |
| `TenantDetails.tsx` — inline name edit, members table, add/remove, create team | Task 6 |
| `TenantRoles.tsx` — cards with permission chips, add/edit/delete (disabled for isDefault) | Task 7 |
| `TenantPolicies.tsx` — one card per resource type, two multiselects, save per card | Task 8 |
| Tenants nav item (admin only) | Completed in Phase 2 Task 8 |
| Tests: tenant store | Task 2 |
