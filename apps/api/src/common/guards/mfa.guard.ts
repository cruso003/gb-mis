import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';

import { mfaCheckCounter } from '../../observability/metrics';
import {
  REQUIRE_MFA_KEY,
  type RequireMfaOptions,
} from '../decorators/require-mfa.decorator';
import type { AuthenticatedUser } from '../types/authenticated-user';

/**
 * Step-up MFA guard. Enforces `@RequireMfa()`-marked endpoints:
 * the actor's session must be MFA-satisfied (via `JwtStrategy`)
 * AND the MFA proof must be no older than `maxAgeSeconds`.
 *
 * Returning UnauthorizedException with `code: 'STEP_UP_REQUIRED'`
 * lets the client redirect the user back through the MFA flow to
 * mint a fresh `auth_time`. The error is distinct from the
 * JwtStrategy's `MFA_REQUIRED` (no MFA at all) so the client can
 * surface the right UI.
 */
@Injectable()
export class MfaGuard implements CanActivate {
  private readonly logger = new Logger(MfaGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RequireMfaOptions | undefined>(
      REQUIRE_MFA_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!options) return true; // endpoint does not require step-up

    const req = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: AuthenticatedUser }>();
    const user = req.user;

    if (!user) {
      // Should be unreachable in practice — JwtAuthGuard runs first.
      throw new UnauthorizedException('Authentication required');
    }

    if (!user.mfaSatisfied) {
      mfaCheckCounter.add(1, { outcome: 'step_up_denied_no_mfa' });
      this.logger.warn(
        `Step-up denied: user ${user.id} reached an MFA-required endpoint with mfaSatisfied=false`,
      );
      throw new UnauthorizedException({
        code: 'STEP_UP_REQUIRED',
        reason: 'mfa_not_completed_in_session',
        message: 'Complete your MFA factor to perform this action.',
      });
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const ageSeconds = nowSeconds - user.authTime;
    const maxAge = options.maxAgeSeconds ?? 900;
    if (user.authTime === 0 || ageSeconds > maxAge) {
      mfaCheckCounter.add(1, { outcome: 'step_up_denied_stale' });
      this.logger.warn(
        `Step-up denied: user ${user.id} authTime is ${ageSeconds}s old, max ${maxAge}s`,
      );
      throw new UnauthorizedException({
        code: 'STEP_UP_REQUIRED',
        reason: 'mfa_proof_stale',
        message: `Re-authenticate to refresh your MFA proof (older than ${maxAge}s).`,
      });
    }

    mfaCheckCounter.add(1, { outcome: 'step_up_satisfied' });
    return true;
  }
}
