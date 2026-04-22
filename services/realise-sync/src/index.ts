import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { dedupBeneficiaries } from './jobs/dedup-beneficiaries';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
const QUEUE_NAME = 'realise-sync';

const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
new Queue(QUEUE_NAME, { connection });

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    if (job.name === 'dedup-beneficiaries') return dedupBeneficiaries(job);
    throw new Error(`Unknown job: ${job.name}`);
  },
  { connection, concurrency: 1 },
);

worker.on('completed', (job) => console.log(`[realise-sync] ${job.name} completed`));
worker.on('failed', (job, err) => console.error(`[realise-sync] ${job?.name} failed`, err.message));

console.log('[realise-sync] Worker started');
