-- ─── Tamper-evident audit hash chain ────────────────────────────────────────
--
-- Closes CLAUDE.md rule #10 ("Append-only at the database level... tamper-evident")
-- and the SECURITY.md § Properties definition:
--   rowHash = sha256(previousRowHash ‖ canonicalisedRow)
--
-- Until this migration, audit_events was append-only by convention only —
-- the application "promised" not to UPDATE or DELETE. This migration:
--   1. Adds rowHash + previousRowHash columns.
--   2. Computes the hash inside a BEFORE INSERT trigger so the application
--      cannot forget to set it (and so the algorithm is centralised).
--   3. Serialises concurrent audit inserts via an advisory lock so the
--      chain has a single deterministic linear order — without this, two
--      simultaneous emits could each read the same "latest" row and both
--      claim to be its successor, breaking the chain at that point.
--   4. Backfills existing rows so the chain is unbroken from row 1.
--   5. Adds blocking triggers on UPDATE and DELETE so tampering is denied
--      at the database level, not just the application — this is the
--      append-only enforcement the security model has promised since
--      day one.
--   6. Exposes audit_events_verify_chain() so the nightly verification
--      job (and the runbook CLI script) walk the chain server-side
--      rather than streaming all rows into Node memory.

-- ─── 1. New columns ─────────────────────────────────────────────────────────

ALTER TABLE audit_events
  ADD COLUMN IF NOT EXISTS "previousRowHash" BYTEA NULL,
  ADD COLUMN IF NOT EXISTS "rowHash"          BYTEA NULL;

-- ─── 2. Canonical-hash function ──────────────────────────────────────────────
-- Deterministic SHA-256 of (previous-row hash ‖ canonical JSON of this row).
-- Timestamps are normalised to UTC and serialised with explicit format so
-- different session timezones produce the same hash. Hash columns are NOT
-- part of the canonical form — that would be circular.

