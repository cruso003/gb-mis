import { Role } from '@gb-mis/types';

/**
 * Roles for which multi-factor authentication is mandatory from first
 * login, per `SECURITY.md § Multi-factor authentication`. The TOR
 * separately requires MFA for administrators; SECURITY.md extends that
 * envelope to the analyst and supervisor roles as well, since both can
 * access survivor-identifying aggregates or supervisory data.
 *
 * Roles NOT in this set may opt into MFA — strongly encouraged for
 * CASE_WORKER and DATA_ENTRY_CLERK per the same section — but their
 * sessions are accepted without it.
 *
 * The enforcement happens in two places:
 *   1. Keycloak realm configuration requires MFA enrollment as a
 *      first-login action for these roles (`infra/keycloak/realm-export.json`).
 *   2. The API's JwtStrategy verifies on every request that the user's
 *      DB record has `mfaEnrolled = true` AND the access token carries
 *      a `acr` claim indicating an MFA-completed authentication.
 *
 * Defence in depth: Keycloak misconfiguration alone cannot grant
 * unauthenticated-MFA access to a sensitive role; the API enforces it
 * independently.
 */
export const MFA_REQUIRED_ROLES: ReadonlySet<Role> = new Set([
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.ANALYST,
  Role.SUPERVISOR,
]);

export function requiresMfa(roles: ReadonlyArray<Role>): boolean {
  return roles.some((r) => MFA_REQUIRED_ROLES.has(r));
}
