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
import { AuditEvent } from '../../common/interceptors/audit.interceptor';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

import { DatasetsService } from './datasets.service';
import {
  TriggerDhsIngestSchema,
  TriggerLisgisIngestSchema,
  type TriggerDhsIngestDto,
  type TriggerLisgisIngestDto,
} from './dto/trigger-ingest.dto';

@ApiTags('datasets')
@Controller('datasets')
export class DatasetsController {
  constructor(private readonly datasetsService: DatasetsService) {}

  @Get()
  @RequirePermission('SECONDARY_DATA_VIEW')
  @ApiOperation({ summary: 'List secondary datasets (LISGIS, DHS, MoH)' })
  listDatasets(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.datasetsService.listDatasets({ page: Number(page), limit: Number(limit) });
  }

  @Get(':id')
  @RequirePermission('SECONDARY_DATA_VIEW')
  @ApiOperation({ summary: 'Get secondary dataset detail with data point count' })
  getDataset(@Param('id', ParseUUIDPipe) id: string) {
    return this.datasetsService.getDataset(id);
  }

  @Get(':id/data-points')
  @RequirePermission('SECONDARY_DATA_VIEW')
  @ApiOperation({ summary: 'List individual data points for a dataset' })
  listDataPoints(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.datasetsService.listDataPoints(id, { page: Number(page), limit: Number(limit) });
  }

  @Post('ingest/lisgis')
  @RequirePermission('SECONDARY_DATA_MANAGE')
  @AuditEvent('CREATE', 'SecondaryDataset')
  @ApiOperation({ summary: 'Queue a LISGIS CSV ingestion job' })
  triggerLisgisIngest(
    @Body(new ZodValidationPipe(TriggerLisgisIngestSchema)) dto: TriggerLisgisIngestDto,
  ) {
    return this.datasetsService.triggerLisgisIngest(dto);
  }

  @Post('ingest/dhs')
  @RequirePermission('SECONDARY_DATA_MANAGE')
  @AuditEvent('CREATE', 'SecondaryDataset')
  @ApiOperation({ summary: 'Queue a DHS tabulation CSV ingestion job' })
  triggerDhsIngest(
    @Body(new ZodValidationPipe(TriggerDhsIngestSchema)) dto: TriggerDhsIngestDto,
  ) {
    return this.datasetsService.triggerDhsIngest(dto);
  }

  @Get('jobs/:jobId')
  @RequirePermission('SECONDARY_DATA_MANAGE')
  @ApiOperation({ summary: 'Check the status of a queued ETL ingestion job' })
  getJobStatus(@Param('jobId') jobId: string) {
    return this.datasetsService.getJobStatus(jobId);
  }
}
