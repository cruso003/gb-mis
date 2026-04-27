# Runbook — Rollback a Bad Deployment

**Audience.** MOGCSP ICT operations engineer with shell access to the production host, the deploy bastion, and the KMS.

**Use this runbook when.** A production deploy meets any rollback trigger criterion in `deploy.md § 8`, or post-deploy monitoring shows a release-induced regression that the on-call cannot mitigate by configuration.

**Decision tree.** This runbook handles two distinct cases:

- **Application-only rollback** (sections 2–3): the new release was deployed but **migrations are compatible** with the previous release (i.e. only additive — added columns/tables/indexes, no destructive changes). This is the common case and is fast.
- **Migration rollback** (section 4): the new release contains migrations that broke the previous release's contract (dropped a column, renamed a table, type-narrowed a column). This is harder and requires a database restore.

Pick the case before touching production. If unsure, default to application-only and re-evaluate once stable.

---

## 1. Pre-rollback gate

1. Confirm the rollback trigger with the on-call engineer. Capture the trigger reason in the incident channel.
2. ⚠️ **MOGCSP approval required** for any rollback that requires a database restore (section 4). The MOGCSP ICT Director must authorise the data loss window before the restore begins.
3. Identify the previous good release: `$PREV_TAG` and the corresponding image digests (`$PREV_API_DIGEST`, `$PREV_WEB_DIGEST`, etc.) — these are recorded in the previous deploy's change record.
4. Re-engage the maintenance banner from `deploy.md § 2`.
5. Snapshot the **current broken state** before changing anything:
   - `docker compose --env-file /run/gb-mis/env logs --since 10m > /tmp/rollback-logs-$(date +%s).txt`
   - Logical backup of the current database (sometimes the broken release wrote partial data that must be examined): see `backup-restore.md § Manual backup`. Tag the backup file `pre-rollback-from-$RELEASE_TAG`.

---

## 2. Application-only rollback

Use when the new release's migrations were additive and the previous release can run against the new schema.

1. On the production API host (`ssh ops@$API_HOST`), change to `/opt/gb-mis`.
2. Check out the previous tag: `git checkout $PREV_TAG`. The `docker-compose.yml` and `.env.example` for the previous release become canonical again.
3. Refresh secrets: `sudo /opt/gb-mis/bin/refresh-secrets.sh`.
4. Pull the previous images by digest: `docker compose --env-file /run/gb-mis/env pull`.
5. Restart application services (workers and API and web) — Postgres, Redis, Keycloak, MinIO, and pgBouncer are not touched in this path:
   - `docker compose --env-file /run/gb-mis/env up -d --no-deps api`
   - `docker compose --env-file /run/gb-mis/env up -d --no-deps dhis2-sync realise-sync etl`
   - `docker compose --env-file /run/gb-mis/env up -d --no-deps web`
6. Wait for `curl -sf https://$API_HOST/health/ready` to return `{"status":"ok",…}`.
7. Drop the maintenance banner per `deploy.md § 6`.
8. Re-run `deploy.md § 7` verification against the rolled-back release. Every check must pass.

If verification fails again on the previous release, escalate to disaster recovery (`disaster-recovery.md`) — this indicates the broken state is not solely from the new release.

---

## 3. Post-application-rollback cleanup

1. Drain and re-process any queued sync records: the BullMQ jobs may have been authored against the new API contract. Inspect `bull:dhis2-sync:failed`, `bull:realise-sync:failed`, `bull:etl:failed`:
   ```
   docker exec gb-mis-redis redis-cli LRANGE bull:dhis2-sync:failed 0 -1
   ```
   Failed jobs that depend on schema changes from the rolled-back release must be discarded. Failed jobs unrelated to the release can be retried.
2. Mobile clients with pending sync from the bad release window: their `sync_records` rows remain `PENDING` and will retry against the rolled-back API. The protocol's "server is authoritative on conflicts" rule (`SYNC_PROTOCOL.md`) handles divergence.
3. Notify the incident channel: `Rolled back to $PREV_TAG; verification green; investigating root cause of $RELEASE_TAG regression.`

---

## 4. Migration rollback (database restore required)

Use when the new release dropped, renamed, or type-narrowed a column/table that the previous release reads. Forward-only schemas plus the previous-release code is the path; we **never** auto-revert migrations because Prisma migrations are not reversible by design.

1. ⚠️ **MOGCSP approval required** before proceeding. The restore window equals (deploy start) → (now) and represents the data loss window. Get the ICT Director's signed authorisation in the change record.
2. Confirm the **most recent backup taken before the deploy**: it is the backup captured in `deploy.md § 1, item 6`. The path was recorded in the change record.
3. Stop all application services so they cannot write during the restore:
   ```
   docker compose --env-file /run/gb-mis/env stop api web dhis2-sync realise-sync etl
   ```
4. Drain pgBouncer's pool to ensure no in-flight transactions: `docker exec gb-mis-pgbouncer psql -p 6432 -U pgbouncer pgbouncer -c "PAUSE $DB_NAME;"`.
5. Execute the database restore per `backup-restore.md § Restore`. Use the pre-deploy backup file. Restore into the **production database** (in-place restore) or — if the restore fits the maintenance window — into a temporary database that is then renamed; the latter is safer.
6. Once the restore reports complete and the database integrity check passes (`backup-restore.md § Verify after restore`), un-pause pgBouncer:
   `docker exec gb-mis-pgbouncer psql -p 6432 -U pgbouncer pgbouncer -c "RESUME $DB_NAME;"`.
7. Check out and start the previous release as in section 2 (steps 1–6).
8. Run `deploy.md § 7` verification.
9. Re-process any sync records or audit events that were captured between the pre-deploy backup and the restore as part of the post-incident review. Survivor-impacting losses must be reported per `incident-response.md § Accidental data disclosure (internal)` even if the disclosure was self-inflicted by the rollback.

---

## 5. Keycloak schema rollback

Keycloak runs migrations on startup and shares the `$DB_HOST` Postgres instance (separate database `keycloak`). A Keycloak version downgrade is **not supported** by Keycloak itself.

1. Application-only rollbacks do not change the Keycloak version — skip this section.
2. If the rollback target is on an older Keycloak version, treat it as a disaster-recovery scenario and follow `disaster-recovery.md` for the Keycloak database. Do not attempt a downgrade in place.

---

## 6. MinIO and Redis

1. **MinIO** state is rarely affected by a rollback. Object writes from the bad release window remain — they are referenced by the audit log and are kept. No action.
2. **Redis** holds BullMQ queues and short-lived caches. After an application rollback, drain known-bad job classes (section 3, step 1). Do not flush Redis wholesale: it would lose pending jobs that pre-date the bad release.

---

## 7. Audit and post-mortem

1. Every rollback emits a deploy-rollback audit event automatically when the API restarts. Verify: `psql "$DB_AUDIT_URL" -c "SELECT * FROM audit_log WHERE action='DEPLOY_ROLLBACK' ORDER BY occurred_at DESC LIMIT 1;"`.
2. Schedule a post-mortem within 5 working days. The post-mortem must answer: what failed in CI to let this reach production, what's the missing test, and what changes to the deploy gate prevent recurrence.
3. ⚠️ **MOGCSP approval required** before re-attempting the deploy after fixes. The fix release goes through the full `deploy.md` flow with the MOGCSP ICT Director's renewed sign-off.
