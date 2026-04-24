import { prisma } from '@gb-mis/db';
import { INDICATOR_CATALOG, computeIndicator } from '@gb-mis/indicators';
import type { IndicatorFramework } from '@gb-mis/types';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';

const K_ANONYMITY_THRESHOLD = 5;

@Injectable()
export class IndicatorsService {
  catalog() {
    return Array.from(INDICATOR_CATALOG.values());
  }

  async findValues(params: {
    indicatorCode?: string;
    orgUnitId?: string;
    framework?: IndicatorFramework;
    periodFrom?: string;
    periodTo?: string;
    page: number;
    limit: number;
  }) {
    const { indicatorCode, orgUnitId, framework, periodFrom, periodTo, page, limit } = params;

    const where: Record<string, unknown> = {};

    if (indicatorCode) {
      const ind = await prisma.indicator.findUnique({ where: { code: indicatorCode } });
      if (ind) where['indicatorId'] = ind.id;
    }

    if (orgUnitId) where['orgUnitId'] = orgUnitId;

    if (periodFrom || periodTo) {
      where['periodStart'] = {};
      if (periodFrom) (where['periodStart'] as Record<string, unknown>)['gte'] = new Date(periodFrom);
      if (periodTo) (where['periodStart'] as Record<string, unknown>)['lte'] = new Date(periodTo);
    }

    if (framework) {
      const codes = Array.from(INDICATOR_CATALOG.values())
        .filter((i) => i.framework === framework)
        .map((i) => i.code);
      const indicators = await prisma.indicator.findMany({ where: { code: { in: codes } } });
      where['indicatorId'] = { in: indicators.map((i) => i.id) };
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.indicatorValue.findMany({
        where,
        skip,
        take: limit,
        include: {
          indicator: { select: { code: true, name: true, unit: true } },
          orgUnit: { select: { code: true, name: true } },
        },
        orderBy: [{ periodStart: 'desc' }],
      }),
      prisma.indicatorValue.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async recordValue(
    dto: {
      indicatorCode: string;
      orgUnitId: string;
      periodStart: Date;
      periodEnd: Date;
      value: number;
      source: 'MANUAL_ENTRY';
      denominator?: number;
    },
    actor: AuthenticatedUser,
  ) {
    const ind = await prisma.indicator.findUnique({ where: { code: dto.indicatorCode } });
    if (!ind) throw new NotFoundException(`Indicator ${dto.indicatorCode} not in catalog`);

    if (dto.denominator !== undefined && dto.denominator < K_ANONYMITY_THRESHOLD) {
      throw new BadRequestException(
        `Denominator ${dto.denominator} is below the k-anonymity threshold of ${K_ANONYMITY_THRESHOLD}`,
      );
    }

    return prisma.indicatorValue.create({
      data: {
        indicatorId: ind.id,
        orgUnitId: dto.orgUnitId,
        periodStart: dto.periodStart,
        periodEnd: dto.periodEnd,
        value: dto.value,
        source: dto.source,
        qualityFlag: 'UNVERIFIED',
        enteredById: actor.id,
      },
    });
  }

  async computeAndSave(
    indicatorCode: string,
    inputs: Record<string, number>,
    orgUnitId: string,
    periodStart: Date,
    periodEnd: Date,
    actor: AuthenticatedUser,
  ) {
    const meta = INDICATOR_CATALOG.get(indicatorCode);
    if (!meta) throw new NotFoundException(`Indicator ${indicatorCode} not in catalog`);
    if (!meta.formula) throw new BadRequestException(`Indicator ${indicatorCode} has no formula (manual entry only)`);

    const value = computeIndicator(meta.formula, inputs);
    if (value === null) throw new BadRequestException('Insufficient inputs to compute indicator');

    return this.recordValue({ indicatorCode, orgUnitId, periodStart, periodEnd, value, source: 'MANUAL_ENTRY' }, actor);
  }

  async getTargets(indicatorCode: string) {
    const ind = await prisma.indicator.findUnique({ where: { code: indicatorCode } });
    if (!ind) return [];
    return prisma.indicatorTarget.findMany({
      where: { indicatorId: ind.id },
      orderBy: { targetYear: 'asc' },
    });
  }

  async setTarget(
    indicatorCode: string,
    year: number,
    target: number,
    orgUnitId: string | null,
    actor: AuthenticatedUser,
  ) {
    const meta = INDICATOR_CATALOG.get(indicatorCode);
    if (!meta) throw new NotFoundException(`Indicator ${indicatorCode} not in catalog`);

    const ind = await prisma.indicator.findUniqueOrThrow({ where: { code: indicatorCode } });

    return prisma.indicatorTarget.create({
      data: {
        indicatorId: ind.id,
        targetYear: year,
        targetValue: target,
        source: `set by ${actor.id}`,
        ...(orgUnitId !== null && { orgUnitId }),
      },
    });
  }
}
