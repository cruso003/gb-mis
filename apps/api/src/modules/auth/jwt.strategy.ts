import { effectivePermissions } from '@gb-mis/auth';
import { prisma } from '@gb-mis/db';
import type { Role } from '@gb-mis/types';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';

interface KeycloakRealmAccess {
  roles?: string[];
}

interface KeycloakJwtPayload {
  sub: string;
  preferred_username?: string;
  name?: string;
  email?: string;
  realm_access?: KeycloakRealmAccess;
  resource_access?: Record<string, KeycloakRealmAccess>;
}

const GB_MIS_ROLES = new Set<string>([
  'SUPER_ADMIN',
  'ADMIN',
  'SUPERVISOR',
  'CASE_WORKER',
  'DATA_ENTRY_CLERK',
  'ANALYST',
  'VIEWER',
]);

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    const keycloakUrl = configService.getOrThrow<string>('KEYCLOAK_URL');
    const realm = configService.getOrThrow<string>('KEYCLOAK_REALM');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri: `${keycloakUrl}/realms/${realm}/protocol/openid-connect/certs`,
      }),
      algorithms: ['RS256'],
    });
  }

  async validate(payload: KeycloakJwtPayload): Promise<AuthenticatedUser> {
    const sub = payload.sub;
    if (!sub) {
      throw new UnauthorizedException('Invalid token: missing subject');
    }

    const realmRoles = payload.realm_access?.roles ?? [];
    const roles = realmRoles.filter((r): r is Role => GB_MIS_ROLES.has(r)) as Role[];

    if (roles.length === 0) {
      throw new UnauthorizedException('Token carries no recognised GB MIS role');
    }

    const user = await prisma.user.findUnique({
      where: { keycloakSubject: sub },
      include: {
        orgUnitScopes: { select: { orgUnitId: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User account not found or has been deactivated');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(`Account is ${user.status.toLowerCase()}`);
    }

    const permissions = effectivePermissions(roles);
    const orgUnitIds = user.orgUnitScopes.map((s) => s.orgUnitId);

    return {
      id: user.id,
      keycloakSubject: sub,
      displayName: user.displayName,
      roles,
      permissions,
      orgUnitIds,
      countyIds: orgUnitIds,
    };
  }
}
