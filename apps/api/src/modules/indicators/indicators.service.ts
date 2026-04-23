import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '@gb-mis/db';
import { INDICATOR_CATALOG, computeIndicator } from '@gb-mis/indicators';
import type { IndicatorFramework, Periodicity } from '@gb-mis/types';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';

const K_ANONYMITY_THRESHOLD = 5;

@Injectable()
export class IndicatorsService {
  catalog() {
    return Array.from(INDICATOR_CATALOG.values());
  }

  async findValues(params: {
    indicatorCode?: string;
    countyCode?: string;
    framework?: IndicatorFramework;
    periodFrom?: string;
    periodTo?: string;
    page: number;
    limit: number;
  }) {
    const { indicatorCode, countyCode, framework, periodFrom, periodTo, page, limit } = params;

    const where: Record<string, unknown> = {};
    if (indicatorCode) where['indicatorCode'] = indicatorCode;
    if (countyCode) where['countyCode'] = countyCode;
    if (periodFrom || periodTo) {
      where['period'] = {};
      if (periodFrom) (where['period'] as Record<string, unknown>)['gte'] = periodFrom;
      if (periodTo) (where['period'] as Record<string, unknown>)['lte'] = periodTo;
    }
    if (framework) {
      const codes = Array.from(INDICATOR_CATALOG.values())
        .filter((i) => i.framework === framework)
        .map((i) => i.code);
      where['indicatorCode'] = { in: codes };
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.indicatorValue.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ period: 'desc' }, { indicatorCode: 'asc' }],
      }),
      prisma.indicatorValue.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async recordValue(
    dto: {
      indicatorCode: string;
      countyCode: string | null;
      period: string;
      periodicity: Periodicity;
      value: number;
      numerator?: number;
      denominator?: number;
      disaggregation?: Record<string, string>;
    },
    actor: AuthenticatedUser,
  ) {
    const meta = INDICATOR_CATALOG.get(dto.indicatorCode);
    if (!meta) throw new NotFoundException(`Indicator ${dto.indicatorCode} not in catalog`);

    // k-anonymity guard for disaggregated counts
    if (dto.denominator !== undefined && dto.denominator < K_ANONYMITY_THRESHOLD) {
      throw new BadRequestException(
        `Denominator ${dto.denominator} is below the k-anonymity threshold of ${K_ANONYMITY_THRESHOLD}`,
      );
    }

    return prisma.indicatorValue.upsert({
      where: {
        indicatorCode_period_countyCode: {
          indicatorCode: dto.indicatorCode,
          period: dto.period,
          countyCode: dto.countyCode ?? 'NATIONAL',
        },
      },
      create: {
        indicatorCode: dto.indicatorCode,
        period: dto.period,
        periodicity: dto.periodicity,
        countyCode: dto.countyCode ?? 'NATIONAL',
        value: dto.value,
        numerator: dto.numerator,
        denominator: dto.denominator,
        disaggregation: dto.disaggregation,
        recordedById: actor.id,
      },
      update: {
        value: dto.value,
        numerator: dto.numerator,
        denominator: dto.denominator,
        disaggregation: dto.disaggregation,
        recordedById: actor.id,
        qualityFlag: 'REVISED',
      },
    });
  }

  async computeAndSave(
    indicatorCode: string,
    inputs: Record<string, number>,
    period: string,
    countyCode: string | null,
    actor: AuthenticatedUser,
  ) {
    const meta = INDICATOR_CATALOG.get(indicatorCode);
    if (!meta) throw new NotFoundException(`Indicator ${indicatorCode} not in catalog`);
    if (!meta.formula) throw new BadRequestException(`Indicator ${indicatorCode} has no formula (manual entry only)`);

    const value = computeIndicator(meta.formula, inputs);
    if (value === null) throw new BadRequestException('Insufficient inputs to compute indicator');

    return this.recordValue({
      indicatorCode,
      countyCode,
      period,
      periodicity: 'ANNUAL',
      value,
    }, actor);
  }

  async getTargets(indicatorCode: string) {
    return prisma.indicatorTarget.findMany({
      where: { indicatorCode },
      orderBy: { year: 'asc' },
    });
  }

  async setTarget(
    indicatorCode: string,
    year: number,
    target: number,
    countyCode: string | null,
    actor: AuthenticatedUser,
  ) {
    const meta = INDICATOR_CATALOG.get(indicatorCode);
    if (!meta) throw new NotFoundException(`Indicator ${indicatorCode} not in catalog`);

    return prisma.indicatorTarget.upsert({
      where: {
        indicatorCode_year_countyCode: {
          indicatorCode,
          year,
          countyCode: countyCode ?? 'NATIONAL',
        },
      },
      create: { indicatorCode, year, countyCode: countyCode ?? 'NATIONAL', target, setById: actor.id },
      update: { target, setById: actor.id },
    });
  }
}
