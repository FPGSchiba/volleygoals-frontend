import { create } from 'zustand';
import {
  ITenant,
  ITenantMember,
  IOwnershipPolicy,
  IRoleDefinition
} from './types';
import VolleyGoalsAPI from '../services/backend.api';
import { ResourceDefinition } from '../types/api-types';
import { useNotificationStore } from './notification';
import i18next from 'i18next';

type TenantState = {
  tenants: ITenant[];
  currentTenant: ITenant | null;
  tenantMembers: ITenantMember[];
  roleDefinitions: IRoleDefinition[];
  resourceDefinitions: ResourceDefinition[];
  ownershipPolicies: IOwnershipPolicy[];
  loading: boolean;
  error: string | null;
};

type TenantActions = {
  fetchTenants: () => Promise<void>;
  fetchResourceDefinitions: () => Promise<void>;
  fetchResourceModel: (tenantId: string) => Promise<void>;
  fetchTenantMembers: (tenantId: string) => Promise<void>;
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
  previewOwnershipPermissions: (tenantId: string, resourceType: string, instanceId?: string) => Promise<any>;
  createTenantedTeam: (tenantId: string, name: string) => Promise<void>;
};

const useTenantStore = create<TenantState & TenantActions>((set) => ({
  tenants: [],
  currentTenant: null,
  tenantMembers: [],
  roleDefinitions: [],
  resourceDefinitions: [],
  ownershipPolicies: [],
  loading: false,
  error: null,

  fetchResourceDefinitions: async () => {
    try {
      const response = await VolleyGoalsAPI.getResourceDefinitions();
      if (response.items) {
        set({ resourceDefinitions: response.items.map((i: any) => ({ id: i.id, name: i.name, description: i.description, actions: i.actions ?? [], allowedChildResources: i.allowedChildResources ?? [] })) });
      } else {
        useNotificationStore.getState().notify({ level: 'error', message: i18next.t(`${response.message}.message`, 'Something went wrong while loading resource definitions.'), title: i18next.t(`${response.message}.title`, 'Something went wrong'), details: response.error });
      }
    } catch (e) {
      useNotificationStore.getState().notify({ level: 'error', message: i18next.t('resource_definitions.load_failed', 'Failed loading resource definitions'), title: i18next.t('Something went wrong') });
    }
  },

  fetchResourceModel: async (tenantId: string) => {
    try {
      // Prefer combined endpoint if backend supports it
      const combined = await VolleyGoalsAPI.getTenantResourceModel(tenantId);
      if (combined && combined.resourceDefinitions && combined.policies) {
        set({ resourceDefinitions: combined.resourceDefinitions.map((i: any) => ({ id: i.id, name: i.name, description: i.description, actions: i.actions ?? [], allowedChildResources: i.allowedChildResources ?? [] })), ownershipPolicies: combined.policies });
        return;
      }

      // Fallback: fetch definitions and policies separately
      const defsResp = await VolleyGoalsAPI.getResourceDefinitions();
      if (defsResp.items) set({ resourceDefinitions: defsResp.items.map((i: any) => ({ id: i.id, name: i.name, description: i.description, actions: i.actions ?? [], allowedChildResources: i.allowedChildResources ?? [] })) });
      const policiesResp = await VolleyGoalsAPI.listOwnershipPolicies(tenantId);
      if (policiesResp.items) set({ ownershipPolicies: policiesResp.items });
    } catch (e) {
      useNotificationStore.getState().notify({ level: 'error', message: i18next.t('resource_model.load_failed', 'Failed loading resource model'), title: i18next.t('Something went wrong') });
    }
  },

  fetchTenants: async () => {
    set({ loading: true });
    try {
      const response = await VolleyGoalsAPI.listTenants({ limit: 100 });
      if (response.items) {
        set({ tenants: response.items });
      } else {
        useNotificationStore.getState().notify({ level: 'error', message: 'tenants.load_failed', title: i18next.t('Something went wrong') });
      }
    } catch (e) {
      useNotificationStore.getState().notify({ level: 'error', message: 'tenants.load_failed', title: i18next.t('Something went wrong') });
    } finally {
      set({ loading: false });
    }
  },

  createTenant: async (name: string) => {
    const response = await VolleyGoalsAPI.createTenant(name);
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
      const response = await VolleyGoalsAPI.getTenant(id);
        if (response.tenant) {
          set({ currentTenant: response.tenant });
          // load tenant members using new list endpoint (flattened response)
          const membersResp = await VolleyGoalsAPI.listTenantMembers(id, { limit: 100 });
          if (membersResp.items) {
            set({ tenantMembers: membersResp.items });
          } else {
            useNotificationStore.getState().notify({
              level: 'error',
              message: membersResp.message || i18next.t('tenants.members.load_failed', 'Failed loading tenant members'),
              title: i18next.t('Something went wrong'),
              details: membersResp.error,
            });
            set({ tenantMembers: [] });
          }
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

  fetchTenantMembers: async (tenantId: string) => {
    try {
      const response = await VolleyGoalsAPI.listTenantMembers(tenantId, { limit: 100 });
      if (response.items) {
        set({ tenantMembers: response.items });
      } else {
        useNotificationStore.getState().notify({ level: 'error', message: i18next.t('tenants.members.load_failed', 'Failed loading tenant members'), title: i18next.t('Something went wrong') });
      }
    } catch {
      useNotificationStore.getState().notify({ level: 'error', message: i18next.t('tenants.members.load_failed', 'Failed loading tenant members'), title: i18next.t('Something went wrong') });
    }
  },

  updateTenant: async (id: string, name: string) => {
    const response = await VolleyGoalsAPI.updateTenant(id, name);
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
    const response = await VolleyGoalsAPI.deleteTenant(id);
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
    const response = await VolleyGoalsAPI.addTenantMember(tenantId, userId, role);
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
    const response = await VolleyGoalsAPI.removeTenantMember(tenantId, memberId);
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
    const response = await VolleyGoalsAPI.listRoleDefinitions(tenantId);
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
    const response = await VolleyGoalsAPI.createRoleDefinition(tenantId, name, permissions);
    if (!response.roleDefinition) {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, 'Something went wrong while creating the role.'),
        title: i18next.t(`${response.message}.title`, 'Something went wrong'),
        details: response.error,
      });
    } else {
      const roleDefinition = response.roleDefinition!;
      set((state) => ({ roleDefinitions: [...state.roleDefinitions, roleDefinition] }));
    }
  },

  updateRoleDefinition: async (tenantId: string, roleId: string, permissions: string[]) => {
    const response = await VolleyGoalsAPI.updateRoleDefinition(tenantId, roleId, permissions);
    if (!response.roleDefinition) {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, 'Something went wrong while updating the role.'),
        title: i18next.t(`${response.message}.title`, 'Something went wrong'),
        details: response.error,
      });
    } else {
      const roleDefinition = response.roleDefinition!;
      set((state) => ({
        roleDefinitions: state.roleDefinitions.map(r => r.id === roleId ? roleDefinition : r),
      }));
    }
  },

  deleteRoleDefinition: async (tenantId: string, roleId: string) => {
    const response = await VolleyGoalsAPI.deleteRoleDefinition(tenantId, roleId);
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
    const response = await VolleyGoalsAPI.listOwnershipPolicies(tenantId);
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
    const response = await VolleyGoalsAPI.updateOwnershipPolicy(tenantId, resourceType, ownerPermissions, parentOwnerPermissions);
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

  previewOwnershipPermissions: async (tenantId: string, resourceType: string, instanceId?: string) => {
    try {
      const response = await VolleyGoalsAPI.previewOwnershipPermissions(tenantId, { resourceType, instanceId });
      return response;
    } catch (e) {
      useNotificationStore.getState().notify({ level: 'error', message: i18next.t('ownership.preview_failed', 'Failed to preview effective permissions'), title: i18next.t('Something went wrong') });
      return { message: 'error', error: 'preview_failed' };
    }
  },

  createTenantedTeam: async (tenantId: string, name: string) => {
    const response = await VolleyGoalsAPI.createTenantedTeam(tenantId, name);
    if (!response.team) {
      useNotificationStore.getState().notify({
        level: 'error',
        message: i18next.t(`${response.message}.message`, 'Something went wrong while creating the team.'),
        title: i18next.t(`${response.message}.title`, 'Something went wrong'),
        details: response.error,
      });
    }
  },
}));

export { useTenantStore };
