import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('cases/summary')
  @RequirePermission('CASE_EXPORT_AGGREGATE')
  @ApiOperation({ summary: 'Aggregated GBV case statistics (k-anonymity applied)' })
  casesSummary(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('countyCode') countyCode?: string,
    @Query('periodFrom') periodFrom?: string,
    @Query('periodTo') periodTo?: string,
  ) {
    return this.reportsService.casesSummary(actor, {
      ...(countyCode !== undefined && { countyCode }),
      ...(periodFrom !== undefined && { periodFrom }),
      ...(periodTo !== undefined && { periodTo }),
    });
  }

  @Get('beneficiaries/summary')
  @RequirePermission('BENEFICIARY_EXPORT')
  @ApiOperation({ summary: 'Aggregated beneficiary statistics (k-anonymity applied)' })
  beneficiarySummary(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('countyCode') countyCode?: string,
  ) {
    return this.reportsService.beneficiarySummary(actor, {
      ...(countyCode !== undefined && { countyCode }),
    });
  }

  @Post('exports')
  @RequirePermission('INDICATOR_EXPORT')
  @ApiOperation({ summary: 'Request an async data export (returns job ID for polling)' })
  requestExport(
    @Body() body: { type: 'indicators_csv' | 'cases_aggregate' | 'beneficiaries_aggregate' },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.reportsService.generateExport(body.type, actor);
  }
}
