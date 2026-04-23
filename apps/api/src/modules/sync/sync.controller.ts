import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { AuditEvent } from '../../common/interceptors/audit.interceptor';
import { SyncService, type SyncPushRecord } from './sync.service';

@ApiTags('sync')
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('pull')
  @RequirePermission('CASE_READ')
  @ApiOperation({ summary: 'Pull server-authoritative changes since cursor' })
  pull(
    @CurrentUser() actor: AuthenticatedUser,
    @Query('cursor') cursor?: string,
    @Query('resources') resources?: string,
  ) {
    return this.syncService.pull(actor, {
      cursor: cursor ?? null,
      resources: resources ? resources.split(',') : [],
    });
  }

  @Post('push')
  @RequirePermission('CASE_CREATE')
  @AuditEvent('CREATE', 'SyncRecord')
  @ApiOperation({ summary: 'Push offline records from mobile device (server is authoritative on conflicts)' })
  push(
    @Body() body: { records: SyncPushRecord[] },
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.syncService.push(actor, body.records);
  }
}
