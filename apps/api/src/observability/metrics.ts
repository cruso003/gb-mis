/**
 * Custom application metrics — exposed on /metrics by the Prometheus
 * exporter wired in `apps/api/src/instrumentation.ts`.
 *
 * Auto-instrumentation already provides HTTP request rate, latency, and
 * error metrics. This file adds the GB-MIS-specific counters that the
 * Grafana dashboards in `infra/grafana/dashboards/` plot.
 */

import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('gb-mis-api', '0.1.0');

/**
 * Counts every audit-event emission attempt. The `success` attribute
 * lets the Grafana audit-health panel show emit failure rate, which
 * the incident-response runbook treats as a class-A signal (a sustained
 * non-zero failure rate means survivor mutations are not being audited).
 */
export const auditEmitCounter = meter.createCounter('gbmis_audit_emit_total', {
  description: 'Audit event emit attempts, labelled by success/failure',
});

/**
 * Counts mobile sync push outcomes. The deploy-verification step in
 * `runbooks/deploy.md` reads from this to confirm sync is healthy after
 * a release. Outcome ∈ {accepted, rejected, network_error}.
 */
export const syncPushCounter = meter.createCounter('gbmis_sync_push_total', {
  description: 'Mobile sync push outcomes',
});

/**
 * Histogram of audit-emit latency. Helps detect slow audit writes
 * before they cause request timeouts (since the interceptor is
 * fail-closed, slow audits become slow requests).
 */
export const auditEmitLatency = meter.createHistogram('gbmis_audit_emit_latency_seconds', {
  description: 'Latency of audit_log INSERT operations',
  unit: 's',
});

/**
 * Audit hash-chain verification — counts every run of the nightly
 * chain verifier (and on-demand runs from the CLI script). The
 * `outcome` attribute is one of {intact, broken, error}. The Grafana
 * audit-health dashboard pages the on-call when the `broken` series
 * goes non-zero — that means tamper-evidence has detected something.
 */
export const auditChainVerifyCounter = meter.createCounter('gbmis_audit_chain_verify_total', {
  description: 'Audit chain verification runs, labelled by outcome',
});

/**
 * Total broken links found across all verification runs. A sustained
 * non-zero rate is a class-A signal per docs/runbooks/incident-response.md
 * (the audit log may have been tampered with).
 */
export const auditChainBreaksCounter = meter.createCounter('gbmis_audit_chain_breaks_total', {
  description: 'Broken audit-chain links found by the verifier',
});

/**
 * Time the chain verification takes — useful for capacity planning as
 * the audit table grows.
 */
export const auditChainVerifyDuration = meter.createHistogram(
  'gbmis_audit_chain_verify_duration_seconds',
  {
    description: 'Duration of an audit chain verification run',
    unit: 's',
  },
);
