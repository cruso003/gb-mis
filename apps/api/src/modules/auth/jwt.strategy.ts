import { effectivePermissions, requiresMfa } from '@gb-mis/auth';
import { prisma } from '@gb-mis/db';
import type { Role } from '@gb-mis/types';
import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { mfaCheckCounter } from '../../observability/metrics';

interface KeycloakRealmAccess {
  roles?: string[];
}

interface KeycloakJwtPayload {
  sub: string;
  preferred_username?: string;
  name?: string;
  email?: string;
  /**
   * Authentication Context Class Reference (OIDC). Keycloak emits:
   *   "0" — no authentication
   *   "1" — password only
   *   "2" — MFA completed
   * Realms configured for higher levels of assurance may emit
   * `"level2"`, `"level3"`, etc. We accept any value other than
   * "0" / "1" as MFA-satisfied to stay flexible across realms.
   */
  acr?: string;
  /**
   * Unix-seconds timestamp of the most recent authentication factor.
   * Required for step-up policies that check the MFA proof is fresh
   * enough for a particular sensitive action.
   */
  auth_time?: number;
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

/**
 * Treats any `acr` value other than the no-auth and password-only
 * sentinels as MFA-completed. The OIDC spec leaves the value space
 * opaque to implementations; Keycloak uses {"0","1","2"} by default,
 * but configured realms may emit "level2" or similar.
 */
function isMfaAcr(acr: string | undefined): boolean {
  if (!acr) return false;
  return acr !== '0' && acr !== '1';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(@Inject(ConfigService) configService: ConfigService) {
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

    // ── MFA enforcement ────────────────────────────────────────────
    // Per SECURITY.md § Multi-factor authentication: SUPER_ADMIN,
    // ADMIN, ANALYST, SUPERVISOR must have MFA. We require both
    // sides of the proof — the persistent enrollment flag in the DB
    // AND a fresh MFA-completed acr claim in the token — so neither
    // Keycloak misconfiguration alone nor stale DB state alone can
    // let a sensitive role through without a current MFA factor.
    const mfaAcrPresent = isMfaAcr(payload.acr);
    const mfaSatisfied = user.mfaEnrolled && mfaAcrPresent;
    const mfaNeeded = requiresMfa(roles);

    if (mfaNeeded && !mfaSatisfied) {
      mfaCheckCounter.add(1, { outcome: 'denied' });
      const reason = !user.mfaEnrolled
        ? 'mfa_not_enrolled'
        : 'mfa_not_completed_in_session';
      this.logger.warn(
        `MFA enforcement denied access for user ${user.id} (roles=${roles.join(',')}): ${reason}`,
      );
      throw new UnauthorizedException({
        code: 'MFA_REQUIRED',
        reason,
        message:
          reason === 'mfa_not_enrolled'
            ? 'This account must enrol an MFA factor before signing in.'
            : 'Re-authenticate using your MFA factor to continue.',
      });
    }
    mfaCheckCounter.add(1, { outcome: mfaNeeded ? 'satisfied' : 'not_required' });

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
      mfaSatisfied,
      authTime: payload.auth_time ?? 0,
    };
  }
}
