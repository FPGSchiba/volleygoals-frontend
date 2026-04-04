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

import VolleyGoalsAPI from '../../services/backend.api';
const api = jest.mocked(VolleyGoalsAPI);

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
