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
