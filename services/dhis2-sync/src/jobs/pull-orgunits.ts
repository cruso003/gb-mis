import type { Job } from 'bullmq';
import { prisma } from '@gb-mis/db';
import { dhis2Client } from '../dhis2-client';

export interface PullOrgUnitsJobData {
  level?: number;
}

export async function pullOrgUnits(job: Job<PullOrgUnitsJobData>): Promise<void> {
  const { level = 3 } = job.data;

  const { organisationUnits } = await dhis2Client.getOrgUnits({ level, fields: 'id,name,code,level,parent[id,code]' });

  let synced = 0;
  for (const ou of organisationUnits) {
    const code = (ou['code'] as string | undefined) ?? '';
    if (!code) continue;

    await prisma.orgUnit.upsert({
      where: { code },
      create: {
        code,
        name: (ou['name'] as string) ?? code,
        level: 'DISTRICT',
        dhis2Id: (ou['id'] as string) ?? null,
      },
      update: {
        name: (ou['name'] as string) ?? code,
        dhis2Id: (ou['id'] as string) ?? null,
      },
    });
    synced++;
  }

  await job.updateProgress({ synced });
}
