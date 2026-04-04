import { create } from 'zustand';
import { ITenant, ITenantMember, IRoleDefinition, IOwnershipPolicy } from './types';
import VolleyGoalsAPI from '../services/backend.api';
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

const useTenantStore = create<TenantState & TenantActions>((set) => ({
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
      // No list-all-tenants endpoint yet; placeholder.
      set({ loading: false });
    } catch {
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
      set((state) => ({ roleDefinitions: [...state.roleDefinitions, response.roleDefinition!] }));
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
      set((state) => ({
        roleDefinitions: state.roleDefinitions.map(r => r.id === roleId ? response.roleDefinition! : r),
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
