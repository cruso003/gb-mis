/**
 * MfaGuard step-up enforcement tests.
 *
 * Endpoints decorated with @RequireMfa() must reject requests where
 * the JWT is technically valid but either (a) the session never had
 * MFA, or (b) the MFA proof has aged past the action's maxAgeSeconds.
 *
 * SECURITY.md § Session management is the source: "Re-authentication
 * required for sensitive actions: changing another user's role,
 * exporting PII, accessing a case outside one's org-unit scope via a
 * supervisor override."
 */

import 'reflect-metadata';
import type { ExecutionContext } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { REQUIRE_MFA_KEY } from '../decorators/require-mfa.decorator';
import type { AuthenticatedUser } from '../types/authenticated-user';

import { MfaGuard } from './mfa.guard';

function makeReflector(metadata: unknown) {
  return {
    getAllAndOverride: () => metadata,
  } as never;
}

function makeContext(user: Partial<AuthenticatedUser> | undefined): ExecutionContext {
  return {
    getHandler: () => () => undefined,
    getClass: () => function noop() {},
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as never;
}

describe('MfaGuard', () => {
  it('permits any endpoint NOT decorated with @RequireMfa', () => {
    const guard = new MfaGuard(makeReflector(undefined));
    expect(
      guard.canActivate(
        makeContext({ mfaSatisfied: false, authTime: 0 } as AuthenticatedUser),
      ),
    ).toBe(true);
  });

  it('rejects when the session has no MFA at all', () => {
    const guard = new MfaGuard(makeReflector({ maxAgeSeconds: 300 }));
    expect(() =>
      guard.canActivate(
        makeContext({
          id: 'u',
          mfaSatisfied: false,
          authTime: Math.floor(Date.now() / 1000),
        } as AuthenticatedUser),
      ),
    ).toThrowError(UnauthorizedException);
  });

  it('permits when MFA is satisfied AND authTime is within maxAgeSeconds', () => {
    const guard = new MfaGuard(makeReflector({ maxAgeSeconds: 300 }));
    const now = Math.floor(Date.now() / 1000);
    expect(
      guard.canActivate(
        makeContext({
          id: 'u',
          mfaSatisfied: true,
          authTime: now - 60,
        } as AuthenticatedUser),
      ),
    ).toBe(true);
  });

  it('rejects when MFA is satisfied but the proof is older than maxAgeSeconds', () => {
    const guard = new MfaGuard(makeReflector({ maxAgeSeconds: 300 }));
    const now = Math.floor(Date.now() / 1000);
    let caught: UnauthorizedException | undefined;
    try {
      guard.canActivate(
        makeContext({
          id: 'u',
          mfaSatisfied: true,
          authTime: now - 1_000, // 1000s ago > 300s window
        } as AuthenticatedUser),
      );
    } catch (err) {
      caught = err as UnauthorizedException;
    }
    expect(caught).toBeInstanceOf(UnauthorizedException);
    const body = caught?.getResponse() as { code?: string; reason?: string };
    expect(body.code).toBe('STEP_UP_REQUIRED');
    expect(body.reason).toBe('mfa_proof_stale');
  });

  it('rejects when authTime is 0 (no auth_time claim emitted)', () => {
    const guard = new MfaGuard(makeReflector({ maxAgeSeconds: 300 }));
    expect(() =>
      guard.canActivate(
        makeContext({
          id: 'u',
          mfaSatisfied: true,
          authTime: 0,
        } as AuthenticatedUser),
      ),
    ).toThrowError(UnauthorizedException);
  });

  it('defaults maxAgeSeconds to 900 when not specified', () => {
    const guard = new MfaGuard(makeReflector({}));
    const now = Math.floor(Date.now() / 1000);
    // 800s old is within the 900s default
    expect(
      guard.canActivate(
        makeContext({
          id: 'u',
          mfaSatisfied: true,
          authTime: now - 800,
        } as AuthenticatedUser),
      ),
    ).toBe(true);
    // 1000s old exceeds the default
    expect(() =>
      guard.canActivate(
        makeContext({
          id: 'u',
          mfaSatisfied: true,
          authTime: now - 1_000,
        } as AuthenticatedUser),
      ),
    ).toThrowError(UnauthorizedException);
  });

  // Sanity check the decorator's metadata key is what we use.
  it('reads the REQUIRE_MFA_KEY from the reflector', () => {
    expect(REQUIRE_MFA_KEY).toBe('requireMfa');
  });
});
