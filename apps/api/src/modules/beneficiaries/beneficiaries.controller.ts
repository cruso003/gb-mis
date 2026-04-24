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

import { BeneficiariesService } from './beneficiaries.service';
import {
  CreateBeneficiarySchema,
  type CreateBeneficiaryDto,
} from './dto/create-beneficiary.dto';
import { RecordGrantSchema, type RecordGrantDto } from './dto/record-grant.dto';

@ApiTags('beneficiaries')
@Controller('beneficiaries')
export class BeneficiariesController {
  constructor(private readonly beneficiariesService: BeneficiariesService) {}

  @Get()
  @RequirePermission('BENEFICIARY_LIST')
  @AuditEvent('READ', 'Beneficiary')
  @ApiOperation({ summary: 'List beneficiaries (county-scoped, no PII returned)' })
  findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    return this.beneficiariesService.findAll(actor, {
      page: Number(page),
      limit: Number(limit),
      ...(search !== undefined && { search }),
    });
  }

  @Get(':id')
  @RequirePermission('BENEFICIARY_READ')
  @AuditEvent('READ', 'Beneficiary')
  @ApiOperation({ summary: 'Get beneficiary detail (audited — PII returned encrypted)' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.beneficiariesService.findOne(id, actor);
  }

  @Post()
  @RequirePermission('BENEFICIARY_CREATE')
  @AuditEvent('CREATE', 'Beneficiary')
  @ApiOperation({ summary: 'Register a new beneficiary with consent' })
  create(
    @Body(new ZodValidationPipe(CreateBeneficiarySchema)) dto: CreateBeneficiaryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.beneficiariesService.create(dto, actor);
  }

  @Get(':id/grants')
  @RequirePermission('BENEFICIARY_GRANT_RECORD')
  @AuditEvent('READ', 'Beneficiary')
  @ApiOperation({ summary: 'List livelihood grants for a beneficiary' })
  listGrants(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.beneficiariesService.listGrants(id, actor);
  }

  @Post(':id/grants')
  @RequirePermission('BENEFICIARY_GRANT_RECORD')
  @AuditEvent('CREATE', 'LivelihoodGrant')
  @ApiOperation({ summary: 'Record a livelihood grant disbursement for a beneficiary' })
  recordGrant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(RecordGrantSchema)) dto: RecordGrantDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.beneficiariesService.recordGrant(id, dto, actor);
  }

  @Post(':id/withdraw')
  @RequirePermission('BENEFICIARY_WITHDRAW')
  @AuditEvent('UPDATE', 'Beneficiary')
  @ApiOperation({ summary: 'Record consent withdrawal and exit beneficiary from programme' })
  withdraw(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { reason: string },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.beneficiariesService.withdraw(id, body.reason, actor);
  }
}
