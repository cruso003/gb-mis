# Runbook — Deploy to Production

**Audience.** MOGCSP ICT operations engineer with shell access to the production host, the deploy bastion, and the KMS.

**Scope.** This runbook covers the on-premise Docker Compose production deployment of the GB MIS. It assumes the hosting model selected during Inception is **on-premise primary** (`ARCHITECTURE.md § Hosting`, option 2 or 3). Cloud-primary deployments follow a separate runbook keyed off the chosen provider. ⚠️ **MOGCSP approval required** if the hosting decision changes after this runbook is signed.

**Normal duration.** 25–40 minutes including verification. Plan a maintenance window of 60 minutes.

---

## 1. Pre-deploy checklist

Complete every item before touching the production host. Any "no" answer aborts the deploy.

1. The release tag exists in the MOGCSP-controlled Git remote (`git tag --list 'v*'`) and is **GPG-signed** by a key in the MOGCSP custody chain (`git tag -v $RELEASE_TAG`).
2. CI for the release tag is **green** on every job: `typecheck`, `lint`, `test`, `openapi`, `sast`, `docker`.
3. The committed OpenAPI document at `apps/api/openapi.json` matches the generated one (`pnpm openapi:check` exits 0).
4. The container images for the tag have been published to `$REGISTRY` and pinned **by digest** (per `SECURITY.md § Supply chain`):
   - `$REGISTRY/gb-mis-api@sha256:…`
   - `$REGISTRY/gb-mis-web@sha256:…`
   - `$REGISTRY/gb-mis-dhis2-sync@sha256:…`
   - `$REGISTRY/gb-mis-realise-sync@sha256:…`
   - `$REGISTRY/gb-mis-etl@sha256:…`
5. The Prisma migrations directory in the release matches the production database state plus the new migrations only (no out-of-order edits, no edits to applied migrations). Run `pnpm prisma migrate diff --from-url $DB_URL --to-migrations packages/db/prisma/migrations` and confirm only new migrations show.
6. A **fresh logical backup** of the production database has been taken in the last 30 minutes. See `backup-restore.md § Manual backup`. Capture the backup file path and SHA-256 in the change record.
7. The release notes in the change record describe: scope, migration impact, rollback trigger criteria, and any privacy-impact items per `CONTRIBUTING.md`.
8. The on-call rotation is staffed for the next 4 hours. Notify the on-call engineer in the incident-channel before starting.
9. ⚠️ **MOGCSP approval required**: the change record is signed off by the MOGCSP ICT Director (or delegate) when the change touches `GbvCase`, `Beneficiary`, `User`, `UserRole`, or `ConsentRecord` schemas, or any RLS policy.

---

## 2. Maintenance-mode banner

1. SSH to the load-balancer host (`ssh ops@$LB_HOST`).
2. Place the maintenance flag: `sudo touch /etc/nginx/maintenance.flag`.
3. Reload NGINX: `sudo nginx -s reload`. Confirm the maintenance page is served:
   `curl -sI https://$WEB_HOST/ | head -1` returns `HTTP/2 503` and `Retry-After`.
4. The mobile app continues to function offline. Pending sync attempts queue locally (per `SYNC_PROTOCOL.md`).

---

## 3. Pull the new images on the API host

1. SSH to the production API host (`ssh ops@$API_HOST`).
2. Change to the deploy directory: `cd /opt/gb-mis`.
3. Pull the new tag: `git fetch --tags && git checkout $RELEASE_TAG`. Verify the working tree is clean (`git status` shows nothing modified).
4. Refresh secrets from KMS (`SECURITY.md § Secrets` requires runtime delivery; never edit `.env` files in place):
   `sudo /opt/gb-mis/bin/refresh-secrets.sh`. The script writes a tmpfs-mounted `/run/gb-mis/env` and exits non-zero on KMS failure.
5. Pull images by digest: `docker compose --env-file /run/gb-mis/env pull`.
6. Verify image digests against the change record:
   `docker compose --env-file /run/gb-mis/env images --format json | jq '.[] | {Service, Digest}'`.

---

## 4. Apply Prisma migrations safely

Migrations run as a one-shot container against the live database **before** any application container restarts. This catches migration failures before the app comes up against an inconsistent schema.

1. Run migrations against `$DB_HOST` through pgBouncer's session-mode pool (`$DB_PORT_SESSION`, typically 6432) — never the transaction-mode pool. Prisma migrations require session-level state:
   ```
   docker run --rm \
     --env-file /run/gb-mis/env \
     -e DATABASE_URL="postgresql://$DB_MIGRATE_USER:$DB_MIGRATE_PASS@$DB_HOST:$DB_PORT_SESSION/$DB_NAME?schema=public&sslmode=require" \
     $REGISTRY/gb-mis-api@$API_DIGEST \
     pnpm prisma migrate deploy
   ```
