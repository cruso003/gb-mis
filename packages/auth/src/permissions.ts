import { Permission, Role } from '@gb-mis/types';
import type { PermissionMap } from '@gb-mis/types';

// Permission registry derived directly from ROLES_PERMISSIONS.md.
// Effective permissions for a user are the union of all their roles.
// Do not modify this file without updating ROLES_PERMISSIONS.md and creating an ADR.

const ALL_ROLES: ReadonlySet<Permission> = new Set(Object.values(Permission));

const SUPER_ADMIN_PERMISSIONS: ReadonlySet<Permission> = ALL_ROLES;

const ADMIN_PERMISSIONS: ReadonlySet<Permission> = new Set([
  Permission.CASE_LIST,
  Permission.CASE_READ, // break-glass only — requires two-person auth in practice
  Permission.CASE_EXPORT_AGGREGATE,
  Permission.BENEFICIARY_LIST,
  Permission.BENEFICIARY_READ, // break-glass only
  Permission.BENEFICIARY_EXPORT,
  Permission.SESSION_MANAGE,
  Permission.SESSION_ATTENDANCE,
  Permission.VSLA_MANAGE,
  Permission.INDICATOR_CATALOG_VIEW,
  Permission.INDICATOR_VALUE_VIEW_VERIFIED,
  Permission.INDICATOR_VALUE_VIEW_UNVERIFIED,
  Permission.INDICATOR_VALUE_APPROVE,
  Permission.INDICATOR_RECOMPUTE,
  Permission.INDICATOR_CATALOG_MANAGE,
  Permission.INDICATOR_TARGET_EDIT,
  Permission.INDICATOR_EXPORT,
  Permission.DASHBOARD_VIEW,
  Permission.USER_CREATE,
  Permission.USER_GRANT_ADMIN,
  Permission.USER_GRANT_ELEVATED,
  Permission.USER_GRANT_BASIC,
  Permission.USER_SUSPEND,
  Permission.USER_FORCE_RESET,
  Permission.USER_DEVICE_WIPE,
  Permission.USER_AUDIT_VIEW,
  Permission.INTEGRATION_VIEW,
  Permission.INTEGRATION_EDIT,
  Permission.INTEGRATION_TEST,
  Permission.FEATURE_FLAG_TOGGLE,
  Permission.AUDIT_VIEW_ALL,
  Permission.AUDIT_EXPORT,
  Permission.DSR_PROCESS,
]);

const SUPERVISOR_PERMISSIONS: ReadonlySet<Permission> = new Set([
  Permission.CASE_LIST,
  Permission.CASE_READ,
  Permission.CASE_CREATE,
  Permission.CASE_UPDATE,
  Permission.CASE_CLOSE,
  Permission.CASE_ASSIGN,
  Permission.CASE_SUPERVISOR_REVIEW,
  Permission.CASE_CROSS_ORG_GRANT,
  Permission.CASE_EXPORT_AGGREGATE,
  Permission.BENEFICIARY_LIST,
  Permission.BENEFICIARY_READ,
  Permission.BENEFICIARY_CREATE,
  Permission.BENEFICIARY_UPDATE,
  Permission.BENEFICIARY_WITHDRAW,
  Permission.BENEFICIARY_CONSENT_MANAGE,
  Permission.BENEFICIARY_GRANT_RECORD,
  Permission.BENEFICIARY_EXPORT,
  Permission.SESSION_MANAGE,
  Permission.SESSION_ATTENDANCE,
  Permission.VSLA_MANAGE,
  Permission.INDICATOR_CATALOG_VIEW,
  Permission.INDICATOR_VALUE_VIEW_VERIFIED,
  Permission.INDICATOR_EXPORT,
  Permission.DASHBOARD_VIEW,
  Permission.USER_CREATE,
  Permission.USER_GRANT_BASIC,
  Permission.USER_SUSPEND,
  Permission.USER_FORCE_RESET,
  Permission.USER_DEVICE_WIPE,
  Permission.USER_AUDIT_VIEW,
  Permission.AUDIT_VIEW_OWN_SCOPE,
]);

