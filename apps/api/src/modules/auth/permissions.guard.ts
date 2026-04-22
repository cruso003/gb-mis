import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import type { Permission } from '@gb-mis/types';

import { PERMISSIONS_KEY } from '../../common/decorators/require-permission.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[] | undefined>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user: AuthenticatedUser }>();

    const user = request.user;
    if (!user) {
      throw new ForbiddenException('No authenticated user on request');
    }

    const missing = required.filter((p) => !user.permissions.has(p));
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Insufficient permissions. Missing: ${missing.join(', ')}`,
      );
    }

    return true;
  }
}
