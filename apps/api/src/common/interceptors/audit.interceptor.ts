import { randomUUID } from 'crypto';

import { prisma } from '@gb-mis/db';
import type { AuditAction } from '@gb-mis/types';
import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor} from '@nestjs/common';
import {
  Injectable
} from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import type { Observable} from 'rxjs';
import { tap } from 'rxjs';

import type { AuthenticatedUser } from '../types/authenticated-user';

export const AUDIT_ACTION_KEY = 'auditAction';
export const AUDIT_RESOURCE_KEY = 'auditResource';

export const AuditEvent = (action: AuditAction, resource: string): MethodDecorator =>
  (target, key, descriptor) => {
    Reflect.defineMetadata(AUDIT_ACTION_KEY, action, (descriptor as PropertyDescriptor).value as object);
    Reflect.defineMetadata(AUDIT_RESOURCE_KEY, resource, (descriptor as PropertyDescriptor).value as object);
    return descriptor;
  };

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.get<AuditAction | undefined>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );
    const resource = this.reflector.get<string | undefined>(
      AUDIT_RESOURCE_KEY,
      context.getHandler(),
    );

    if (!action || !resource) return next.handle();

    const req = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: AuthenticatedUser; params: Record<string, string> }>();

    const user = req.user;
    const resourceId = req.params['id'] ?? null;
    const requestId = randomUUID();

    return next.handle().pipe(
      tap({
        next: async () => {
          if (!user) return;
          await this.emit({
            actorUserId: user.id,
            action,
            entityType: resource,
            entityId: resourceId,
            actorIp: req.ip,
            requestId,
            success: true,
          });
        },
        error: async () => {
          if (!user) return;
          await this.emit({
            actorUserId: user.id,
            action,
            entityType: resource,
            entityId: resourceId,
            actorIp: req.ip,
            requestId,
            success: false,
          });
        },
      }),
    );
  }

  private async emit(data: {
    actorUserId: string;
    action: AuditAction;
    entityType: string;
    entityId: string | null;
    actorIp: string | undefined;
    requestId: string;
    success: boolean;
  }): Promise<void> {
    try {
      await prisma.auditEvent.create({
        data: {
          actorUserId: data.actorUserId,
          action: data.action,
          entityType: data.entityType,
          ...(data.entityId !== null && { entityId: data.entityId }),
          actorIp: data.actorIp ?? null,
          requestId: data.requestId,
          success: data.success,
        },
      });
    } catch {
      // Audit failures must never crash the request — log and continue.
    }
  }
}
