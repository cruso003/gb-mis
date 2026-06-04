import { SetMetadata } from '@nestjs/common';

export const REQUIRE_MFA_KEY = 'requireMfa';

export interface RequireMfaOptions {
  /**
   * Maximum age in seconds since the user's most recent MFA factor.
   * Default 15 minutes — sensitive actions require a recent MFA
   * proof, not a months-old one persisted via a long-lived session.
   * Set to a smaller window (e.g. 300 = 5 minutes) for the most
   * sensitive actions: cross-scope supervisor override, role grants,
   * key rotation, audit-log export.
   */
  maxAgeSeconds?: number;
}

/**
 * Marks an endpoint as requiring step-up MFA — the actor must have
 * an MFA-satisfied session AND a recent MFA proof, regardless of role.
 *
 * Per SECURITY.md § Session management: re-authentication is required
 * for changing another user's role, exporting PII, accessing a case
 * outside one's org-unit scope via a supervisor override.
 *
 * The MfaGuard reads this metadata and enforces the check. Endpoints
 * without the decorator are unaffected.
 */
export const RequireMfa = (options: RequireMfaOptions = {}): MethodDecorator =>
  SetMetadata(REQUIRE_MFA_KEY, { maxAgeSeconds: options.maxAgeSeconds ?? 900 });
