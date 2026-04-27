/**
 * AuditEvent decorator tests.
 *
 * Per CLAUDE.md rule #8 every mutating endpoint emits an audit event,
 * and per rule #9 every read of GbvCase or Beneficiary emits one too.
 * The mechanism is the `@AuditEvent(action, resource)` decorator that
 * the AuditInterceptor reads via the Reflector.
 *
 * These tests verify the decorator stores both keys correctly and
 * that the metadata round-trips through Reflect — without booting Nest.
 */

import 'reflect-metadata';
import { describe, it, expect } from 'vitest';

import { AUDIT_ACTION_KEY, AUDIT_RESOURCE_KEY, AuditEvent } from './audit.interceptor';

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
    // This is a contract test: every controller that handles GbvCase or
    // Beneficiary must apply @AuditEvent on its read paths too.
    // We assert the decorator accepts a READ action without complaint.
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
