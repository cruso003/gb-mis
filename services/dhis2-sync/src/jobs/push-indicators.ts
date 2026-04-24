import { prisma } from '@gb-mis/db';
import { getDhis2Mapping } from '@gb-mis/indicators';
import type { Job } from 'bullmq';

import { dhis2Client } from '../dhis2-client';

export interface PushIndicatorsJobData {
  periodStart: string;
  periodEnd: string;
}

export async function pushIndicators(job: Job<PushIndicatorsJobData>): Promise<void> {
  const { periodStart, periodEnd } = job.data;

  const values = await prisma.indicatorValue.findMany({
    where: {
      periodStart: { gte: new Date(periodStart) },
      periodEnd: { lte: new Date(periodEnd) },
      qualityFlag: { in: ['VERIFIED', 'PROVISIONAL'] },
    },
    include: {
      indicator: { select: { code: true, dhis2DataElementId: true } },
    },
  });

  if (values.length === 0) {
    return;
  }

  type DataValue = { dataElement: string; period: string; orgUnit: string; value: string; comment: string };

  const dataValues = values
    .map((v): DataValue | null => {
      if (!v.indicator.dhis2DataElementId) return null;
      const mapping = getDhis2Mapping(v.indicator.code);
      const periodStr = v.periodStart.toISOString().slice(0, 7).replace('-', '');
      return {
        dataElement: v.indicator.dhis2DataElementId,
        period: periodStr,
        orgUnit: mapping?.dhis2OrgUnitId ?? '',
        value: String(v.value),
        comment: `GB MIS export — quality: ${v.qualityFlag}`,
      };
    })
    .filter((item): item is DataValue => item !== null && item.orgUnit !== '');

  if (dataValues.length === 0) {
    return;
  }

  const result = await dhis2Client.postDataValueSet({ dataValues });
  await job.updateProgress({ pushed: dataValues.length, importCount: result.importCount });
}
