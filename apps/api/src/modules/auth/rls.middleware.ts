import { rlsContextStore } from '@gb-mis/db';
import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';

const BYPASS_ROLES = new Set(['SUPER_ADMIN', 'ADMIN']);

/**
 * Pushes the authenticated user's identity into AsyncLocalStorage so
 * the Prisma extension in `@gb-mis/db` can emit `SET LOCAL` for the
 * RLS session variables on every query within this request.
 *
 * Must run after JwtAuthGuard so request.user is populated. Public
 * routes have no user — RLS-bearing tables are not reachable through
 * them by design.
 */
@Injectable()
export class RlsMiddleware implements NestMiddleware {
  use(
    req: FastifyRequest & { user?: AuthenticatedUser },
    _res: FastifyReply,
    next: () => void,
  ): void {
    const user = req.user;
    if (!user) {
      next();
      return;
    }

    const bypassRls = user.roles.some((r) => BYPASS_ROLES.has(r));
    rlsContextStore.run({ userId: user.id, bypassRls }, () => next());
  }
}