const CASE_WORKER_PERMISSIONS: ReadonlySet<Permission> = new Set([
  Permission.CASE_LIST,
  Permission.CASE_READ,
  Permission.CASE_CREATE,
  Permission.CASE_UPDATE,
  Permission.CASE_CLOSE,
  Permission.BENEFICIARY_LIST,
  Permission.BENEFICIARY_READ,
  Permission.BENEFICIARY_CREATE,
  Permission.BENEFICIARY_UPDATE,
  Permission.BENEFICIARY_CONSENT_MANAGE,
  Permission.SESSION_MANAGE,
  Permission.SESSION_ATTENDANCE,
  Permission.VSLA_MANAGE,
  Permission.INDICATOR_CATALOG_VIEW,
  Permission.INDICATOR_VALUE_VIEW_VERIFIED,
  Permission.DASHBOARD_VIEW,
  Permission.AUDIT_VIEW_OWN_SCOPE,
]);

const DATA_ENTRY_CLERK_PERMISSIONS: ReadonlySet<Permission> = new Set([
  Permission.BENEFICIARY_LIST,
  Permission.BENEFICIARY_READ,
  Permission.BENEFICIARY_CREATE,
  Permission.BENEFICIARY_UPDATE,
  Permission.BENEFICIARY_CONSENT_MANAGE,
  Permission.BENEFICIARY_GRANT_RECORD,
  Permission.SESSION_MANAGE,
  Permission.SESSION_ATTENDANCE,
  Permission.VSLA_MANAGE,
  Permission.INDICATOR_CATALOG_VIEW,
  Permission.INDICATOR_VALUE_VIEW_VERIFIED,
  Permission.DASHBOARD_VIEW,
  Permission.AUDIT_VIEW_OWN_SCOPE,
]);

const ANALYST_PERMISSIONS: ReadonlySet<Permission> = new Set([
  Permission.CASE_EXPORT_AGGREGATE,
  Permission.INDICATOR_CATALOG_VIEW,
  Permission.INDICATOR_VALUE_VIEW_VERIFIED,
  Permission.INDICATOR_VALUE_VIEW_UNVERIFIED,
  Permission.INDICATOR_VALUE_ENTER,
  Permission.INDICATOR_EXPORT,
  Permission.DASHBOARD_VIEW,
  Permission.AUDIT_VIEW_OWN_SCOPE,
]);

const VIEWER_PERMISSIONS: ReadonlySet<Permission> = new Set([
  Permission.INDICATOR_CATALOG_VIEW,
  Permission.INDICATOR_VALUE_VIEW_VERIFIED,
  Permission.DASHBOARD_VIEW,
]);

export const PERMISSION_MAP: PermissionMap = {
  [Role.SUPER_ADMIN]: SUPER_ADMIN_PERMISSIONS,
  [Role.ADMIN]: ADMIN_PERMISSIONS,
  [Role.SUPERVISOR]: SUPERVISOR_PERMISSIONS,
  [Role.CASE_WORKER]: CASE_WORKER_PERMISSIONS,
  [Role.DATA_ENTRY_CLERK]: DATA_ENTRY_CLERK_PERMISSIONS,
  [Role.ANALYST]: ANALYST_PERMISSIONS,
  [Role.VIEWER]: VIEWER_PERMISSIONS,
};

/**
 * Returns true if any of the given roles grants the requested permission.
 * Effective permissions = union of all roles held by the user.
 */
export function can(roles: Role[], permission: Permission): boolean {
  return roles.some((role) => PERMISSION_MAP[role].has(permission));
}

/**
 * Returns the full set of permissions granted by the given roles.
 */
export function effectivePermissions(roles: Role[]): Set<Permission> {
  const result = new Set<Permission>();
  for (const role of roles) {
    for (const perm of PERMISSION_MAP[role]) {
      result.add(perm);
    }
  }
  return result;
}
