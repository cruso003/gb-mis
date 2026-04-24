import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { AuditEvent } from '../../common/interceptors/audit.interceptor';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';

import { CasesService } from './cases.service';
import { AddServiceSchema, type AddServiceDto } from './dto/add-service.dto';
import { CreateCaseSchema, type CreateCaseDto } from './dto/create-case.dto';
import { CreateReferralSchema, type CreateReferralDto } from './dto/create-referral.dto';

@ApiTags('cases')
@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  @RequirePermission('CASE_LIST')
  @AuditEvent('READ', 'GbvCase')
  @ApiOperation({ summary: 'List GBV cases (county-scoped per user)' })
  findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
  ) {
    return this.casesService.findAll(actor, {
      page: Number(page),
      limit: Number(limit),
      ...(status !== undefined && { status }),
      ...(priority !== undefined && { priority }),
    });
  }

  @Get(':id')
  @RequirePermission('CASE_READ')
  @AuditEvent('READ', 'GbvCase')
  @ApiOperation({ summary: 'Get full case detail (audited)' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.casesService.findOne(id, actor);
  }

  @Post()
  @RequirePermission('CASE_CREATE')
  @AuditEvent('CREATE', 'GbvCase')
  @ApiOperation({ summary: 'Open a new GBV case' })
  create(
    @Body(new ZodValidationPipe(CreateCaseSchema)) dto: CreateCaseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.casesService.create(dto, actor);
  }

  @Post(':id/services')
  @RequirePermission('CASE_UPDATE')
  @AuditEvent('CREATE', 'CaseService')
  @ApiOperation({ summary: 'Record a service delivered on this case' })
  addService(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(AddServiceSchema)) dto: AddServiceDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.casesService.addService(id, dto, actor);
  }

  @Post(':id/referrals')
  @RequirePermission('CASE_UPDATE')
  @AuditEvent('CREATE', 'CaseReferral')
  @ApiOperation({ summary: 'Create a referral for this case' })
  createReferral(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(CreateReferralSchema)) dto: CreateReferralDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.casesService.createReferral(id, dto, actor);
  }

  @Post(':id/review')
  @RequirePermission('CASE_SUPERVISOR_REVIEW')
  @AuditEvent('UPDATE', 'GbvCase')
  @ApiOperation({ summary: 'Supervisor approve or return a case' })
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { decision: 'APPROVED' | 'RETURNED'; notes: string },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.casesService.supervisorReview(id, body.decision, actor);
  }

  @Post(':id/close')
  @RequirePermission('CASE_CLOSE')
  @AuditEvent('UPDATE', 'GbvCase')
  @ApiOperation({ summary: 'Close a case with reason' })
  close(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason: string },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.casesService.close(id, body.reason, actor);
  }
}
