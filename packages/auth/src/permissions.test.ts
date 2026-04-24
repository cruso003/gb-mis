import { Permission, Role } from '@gb-mis/types';
import { describe, it, expect } from 'vitest';

import { can, effectivePermissions, PERMISSION_MAP } from './permissions';

describe('PERMISSION_MAP', () => {
  it('covers all seven roles', () => {
    const roles = Object.values(Role);
    for (const role of roles) {
      expect(PERMISSION_MAP[role], `Missing permissions for role ${role}`).toBeDefined();
    }
  });

  it('SUPER_ADMIN holds every permission', () => {
    const allPerms = Object.values(Permission);
    const superAdminPerms = PERMISSION_MAP[Role.SUPER_ADMIN];
    for (const perm of allPerms) {
      expect(superAdminPerms.has(perm), `SUPER_ADMIN missing ${perm}`).toBe(true);
    }
  });

  it('VIEWER only holds read-only permissions', () => {
    const viewerPerms = PERMISSION_MAP[Role.VIEWER];
    // VIEWER must not be able to create, update, or delete
    expect(viewerPerms.has(Permission.CASE_CREATE)).toBe(false);
    expect(viewerPerms.has(Permission.BENEFICIARY_CREATE)).toBe(false);
    expect(viewerPerms.has(Permission.USER_CREATE)).toBe(false);
    expect(viewerPerms.has(Permission.INDICATOR_VALUE_ENTER)).toBe(false);
    // VIEWER can view the dashboard and verified indicators
    expect(viewerPerms.has(Permission.DASHBOARD_VIEW)).toBe(true);
    expect(viewerPerms.has(Permission.INDICATOR_VALUE_VIEW_VERIFIED)).toBe(true);
  });

  it('CASE_WORKER can create cases but cannot review them as supervisor', () => {
    const perms = PERMISSION_MAP[Role.CASE_WORKER];
    expect(perms.has(Permission.CASE_CREATE)).toBe(true);
    expect(perms.has(Permission.CASE_SUPERVISOR_REVIEW)).toBe(false);
  });

  it('SUPERVISOR can review cases', () => {
    const perms = PERMISSION_MAP[Role.SUPERVISOR];
    expect(perms.has(Permission.CASE_SUPERVISOR_REVIEW)).toBe(true);
  });

  it('ANALYST cannot read individual case records', () => {
    const perms = PERMISSION_MAP[Role.ANALYST];
    expect(perms.has(Permission.CASE_READ)).toBe(false);
    expect(perms.has(Permission.BENEFICIARY_READ)).toBe(false);
    // but can export aggregates
    expect(perms.has(Permission.CASE_EXPORT_AGGREGATE)).toBe(true);
  });

  it('DATA_ENTRY_CLERK cannot access cases at all', () => {
    const perms = PERMISSION_MAP[Role.DATA_ENTRY_CLERK];
    expect(perms.has(Permission.CASE_READ)).toBe(false);
    expect(perms.has(Permission.CASE_CREATE)).toBe(false);
  });

  it('ADMIN can manage users but not read individual case records directly', () => {
    const perms = PERMISSION_MAP[Role.ADMIN];
    expect(perms.has(Permission.USER_CREATE)).toBe(true);
    expect(perms.has(Permission.USER_GRANT_ADMIN)).toBe(true);
  });
});

describe('can()', () => {
  it('returns true when the role holds the permission', () => {
    expect(can([Role.CASE_WORKER], Permission.CASE_CREATE)).toBe(true);
  });

  it('returns false when the role does not hold the permission', () => {
    expect(can([Role.VIEWER], Permission.CASE_CREATE)).toBe(false);
  });

  it('returns true when any role in a multi-role set holds the permission', () => {
    expect(can([Role.VIEWER, Role.ANALYST], Permission.INDICATOR_VALUE_ENTER)).toBe(true);
  });

  it('returns false with an empty roles array', () => {
    expect(can([], Permission.DASHBOARD_VIEW)).toBe(false);
  });

  it('k-anonymity guard: ANALYST cannot read individual beneficiary records', () => {
    expect(can([Role.ANALYST], Permission.BENEFICIARY_READ)).toBe(false);
  });
});

describe('effectivePermissions()', () => {
  it('returns the union of permissions for multiple roles', () => {
    const perms = effectivePermissions([Role.VIEWER, Role.ANALYST]);
    // From VIEWER
    expect(perms.has(Permission.DASHBOARD_VIEW)).toBe(true);
    expect(perms.has(Permission.INDICATOR_VALUE_VIEW_VERIFIED)).toBe(true);
    // From ANALYST (not in VIEWER)
    expect(perms.has(Permission.INDICATOR_VALUE_ENTER)).toBe(true);
    expect(perms.has(Permission.CASE_EXPORT_AGGREGATE)).toBe(true);
  });

  it('returns empty set for empty roles array', () => {
    expect(effectivePermissions([]).size).toBe(0);
  });

  it('single SUPER_ADMIN role produces all permissions', () => {
    const perms = effectivePermissions([Role.SUPER_ADMIN]);
    const allPerms = Object.values(Permission);
    expect(perms.size).toBe(allPerms.length);
  });

  it('is idempotent — duplicate roles do not duplicate permissions', () => {
    const single = effectivePermissions([Role.CASE_WORKER]);
    const doubled = effectivePermissions([Role.CASE_WORKER, Role.CASE_WORKER]);
    expect(single.size).toBe(doubled.size);
  });
});
