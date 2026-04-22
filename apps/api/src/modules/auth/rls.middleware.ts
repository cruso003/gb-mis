import { Injectable, NestMiddleware } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '@gb-mis/db';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';

/**
 * Injects PostgreSQL session variables for RLS per request.
 * Must run after JwtAuthGuard so request.user is populated.
 *
 * The RLS policies rely on:
 *   app.current_user_id  — used by all county-scoped tables
 *   app.current_county_ids — comma-separated county codes for multi-county access
 */
@Injectable()
export class RlsMiddleware implements NestMiddleware {
  async use(
    req: FastifyRequest & { user?: AuthenticatedUser },
    _res: FastifyReply,
    next: () => void,
  ): Promise<void> {
    const user = req.user;
    if (user) {
      const countyList = user.countyIds.join(',');
      await prisma.$executeRawUnsafe(
        `SELECT set_config('app.current_user_id', $1, true),
                set_config('app.current_county_ids', $2, true)`,
        user.id,
        countyList,
      );
    }
    next();
  }
}
