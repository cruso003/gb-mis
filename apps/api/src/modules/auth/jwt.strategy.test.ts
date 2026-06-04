/**
 * JwtStrategy MFA-enforcement tests.
 *
 * SECURITY.md § Multi-factor authentication requires MFA for
 * SUPER_ADMIN, ADMIN, ANALYST, SUPERVISOR. The strategy must reject
 * tokens that should have MFA but don't — both at the persistent
 * level (user.mfaEnrolled = false) and at the session level (the
 * token's acr claim isn't MFA-completed).
 *
 * We don't exercise the Passport machinery here — we instantiate the
 * strategy and call validate() directly with a synthetic payload.
 */

import { UnauthorizedException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { userFindUnique } = vi.hoisted(() => ({ userFindUnique: vi.fn() }));

vi.mock('@gb-mis/db', () => ({
  prisma: { user: { findUnique: userFindUnique } },
}));

// Stub ConfigService to satisfy the constructor without booting Nest.
class StubConfigService {
  getOrThrow(key: string): string {
    if (key === 'KEYCLOAK_URL') return 'http://localhost:8080';
    if (key === 'KEYCLOAK_REALM') return 'gb-mis';
    return '';
  }
}

// Imported after the prisma mock so the strategy binds to the mocked client.
// eslint-disable-next-line import/order
import { JwtStrategy } from './jwt.strategy';

function makePayload(overrides: Record<string, unknown> = {}) {
  return {
    sub: 'kc-sub-1',
    realm_access: { roles: ['CASE_WORKER'] },
    auth_time: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-uuid',
    keycloakSubject: 'kc-sub-1',
    displayName: 'Test User',
    status: 'ACTIVE',
    mfaEnrolled: true,
    orgUnitScopes: [],
    ...overrides,
  };
}

beforeEach(() => {
  userFindUnique.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('JwtStrategy.validate — non-MFA roles', () => {
  it('admits a CASE_WORKER with no MFA at all', async () => {
    userFindUnique.mockResolvedValue(makeUser({ mfaEnrolled: false }));
    const strategy = new JwtStrategy(new StubConfigService() as never);
    const user = await strategy.validate(
      makePayload({ realm_access: { roles: ['CASE_WORKER'] }, acr: '1' }),
    );
    expect(user.roles).toContain('CASE_WORKER');
    expect(user.mfaSatisfied).toBe(false);
  });

  it('admits a DATA_ENTRY_CLERK who has chosen to enrol MFA — mfaSatisfied=true', async () => {
    userFindUnique.mockResolvedValue(makeUser({ mfaEnrolled: true }));
    const strategy = new JwtStrategy(new StubConfigService() as never);
    const user = await strategy.validate(
      makePayload({ realm_access: { roles: ['DATA_ENTRY_CLERK'] }, acr: '2' }),
    );
    expect(user.mfaSatisfied).toBe(true);
  });
});

describe('JwtStrategy.validate — MFA-required roles', () => {
  it.each(['SUPER_ADMIN', 'ADMIN', 'ANALYST', 'SUPERVISOR'])(
    'rejects %s when mfaEnrolled = false',
    async (role) => {
      userFindUnique.mockResolvedValue(makeUser({ mfaEnrolled: false }));
      const strategy = new JwtStrategy(new StubConfigService() as never);
      await expect(
        strategy.validate(makePayload({ realm_access: { roles: [role] }, acr: '2' })),
      ).rejects.toThrow(UnauthorizedException);
    },
  );

  it('rejects ADMIN when acr indicates password-only session', async () => {
    userFindUnique.mockResolvedValue(makeUser({ mfaEnrolled: true }));
    const strategy = new JwtStrategy(new StubConfigService() as never);
    await expect(
      strategy.validate(makePayload({ realm_access: { roles: ['ADMIN'] }, acr: '1' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects SUPERVISOR when acr is missing entirely', async () => {
    userFindUnique.mockResolvedValue(makeUser({ mfaEnrolled: true }));
    const strategy = new JwtStrategy(new StubConfigService() as never);
    await expect(
      strategy.validate(makePayload({ realm_access: { roles: ['SUPERVISOR'] } })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('admits ADMIN when mfaEnrolled = true AND acr = "2"', async () => {
    userFindUnique.mockResolvedValue(makeUser({ mfaEnrolled: true }));
    const strategy = new JwtStrategy(new StubConfigService() as never);
    const user = await strategy.validate(
      makePayload({ realm_access: { roles: ['ADMIN'] }, acr: '2' }),
    );
    expect(user.mfaSatisfied).toBe(true);
    expect(user.roles).toEqual(['ADMIN']);
  });

  it('admits ADMIN with a realm-specific acr value like "level2"', async () => {
    userFindUnique.mockResolvedValue(makeUser({ mfaEnrolled: true }));
    const strategy = new JwtStrategy(new StubConfigService() as never);
    const user = await strategy.validate(
      makePayload({ realm_access: { roles: ['ADMIN'] }, acr: 'level2' }),
    );
    expect(user.mfaSatisfied).toBe(true);
  });

  it('populates authTime from the auth_time claim', async () => {
    userFindUnique.mockResolvedValue(makeUser({ mfaEnrolled: true }));
    const strategy = new JwtStrategy(new StubConfigService() as never);
    const now = Math.floor(Date.now() / 1000);
    const user = await strategy.validate(
      makePayload({ realm_access: { roles: ['ADMIN'] }, acr: '2', auth_time: now }),
    );
    expect(user.authTime).toBe(now);
  });
});

describe('JwtStrategy.validate — other rejections', () => {
  it('rejects when the user account is suspended', async () => {
    userFindUnique.mockResolvedValue(makeUser({ status: 'SUSPENDED' }));
    const strategy = new JwtStrategy(new StubConfigService() as never);
    await expect(strategy.validate(makePayload())).rejects.toThrow(UnauthorizedException);
  });

  it('rejects when no recognised role is on the token', async () => {
    userFindUnique.mockResolvedValue(makeUser());
    const strategy = new JwtStrategy(new StubConfigService() as never);
    await expect(
      strategy.validate(makePayload({ realm_access: { roles: ['random-realm-role'] } })),
    ).rejects.toThrow('no recognised GB MIS role');
  });
});