CREATE OR REPLACE FUNCTION audit_events_canonical_hash(row audit_events, prev_hash BYTEA)
RETURNS BYTEA LANGUAGE SQL IMMUTABLE AS $fn$
  SELECT digest(
    COALESCE(prev_hash, '\x'::BYTEA) ||
    convert_to(
      jsonb_build_object(
        'id',                     row.id,
        'occurredAt',             to_char(row."occurredAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
        'actorUserId',            row."actorUserId",
        'actorRole',              row."actorRole"::TEXT,
        'actorIp',                row."actorIp",
        'actorDeviceFingerprint', row."actorDeviceFingerprint",
        'action',                 row.action::TEXT,
        'entityType',             row."entityType",
        'entityId',               row."entityId",
        'beforeSnapshot',         row."beforeSnapshot",
        'afterSnapshot',          row."afterSnapshot",
        'requestId',              row."requestId",
        'success',                row.success,
        'reasonCode',             row."reasonCode",
        'additionalContext',      row."additionalContext"
      )::TEXT,
      'UTF8'
    ),
    'sha256'
  );
$fn$;

COMMENT ON FUNCTION audit_events_canonical_hash(audit_events, BYTEA) IS
  'Deterministic SHA-256 of (prev_hash || canonical JSON of audit_events row). Excludes the hash columns themselves. Used by the BEFORE INSERT trigger and the nightly verify function.';

-- ─── 3. BEFORE INSERT trigger that assigns the hash ─────────────────────────

CREATE OR REPLACE FUNCTION audit_events_assign_hash()
RETURNS TRIGGER LANGUAGE plpgsql AS $fn$
DECLARE
  latest_hash BYTEA;
BEGIN
  -- Serialise concurrent audit inserts. The lock is per-transaction; it
  -- is released automatically when this insert's transaction commits or
  -- rolls back. The key is a stable hash of the literal table name.
  PERFORM pg_advisory_xact_lock(hashtext('audit_events_hash_chain'));

  SELECT "rowHash" INTO latest_hash
  FROM audit_events
  ORDER BY "occurredAt" DESC, id DESC
  LIMIT 1;

  NEW."previousRowHash" := latest_hash;
  NEW."rowHash" := audit_events_canonical_hash(NEW, latest_hash);
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS audit_events_hash_trigger ON audit_events;
CREATE TRIGGER audit_events_hash_trigger
BEFORE INSERT ON audit_events
FOR EACH ROW EXECUTE FUNCTION audit_events_assign_hash();

-- ─── 4. Backfill existing rows so the chain is unbroken ─────────────────────
-- Walks existing audit rows in chronological order, assigns each one a
-- previousRowHash + rowHash. Must run BEFORE the append-only triggers in
-- §5 — they would otherwise block this UPDATE.

DO $back$
DECLARE
  rec       audit_events;
  prev_hash BYTEA := NULL;
  new_hash  BYTEA;
BEGIN
  FOR rec IN
    SELECT * FROM audit_events
    WHERE "rowHash" IS NULL
    ORDER BY "occurredAt" ASC, id ASC
  LOOP
    new_hash := audit_events_canonical_hash(rec, prev_hash);
    UPDATE audit_events
       SET "previousRowHash" = prev_hash,
           "rowHash"         = new_hash
     WHERE id = rec.id;
    prev_hash := new_hash;
  END LOOP;
END
$back$;

-- Now that every row has a hash, make rowHash NOT NULL.
ALTER TABLE audit_events
  ALTER COLUMN "rowHash" SET NOT NULL;

-- ─── 5. Append-only enforcement (deny UPDATE and DELETE) ────────────────────
-- CLAUDE.md rule #10: even SUPER_ADMIN cannot UPDATE or DELETE audit rows
-- via the application. The trigger denies it at the database level so the
-- application's promise is enforced, not assumed.
--
-- This is intentionally redundant with role-based grants — a defence in
-- depth. A future production setup will additionally connect the API as
-- a non-owner role with INSERT-only privileges on audit_events.

CREATE OR REPLACE FUNCTION audit_events_deny_modify()
RETURNS TRIGGER LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only — UPDATE and DELETE are forbidden (CLAUDE.md rule #10)';
END;
$fn$;

DROP TRIGGER IF EXISTS audit_events_no_update ON audit_events;
CREATE TRIGGER audit_events_no_update
BEFORE UPDATE ON audit_events
FOR EACH ROW EXECUTE FUNCTION audit_events_deny_modify();

DROP TRIGGER IF EXISTS audit_events_no_delete ON audit_events;
CREATE TRIGGER audit_events_no_delete
BEFORE DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION audit_events_deny_modify();

-- ─── 6. Verification function — walks the chain server-side ─────────────────
-- Returns one row per broken link. An empty result set means the chain
-- is intact from row 1 to the most recent row. The verification job and
-- the runbook CLI script both call this.

CREATE OR REPLACE FUNCTION audit_events_verify_chain(since_at TIMESTAMPTZ DEFAULT '-infinity'::TIMESTAMPTZ)
RETURNS TABLE(broken_id UUID, expected_hash BYTEA, actual_hash BYTEA, reason TEXT)
LANGUAGE plpgsql AS $fn$
DECLARE
  rec       audit_events;
  prev_hash BYTEA := NULL;
  expected  BYTEA;
BEGIN
  -- For partial verification, we need the prev_hash of the row just
  -- before `since_at` so the first row in the window has the right
  -- predecessor. Loading it once up front keeps the loop simple.
  IF since_at > '-infinity'::TIMESTAMPTZ THEN
    SELECT "rowHash" INTO prev_hash
    FROM audit_events
    WHERE "occurredAt" < since_at
    ORDER BY "occurredAt" DESC, id DESC
    LIMIT 1;
  END IF;

  FOR rec IN
    SELECT * FROM audit_events
    WHERE "occurredAt" >= since_at
    ORDER BY "occurredAt" ASC, id ASC
  LOOP
    IF rec."previousRowHash" IS DISTINCT FROM prev_hash THEN
      broken_id     := rec.id;
      expected_hash := prev_hash;
      actual_hash   := rec."previousRowHash";
      reason        := 'previousRowHash does not match the rowHash of the prior row';
      RETURN NEXT;
    END IF;

    expected := audit_events_canonical_hash(rec, prev_hash);
    IF rec."rowHash" IS DISTINCT FROM expected THEN
      broken_id     := rec.id;
      expected_hash := expected;
      actual_hash   := rec."rowHash";
      reason        := 'rowHash does not match the canonical hash of the row content (tampering)';
      RETURN NEXT;
    END IF;

    prev_hash := rec."rowHash";
  END LOOP;
  RETURN;
END;
$fn$;

COMMENT ON FUNCTION audit_events_verify_chain(TIMESTAMPTZ) IS
  'Walks the audit chain from `since_at` (default: from the beginning) and returns one row per broken link. Empty result set ⇒ chain intact.';
