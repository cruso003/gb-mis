import { Worker, Queue, QueueScheduler } from 'bullmq';
import IORedis from 'ioredis';
import { pushIndicators } from './jobs/push-indicators';
import { pullOrgUnits } from './jobs/pull-orgunits';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
const QUEUE_NAME = 'dhis2-sync';

const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

const queue = new Queue(QUEUE_NAME, { connection });
new QueueScheduler(QUEUE_NAME, { connection });

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    switch (job.name) {
      case 'push-indicators':
        return pushIndicators(job);
      case 'pull-orgunits':
        return pullOrgUnits(job);
      default:
        throw new Error(`Unknown job: ${job.name}`);
    }
  },
  { connection, concurrency: 1 },
);

worker.on('completed', (job) => {
  console.log(`[dhis2-sync] ${job.name} completed`, job.returnvalue);
});

worker.on('failed', (job, err) => {
  console.error(`[dhis2-sync] ${job?.name} failed`, err.message);
});

// Schedule weekly org unit pull and daily indicator push
async function scheduleRecurringJobs() {
  await queue.add('pull-orgunits', { level: 3 }, {
    repeat: { pattern: '0 2 * * 1' }, // Monday 02:00 UTC
    removeOnComplete: 10,
  });
  await queue.add('push-indicators', { period: getCurrentPeriod() }, {
    repeat: { pattern: '0 6 * * *' }, // Daily 06:00 UTC
    removeOnComplete: 30,
  });
}

function getCurrentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}`;
}

scheduleRecurringJobs().catch(console.error);

console.log('[dhis2-sync] Worker started');
