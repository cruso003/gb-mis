import { prisma } from '@gb-mis/db';
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type {
  HealthCheckService,
  PrismaHealthIndicator} from '@nestjs/terminus';
import {
  HealthCheck
} from '@nestjs/terminus';


import { Public } from '../../common/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', prisma),
    ]);
  }

  @Public()
  @Get('ready')
  ready() {
    return { status: 'UP', timestamp: new Date().toISOString() };
  }
}
