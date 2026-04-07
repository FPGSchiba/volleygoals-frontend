import { IRoleDefinition } from '../store/types';

export const ALL_PERMISSIONS = [
  'teams:read', 'teams:write', 'teams:delete',
  'team_settings:read', 'team_settings:write',
  'members:read', 'members:write', 'members:delete',
  'invites:read', 'invites:write', 'invites:delete',
  'seasons:read', 'seasons:write', 'seasons:delete',
  'team_goals:read', 'team_goals:write', 'team_goals:delete',
  'individual_goals:read', 'individual_goals:write', 'individual_goals:delete',
  'progress_reports:read', 'progress_reports:write', 'progress_reports:delete',
  'progress:read', 'progress:write',
  'comments:read', 'comments:write', 'comments:delete',
  'activities:read'
] as const;

export type Permission = typeof ALL_PERMISSIONS[number];

const DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  admin: [...ALL_PERMISSIONS] as Permission[],
  trainer: [
    'team_goals:read', 'team_goals:write', 'team_goals:delete',
    'individual_goals:read',
    'members:read',
    'seasons:read',
    'invites:read', 'invites:write',
    'comments:read', 'comments:write',
    'progress_reports:read', 'progress_reports:write',
    'team_settings:read',
    'activities:read',
  ],
  member: [
    'team_goals:read', 'individual_goals:read',
    'individual_goals:write', 'individual_goals:delete',
    'comments:read', 'comments:write',
    'seasons:read',
    'progress_reports:read', 'progress_reports:write',
    'activities:read',
  ],
};

export function resolvePermissions(role: string, roleDefinitions: IRoleDefinition[]): Permission[] {
  const custom = roleDefinitions.find(r => r.name.toLowerCase() === role.toLowerCase());
  if (custom) {
    return custom.permissions.filter((p): p is Permission =>
      ALL_PERMISSIONS.includes(p as Permission)
    );
  }
  return DEFAULT_PERMISSIONS[role.toLowerCase()] ?? [];
}
