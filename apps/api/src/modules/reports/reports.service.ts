import { prisma } from '@gb-mis/db';
import { Injectable, BadRequestException } from '@nestjs/common';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';

const K_ANONYMITY_THRESHOLD = 5;

@Injectable()
export class ReportsService {
  /** Aggregate GBV case summary — k-anonymity enforced, no cell < 5. */
  async casesSummary(
    actor: AuthenticatedUser,
    params: { countyCode?: string; periodFrom?: string; periodTo?: string },
  ) {
    const { countyCode, periodFrom, periodTo } = params;

    const where: Record<string, unknown> = {};

    if (!actor.roles.includes('SUPER_ADMIN') && !actor.roles.includes('ADMIN')) {
      where['orgUnit'] = { countyCode: { in: actor.countyIds } };
    } else if (countyCode) {
      where['orgUnit'] = { countyCode };
    }

    if (periodFrom || periodTo) {
      where['createdAt'] = {};
      if (periodFrom) (where['createdAt'] as Record<string, unknown>)['gte'] = new Date(periodFrom);
      if (periodTo) (where['createdAt'] as Record<string, unknown>)['lte'] = new Date(periodTo);
    }

    const [total, byStatus, byViolenceType, byPriority] = await Promise.all([
      prisma.gbvCase.count({ where }),
      prisma.gbvCase.groupBy({ by: ['status'], where, _count: true }),
      prisma.gbvCase.groupBy({ by: ['primaryViolenceType'], where, _count: true }),
      prisma.gbvCase.groupBy({ by: ['priority'], where, _count: true }),
    ]);

    // Suppress cells below k-anonymity threshold
    const redact = <T extends { _count: number }>(rows: T[]) =>
      rows.map((r) => ({ ...r, _count: r._count < K_ANONYMITY_THRESHOLD ? null : r._count }));

    return {
      total: total < K_ANONYMITY_THRESHOLD ? null : total,
      byStatus: redact(byStatus),
      byViolenceType: redact(byViolenceType),
      byPriority: redact(byPriority),
    };
  }

  async beneficiarySummary(
    actor: AuthenticatedUser,
    params: { countyCode?: string },
  ) {
    const { countyCode } = params;

    const where: Record<string, unknown> = {};
    if (!actor.roles.includes('SUPER_ADMIN') && !actor.roles.includes('ADMIN')) {
      where['orgUnit'] = { countyCode: { in: actor.countyIds } };
    } else if (countyCode) {
      where['orgUnit'] = { countyCode };
    }

    const [total, bySex, byStatus, byDisability] = await Promise.all([
      prisma.beneficiary.count({ where }),
      prisma.beneficiary.groupBy({ by: ['sex'], where, _count: true }),
      prisma.beneficiary.groupBy({ by: ['status'], where, _count: true }),
      prisma.beneficiary.groupBy({ by: ['disabilityStatus'], where, _count: true }),
    ]);

    const redact = <T extends { _count: number }>(rows: T[]) =>
      rows.map((r) => ({ ...r, _count: r._count < K_ANONYMITY_THRESHOLD ? null : r._count }));

    return {
      total: total < K_ANONYMITY_THRESHOLD ? null : total,
      bySex: redact(bySex),
      byStatus: redact(byStatus),
      byDisability: redact(byDisability),
    };
  }

  async generateExport(type: 'indicators_csv' | 'cases_aggregate' | 'beneficiaries_aggregate', actor: AuthenticatedUser) {
    if (!actor.roles.includes('ADMIN') && !actor.roles.includes('SUPER_ADMIN') && !actor.roles.includes('ANALYST')) {
      throw new BadRequestException('Report export requires ADMIN or ANALYST role');
    }
    // Stub: enqueue BullMQ job, return job ID for polling
    return { jobId: `export-${Date.now()}`, type, status: 'queued', message: 'Export enqueued — poll /reports/exports/{jobId} for status' };
  }
}
