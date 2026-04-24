import type { IndicatorFramework } from '@gb-mis/types';
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditEvent } from '../../common/interceptors/audit.interceptor';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';

import { IndicatorsService } from './indicators.service';

@ApiTags('indicators')
@Controller('indicators')
export class IndicatorsController {
  constructor(private readonly indicatorsService: IndicatorsService) {}

  @Get('catalog')
  @RequirePermission('INDICATOR_CATALOG_VIEW')
  @ApiOperation({ summary: 'Return the full indicator catalog metadata' })
  catalog() {
    return this.indicatorsService.catalog();
  }

  @Get('values')
  @RequirePermission('INDICATOR_VALUE_VIEW_VERIFIED')
  @ApiOperation({ summary: 'Query indicator values with filters' })
  findValues(
    @Query('indicatorCode') indicatorCode?: string,
    @Query('orgUnitId') orgUnitId?: string,
    @Query('framework') framework?: IndicatorFramework,
    @Query('periodFrom') periodFrom?: string,
    @Query('periodTo') periodTo?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.indicatorsService.findValues({
      page: Number(page),
      limit: Number(limit),
      ...(indicatorCode !== undefined && { indicatorCode }),
      ...(orgUnitId !== undefined && { orgUnitId }),
      ...(framework !== undefined && { framework }),
      ...(periodFrom !== undefined && { periodFrom }),
      ...(periodTo !== undefined && { periodTo }),
    });
  }

  @Post('values')
  @RequirePermission('INDICATOR_VALUE_ENTER')
  @AuditEvent('CREATE', 'IndicatorValue')
  @ApiOperation({ summary: 'Manually record an indicator value' })
  recordValue(
    @Body()
    body: {
      indicatorCode: string;
      orgUnitId: string;
      periodStart: string;
      periodEnd: string;
      value: number;
      denominator?: number;
    },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.indicatorsService.recordValue(
      {
        indicatorCode: body.indicatorCode,
        orgUnitId: body.orgUnitId,
        periodStart: new Date(body.periodStart),
        periodEnd: new Date(body.periodEnd),
        value: body.value,
        source: 'MANUAL_ENTRY',
        ...(body.denominator !== undefined && { denominator: body.denominator }),
      },
      actor,
    );
  }

  @Post(':code/compute')
  @RequirePermission('INDICATOR_RECOMPUTE')
  @AuditEvent('CREATE', 'IndicatorValue')
  @ApiOperation({ summary: 'Compute an indicator from raw inputs and persist the result' })
  compute(
    @Param('code') code: string,
    @Body() body: { inputs: Record<string, number>; orgUnitId: string; periodStart: string; periodEnd: string },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.indicatorsService.computeAndSave(
      code,
      body.inputs,
      body.orgUnitId,
      new Date(body.periodStart),
      new Date(body.periodEnd),
      actor,
    );
  }

  @Get(':code/targets')
  @RequirePermission('INDICATOR_VALUE_VIEW_VERIFIED')
  @ApiOperation({ summary: 'Get targets for an indicator' })
  getTargets(@Param('code') code: string) {
    return this.indicatorsService.getTargets(code);
  }

  @Post(':code/targets')
  @RequirePermission('INDICATOR_TARGET_EDIT')
  @AuditEvent('CREATE', 'IndicatorTarget')
  @ApiOperation({ summary: 'Set or update an indicator target' })
  setTarget(
    @Param('code') code: string,
    @Body() body: { year: number; target: number; orgUnitId?: string },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.indicatorsService.setTarget(
      code,
      body.year,
      body.target,
      body.orgUnitId ?? null,
      actor,
    );
  }
}
