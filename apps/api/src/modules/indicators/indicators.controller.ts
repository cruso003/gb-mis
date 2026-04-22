import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { IndicatorFramework } from '@gb-mis/types';

import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { AuditEvent } from '../../common/interceptors/audit.interceptor';
import { IndicatorsService } from './indicators.service';

@ApiTags('indicators')
@Controller('indicators')
export class IndicatorsController {
  constructor(private readonly indicatorsService: IndicatorsService) {}

  @Get('catalog')
  @RequirePermission('indicators:read')
  @ApiOperation({ summary: 'Return the full indicator catalog metadata' })
  catalog() {
    return this.indicatorsService.catalog();
  }

  @Get('values')
  @RequirePermission('indicators:read')
  @ApiOperation({ summary: 'Query indicator values with filters' })
  findValues(
    @Query('indicatorCode') indicatorCode?: string,
    @Query('countyCode') countyCode?: string,
    @Query('framework') framework?: IndicatorFramework,
    @Query('periodFrom') periodFrom?: string,
    @Query('periodTo') periodTo?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.indicatorsService.findValues({
      indicatorCode,
      countyCode,
      framework,
      periodFrom,
      periodTo,
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Post('values')
  @RequirePermission('indicators:enter-data')
  @AuditEvent('CREATE', 'IndicatorValue')
  @ApiOperation({ summary: 'Manually record an indicator value' })
  recordValue(
    @Body()
    body: {
      indicatorCode: string;
      countyCode: string | null;
      period: string;
      periodicity: string;
      value: number;
      numerator?: number;
      denominator?: number;
      disaggregation?: Record<string, string>;
    },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.indicatorsService.recordValue(body as Parameters<IndicatorsService['recordValue']>[0], actor);
  }

  @Post(':code/compute')
  @RequirePermission('indicators:enter-data')
  @AuditEvent('CREATE', 'IndicatorValue')
  @ApiOperation({ summary: 'Compute an indicator from raw inputs and persist the result' })
  compute(
    @Param('code') code: string,
    @Body() body: { inputs: Record<string, number>; period: string; countyCode?: string },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.indicatorsService.computeAndSave(
      code,
      body.inputs,
      body.period,
      body.countyCode ?? null,
      actor,
    );
  }

  @Get(':code/targets')
  @RequirePermission('indicators:read')
  @ApiOperation({ summary: 'Get targets for an indicator' })
  getTargets(@Param('code') code: string) {
    return this.indicatorsService.getTargets(code);
  }

  @Post(':code/targets')
  @RequirePermission('indicators:set-targets')
  @AuditEvent('CREATE', 'IndicatorTarget')
  @ApiOperation({ summary: 'Set or update an indicator target' })
  setTarget(
    @Param('code') code: string,
    @Body() body: { year: number; target: number; countyCode?: string },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.indicatorsService.setTarget(
      code,
      body.year,
      body.target,
      body.countyCode ?? null,
      actor,
    );
  }
}
