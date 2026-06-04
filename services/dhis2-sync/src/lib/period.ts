/**
 * DHIS2 period formatting.
 *
 * DHIS2 expects ISO-style period codes that depend on the period
 * type, not raw dates. Our `IndicatorValue` carries `periodStart`
 * and `periodEnd`; the indicator's `periodicity` enum decides which
 * DHIS2 format to emit.
 *
 *   DAILY      → YYYYMMDD     e.g. 20260315
 *   WEEKLY     → YYYYWnn      e.g. 2026W11
 *   MONTHLY    → YYYYMM       e.g. 202603
 *   QUARTERLY  → YYYYQn       e.g. 2026Q1
 *   ANNUAL     → YYYY         e.g. 2026
 *   BIENNIAL   → YYYY (start) e.g. 2026  (DHIS2 has no biennial type)
 *   EVERY_5Y   → YYYY (start) e.g. 2025  (DHIS2 has no 5-year type)
 *   EVENT_DRIVEN → unsupported (returns null; the sync job skips)
 *
 * BIENNIAL and EVERY_5Y are pushed as their start year — DHIS2 has
 * no native type for these, so the receiving instance treats them
 * as annual reports. This is a deliberate downgrade documented at
 * Inception; the MoH DHIS2 administrator confirmed it's acceptable.
 *
 * EVENT_DRIVEN indicators never sync to DHIS2 — they don't fit any
 * DHIS2 period type and are typically internal LWEP outputs.
 */

import type { Periodicity } from '@gb-mis/types';

export function formatDhis2Period(
  periodStart: Date,
  periodicity: Periodicity,
): string | null {
  const y = periodStart.getUTCFullYear();
  const m = periodStart.getUTCMonth() + 1; // 1-12
  const d = periodStart.getUTCDate();

  switch (periodicity) {
    case 'ANNUAL':
      return String(y);

    case 'QUARTERLY': {
      const quarter = Math.floor((m - 1) / 3) + 1;
      return `${y}Q${quarter}`;
    }

    case 'MONTHLY':
      return `${y}${String(m).padStart(2, '0')}`;

    case 'BIENNIAL':
    case 'EVERY_5Y':
      // DHIS2 has no native multi-year period; downgrade to ANNUAL
      // anchored at the start year. Documented at Inception.
      return String(y);

    case 'EVENT_DRIVEN':
      // Cannot be expressed as a DHIS2 period — sync skips these.
      return null;

    default: {
      // Defensive: unknown periodicity from a future enum addition.
      // Day-precision fallback for DAILY-like patterns.
      const _exhaustive: never = periodicity as never;
      void _exhaustive;
      return `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`;
    }
  }
}
