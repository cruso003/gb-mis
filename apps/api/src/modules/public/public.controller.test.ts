/**
 * Public controller contract tests.
 *
 * Public endpoints expose only VERIFIED indicator values and never
 * survivor PII. The public decorator must be applied to every public
 * route so the JwtAuthGuard skips it. These tests verify the contract
 * at the decorator/metadata level — full DB-backed integration tests
 * live in the e2e suite.
 */

import 'reflect-metadata';
import { describe, it, expect } from 'vitest';

import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

import { PublicController } from './public.controller';

describe('PublicController', () => {
  it('@Public() is applied to publicIndicators', () => {
    const handler = PublicController.prototype.publicIndicators;
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
  });

  it('@Public() is applied to publicCounties', () => {
    const handler = PublicController.prototype.publicCounties;
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
  });

  it('every method on PublicController must be marked @Public — defence in depth', () => {
    const proto = PublicController.prototype as unknown as Record<string, unknown>;
    const methodNames = Object.getOwnPropertyNames(proto).filter(
      (name) => name !== 'constructor' && typeof proto[name] === 'function',
    );
    expect(methodNames.length).toBeGreaterThan(0);
    for (const name of methodNames) {
      const handler = proto[name] as (...args: unknown[]) => unknown;
      expect(
        Reflect.getMetadata(IS_PUBLIC_KEY, handler),
        `PublicController.${name} is missing @Public() — would require auth, contradicting the controller's contract`,
      ).toBe(true);
    }
  });
});
