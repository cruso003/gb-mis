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

import { CreateSessionSchema, type CreateSessionDto } from './dto/create-session.dto';
import { SessionsService } from './sessions.service';

@ApiTags('sessions')
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @RequirePermission('SESSION_MANAGE')
  @ApiOperation({ summary: 'List community sessions (county-scoped)' })
  findAll(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('orgUnitId') orgUnitId?: string,
    @Query('type') type?: string,
  ) {
    return this.sessionsService.findAll(actor, {
      page: Number(page),
      limit: Number(limit),
      ...(orgUnitId !== undefined && { orgUnitId }),
      ...(type !== undefined && { type }),
    });
  }

  @Get(':id')
  @RequirePermission('SESSION_MANAGE')
  @AuditEvent('READ', 'CommunitySession')
  @ApiOperation({ summary: 'Get session detail with attendance' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.sessionsService.findOne(id, actor);
  }

  @Post()
  @RequirePermission('SESSION_MANAGE')
  @AuditEvent('CREATE', 'CommunitySession')
  @ApiOperation({ summary: 'Record a community session (SASA!, ASRH, etc.)' })
  create(
    @Body(new ZodValidationPipe(CreateSessionSchema)) dto: CreateSessionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.sessionsService.create(dto, actor);
  }

  @Post(':id/attendance')
  @RequirePermission('SESSION_ATTENDANCE')
  @AuditEvent('CREATE', 'SessionAttendance')
  @ApiOperation({ summary: 'Record attendance for a community session' })
  recordAttendance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { beneficiaryId?: string; sexAgeBracket?: string },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.sessionsService.recordAttendance(id, body, actor);
  }
}
