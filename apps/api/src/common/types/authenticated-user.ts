import type { Permission, Role } from '@gb-mis/types';

export interface AuthenticatedUser {
  id: string;
  keycloakSubject: string;
  displayName: string;
  roles: Role[];
  permissions: Set<Permission>;
  orgUnitIds: string[];
  countyIds: string[];
}
