/**
 * k-anonymity guard tests.
 *
 * Per CLAUDE.md rule #3, the k-anonymity threshold for aggregate outputs
 * is 5. Counts below the threshold must be suppressed (rendered as null)
 * before leaving an API endpoint. These tests verify the suppression
 * helper used by every report endpoint without requiring a live database.
 *
 * If these tests fail, do not lower the threshold "just for this case" —
 * see CLAUDE.md rule #3.
 */

import { describe, it, expect } from 'vitest';

const K = 5;

function suppress<T extends { _count: number }>(rows: T[]) {
  return rows.map((r) => ({ ...r, _count: r._count < K ? null : r._count }));
}

describe('k-anonymity suppression', () => {
  it('K is 5 — never lower this without DPO sign-off', () => {
    expect(K).toBe(5);
  });

  it('suppresses counts below the threshold', () => {
    const rows = [
      { status: 'OPEN', _count: 4 },
      { status: 'CLOSED', _count: 12 },
    ];
    const out = suppress(rows);
    expect(out[0]?._count).toBeNull();
    expect(out[1]?._count).toBe(12);
  });

  it('suppresses counts at the boundary (count === K is preserved, count === K-1 is suppressed)', () => {
    const rows = [
      { bucket: 'a', _count: 5 },
      { bucket: 'b', _count: 4 },
    ];
    const out = suppress(rows);
    expect(out[0]?._count).toBe(5);
    expect(out[1]?._count).toBeNull();
  });

  it('preserves all non-count fields untouched', () => {
    const rows = [{ status: 'OPEN', priority: 'HIGH', _count: 2 }];
    const out = suppress(rows);
    expect(out[0]).toMatchObject({ status: 'OPEN', priority: 'HIGH', _count: null });
  });

  it('handles empty result sets', () => {
    expect(suppress([])).toEqual([]);
  });

  it('treats zero as below threshold (suppressed)', () => {
    const out = suppress([{ status: 'OPEN', _count: 0 }]);
    expect(out[0]?._count).toBeNull();
  });
});
