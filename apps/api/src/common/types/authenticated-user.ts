import type { Permission, Role } from '@gb-mis/types';

export interface AuthenticatedUser {
  id: string;
  keycloakSubject: string;
  displayName: string;
  roles: Role[];
  permissions: Set<Permission>;
  orgUnitIds: string[];
  countyIds: string[];
  /**
   * True when (a) the user's DB record has `mfaEnrolled = true` AND
   * (b) the access token carries an MFA-completed acr claim. Step-up
   * guards read this; the JwtStrategy refuses tokens that should have
   * MFA but don't.
   */
  mfaSatisfied: boolean;
  /**
   * Unix-seconds timestamp of the most recent authentication factor
   * (from the JWT `auth_time` claim). Used by step-up guards to refuse
   * action when the MFA proof is stale relative to the action's policy.
   */
  authTime: number;
}
