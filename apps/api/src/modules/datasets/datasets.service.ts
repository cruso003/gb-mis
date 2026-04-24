import { prisma } from '@gb-mis/db';
import { Injectable, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

import type { TriggerDhsIngestDto, TriggerLisgisIngestDto } from './dto/trigger-ingest.dto';

@Injectable()
export class DatasetsService implements OnModuleDestroy {
  private readonly connection: IORedis;
  private readonly etlQueue: Queue;

  constructor() {
    this.connection = new IORedis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    this.etlQueue = new Queue('etl', { connection: this.connection });
  }

  async onModuleDestroy() {
    await this.etlQueue.close();
    this.connection.disconnect();
  }

  async listDatasets(params: { page: number; limit: number }) {
    const { page, limit } = params;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.secondaryDataset.findMany({
        skip,
        take: limit,
        orderBy: { ingestedAt: 'desc' },
        include: { _count: { select: { dataPoints: true } } },
      }),
      prisma.secondaryDataset.count(),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getDataset(id: string) {
    const dataset = await prisma.secondaryDataset.findUnique({
      where: { id },
      include: { _count: { select: { dataPoints: true } } },
    });
    if (!dataset) throw new NotFoundException(`Dataset ${id} not found`);
    return dataset;
  }

  async listDataPoints(datasetId: string, params: { page: number; limit: number }) {
    await this.getDataset(datasetId);
    const { page, limit } = params;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      prisma.secondaryDataPoint.findMany({
        where: { datasetId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          orgUnit: { select: { code: true, name: true } },
          indicator: { select: { code: true, name: true } },
        },
      }),
      prisma.secondaryDataPoint.count({ where: { datasetId } }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async triggerLisgisIngest(dto: TriggerLisgisIngestDto): Promise<{ jobId: string }> {
    const job = await this.etlQueue.add('ingest-lisgis', dto, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
    return { jobId: job.id ?? 'queued' };
  }

  async triggerDhsIngest(dto: TriggerDhsIngestDto): Promise<{ jobId: string }> {
    const job = await this.etlQueue.add('ingest-dhs', dto, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
    return { jobId: job.id ?? 'queued' };
  }

  async getJobStatus(jobId: string) {
    const job = await this.etlQueue.getJob(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);
    const state = await job.getState();
    return {
      jobId,
      state,
      progress: job.progress,
      returnvalue: job.returnvalue as unknown,
      failedReason: job.failedReason,
    };
  }
}
