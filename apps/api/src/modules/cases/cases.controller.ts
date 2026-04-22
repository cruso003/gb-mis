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

import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuditEvent } from '../../common/interceptors/audit.interceptor';
import { CasesService } from './cases.service';
import { CreateCaseSchema, type CreateCaseDto } from './dto/create-case.dto';
import { AddServiceSchema, type AddServiceDto } from './dto/add-service.dto';
import { CreateReferralSchema, type CreateReferralDto } from './dto/create-referral.dto';

@ApiTags('cases')
@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  @RequirePermission('cases:read')
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
      status,
      priority,
    });
  }

  @Get(':id')
  @RequirePermission('cases:read')
  @AuditEvent('READ', 'GbvCase')
  @ApiOperation({ summary: 'Get full case detail (audited)' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.casesService.findOne(id, actor);
  }

  @Post()
  @RequirePermission('cases:create')
  @AuditEvent('CREATE', 'GbvCase')
  @ApiOperation({ summary: 'Open a new GBV case' })
  create(
    @Body(new ZodValidationPipe(CreateCaseSchema)) dto: CreateCaseDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.casesService.create(dto, actor);
  }

  @Post(':id/services')
  @RequirePermission('cases:add-service')
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
  @RequirePermission('cases:create-referral')
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
  @RequirePermission('cases:review')
  @AuditEvent('UPDATE', 'GbvCase')
  @ApiOperation({ summary: 'Supervisor approve or return a case' })
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { decision: 'APPROVED' | 'RETURNED'; notes: string },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.casesService.supervisorReview(id, body.decision, body.notes, actor);
  }

  @Post(':id/close')
  @RequirePermission('cases:close')
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
