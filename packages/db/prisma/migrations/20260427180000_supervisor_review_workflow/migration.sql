-- ─── Supervisor review workflow ─────────────────────────────────────────────
--
-- TOR-explicit ("supervisor review workflow for counties"). Until this
-- migration, the case lifecycle was: case worker creates → status OPEN.
-- That meant survivor records could enter service workflows without a
-- supervisor having seen them — a real risk in a system where the case
-- worker is also the first responder.
--
-- New lifecycle:
--   case worker creates  → status PENDING_REVIEW (default)
--   supervisor approves  → status OPEN (case-management work can start)
--   supervisor returns   → status RETURNED_FOR_REVISION
--   case worker resubmits → status PENDING_REVIEW (cycle continues)
--
-- The supervisor's notes are stored on the case itself (one slot, the
-- latest). The full chronological history is reconstructable from the
-- audit_log — every state transition is audited.

-- 1. Extend the CaseStatus enum
ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'PENDING_REVIEW';
ALTER TYPE "CaseStatus" ADD VALUE IF NOT EXISTS 'RETURNED_FOR_REVISION';

-- 1a. Extend the AuditAction enum so supervisor activity is queryable
-- by action class without parsing free-form payloads.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CASE_SUBMIT_FOR_REVIEW';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CASE_APPROVE';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CASE_RETURN_FOR_REVISION';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CASE_RESUBMIT_FOR_REVIEW';

-- 2. Add review-tracking columns
ALTER TABLE gbv_cases
  ADD COLUMN IF NOT EXISTS "reviewerId" UUID NULL REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS "reviewNotes" TEXT NULL,
  ADD COLUMN IF NOT EXISTS "submittedForReviewAt" TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS "reviewCount" INTEGER NOT NULL DEFAULT 0;

-- 3. Existing rows: backfill submittedForReviewAt for rows we want to be
-- treated as "already reviewed" so they don't disappear into the queue.
-- For rows whose status is already past PENDING (anything that isn't a
-- new-style PENDING_REVIEW), set submittedForReviewAt to createdAt so the
-- timeline stays coherent.
UPDATE gbv_cases
SET "submittedForReviewAt" = "createdAt"
WHERE "submittedForReviewAt" IS NULL;

-- 4. New cases default to PENDING_REVIEW at the application layer (Prisma
-- @default annotation, not a DB default — so existing OPEN rows stay OPEN).
-- We deliberately do not change the column default here; the application
-- decides initial status so future workflow shapes (e.g. a draft state)
-- don't require another migration.
