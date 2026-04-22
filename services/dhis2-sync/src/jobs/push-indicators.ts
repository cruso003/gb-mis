import { Job } from 'bullmq';
import { prisma } from '@gb-mis/db';
import { getDhis2SyncableIndicators, getDhis2Mapping } from '@gb-mis/indicators';
import { dhis2Client } from '../dhis2-client';

export interface PushIndicatorsJobData {
  period: string;
}

export async function pushIndicators(job: Job<PushIndicatorsJobData>): Promise<void> {
  const { period } = job.data;

  const syncableIndicators = getDhis2SyncableIndicators();
  if (syncableIndicators.length === 0) {
    return;
  }

  const indicatorCodes = syncableIndicators.map((i) => i.code);

  const values = await prisma.indicatorValue.findMany({
    where: {
      indicatorCode: { in: indicatorCodes },
      period,
      qualityFlag: { in: ['OFFICIAL', 'PRELIMINARY'] },
    },
  });

  if (values.length === 0) {
    return;
  }

  const dataValues = values
    .map((v) => {
      const mapping = getDhis2Mapping(v.indicatorCode);
      if (!mapping) return null;

      return {
        dataElement: mapping.dhis2DataElementId,
        period: v.period.replace('-', ''),
        orgUnit: mapping.dhis2OrgUnitMap[v.countyCode ?? 'NATIONAL'] ?? mapping.dhis2OrgUnitMap['NATIONAL'] ?? '',
        value: String(v.value),
        comment: `GB MIS export — quality: ${v.qualityFlag}`,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null && v.orgUnit !== '');

  if (dataValues.length === 0) {
    return;
  }

  const result = await dhis2Client.postDataValueSet({ dataValues });
  await job.updateProgress({ pushed: dataValues.length, importCount: result.importCount });
}
