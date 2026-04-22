import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { ingestLisgis } from './jobs/ingest-lisgis';
import { ingestDhs } from './jobs/ingest-dhs';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
const QUEUE_NAME = 'etl';

const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
new Queue(QUEUE_NAME, { connection });

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    switch (job.name) {
      case 'ingest-lisgis': return ingestLisgis(job);
      case 'ingest-dhs': return ingestDhs(job);
      default: throw new Error(`Unknown ETL job: ${job.name}`);
    }
  },
  { connection, concurrency: 1 },
);

worker.on('completed', (job) => console.log(`[etl] ${job.name} completed`));
worker.on('failed', (job, err) => console.error(`[etl] ${job?.name} failed`, err.message));

console.log('[etl] Worker started');
