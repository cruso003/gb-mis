# Runbook — Backup and Restore

**Audience.** MOGCSP ICT operations engineer.

**Targets.** Per `ARCHITECTURE.md § Performance targets`:

- **RPO 15 minutes** — backup frequency must keep loss below 15 minutes.
- **RTO 4 hours** — restore procedure must complete within 4 hours and be rehearsed quarterly.

**Scope.** This runbook covers PostgreSQL 16 (the primary data store) on the on-prem Docker Compose deployment. Keycloak's database, MinIO objects, Redis, and the application configuration each have a short section at the end. Mobile devices keep their own SQLCipher store and are not backed up centrally — that is by design (per `MOBILE_SQLCIPHER_BUILD.md`); the local store holds at most a few days of pending sync.

**Encryption.** All backups are GPG-encrypted with a key from a separate custody chain before leaving the database host (per `SECURITY.md § At rest`). The encryption key is **not** the same as the database column-encryption key — it is the dedicated backup key held by the MOGCSP backup-custody role.

**Storage.** Backups land in the MinIO `gb-mis-backups` bucket (or the cloud-DR bucket when the hosting model is hybrid, per `ARCHITECTURE.md § Hosting`). Survivor data **must not leave Liberia** without a specific legal basis (`CLAUDE.md` rule #4); confirm bucket residency before configuring.

---

## 1. Backup architecture

The production database runs continuous archiving to deliver a 15-minute RPO:

1. **Base backups** every 24 hours at 02:00 Africa/Monrovia via `pg_basebackup`. Output: a directory tarball.
2. **WAL archiving** continuously. The `archive_command` ships each completed WAL segment to MinIO within seconds of close, and Postgres is configured with `archive_timeout = 5min` so WAL is forced-rotated even on idle databases — this caps the loss to 5 minutes in the worst case (within the 15-minute RPO).
3. **Retention**:
   - Base backups: 30 days online in MinIO, 1 year in cold storage
   - WAL segments: 35 days online (covers 30-day base + 5-day cushion)
   - Audit log dumps: 7 years (per `SECURITY.md § Properties`), tiered to cold storage after 90 days

WAL files and base backups together let us restore to **any point in time** in the retention window — point-in-time recovery (PITR) is the default restore mode.

---

## 2. Configuration prerequisites (one-time)

These must already be set on the Postgres container before backups run. Verify on every quarterly DR rehearsal.

1. `postgresql.conf`:
   ```
   wal_level = replica
   archive_mode = on
   archive_command = '/usr/local/bin/wal-archive.sh "%p" "%f"'
   archive_timeout = 5min
   max_wal_senders = 3
   ```
2. `/usr/local/bin/wal-archive.sh` is shipped via `infra/docker/postgres/`. It:
   - GPG-encrypts the WAL segment with the backup public key
   - Uploads to `s3://$BACKUP_BUCKET/wal/$DB_HOST/%f.gpg` via the MinIO client
   - Returns 0 on success, non-zero on any failure (Postgres halts archiving on failure — never silently drops WAL)
3. The `pg_basebackup` schedule is a cron job inside a sidecar container:
   ```
   0 2 * * *  /usr/local/bin/take-base-backup.sh
   ```
4. The backup user is a dedicated Postgres role with **only** `REPLICATION` and `pg_read_all_data` privileges.

---

## 3. Manual backup (pre-deploy / pre-migration / on-demand)

Use this before any deploy that runs migrations (per `deploy.md § 1, item 6`).

1. SSH to the database host (`ssh ops@$DB_HOST`).
2. Trigger an immediate base backup:
   ```
   docker exec gb-mis-postgres-backup /usr/local/bin/take-base-backup.sh --label "pre-deploy-$RELEASE_TAG"
   ```
3. Wait for the script to print `BASE BACKUP COMPLETE: $BACKUP_PATH SHA256=$SHA`.
4. Force a WAL switch so the latest committed transactions are archived immediately:
   ```
   docker exec gb-mis-postgres psql -U $DB_BACKUP_USER -d $DB_NAME -c "SELECT pg_switch_wal();"
   ```
5. Capture the backup path, SHA-256, and the WAL LSN at the time of backup:
   ```
   docker exec gb-mis-postgres psql -U $DB_BACKUP_USER -d $DB_NAME -c "SELECT pg_current_wal_lsn();"
   ```
6. Record all three values in the change record. They are required to identify the restore point if rollback is invoked.

---

## 4. Verify a backup (do this on every backup, not just rehearsals)

Backups that have never been restored are not backups. The post-write verification is automated; the human-driven quarterly rehearsal is in section 7.

1. The verification job runs hourly and:
   - Lists the most recent base backup and the most recent WAL segment in `s3://$BACKUP_BUCKET/`
   - Re-computes the SHA-256 of the base backup tarball and compares against the manifest
   - Decrypts a small WAL segment with the backup private key and checks the magic bytes
   - Posts a green/red status to the Grafana backup-health panel
2. ⚠️ **MOGCSP approval required** to skip verification on any single backup (e.g. due to MinIO maintenance). Skipping unverified leaves you outside RPO compliance.
3. If verification reports red:
   - Page the on-call engineer
   - Re-take the backup (`section 3`) and verify
   - File an incident if the second attempt also fails (`incident-response.md § Lost / stolen device` is wrong; use the generic outage path with the MOGCSP ICT Director)

---

## 5. Restore — into an isolated environment

**Use this for**: rollback restores (`rollback.md § 4`), DR rehearsal, forensic investigation. The isolated environment is **not** the production database.

1. Provision an isolated Docker host (or a separate VM). It must be on a private network with no inbound traffic from production users.
2. Clone the production deployment skeleton to the isolated host and start only Postgres:
   ```
   git clone $REPO_URL gb-mis-restore && cd gb-mis-restore
   git checkout $RESTORE_TARGET_TAG
   docker compose --env-file /run/gb-mis-restore/env up -d postgres
   ```
3. Stop the freshly-started Postgres so the data directory is empty for the base backup overlay:
   ```
   docker compose --env-file /run/gb-mis-restore/env stop postgres
   ```
4. Identify the **target restore point**. For a deploy rollback, this is the LSN captured in `section 3, step 5`. For a DR rehearsal, this is "latest available."
5. Pull and decrypt the base backup nearest to (and earlier than) the target point:
   ```
   /opt/gb-mis/bin/restore-base-backup.sh \
     --bucket s3://$BACKUP_BUCKET \
     --target-lsn $TARGET_LSN \
     --output /var/lib/gb-mis-restore/postgres-data
   ```
   The script:
   - Selects the latest base backup taken at or before `$TARGET_LSN`
   - GPG-decrypts the tarball with the backup private key (held in the separate custody chain)
   - Verifies SHA-256 against the manifest
   - Extracts into the empty data directory
6. Stage the WAL segments needed to roll forward to the target point:
   ```
   /opt/gb-mis/bin/restore-wal.sh \
     --bucket s3://$BACKUP_BUCKET \
     --from-lsn $BASE_BACKUP_LSN \
     --to-lsn $TARGET_LSN \
     --restore-dir /var/lib/gb-mis-restore/postgres-data/pg_wal
   ```
7. Configure recovery in `postgresql.auto.conf` of the restored data directory:
   ```
   restore_command = 'cp /var/lib/gb-mis-restore/wal-staging/%f %p'
   recovery_target_lsn = '$TARGET_LSN'
   recovery_target_action = 'pause'
   ```
8. Start the isolated Postgres: `docker compose --env-file /run/gb-mis-restore/env up -d postgres`.
9. Watch the log until: `LOG: recovery has paused at $TARGET_LSN`. The database is now consistent at the target point and waiting for confirmation.
10. Run the verification queries in `section 6`. If everything passes, promote the restore:
    ```
    docker exec gb-mis-postgres-restore psql -U postgres -c "SELECT pg_wal_replay_resume();"
    ```
11. The restored database is now read-write. Capture a fresh logical dump (`pg_dump`) for the post-mortem record.

---

## 6. Verify after restore

Run all checks. Any failure aborts the restore and triggers a re-attempt or escalation.

1. **Connectivity**: `psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT 1;"` returns 1.
2. **Schema integrity**: `psql … -c "SELECT count(*) FROM pg_tables WHERE schemaname='public';"` matches the expected table count for `$RESTORE_TARGET_TAG`.
3. **RLS preserved**: `psql … -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity = false AND tablename IN ('gbv_cases','beneficiaries','incidents','services_provided','referrals','case_attachments','households','vsla_groups','community_sessions');"` returns **zero rows**. Any row here means RLS was lost in the restore — escalate.
4. **Audit hash chain**: run the verification job against the restored database:
   ```
   docker run --rm --env-file /run/gb-mis-restore/env $REGISTRY/gb-mis-api@$API_DIGEST node dist/scripts/verify-audit-chain.js --full
   ```
   Output: `OK <N> rows verified, chain intact from row 1 to row N`. A break in the chain at the restore point itself is acceptable and expected (the next live row will hash the prior row); a break **earlier** indicates corruption — escalate.
5. **Row counts on key entities** (compare with the pre-deploy capture, accounting for the time gap):
   ```
   psql … -c "SELECT 'gbv_cases' tbl, count(*) FROM gbv_cases UNION ALL
              SELECT 'beneficiaries', count(*) FROM beneficiaries UNION ALL
              SELECT 'audit_log', count(*) FROM audit_log;"
   ```
6. **Column-encryption sanity**: pick a known-encrypted column (e.g. `gbv_cases.notes_ciphertext`) and confirm the value decrypts with the production KEK in the KMS. If the KEK is unreachable from the isolated host, this check is deferred until restore is promoted to production.

---

## 7. Quarterly DR rehearsal

Per `SECURITY.md § Performance targets` ("rehearsed quarterly"), once every 3 months:

1. Schedule the rehearsal with the MOGCSP ICT Director and the DPO. The DPO's involvement is required because the rehearsal handles real survivor data.
2. ⚠️ **MOGCSP approval required** to use a real backup containing survivor data in the rehearsal environment. The isolated host must be on a network the DPO has cleared and inside Liberia.
3. Run sections 5 and 6 against the latest backup. Time each step.
4. Compare elapsed time against the 4-hour RTO. If exceeded, file a finding and improve before the next rehearsal.
5. **Wipe the isolated environment** when the rehearsal completes. The wipe procedure is `incident-response.md § Lost / stolen device` adapted for a host: `shred -u` on every file, `dd if=/dev/zero` on the data volume, decommission the VM. Survivor data must not persist on rehearsal infrastructure.
6. File the rehearsal report in the MOGCSP document system.

---

## 8. Keycloak database

Keycloak shares `$DB_HOST` Postgres but uses the `keycloak` database. Backups follow the same `pg_basebackup` + WAL flow — the same base backup captures both `gbmis` and `keycloak` databases. Restore restores both atomically.

For Keycloak-only restores (rare): use `pg_dump` of the `keycloak` database alone, take it during a Keycloak downtime window, and restore via `pg_restore` against an empty `keycloak` database.

---

## 9. MinIO objects

MinIO holds case attachments, exports, and the backup tarballs themselves. Backups of MinIO follow a different schedule because objects are append-mostly:

1. **Versioning** is enabled on `gb-mis-attachments` and `gb-mis-exports` — overwrite and delete are recoverable for 30 days.
2. **Replication** to a second MinIO target (cloud-DR or second on-prem rack) runs continuously when the hosting model includes it. ⚠️ **MOGCSP approval required** before configuring cross-region replication: per `CLAUDE.md` rule #4, survivor-related attachments must not leave Liberia without a legal basis.
3. **Deep backup** of MinIO uses `mc mirror` to a separate encrypted volume nightly:
   ```
   mc mirror --overwrite --remove --encrypt-key 's3://gb-mis-attachments=$MINIO_ENCRYPT_KEY' \
     local/gb-mis-attachments cold/$DATE/gb-mis-attachments
   ```
4. **Restore**: `mc mirror` from cold back to live, then re-emit audit events flagging the restored objects so consuming reports can re-link them.

---

## 10. Redis

Redis holds BullMQ queues and short-lived caches. It is **not** part of the formal backup story — losing Redis costs at most a few minutes of unprocessed jobs, well inside RPO. Redis runs with `appendonly yes` so a process crash recovers without data loss; a node loss recovers via worker re-queueing on next sync cycle.

---

## 11. Application configuration

The `.env` files used at runtime never live on disk in the production host (they are tmpfs-mounted from KMS, per `deploy.md § 3, step 4`). The KMS itself has its own backup story per the KMS vendor's documentation. For the on-prem HashiCorp Vault path: snapshot weekly via `vault operator raft snapshot save` and ship to the same `gb-mis-backups` bucket, GPG-encrypted with the backup key.
