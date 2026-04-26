import { prisma } from '@gb-mis/db';
import { INDICATOR_CATALOG } from '@gb-mis/indicators';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';

/**
 * Public endpoints — no authentication required.
 * Returns only VERIFIED indicator values. Never exposes case or beneficiary PII.
 * Rate-limited at the nginx/infra layer (not here).
 */
@ApiTags('public')
@Controller('public')
export class PublicController {
  @Get('indicators')
  @Public()
  @ApiOperation({
    summary: 'Verified indicator values for the public dashboard (no auth required)',
  })
  async publicIndicators(@Query('county') county?: string) {
    const where: Record<string, unknown> = { qualityFlag: 'VERIFIED' };
    if (county) where['orgUnit'] = { code: county };

    const values = await prisma.indicatorValue.findMany({
      where,
      include: {
        indicator: {
          select: {
            code: true,
            name: true,
            unit: true,
            framework: true,
            area: true,
          },
        },
        orgUnit: {
          select: { code: true, name: true },
        },
      },
      orderBy: [{ indicator: { code: 'asc' } }, { periodStart: 'desc' }],
      take: 500,
    });

    // Group by indicator code; sdgTarget comes from the TS catalog, not the DB.
    const grouped = new Map<string, typeof values>();
    for (const v of values) {
      const key = v.indicator.code;
      const existing = grouped.get(key) ?? [];
      existing.push(v);
      grouped.set(key, existing);
    }

    return {
      indicators: [...grouped.entries()].map(([code, entries]) => {
        const meta = INDICATOR_CATALOG.get(code);
        const first = entries[0];
        return {
          code,
          name: first?.indicator.name ?? '',
          unit: first?.indicator.unit ?? '',
          framework: first?.indicator.framework ?? '',
          area: first?.indicator.area ?? '',
          sdgTarget: meta?.sdgTarget ?? null,
          notes: meta?.notes ?? null,
          values: entries.map((e) => ({
            county: e.orgUnit.name,
            countyCode: e.orgUnit.code,
            value: Number(e.value),
            periodStart: e.periodStart,
            periodEnd: e.periodEnd,
            disaggregations: e.disaggregations,
          })),
        };
      }),
      generatedAt: new Date().toISOString(),
      note: 'Only VERIFIED indicators are published here.',
    };
  }

  @Get('counties')
  @Public()
  @ApiOperation({ summary: 'List LWEP counties with their codes (no auth required)' })
  async publicCounties() {
    const counties = await prisma.orgUnit.findMany({
      where: { level: 'COUNTY' },
      select: { id: true, code: true, name: true, shortName: true },
      orderBy: { name: 'asc' },
    });
    return { counties };
  }
}
