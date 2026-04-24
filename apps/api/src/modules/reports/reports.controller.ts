import { Body, Controller, Get, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
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
    @Query('orgUnitId') orgUnitId?: string,
    @Query('periodFrom') periodFrom?: string,
    @Query('periodTo') periodTo?: string,
  ) {
    return this.reportsService.casesSummary(actor, {
      ...(orgUnitId !== undefined && { orgUnitId }),
      ...(periodFrom !== undefined && { periodFrom }),
      ...(periodTo !== undefined && { periodTo }),
    });
  }

  @Get('beneficiaries/summary')
  @RequirePermission('BENEFICIARY_EXPORT')
  @ApiOperation({ summary: 'Aggregated beneficiary statistics (k-anonymity applied)' })
  beneficiarySummary(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('orgUnitId') orgUnitId?: string,
  ) {
    return this.reportsService.beneficiarySummary(actor, {
      ...(orgUnitId !== undefined && { orgUnitId }),
    });
  }

  @Get('monthly-county')
  @RequirePermission('INDICATOR_EXPORT')
  @ApiOperation({ summary: 'Monthly county report — cases, beneficiaries, sessions, indicators' })
  monthlyCounty(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('orgUnitId') orgUnitId: string,
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    return this.reportsService.monthlyCountyReport(actor, { orgUnitId, year, month });
  }

  @Get('quarterly-lwep')
  @RequirePermission('INDICATOR_EXPORT')
  @ApiOperation({ summary: 'Quarterly LWEP narrative report for World Bank' })
  quarterlyLwep(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('year', ParseIntPipe) year: number,
    @Query('quarter', ParseIntPipe) quarter: number,
  ) {
    return this.reportsService.quarterlyLwepReport(actor, {
      year,
      quarter: quarter as 1 | 2 | 3 | 4,
    });
  }

  @Get('annual-cedaw')
  @RequirePermission('INDICATOR_EXPORT')
  @ApiOperation({ summary: 'Annual CEDAW follow-up report — all BPfA/CEDAW indicators' })
  annualCedaw(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('year', ParseIntPipe) year: number,
  ) {
    return this.reportsService.annualCedawReport(actor, { year });
  }

  @Post('exports')
  @RequirePermission('INDICATOR_EXPORT')
  @ApiOperation({ summary: 'Request an async report export (returns job ID for polling)' })
  requestExport(
    @Body()
    body: {
      type: 'indicators_csv' | 'cases_aggregate' | 'beneficiaries_aggregate' | 'monthly_county' | 'quarterly_lwep' | 'annual_cedaw';
    },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.reportsService.generateExport(body.type, actor);
  }
}
