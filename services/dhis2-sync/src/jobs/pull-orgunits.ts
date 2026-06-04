import { prisma } from '@gb-mis/db';
import type { Job } from 'bullmq';

import type { Dhis2Client, Dhis2OrgUnit } from '../dhis2-client';

export interface PullOrgUnitsJobData {
  /**
   * DHIS2 level to pull. Liberia's WHO DHIS2 (per the Inception
   * confirmation) uses:
   *   1 = National
   *   2 = County
   *   3 = District
   *   4 = Facility
   *
   * The default pulls counties + districts since those are what we
   * need for indicator-value aggregation in apps/web.
   */
  levels?: number[];
  /**
   * Restrict the pull to a subtree rooted at this DHIS2 orgUnit UID.
   * Defaults to the Liberia root UID set via env (DHIS2_LIBERIA_ROOT_ID)
   * — without this filter we'd pull every country DHIS2 knows about.
   */
  rootParentId?: string;
}

export interface PullOrgUnitsResult {
  fetched: number;
  created: number;
  updated: number;
  skippedNoCode: number;
  skippedUnknownParent: number;
}

/**
 * Maps DHIS2 levels to our OrgUnitLevel enum. Conservative: anything
 * outside the documented mapping is treated as DISTRICT (the most
 * common operational level). The Inception report locks the actual
 * mapping; this default is the fallback.
 */
function mapDhis2LevelToOrgUnitLevel(level: number): 'NATIONAL' | 'COUNTY' | 'DISTRICT' | 'COMMUNITY' | 'FACILITY' {
  if (level === 1) return 'NATIONAL';
  if (level === 2) return 'COUNTY';
  if (level === 3) return 'DISTRICT';
  if (level === 4) return 'FACILITY';
  return 'COMMUNITY';
}

export async function pullOrgUnits(
  job: Job<PullOrgUnitsJobData>,
  client: Dhis2Client,
): Promise<PullOrgUnitsResult> {
  const levels = job.data.levels ?? [2, 3];
  const rootParentId =
    job.data.rootParentId ?? process.env['DHIS2_LIBERIA_ROOT_ID'] ?? undefined;

  // Collect all units across requested levels in one pass so we can
  // resolve parent FK pointers correctly even when a child's parent
  // belongs to a different DHIS2 level fetch.
  const fetched: Dhis2OrgUnit[] = [];
  for (const level of levels) {
    fetched.push(
      ...(await client.getOrganisationUnits({
        level,
        ...(rootParentId !== undefined && { parentId: rootParentId }),
      })),
    );
  }

  // Look up our internal parent IDs for each unit's DHIS2 parent.
  // We map by dhis2Id rather than `code` because DHIS2 codes are
  // optional in the metadata and not guaranteed unique across levels.
  const parentDhis2Ids = new Set<string>();
  for (const ou of fetched) if (ou.parent?.id) parentDhis2Ids.add(ou.parent.id);
  const parentRows = await prisma.orgUnit.findMany({
    where: { dhis2Id: { in: [...parentDhis2Ids] } },
    select: { id: true, dhis2Id: true },
  });
  const parentDhis2IdToInternal = new Map<string, string>(
    parentRows.map((r) => [r.dhis2Id!, r.id]),
  );

  const result: PullOrgUnitsResult = {
    fetched: fetched.length,
    created: 0,
    updated: 0,
    skippedNoCode: 0,
    skippedUnknownParent: 0,
  };

  for (const ou of fetched) {
    // `code` is our natural key in apps/web routing — DHIS2 entries
    // without a code can't be addressed in our UI, so we skip them
    // rather than synthesising one. Inception locks the convention
    // that DHIS2 metadata always carries a `code`.
    if (!ou.code) {
      result.skippedNoCode++;
      continue;
    }

    let parentInternalId: string | undefined;
    if (ou.parent?.id) {
      parentInternalId = parentDhis2IdToInternal.get(ou.parent.id);
      if (!parentInternalId && ou.level > 1) {
        // We tried to link a child to a parent we don't have yet —
        // either the levels[] ordering was wrong or the parent was
        // filtered out. Skip so we don't create orphans; the next run
        // (with the parent already present) will catch up.
        result.skippedUnknownParent++;
        continue;
      }
    }

    const ourLevel = mapDhis2LevelToOrgUnitLevel(ou.level);
    const existing = await prisma.orgUnit.findUnique({ where: { code: ou.code } });

    if (!existing) {
      await prisma.orgUnit.create({
        data: {
          code: ou.code,
          name: ou.name,
          shortName: ou.shortName ?? ou.name,
          level: ourLevel,
          dhis2Id: ou.id,
          ...(parentInternalId !== undefined && { parentId: parentInternalId }),
        },
      });
      result.created++;
    } else {
      // Only refresh DHIS2-owned fields. Never touch LWEP fields the
      // local ministry maintains (lwepCovered, custom shortName, etc.).
      await prisma.orgUnit.update({
        where: { id: existing.id },
        data: {
          name: ou.name,
          dhis2Id: ou.id,
          ...(parentInternalId !== undefined && { parentId: parentInternalId }),
        },
      });
      result.updated++;
    }
  }

  await job.updateProgress(result);
  return result;
}
