/**
 * DHIS2 period-format tests.
 *
 * Periods are wire-format strings DHIS2 parses on the receive side;
 * a wrong format produces an `ignored` import-count entry that's hard
 * to forensic later. Lock the format per periodicity here so a future
 * refactor can't silently break ANNUAL → YYYY → "2026" vs. "2026-01-01".
 */

import { describe, expect, it } from 'vitest';

import { formatDhis2Period } from './period';

describe('formatDhis2Period', () => {
  it('ANNUAL returns YYYY', () => {
    expect(formatDhis2Period(new Date('2026-03-15T00:00:00Z'), 'ANNUAL')).toBe('2026');
  });

  it('QUARTERLY returns YYYYQn for each quarter', () => {
    expect(formatDhis2Period(new Date('2026-01-15T00:00:00Z'), 'QUARTERLY')).toBe('2026Q1');
    expect(formatDhis2Period(new Date('2026-04-15T00:00:00Z'), 'QUARTERLY')).toBe('2026Q2');
    expect(formatDhis2Period(new Date('2026-07-15T00:00:00Z'), 'QUARTERLY')).toBe('2026Q3');
    expect(formatDhis2Period(new Date('2026-10-15T00:00:00Z'), 'QUARTERLY')).toBe('2026Q4');
  });

  it('QUARTERLY at the quarter boundary uses the starting quarter', () => {
    expect(formatDhis2Period(new Date('2026-03-31T23:59:00Z'), 'QUARTERLY')).toBe('2026Q1');
    expect(formatDhis2Period(new Date('2026-04-01T00:00:00Z'), 'QUARTERLY')).toBe('2026Q2');
  });

  it('MONTHLY returns YYYYMM with zero-padded month', () => {
    expect(formatDhis2Period(new Date('2026-01-15T00:00:00Z'), 'MONTHLY')).toBe('202601');
    expect(formatDhis2Period(new Date('2026-12-15T00:00:00Z'), 'MONTHLY')).toBe('202612');
  });

  it('BIENNIAL downgrades to ANNUAL at the start year', () => {
    // DHIS2 has no biennial type — documented at Inception.
    expect(formatDhis2Period(new Date('2026-06-15T00:00:00Z'), 'BIENNIAL')).toBe('2026');
  });

  it('EVERY_5Y downgrades to ANNUAL at the start year', () => {
    expect(formatDhis2Period(new Date('2025-01-15T00:00:00Z'), 'EVERY_5Y')).toBe('2025');
  });

  it('EVENT_DRIVEN returns null (no DHIS2 equivalent — skip)', () => {
    expect(formatDhis2Period(new Date('2026-03-15T00:00:00Z'), 'EVENT_DRIVEN')).toBeNull();
  });

  it('uses UTC date components (not local time) for cross-timezone determinism', () => {
    // 23:00 UTC on March 1 is still March 1 in UTC regardless of session timezone
    expect(formatDhis2Period(new Date('2026-03-01T23:00:00Z'), 'MONTHLY')).toBe('202603');
  });
});
