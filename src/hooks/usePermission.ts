import { useCognitoUserStore } from '../store/cognitoUser';
import { Permission } from '../utils/permissions';

export function usePermission(permission: Permission): boolean {
  return useCognitoUserStore(s => s.currentPermissions.includes(permission));
}
