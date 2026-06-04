import { prisma } from '@gb-mis/db';
import { getDhis2Mapping } from '@gb-mis/indicators';
import type { Job } from 'bullmq';

import type {
  Dhis2Client,
  Dhis2DataValue,
  Dhis2DataValueSetResponse,
} from '../dhis2-client';
import { formatDhis2Period } from '../lib/period';

/**
 * DHIS2's recommended dataValueSets payload size. Larger payloads
 * accumulate parse overhead on the receiving instance and risk
 * timeouts; smaller payloads inflate per-request fixed cost. 1000
 * is the value DHIS2's own bulk-import tooling uses by default.
 */
const BATCH_SIZE = 1000;

export interface PushIndicatorsJobData {
  /**
   * Pushes IndicatorValue rows whose periodStart falls within
   * [periodStart, periodEnd]. ISO 8601 strings; the BullMQ scheduler
   * computes a rolling window each cycle.
   */
  periodStart: string;
  periodEnd: string;
  /** Optional override; defaults to VERIFIED only. */
  qualityFlags?: ReadonlyArray<'VERIFIED' | 'PROVISIONAL'>;
}

export interface PushIndicatorsResult {
  /** Rows considered by the query. */
  scanned: number;
  /** Rows skipped because no DHIS2 mapping exists. */
  unmapped: number;
  /** Rows skipped because the period is not expressible in DHIS2. */
  periodSkipped: number;
  /** Rows skipped because the indicator's orgUnit has no dhis2Id. */
  orgUnitSkipped: number;
  /** Rows actually shipped to DHIS2. */
  pushed: number;
  /** Per-batch DHIS2 outcomes. */
  batches: BatchOutcome[];
  imported: number;
  updated: number;
  ignored: number;
  conflicts: number;
}

export interface BatchOutcome {
  count: number;
  status: Dhis2DataValueSetResponse['status'];
  importCount: Dhis2DataValueSetResponse['importCount'];
  conflicts?: Dhis2DataValueSetResponse['conflicts'];
}

export async function pushIndicators(
  job: Job<PushIndicatorsJobData>,
  client: Dhis2Client,
): Promise<PushIndicatorsResult> {
  const { periodStart, periodEnd, qualityFlags = ['VERIFIED'] } = job.data;

  const values = await prisma.indicatorValue.findMany({
    where: {
      periodStart: { gte: new Date(periodStart) },
      periodEnd: { lte: new Date(periodEnd) },
      qualityFlag: { in: [...qualityFlags] },
    },
    include: {
      indicator: {
        select: { code: true, dhis2DataElementId: true, periodicity: true },
      },
      orgUnit: { select: { dhis2Id: true } },
    },
  });

  const result: PushIndicatorsResult = {
    scanned: values.length,
    unmapped: 0,
    periodSkipped: 0,
    orgUnitSkipped: 0,
    pushed: 0,
    batches: [],
    imported: 0,
    updated: 0,
    ignored: 0,
    conflicts: 0,
  };

  const dataValues: Dhis2DataValue[] = [];
  for (const v of values) {
    const mapping = getDhis2Mapping(v.indicator.code);
    if (!mapping || !v.indicator.dhis2DataElementId) {
      result.unmapped++;
      continue;
    }
    const period = formatDhis2Period(v.periodStart, v.indicator.periodicity);
    if (!period) {
      result.periodSkipped++;
      continue;
    }
    // Prefer the row's orgUnit.dhis2Id (the GB MIS source-of-truth
    // mapping kept fresh by the pull job) over the mapping table's
    // hardcoded UID — the mapping is only fallback for national-level
    // indicators that don't carry an orgUnit.
    const orgUnitDhis2Id = v.orgUnit?.dhis2Id ?? mapping.dhis2OrgUnitId ?? null;
    if (!orgUnitDhis2Id) {
      result.orgUnitSkipped++;
      continue;
    }

    dataValues.push({
      dataElement: v.indicator.dhis2DataElementId,
      period,
      orgUnit: orgUnitDhis2Id,
      categoryOptionCombo: mapping.dhis2CategoryOptionComboId,
      value: stringifyValue(v.value),
      comment: `GB MIS export — quality: ${v.qualityFlag}`,
      storedBy: 'gb-mis-api',
    });
  }

  // Ship in batches so a single large quarterly export doesn't time out.
  for (let i = 0; i < dataValues.length; i += BATCH_SIZE) {
    const batch = dataValues.slice(i, i + BATCH_SIZE);
    const response = await client.postDataValueSet({ dataValues: batch });
    const outcome: BatchOutcome = {
      count: batch.length,
      status: response.status,
      importCount: response.importCount,
      ...(response.conflicts !== undefined && { conflicts: response.conflicts }),
    };
    result.batches.push(outcome);
    result.imported += response.importCount.imported;
    result.updated += response.importCount.updated;
    result.ignored += response.importCount.ignored;
    result.conflicts += response.conflicts?.length ?? 0;
    result.pushed += batch.length;

    await job.updateProgress({
      pushedSoFar: result.pushed,
      conflictsSoFar: result.conflicts,
    });
  }

  return result;
}

/**
 * Prisma stores indicator value as `Json` (could be a Decimal, number,
 * or object for disaggregated values). For now we collapse to a string
 * representation DHIS2 can cast. Disaggregated values are pushed as a
 * single comment-tagged string — the receiving instance is configured
 * to ignore unrecognised disaggregation payloads.
 */
function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
