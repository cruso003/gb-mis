import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';

import { buildDhis2ClientFromEnv } from './dhis2-client';
import { pullOrgUnits, type PullOrgUnitsJobData } from './jobs/pull-orgunits';
import { pushIndicators, type PushIndicatorsJobData } from './jobs/push-indicators';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
const QUEUE_NAME = 'dhis2-sync';

const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
const queue = new Queue(QUEUE_NAME, { connection });
const dhis2 = buildDhis2ClientFromEnv();

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    switch (job.name) {
      case 'push-indicators':
        return pushIndicators(job as never, dhis2);
      case 'pull-orgunits':
        return pullOrgUnits(job as never, dhis2);
      default:
        throw new Error(`Unknown DHIS2 sync job: ${job.name}`);
    }
  },
  {
    connection,
    concurrency: 1,
    // BullMQ keeps the job in the queue with the failure attached when
    // attempts run out — operator visibility, no silent data loss.
    settings: { backoffStrategy: (attempts) => Math.min(60_000, 1_000 * 2 ** attempts) },
  },
);

worker.on('completed', (job) => {
  // Job's returnvalue carries the per-batch outcomes (PushIndicatorsResult or
  // PullOrgUnitsResult). Log structured so the runbook can grep.
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ event: 'dhis2_sync_completed', job: job.name, result: job.returnvalue }));
});

worker.on('failed', (job, err) => {
  // eslint-disable-next-line no-console
  console.error(
    JSON.stringify({
      event: 'dhis2_sync_failed',
      job: job?.name,
      attempts: job?.attemptsMade,
      error: err.message,
    }),
  );
});

/**
 * Rolling 7-day window — push the last week of verified values daily
 * so a re-run catches anything that was being verified at the moment
 * of the previous run. Idempotency is on the DHIS2 side (importStrategy
 * CREATE_AND_UPDATE).
 */
function dailyPushWindow(): PushIndicatorsJobData {
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { periodStart: start.toISOString(), periodEnd: end.toISOString() };
}

function weeklyPullArgs(): PullOrgUnitsJobData {
  // levels and rootParentId fall through to defaults inside the job.
  return {};
}

async function scheduleRecurringJobs() {
  await queue.add('pull-orgunits', weeklyPullArgs(), {
    repeat: { pattern: '0 2 * * 1' }, // Monday 02:00 UTC
    removeOnComplete: 10,
    removeOnFail: 20,
    attempts: 5,
  });
  await queue.add('push-indicators', dailyPushWindow(), {
    repeat: { pattern: '0 6 * * *' }, // Daily 06:00 UTC
    removeOnComplete: 30,
    removeOnFail: 30,
    attempts: 5,
  });
}

scheduleRecurringJobs().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Failed to schedule DHIS2 sync jobs:', err);
  process.exit(1);
});

// eslint-disable-next-line no-console
console.log(JSON.stringify({ event: 'dhis2_sync_worker_started', queue: QUEUE_NAME }));
