import { usePermission } from './usePermission';

export interface ProgressReportPermissions {
  /** User can create/edit their own progress reports */
  canParticipate: boolean;
  /** User can view all team members' progress reports */
  canOversee: boolean;
}

export function useProgressReportPermissions(): ProgressReportPermissions {
  const canParticipate = usePermission('individual_goals:write');
  const canOversee = usePermission('members:read');
  return { canParticipate, canOversee };
}
