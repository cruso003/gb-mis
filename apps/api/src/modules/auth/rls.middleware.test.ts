/**
 * RlsMiddleware tests.
 *
 * Verifies that the right RLS context lands in AsyncLocalStorage for
 * each role class. Per CLAUDE.md rule #11 RLS is defence in depth —
 * a wrong-role bypass would silently expose cross-county survivor
 * data, so this contract is locked in by tests.
 */

import { currentRlsContext, type RlsContext } from '@gb-mis/db';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { describe, expect, it } from 'vitest';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';

import { RlsMiddleware } from './rls.middleware';

function makeUser(overrides: Partial<AuthenticatedUser>): AuthenticatedUser {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    keycloakSubject: 'sub-1',
    displayName: 'Test User',
    roles: [],
    permissions: new Set(),
    orgUnitIds: [],
    countyIds: [],
    mfaSatisfied: true,
    authTime: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

function runMiddleware(user: AuthenticatedUser | undefined): RlsContext | undefined {
  const middleware = new RlsMiddleware();
  let observed: RlsContext | undefined;
  const req = { user } as unknown as FastifyRequest & { user?: AuthenticatedUser };
  const res = {} as unknown as FastifyReply;
  middleware.use(req, res, () => {
    observed = currentRlsContext();
  });
  return observed;
}

describe('RlsMiddleware', () => {
  it('does not push a context for an unauthenticated request', () => {
    expect(runMiddleware(undefined)).toBeUndefined();
  });

  it('SUPER_ADMIN gets bypassRls = true', () => {
    const ctx = runMiddleware(makeUser({ roles: ['SUPER_ADMIN'] as never }));
    expect(ctx).toEqual({
      userId: '00000000-0000-0000-0000-000000000001',
      bypassRls: true,
    });
  });

  it('ADMIN gets bypassRls = true', () => {
    const ctx = runMiddleware(makeUser({ roles: ['ADMIN'] as never }));
    expect(ctx?.bypassRls).toBe(true);
  });

  it('SUPERVISOR does NOT bypass — county-scoped reads still apply', () => {
    const ctx = runMiddleware(makeUser({ roles: ['SUPERVISOR'] as never }));
    expect(ctx?.bypassRls).toBe(false);
  });

  it('CASE_WORKER does NOT bypass', () => {
    const ctx = runMiddleware(makeUser({ roles: ['CASE_WORKER'] as never }));
    expect(ctx?.bypassRls).toBe(false);
  });

  it('ANALYST does NOT bypass — aggregates run inside the user scope', () => {
    // ANALYST can see aggregates, but the policy still filters at the row level;
    // analyst-level access to individual records is denied by the permission
    // registry, not by RLS bypass.
    const ctx = runMiddleware(makeUser({ roles: ['ANALYST'] as never }));
    expect(ctx?.bypassRls).toBe(false);
  });

  it('mixed roles bypass when ANY role is SUPER_ADMIN or ADMIN', () => {
    const ctx = runMiddleware(
      makeUser({ roles: ['CASE_WORKER', 'ADMIN'] as never }),
    );
    expect(ctx?.bypassRls).toBe(true);
  });

  it('VIEWER does NOT bypass', () => {
    const ctx = runMiddleware(makeUser({ roles: ['VIEWER'] as never }));
    expect(ctx?.bypassRls).toBe(false);
  });
});
