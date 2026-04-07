import { resolvePermissions, ALL_PERMISSIONS } from '../../utils/permissions';
import { IRoleDefinition } from '../../store/types';

const now = '2026-01-01T00:00:00Z';

function makeRoleDef(name: string, permissions: string[]): IRoleDefinition {
  return { id: 'r1', tenantId: 't1', name, permissions, isDefault: false, createdAt: now, updatedAt: now };
}

describe('resolvePermissions', () => {
  it('returns all permissions for admin role with no custom definitions', () => {
    const perms = resolvePermissions('admin', []);
    expect(perms).toEqual(expect.arrayContaining(['team_goals:read', 'team_goals:write', 'team_goals:delete']));
    expect(perms.length).toBe(ALL_PERMISSIONS.length);
  });

  it('returns subset for trainer role with no custom definitions', () => {
    const perms = resolvePermissions('trainer', []);
    expect(perms).toContain('team_goals:read');
    expect(perms).toContain('team_goals:write');
    expect(perms).toContain('team_goals:delete');
    expect(perms).not.toContain('individual_goals:write');
  });

  it('returns limited set for member role with no custom definitions', () => {
    const perms = resolvePermissions('member', []);
    expect(perms).toContain('team_goals:read');
    expect(perms).not.toContain('team_goals:write');
    expect(perms).not.toContain('members:write');
  });

  it('returns custom role permissions when a matching IRoleDefinition exists', () => {
    const custom = makeRoleDef('coach', ['team_goals:read', 'seasons:read', 'seasons:write']);
    const perms = resolvePermissions('coach', [custom]);
    expect(perms).toEqual(['team_goals:read', 'seasons:read', 'seasons:write']);
  });

  it('custom role match is case-insensitive', () => {
    const custom = makeRoleDef('Coach', ['team_goals:read']);
    const perms = resolvePermissions('coach', [custom]);
    expect(perms).toContain('team_goals:read');
  });

  it('returns empty array for unknown role with no matching definition', () => {
    const perms = resolvePermissions('unknown_role', []);
    expect(perms).toHaveLength(0);
  });
});
