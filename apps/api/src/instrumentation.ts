/**
 * OpenTelemetry instrumentation bootstrap.
 *
 * MUST be the very first import in main.ts. The OTel SDK installs its
 * hooks into Node's module loader at start(); modules imported before
 * that point are not instrumented, so HTTP traces and database query
 * spans would silently disappear.
 *
 * Exposes Prometheus metrics on `OBSERVABILITY_METRICS_PORT` (default
 * 9464). The Prometheus container in docker-compose.yml scrapes that
 * endpoint every 15s.
 *
 * Closes Stage 3 deliverable #5 (operational dashboards in Grafana).
 * The runbooks (deploy.md, backup-restore.md, incident-response.md)
 * reference Grafana panels — those panels are defined in
 * `infra/grafana/dashboards/` and read from the metrics defined here
 * plus the auto-instrumented HTTP and Postgres metrics.
 */

import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const SERVICE_NAME = 'gb-mis-api';
const SERVICE_VERSION = process.env['npm_package_version'] ?? '0.1.0';
const METRICS_PORT = Number(process.env['OBSERVABILITY_METRICS_PORT'] ?? 9464);

const prometheusExporter = new PrometheusExporter({
  port: METRICS_PORT,
  endpoint: '/metrics',
});

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
    'deployment.environment': process.env['NODE_ENV'] ?? 'development',
  }),
  metricReader: prometheusExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Don't instrument the file system — it's noisy and not useful for an
      // operational dashboard. HTTP, Fastify, and pg are the ones we want.
      '@opentelemetry/instrumentation-fs': { enabled: false },
      // DNS instrumentation can add overhead for every external call; skip
      // it. Net-level latency is captured at the HTTP layer.
      '@opentelemetry/instrumentation-dns': { enabled: false },
    }),
  ],
});

sdk.start();

// Graceful shutdown so in-flight metrics flush.
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .catch((err: unknown) => {
      // eslint-disable-next-line no-console
      console.error('OpenTelemetry shutdown error', err);
    });
});
