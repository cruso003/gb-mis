import type { Role } from '@gb-mis/types';

export interface KeycloakTokenPayload {
  sub: string;
  email?: string;
  preferred_username?: string;
  name?: string;
  realm_access?: {
    roles: string[];
  };
  resource_access?: Record<string, { roles: string[] }>;
  iat: number;
  exp: number;
  iss: string;
}

export interface ParsedJwtUser {
  keycloakSubject: string;
  email: string | undefined;
  displayName: string | undefined;
  roles: Role[];
}

const VALID_ROLES = new Set<string>([
  'SUPER_ADMIN',
  'ADMIN',
  'SUPERVISOR',
  'CASE_WORKER',
  'DATA_ENTRY_CLERK',
  'ANALYST',
  'VIEWER',
]);

/**
 * Extracts GB MIS roles from a Keycloak JWT.
 * Roles are configured as realm roles in Keycloak.
 */
export function extractRolesFromToken(payload: KeycloakTokenPayload): Role[] {
  const realmRoles = payload.realm_access?.roles ?? [];
  return realmRoles.filter((r) => VALID_ROLES.has(r)) as Role[];
}

export function parseKeycloakToken(payload: KeycloakTokenPayload): ParsedJwtUser {
  return {
    keycloakSubject: payload.sub,
    email: payload.email,
    displayName: payload.name ?? payload.preferred_username,
    roles: extractRolesFromToken(payload),
  };
}

export function buildKeycloakIssuerUrl(baseUrl: string, realm: string): string {
  return `${baseUrl}/realms/${realm}`;
}

export function buildJwksUri(baseUrl: string, realm: string): string {
  return `${baseUrl}/realms/${realm}/protocol/openid-connect/certs`;
}
