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
import {
  ApproveCaseSchema,
  type ApproveCaseDto,
  ReturnCaseSchema,
  type ReturnCaseDto,
} from './dto/review-case.dto';

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

  @Get('review-queue')
  @RequirePermission('CASE_SUPERVISOR_REVIEW')
  @AuditEvent('READ', 'GbvCase')
  @ApiOperation({
    summary: 'Supervisor review queue — PENDING_REVIEW cases in scope',
  })
  reviewQueue(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.casesService.reviewQueue(actor, {
      page: Number(page),
      limit: Number(limit),
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
  @AuditEvent('CASE_SUBMIT_FOR_REVIEW', 'GbvCase')
  @ApiOperation({
    summary: 'Open a new GBV case — enters PENDING_REVIEW automatically',
  })
  create(
    @Body(new ZodValidationPipe(CreateCaseSchema)) dto: CreateCaseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.casesService.create(dto, actor);
  }

  @Post(':id/services')
  @RequirePermission('CASE_UPDATE')
  @AuditEvent('CREATE', 'CaseService')
  @ApiOperation({
    summary: 'Record a service delivered on this case (blocked while in review)',
  })
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
  @ApiOperation({
    summary: 'Create a referral for this case (blocked while in review)',
  })
  createReferral(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(CreateReferralSchema)) dto: CreateReferralDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.casesService.createReferral(id, dto, actor);
  }

  @Post(':id/approve')
  @RequirePermission('CASE_SUPERVISOR_REVIEW')
  @AuditEvent('CASE_APPROVE', 'GbvCase')
  @ApiOperation({ summary: 'Supervisor approves a PENDING_REVIEW case → OPEN' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(ApproveCaseSchema)) dto: ApproveCaseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.casesService.approve(id, dto, actor);
  }

  @Post(':id/return')
  @RequirePermission('CASE_SUPERVISOR_REVIEW')
  @AuditEvent('CASE_RETURN_FOR_REVISION', 'GbvCase')
  @ApiOperation({
    summary: 'Supervisor returns a PENDING_REVIEW case for revision (notes required)',
  })
  returnForRevision(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(ReturnCaseSchema)) dto: ReturnCaseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.casesService.returnForRevision(id, dto, actor);
  }

  @Post(':id/resubmit')
  @RequirePermission('CASE_RESUBMIT_FOR_REVIEW')
  @AuditEvent('CASE_RESUBMIT_FOR_REVIEW', 'GbvCase')
  @ApiOperation({
    summary: 'Case worker resubmits a RETURNED_FOR_REVISION case for review',
  })
  resubmit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.casesService.resubmitForReview(id, actor);
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