2. Verify the migrations applied: `docker run --rm --env-file /run/gb-mis/env $REGISTRY/gb-mis-api@$API_DIGEST pnpm prisma migrate status`. Every migration listed in the release must show `applied`.
3. **Verify RLS policies** for any newly added county-scoped tables (`CLAUDE.md` rule #11). Connect with the read-only audit role:
   ```
   psql "$DB_AUDIT_URL" -c "SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname='public';"
   ```
   Every table on the privacy-impacting list (`GbvCase`, `Beneficiary`, `Incident`, `ServiceProvided`, `Referral`, `CaseAttachment`, `Household`, `VslaGroup`, `CommunitySession`, plus any new ones in this release) must show `rowsecurity = t`.
4. **If migration step 1 fails**: do **not** restart the application. Trigger `rollback.md § 4. Migration rollback` immediately and abort the deploy.

---

## 5. Restart application services in order

Order matters: dependencies up first, then dependents. Each service must report healthy before the next is restarted.

1. **Postgres + pgBouncer + Redis + Keycloak + MinIO** — these are stateful and are not restarted as part of an application deploy. Verify they are healthy first:
   ```
   docker compose --env-file /run/gb-mis/env ps
   ```
   All five containers must show `Up (healthy)`. If any are unhealthy, abort the deploy and investigate before continuing.
2. Restart the API: `docker compose --env-file /run/gb-mis/env up -d --no-deps api`. Wait for the health check to pass:
   ```
   curl -sf https://$API_HOST/health/ready
   ```
   The response must be `{"status":"ok","db":"ok","redis":"ok","keycloak":"ok"}`.
3. Restart the workers (each is a separate compose service):
   - `docker compose --env-file /run/gb-mis/env up -d --no-deps dhis2-sync`
   - `docker compose --env-file /run/gb-mis/env up -d --no-deps realise-sync`
   - `docker compose --env-file /run/gb-mis/env up -d --no-deps etl`
   For each, check the BullMQ queue is being consumed:
   ```
   docker exec gb-mis-redis redis-cli LLEN bull:dhis2-sync:wait
   ```
   The depth should not be growing unboundedly. A small backlog while the worker starts is normal.
4. Restart the web app: `docker compose --env-file /run/gb-mis/env up -d --no-deps web`. Wait for: `curl -sf https://$WEB_HOST/api/health` to return 200.

---

## 6. Drop the maintenance banner

1. On the LB host: `sudo rm /etc/nginx/maintenance.flag && sudo nginx -s reload`.
2. Confirm normal traffic flows:
   `curl -sI https://$WEB_HOST/login | head -1` returns `HTTP/2 200`.

---

## 7. Post-deploy verification

Complete every check. Failure of any check triggers the rollback criteria in section 8.

1. **Login flow**: a known test account in `$KEYCLOAK_URL` realm `gb-mis` can complete an OIDC login and receive a JWT. Perform from the deploy bastion, not from the production host.
2. **Audit emission**: create a test record under the test account; query the audit store: `psql "$DB_AUDIT_URL" -c "SELECT action, entity_type, occurred_at FROM audit_log ORDER BY occurred_at DESC LIMIT 5;"`. The action must appear within 10 seconds.
3. **Hash chain**: trigger an on-demand audit hash-chain verification:
   ```
   docker exec gb-mis-api node dist/scripts/verify-audit-chain.js --since '5 minutes ago'
   ```
   Output: `OK <N> rows verified`.
4. **DHIS2 sync worker**: trigger a heartbeat job and verify it consumes:
   ```
   docker exec gb-mis-redis redis-cli LPUSH bull:dhis2-sync:heartbeat '{}'
   ```
   The heartbeat counter increments in `/health/ready`.
5. **Mobile sync endpoint**: `curl -sf -H "Authorization: Bearer $TEST_TOKEN" "https://$API_HOST/v1/sync/pull?resources=cases"` returns 200 with a JSON body.
6. **Public dashboard**: `curl -sf https://$WEB_HOST/public/dashboard | grep -q 'verified indicators'`.
7. **Error rate** in Sentry: no new error groups in the last 5 minutes attributable to the new release.
8. **API p95 latency**: under the 800 ms SLA target (per `ARCHITECTURE.md § Performance targets`). Check the **HTTP p95 latency** panel on the *GB MIS — API Operational* dashboard (`infra/grafana/dashboards/api-operational.json`).
9. **Audit volume**: not anomalously low (would indicate audit emission silently broken). Check the **Audit emit rate** panel on the same dashboard.

---

## 8. Rollback trigger criteria

Stop the deploy and execute `rollback.md` if **any** of these are true within the first 30 minutes after section 6:

- `/health/ready` returns non-200 for more than 60 consecutive seconds
- A migration step in section 4 fails after partial application
- Sentry shows a new error group at > 5 events / minute attributable to the release
- API p95 latency exceeds 1500 ms for 5 minutes
- The audit hash-chain verification reports a discrepancy
- A user's RLS scope is observed to leak (a county worker sees data from another county) — also triggers `incident-response.md`
- ⚠️ **MOGCSP approval required** to proceed despite a non-blocking failure (e.g. a single non-critical worker failing to start). Document the decision in the change record.

---

## 9. Close the change record

1. Capture: deploy start/end timestamps, image digests deployed, migration list applied, verification results, any anomalies.
2. File the record per `CONTRIBUTING.md § Change records`.
3. Notify the incident-channel: `Deploy $RELEASE_TAG complete; $N migrations applied; verification green.`
4. The on-call engineer remains attentive for the next 2 hours.
