import type { AuditAction } from '@gb-mis/types';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../../common/decorators/require-permission.decorator';

import { AuditService } from './audit.service';

@ApiTags('audit')
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermission('AUDIT_VIEW_ALL')
  @ApiOperation({ summary: 'Query the append-only audit log (SUPER_ADMIN / compliance roles)' })
  findAll(
    @Query('actorId') actorId?: string,
    @Query('resource') resource?: string,
    @Query('action') action?: AuditAction,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.auditService.findAll({
      page: Number(page),
      limit: Number(limit),
      ...(actorId !== undefined && { actorId }),
      ...(resource !== undefined && { resource }),
      ...(action !== undefined && { action }),
      ...(from !== undefined && { from }),
      ...(to !== undefined && { to }),
    });
  }
}
