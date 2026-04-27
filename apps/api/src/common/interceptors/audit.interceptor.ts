import { randomUUID } from 'crypto';

import { prisma } from '@gb-mis/db';
import type { AuditAction } from '@gb-mis/types';
import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor} from '@nestjs/common';
import {
  Injectable, Logger
} from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { Observable } from 'rxjs';

import type { AuthenticatedUser } from '../types/authenticated-user';

export const AUDIT_ACTION_KEY = 'auditAction';
export const AUDIT_RESOURCE_KEY = 'auditResource';

export const AuditEvent = (action: AuditAction, resource: string): MethodDecorator =>
  (target, key, descriptor) => {
    Reflect.defineMetadata(AUDIT_ACTION_KEY, action, (descriptor as PropertyDescriptor).value as object);
    Reflect.defineMetadata(AUDIT_RESOURCE_KEY, resource, (descriptor as PropertyDescriptor).value as object);
    return descriptor;
  };

/**
 * Audit interceptor — emits an AuditEvent before the response is returned.
 *
 * Closes hardening-checklist H5. Per CLAUDE.md rule #8 ("every mutating
 * endpoint emits an audit event. No exceptions.") the emission is
 * fail-closed: if the database insert into audit_log fails, the request
 * itself fails with 500. A mutation that succeeds without being audited
 * is a worse outcome than a request the client retries.
 *
 * The previous version used `tap` (non-blocking) and swallowed the catch
 * silently — both are now fixed.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

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

    // Subscribe to the upstream once so the success and failure paths each
    // have a single audit attempt — using mergeMap + catchError would route
    // a thrown audit error from the success path back into catchError and
    // emit twice. That's both wrong (two audit rows for one request) and
    // misleading (the second row would record success=false against an
    // operation whose only failure was the audit itself).
    return new Observable<unknown>((subscriber) => {
      const upstream = next.handle().subscribe({
        next: (response) => {
          if (!user) {
            subscriber.next(response);
            subscriber.complete();
            return;
          }
          this.emit({
            actorUserId: user.id,
            action,
            entityType: resource,
            entityId: resourceId,
            actorIp: req.ip,
            requestId,
            success: true,
          })
            .then(() => {
              subscriber.next(response);
              subscriber.complete();
            })
            .catch((auditErr: unknown) => {
              // Fail-closed: surface the audit error to the client. The
              // controller's mutation must already be committed by the
              // time we get here; rolling back is out of the interceptor's
              // reach. The 500 prompts the operator to investigate.
              subscriber.error(auditErr);
            });
        },
        error: (err: unknown) => {
          if (!user) {
            subscriber.error(err);
            return;
          }
          this.emit({
            actorUserId: user.id,
            action,
            entityType: resource,
            entityId: resourceId,
            actorIp: req.ip,
            requestId,
            success: false,
          })
            .catch((auditErr: unknown) => {
              // Best-effort on the failure path. Don't mask the original
              // controller error — that's the more useful signal for the
              // client and the on-call.
              this.logger.error(
                `Failure-path audit emission failed; propagating the original controller error`,
                auditErr instanceof Error ? auditErr.stack : String(auditErr),
              );
            })
            .finally(() => subscriber.error(err));
        },
      });

      return () => upstream.unsubscribe();
    });
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
    // Fail-closed: any database error here propagates. The caller's request
    // returns 500 with a clear log line. Operationally this requires the
    // audit_log table to be available; that's exactly the point — a system
    // that can't audit must not accept survivor-data mutations.
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
    } catch (err) {
      this.logger.error(
        `Audit emission failed for ${data.action} on ${data.entityType}${
          data.entityId ? ` (${data.entityId})` : ''
        } by ${data.actorUserId} — failing the request closed`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }
}
