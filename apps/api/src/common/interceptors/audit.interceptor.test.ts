/**
 * AuditEvent decorator + AuditInterceptor tests.
 *
 * Per CLAUDE.md rule #8 every mutating endpoint emits an audit event,
 * and per rule #9 every read of GbvCase or Beneficiary emits one too.
 * The mechanism is the `@AuditEvent(action, resource)` decorator that
 * the AuditInterceptor reads via the Reflector.
 *
 * Per hardening-checklist H5 the interceptor is fail-closed: an emit
 * failure must propagate, never silently let an unaudited mutation
 * succeed.
 */

import 'reflect-metadata';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AUDIT_ACTION_KEY, AUDIT_RESOURCE_KEY, AuditEvent, AuditInterceptor } from './audit.interceptor';

const { auditCreate } = vi.hoisted(() => ({ auditCreate: vi.fn() }));

vi.mock('@gb-mis/db', () => ({
  prisma: {
    auditEvent: { create: auditCreate },
  },
}));

describe('@AuditEvent decorator', () => {
  it('attaches the action and resource to the method metadata', () => {
    class TestController {
      @AuditEvent('CASE_CREATE' as never, 'Case')
      createCase() {
        return 'ok';
      }
    }

    const fn = TestController.prototype.createCase;
    expect(Reflect.getMetadata(AUDIT_ACTION_KEY, fn)).toBe('CASE_CREATE');
    expect(Reflect.getMetadata(AUDIT_RESOURCE_KEY, fn)).toBe('Case');
  });

  it('does not affect methods that are not decorated', () => {
    class TestController {
      undecoratedRead() {
        return 'ok';
      }
    }

    const fn = TestController.prototype.undecoratedRead;
    expect(Reflect.getMetadata(AUDIT_ACTION_KEY, fn)).toBeUndefined();
    expect(Reflect.getMetadata(AUDIT_RESOURCE_KEY, fn)).toBeUndefined();
  });

  it('survivor-sensitive resources audit reads, not just writes', () => {
    class CaseController {
      @AuditEvent('CASE_READ' as never, 'GbvCase')
      findOne() {
        return 'ok';
      }
    }
    const fn = CaseController.prototype.findOne;
    expect(Reflect.getMetadata(AUDIT_ACTION_KEY, fn)).toBe('CASE_READ');
    expect(Reflect.getMetadata(AUDIT_RESOURCE_KEY, fn)).toBe('GbvCase');
  });
});

// ─── Fail-closed integration tests ──────────────────────────────────────────

function makeContext(action: string | undefined, resource: string | undefined) {
  const handler = (): unknown => undefined;
  if (action) Reflect.defineMetadata(AUDIT_ACTION_KEY, action, handler);
  if (resource) Reflect.defineMetadata(AUDIT_RESOURCE_KEY, resource, handler);

  return {
    getHandler: () => handler,
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'user-uuid', countyIds: [] },
        params: { id: 'entity-uuid' },
        ip: '127.0.0.1',
      }),
    }),
  } as unknown as ExecutionContext;
}

// Minimal Reflector stub — only the .get() method is exercised by the interceptor.
const reflector = {
  get: <T,>(key: string, target: object): T | undefined =>
    Reflect.getMetadata(key, target) as T | undefined,
};

describe('AuditInterceptor — fail-closed semantics', () => {
  beforeEach(() => {
    auditCreate.mockReset();
  });
  afterEach(() => {
    auditCreate.mockReset();
  });

  it('passes through endpoints without @AuditEvent unchanged', async () => {
    const interceptor = new AuditInterceptor(reflector as never);
    const ctx = makeContext(undefined, undefined);
    const handler: CallHandler = { handle: () => of('payload') };

    const result = await firstValueFrom(interceptor.intercept(ctx, handler));
    expect(result).toBe('payload');
    expect(auditCreate).not.toHaveBeenCalled();
  });

  it('emits a success audit and returns the response on the happy path', async () => {
    auditCreate.mockResolvedValue(undefined);
    const interceptor = new AuditInterceptor(reflector as never);
    const ctx = makeContext('CASE_CREATE', 'Case');
    const handler: CallHandler = { handle: () => of({ ok: true }) };

    const result = await firstValueFrom(interceptor.intercept(ctx, handler));
    expect(result).toEqual({ ok: true });
    expect(auditCreate).toHaveBeenCalledTimes(1);
    expect(auditCreate.mock.calls[0]?.[0].data.success).toBe(true);
  });

  it('FAIL-CLOSED: audit emit failure propagates, request fails (no silent unaudited mutation)', async () => {
    auditCreate.mockRejectedValue(new Error('audit_log table unavailable'));
    const interceptor = new AuditInterceptor(reflector as never);
    const ctx = makeContext('CASE_CREATE', 'Case');
    const handler: CallHandler = { handle: () => of({ ok: true }) };

    await expect(firstValueFrom(interceptor.intercept(ctx, handler))).rejects.toThrow(
      'audit_log table unavailable',
    );
    expect(auditCreate).toHaveBeenCalledTimes(1);
  });

  it('emits a failure audit even when the controller throws', async () => {
    auditCreate.mockResolvedValue(undefined);
    const interceptor = new AuditInterceptor(reflector as never);
    const ctx = makeContext('CASE_CREATE', 'Case');
    const controllerError = new Error('validation failed');
    const handler: CallHandler = { handle: () => throwError(() => controllerError) };

    await expect(firstValueFrom(interceptor.intercept(ctx, handler))).rejects.toThrow(
      'validation failed',
    );
    expect(auditCreate).toHaveBeenCalledTimes(1);
    expect(auditCreate.mock.calls[0]?.[0].data.success).toBe(false);
  });
});
