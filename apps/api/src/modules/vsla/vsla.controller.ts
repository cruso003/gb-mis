import {
  Body,
  Controller,
  Delete,
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

import {
  AddMemberSchema,
  CreateVslaGroupSchema,
  type AddMemberDto,
  type CreateVslaGroupDto,
} from './dto/create-vsla-group.dto';
import { VslaService } from './vsla.service';

@ApiTags('vsla-groups')
@Controller('vsla-groups')
export class VslaController {
  constructor(private readonly vslaService: VslaService) {}

  @Get()
  @RequirePermission('VSLA_MANAGE')
  @ApiOperation({ summary: 'List VSLA groups (county-scoped)' })
  findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('orgUnitId') orgUnitId?: string,
  ) {
    return this.vslaService.findAll(actor, {
      page: Number(page),
      limit: Number(limit),
      ...(orgUnitId !== undefined && { orgUnitId }),
    });
  }

  @Get(':id')
  @RequirePermission('VSLA_MANAGE')
  @ApiOperation({ summary: 'Get VSLA group with member roster' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.vslaService.findOne(id, actor);
  }

  @Post()
  @RequirePermission('VSLA_MANAGE')
  @AuditEvent('CREATE', 'VslaGroup')
  @ApiOperation({ summary: 'Register a new VSLA group' })
  create(
    @Body(new ZodValidationPipe(CreateVslaGroupSchema)) dto: CreateVslaGroupDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.vslaService.create(dto, actor);
  }

  @Post(':id/members')
  @RequirePermission('VSLA_MANAGE')
  @AuditEvent('CREATE', 'VslaMembership')
  @ApiOperation({ summary: 'Add a beneficiary to a VSLA group' })
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(AddMemberSchema)) dto: AddMemberDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.vslaService.addMember(id, dto, actor);
  }

  @Delete(':id/members/:beneficiaryId')
  @RequirePermission('VSLA_MANAGE')
  @AuditEvent('UPDATE', 'VslaMembership')
  @ApiOperation({ summary: 'Record a beneficiary leaving a VSLA group' })
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('beneficiaryId', ParseUUIDPipe) beneficiaryId: string,
    @Body() body: { leftAt: string },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.vslaService.removeMember(id, beneficiaryId, body.leftAt, actor);
  }
}
