import { prisma } from '@gb-mis/db';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import {
  auditChainBreaksCounter,
  auditChainVerifyCounter,
  auditChainVerifyDuration,
} from '../../observability/metrics';

/**
 * Per `SECURITY.md § Properties`, the audit chain is verified nightly
 * and the operator is alerted on discrepancy. This service does that.
 *
 * The walk is performed server-side by the SQL function
 * `audit_events_verify_chain()` from migration 20260428100000 — that
 * keeps the entire audit table from streaming through Node memory just
 * to compute a SHA-256 per row, and it means the verification uses
 * exactly the same canonicalisation as the BEFORE INSERT trigger
 * (canonicalisation drift between the two would itself be a finding).
 *
 * On detection of a break, the service:
 *   1. increments `gbmis_audit_chain_breaks_total` — wired to a
 *      Grafana alert that pages the on-call;
 *   2. logs at ERROR level with the affected row IDs (no decrypted
 *      content);
 *   3. returns the broken rows from `verifyChain()` so the runbook
 *      script can render them for the operator.
 *
 * The runbook CLI script in `apps/api/scripts/verify-audit-chain.cjs`
 * is a thin wrapper around the same function, callable on demand from
 * the deploy / DR / incident-response runbooks.
 */
@Injectable()
export class ChainVerificationService {
  private readonly logger = new Logger(ChainVerificationService.name);

  /**
   * Walks the chain. `sinceAt = undefined` walks the full table.
   * Returns the list of broken rows; an empty list ⇒ chain intact.
   */
  async verifyChain(sinceAt?: Date): Promise<BrokenChainLink[]> {
    const startedAt = process.hrtime.bigint();
    try {
      const since = sinceAt ?? new Date('1970-01-01T00:00:00Z');
      // `audit_events_verify_chain(since_at TIMESTAMPTZ)` returns
      // (broken_id UUID, expected_hash BYTEA, actual_hash BYTEA, reason TEXT).
      const rows = await prisma.$queryRaw<BrokenChainLink[]>`
        SELECT
          broken_id     AS "brokenId",
          encode(expected_hash, 'hex') AS "expectedHash",
          encode(actual_hash,   'hex') AS "actualHash",
          reason        AS "reason"
        FROM audit_events_verify_chain(${since})
      `;

      auditChainBreaksCounter.add(rows.length);
      auditChainVerifyCounter.add(1, { outcome: rows.length === 0 ? 'intact' : 'broken' });

      if (rows.length > 0) {
        this.logger.error(
          `Audit chain verification found ${rows.length} broken link(s). ` +
            `First: ${rows[0]?.brokenId} — ${rows[0]?.reason}. ` +
            `Investigate per docs/runbooks/incident-response.md § A (data-breach playbook).`,
        );
      }
      return rows;
    } catch (err) {
      auditChainVerifyCounter.add(1, { outcome: 'error' });
      this.logger.error(
        'Audit chain verification job itself failed — this is operationally equivalent to a break',
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    } finally {
      const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
      auditChainVerifyDuration.record(durationSeconds);
    }
  }

  /**
   * Nightly job — 02:00 Africa/Monrovia. Walks the entire chain.
   * Runs unattended; the Grafana metric is the alerting channel.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM, {
    name: 'audit-chain-nightly-verify',
    timeZone: 'Africa/Monrovia',
  })
  async nightlyJob(): Promise<void> {
    this.logger.log('Starting nightly audit chain verification');
    const broken = await this.verifyChain();
    this.logger.log(
      `Nightly audit chain verification complete — ${broken.length} broken link(s) found`,
    );
  }
}

export interface BrokenChainLink {
  brokenId: string;
  expectedHash: string;
  actualHash: string;
  reason: string;
}
