#!/usr/bin/env node
/**
 * Verify the audit hash chain.
 *
 * Referenced by:
 *   - docs/runbooks/deploy.md § 7 step 3  (`--since '5 minutes ago'`)
 *   - docs/runbooks/backup-restore.md § 6 (`--full`)
 *   - docs/runbooks/incident-response.md § A (forensic check on demand)
 *
 * Usage:
 *   node scripts/verify-audit-chain.cjs --full
 *   node scripts/verify-audit-chain.cjs --since '5 minutes ago'
 *   node scripts/verify-audit-chain.cjs --since 2026-04-28T00:00:00Z
 *
 * Pre-condition: `pnpm --filter=@gb-mis/api build` has been run, so
 * dist/app.module.js exists. We require from dist/ to reuse the same
 * Nest startup path the production binary uses — that way the verifier
 * connects to Postgres through the same Prisma client + RLS context
 * the application uses, not through ad-hoc credentials.
 *
 * Exit codes:
 *   0 — chain intact
 *   1 — chain has broken links (operator should investigate)
 *   2 — verifier failed to run (DB unreachable, etc.)
 */

/* eslint-disable @typescript-eslint/no-require-imports, no-console */

const { NestFactory } = require('@nestjs/core');
const { FastifyAdapter } = require('@nestjs/platform-fastify');

const { AppModule } = require('../dist/app.module');
const { ChainVerificationService } = require('../dist/modules/audit/chain-verification.service');

function parseSince(arg) {
  if (!arg) return undefined;
  // Accept ISO 8601 or human-readable expressions Postgres understands —
  // we resolve human ones to a JS Date locally so we don't have to round-
  // trip through Postgres just to parse "5 minutes ago".
  const trimmed = arg.trim();
  const minutesAgo = /^(\d+)\s*minutes?\s*ago$/i.exec(trimmed);
  if (minutesAgo) return new Date(Date.now() - Number(minutesAgo[1]) * 60_000);
  const hoursAgo = /^(\d+)\s*hours?\s*ago$/i.exec(trimmed);
  if (hoursAgo) return new Date(Date.now() - Number(hoursAgo[1]) * 3_600_000);
  const daysAgo = /^(\d+)\s*days?\s*ago$/i.exec(trimmed);
  if (daysAgo) return new Date(Date.now() - Number(daysAgo[1]) * 86_400_000);
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Cannot parse --since value: ${arg}`);
  }
  return parsed;
}

(async () => {
  const args = process.argv.slice(2);
  let sinceAt;
  let full = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--full') full = true;
    else if (args[i] === '--since') {
      sinceAt = parseSince(args[i + 1]);
      i++;
    }
  }
  if (!full && !sinceAt) {
    console.error('Usage: verify-audit-chain.cjs --full | --since "<duration>"');
    process.exit(2);
  }

  const app = await NestFactory.createApplicationContext(
    AppModule,
    { logger: ['error', 'warn'], abortOnError: false },
  );
  try {
    const svc = app.get(ChainVerificationService);
    const broken = await svc.verifyChain(sinceAt);

    if (broken.length === 0) {
      console.log(`OK — audit chain intact${sinceAt ? ` since ${sinceAt.toISOString()}` : ''}`);
      await app.close();
      process.exit(0);
    }

    console.error(`BROKEN — ${broken.length} link(s) failed verification:`);
    for (const link of broken) {
      console.error(
        `  ${link.brokenId}  expected=${link.expectedHash.slice(0, 16)}…  actual=${link.actualHash.slice(0, 16)}…  reason=${link.reason}`,
      );
    }
    await app.close();
    process.exit(1);
  } catch (err) {
    console.error('Verifier crashed:', err instanceof Error ? err.stack : err);
    await app.close().catch(() => {});
    process.exit(2);
  }
})();
