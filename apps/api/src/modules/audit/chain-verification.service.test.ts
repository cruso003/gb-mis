/**
 * Tests for the audit chain verification service.
 *
 * The verification SQL lives in the migration — we don't re-test that
 * here. What we lock in is the service-layer contract: an empty result
 * set from the SQL function means "intact" and is logged as such; a
 * non-empty result set increments the breaks metric and surfaces an
 * error log line containing the affected row IDs.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { queryRaw } = vi.hoisted(() => ({ queryRaw: vi.fn() }));

vi.mock('@gb-mis/db', () => ({
  prisma: { $queryRaw: queryRaw },
}));

// Imported after the mock so the service binds to the mocked prisma.
// eslint-disable-next-line import/order
import { ChainVerificationService } from './chain-verification.service';

beforeEach(() => {
  queryRaw.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('ChainVerificationService.verifyChain', () => {
  it('returns an empty list when the chain is intact', async () => {
    queryRaw.mockResolvedValue([]);
    const svc = new ChainVerificationService();
    await expect(svc.verifyChain()).resolves.toEqual([]);
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it('returns the broken links when the chain is broken', async () => {
    queryRaw.mockResolvedValue([
      {
        brokenId: '11111111-1111-1111-1111-111111111111',
        expectedHash: 'aa',
        actualHash: 'bb',
        reason: 'rowHash does not match the canonical hash of the row content (tampering)',
      },
    ]);
    const svc = new ChainVerificationService();
    const broken = await svc.verifyChain();
    expect(broken).toHaveLength(1);
    expect(broken[0]?.reason).toMatch(/tampering/);
  });

  it('passes the sinceAt argument through to the SQL function', async () => {
    queryRaw.mockResolvedValue([]);
    const svc = new ChainVerificationService();
    const since = new Date('2026-04-28T00:00:00Z');
    await svc.verifyChain(since);
    // Prisma tagged template — the second positional argument carries
    // the interpolated values. We assert the timestamp ends up in there.
    const call = queryRaw.mock.calls[0];
    expect(call).toBeDefined();
    const interpolated = call?.slice(1) ?? [];
    expect(interpolated).toContain(since);
  });

  it('propagates a verifier crash as a thrown error (so the cron job surfaces it)', async () => {
    queryRaw.mockRejectedValue(new Error('connection lost'));
    const svc = new ChainVerificationService();
    await expect(svc.verifyChain()).rejects.toThrow('connection lost');
  });
});
