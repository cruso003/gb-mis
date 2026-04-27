# Runbook — Disaster Recovery

**Audience.** MOGCSP ICT Director, on-call SRE, MOGCSP DPO, MOGCSP key-custody role-holders.

**Use this runbook when.** The primary production site is unrecoverable and the system must be re-established at the DR site. Examples:

- Hardware loss (fire, flood, theft) at the primary datacenter
- Catastrophic data corruption that the backup cannot heal in place
- Long-running provider outage that exceeds the RTO

This is **not** for ordinary production incidents (use `incident-response.md`) or routine restores (use `backup-restore.md` directly).

**Targets.** Per `ARCHITECTURE.md § Performance targets`:

- **RTO 4 hours** from disaster declared to system serving production users at the DR site
- **RPO 15 minutes** of data loss from the disaster moment

These are gating. If the procedure begins to exceed RTO, escalate to the ICT Director — extending the window is acceptable only with documented justification.

---

## 1. Disaster declaration

DR is invoked only by a named role-holder, not by any on-call engineer.

1. The on-call engineer pages the **MOGCSP ICT Director** and the **DPO** simultaneously when they suspect the primary is unrecoverable.
2. The ICT Director assesses: is this recoverable in place within RTO? If yes → continue with `backup-restore.md` against the live site. If no → declare DR.
3. ⚠️ **MOGCSP approval required**: the ICT Director (or, if unavailable, the Deputy Minister for Gender) formally declares DR in the incident channel. This declaration starts the 4-hour RTO clock.
4. The DPO is informed — DR involves moving survivor data and the DPO must know whether the DR site is inside Liberia (per `CLAUDE.md` rule #4).
5. The World Bank PMU receives a written notification within 24 hours of declaration (per `SECURITY.md § Communications`). The notification template lives in the MOGCSP document system.

---

## 2. Pre-conditions verified before activation

Each must already be true at the moment of disaster. They are validated at every quarterly DR rehearsal (`backup-restore.md § 7`); if any are false at activation, escalate immediately.

1. **DR site is provisioned and reachable.** Per `ARCHITECTURE.md § Hosting`, the DR site model is one of:
   - Hybrid hosting → on-premise primary, cloud DR
   - Cloud primary → on-premise MOGCSP DR
   - Fully on-prem → second MOGCSP site DR
   ⚠️ **MOGCSP approval required** to deviate (e.g. if the DR site is also unreachable, the Deputy Minister authorises a temporary alternate location).
2. **Backups are current.** The Grafana backup-health panel shows the last verified backup is within 15 minutes (RPO).
3. **Backup encryption key is reachable from the DR site.** The MOGCSP backup-custody role-holders can produce the GPG private key on the DR-site key-custody chain. **Two-person authorisation is required to unwrap** (per `SECURITY.md § Key management`).
4. **DR-site KMS is reachable.** The wrapping keys used by `pgcrypto` for column-level encryption live in the DR-site KMS replica. Without these, the data restores but cannot be decrypted at the application layer.
5. **DR-site DNS records exist** but currently point to the primary; switching is the final cutover step (section 7).

If any pre-condition fails, the RTO target may be unachievable — declare a degraded-DR window with the Deputy Minister.

---

## 3. Stand up infrastructure at the DR site

Run sections 3–5 in parallel where possible. Two-engineer execution is the assumption.

1. **Engineer A (database track):**
   1. SSH to the DR-site database host: `ssh ops@$DR_DB_HOST`.
   2. Confirm the `postgres-data` volume is empty: `ls /var/lib/gb-mis-dr/postgres-data` returns nothing.
   3. Pull the latest base backup and the WAL chain from the backup bucket. Use the latest base backup and roll WAL forward to the most recent verified segment:
      ```
      /opt/gb-mis/bin/restore-base-backup.sh \
        --bucket s3://$BACKUP_BUCKET \
        --target-lsn LATEST \
        --output /var/lib/gb-mis-dr/postgres-data
      /opt/gb-mis/bin/restore-wal.sh \
        --bucket s3://$BACKUP_BUCKET \
        --from-lsn $BASE_LSN \
        --to-lsn LATEST \
        --restore-dir /var/lib/gb-mis-dr/postgres-data/pg_wal
      ```
   4. Configure recovery to play forward to the latest WAL and then promote (no pause):
      ```
      restore_command = 'cp /var/lib/gb-mis-dr/wal-staging/%f %p'
      recovery_target_action = 'promote'
      ```
   5. Start Postgres: `docker compose --env-file /run/gb-mis-dr/env up -d postgres`. Wait for `LOG: redo done at $LSN` then `LOG: archive recovery complete` then `LOG: database system is ready to accept connections`.
   6. Run `backup-restore.md § 6 Verify after restore`. Every check must pass before this database serves traffic.

2. **Engineer B (services track):**
   1. SSH to the DR-site application host: `ssh ops@$DR_API_HOST`.
   2. Refresh secrets from the DR KMS replica: `sudo /opt/gb-mis/bin/refresh-secrets.sh --kms $DR_KMS`.
   3. Pull the application images by digest. Use the digests from the **last successful production deploy** recorded in the most recent change record — DR brings up the last known good release, not whatever is in `main`.
   4. Start the supporting stateful services: pgBouncer, Redis, MinIO, Keycloak. Order: pgBouncer (depends on Postgres being up — coordinate with Engineer A), Redis (independent), MinIO (independent), Keycloak (depends on Postgres and the `keycloak` database being restored).
   5. **MinIO objects**: if MinIO replication was active, the DR-site MinIO already holds the objects. If not, restore from the cold backup per `backup-restore.md § 9`.
   6. **Keycloak**: starts against the restored `keycloak` database. Verify the realm imports are present: `curl -sf $DR_KEYCLOAK_URL/realms/gb-mis/.well-known/openid-configuration`.

---

## 4. Bring the application up at the DR site

Only after section 3 reports green from both engineers.

1. Start the API: `docker compose --env-file /run/gb-mis-dr/env up -d --no-deps api`. Health check: `curl -sf https://$DR_API_HOST/health/ready` returns `{"status":"ok",…}`.
2. Start workers: `docker compose --env-file /run/gb-mis-dr/env up -d --no-deps dhis2-sync realise-sync etl`.
3. Start the web app: `docker compose --env-file /run/gb-mis-dr/env up -d --no-deps web`.
4. Run `deploy.md § 7` verification — the DR system is held to the same readiness bar as a normal deploy.
5. ⚠️ **MOGCSP approval required**: the ICT Director confirms DR-system readiness before DNS cutover.

---

## 5. Decide: full cutover vs. read-only

DR can be activated in two modes. The choice depends on confidence in the data integrity check and the duration the primary will remain offline.

1. **Full cutover** (default): the DR site becomes primary. Mobile and web traffic is redirected. The original primary stays offline until thoroughly investigated and reconstructed as the new DR site.
2. **Read-only** (rare): the DR site serves read traffic only while the primary is being repaired in place. Use this when the primary's failure is suspected to be a software bug whose fix is hours away and accepting writes at the DR site would create a divergence to reconcile later.

⚠️ **MOGCSP approval required** to choose read-only mode. Default is full cutover unless the ICT Director and the engineering lead jointly authorise read-only.

---

## 6. Mobile-client considerations

Mobile devices in the field do not know about the DR site. They will continue to fail their sync calls until DNS cuts over.

1. **Pending records on devices remain safe.** Per `SYNC_PROTOCOL.md`, records sit in the local SQLCipher store with status `PENDING` and will retry on next reachability.
2. **Cached access tokens may be stale.** After cutover the next sync will receive a 401, the app will refresh against Keycloak at the DR site, and re-attempt.
3. **App configuration** (`EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_KEYCLOAK_URL`) is set at build time. If the DR site uses different hostnames than the primary (rather than DNS cutover behind the same hostnames), an emergency over-the-air update of the app's config is required — coordinate with the mobile lead. The deploy DNS practice (same hostname both sites) avoids this.

---

## 7. DNS cutover

This is the action that exposes DR to live users. Do **not** perform it before sections 3–4 are green.

1. ⚠️ **MOGCSP approval required** to perform DNS cutover. The ICT Director gives explicit go-ahead in the incident channel.
2. On the DNS provider (or BIND zone file for self-hosted DNS), update the A / AAAA records:
   - `api.$DOMAIN` → `$DR_API_IP`
   - `app.$DOMAIN` → `$DR_WEB_IP`
   - `auth.$DOMAIN` → `$DR_KEYCLOAK_IP`
   - `s3.$DOMAIN` → `$DR_MINIO_IP` (if MinIO is exposed externally; otherwise it stays internal)
3. The TTL on these records is intentionally low (60 s) so cutover propagates within ≈ 1 minute. Confirm: `dig +short api.$DOMAIN @8.8.8.8` returns `$DR_API_IP`.
4. Browse to `https://app.$DOMAIN/login` and complete an OIDC login — the round trip must succeed via the DR-site Keycloak.
5. Trigger a heartbeat sync from a test mobile device or use the API directly with a test token: `curl -sf -H "Authorization: Bearer $TEST_TOKEN" "https://api.$DOMAIN/v1/sync/pull?resources=cases"`.

---

## 8. Communications during DR

1. **Internal**: continuous updates in the incident channel (Slack or Signal per `SECURITY.md § Communications`). Major milestones (DR declared, DNS cut over, system serving) are pinned.
2. **MOGCSP staff**: SMS or WhatsApp broadcast to county offices: "GB MIS is temporarily routed through the DR site. Mobile app will continue to work offline; web users may be prompted to log in again."
3. **Field workers**: explicit reassurance that no data they entered offline is lost.
4. **World Bank PMU**: written notification within 24 hours of DR declaration.
5. **Affected individuals**: **never** before MOGCSP leadership has been informed and a remediation plan is in place. The DPO directs whether this is needed at all (per `SECURITY.md § Communications`).

---

## 9. Post-DR stabilisation

For 48 hours after the DR system goes live:

1. The on-call engineer remains attentive; rotation doubles staffing.
2. Hourly check of: API error rate, sync success rate, audit emission rate, BullMQ queue depth.
3. The audit hash chain is re-verified daily (rather than nightly) until the DR site is confirmed stable.
4. ⚠️ **MOGCSP approval required** before reducing staffing back to normal — the ICT Director signs off when stability is demonstrated.

---

## 10. Returning to the primary site (failback)

When the original primary is repaired, the DR site is the new authoritative system and must be carefully replicated back to the (rebuilt) primary before any switchback.

1. Treat the rebuilt primary as a new DR site: stand it up using the procedure in section 3, but with the DR site as the source of truth.
2. Once it is in lockstep replication with the live DR site, ⚠️ **MOGCSP approval required** to invert the roles via DNS cutover (section 7 in reverse). Schedule this for a maintenance window.
3. Perform the standard `deploy.md § 7` verification before declaring failback complete.
4. The post-incident review documents: timeline, RTO actually achieved, RPO actually achieved (compute from the LSN gap), gaps versus plan, and improvements for the next quarterly rehearsal.

---

## 11. Post-incident review

Within 5 working days of returning to normal operation:

1. Document timeline of the disaster, the response, and every decision point.
2. Compute RTO and RPO actuals against the 4 h / 15 min targets. Any miss is a finding.
3. List recovery steps that took longer than estimated and propose specific runbook improvements.
4. Update this runbook directly with the lessons. The `docs/runbooks/` directory is versioned in Git — every DR event should leave a paper trail in the commit history.
5. The review is presented to the MOGCSP Technical Team and the World Bank PMU.
