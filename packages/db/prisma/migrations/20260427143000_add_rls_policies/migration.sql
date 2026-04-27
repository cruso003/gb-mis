-- ─── Row-level security policies for county-scoped survivor data ─────────────
--
-- Closes the B4 gap from docs/pen-test/hardening-checklist.md and honours
-- CLAUDE.md rule #11: "RLS policies are defence-in-depth. Do not rely on
-- application-layer filtering alone for county-scoped data."
--
-- Scope set:
--   Direct (orgUnitId column):
--     beneficiaries, households, vsla_groups, community_sessions, gbv_cases
--   Indirect via gbv_cases.orgUnitId (caseId join):
--     incidents, services_provided, referrals, case_attachments
--   Indirect via beneficiaries.orgUnitId (beneficiaryId join):
--     consent_records, livelihood_grants, vsla_memberships,
--     household_members, session_attendances
--
-- Per-request session variables (set by apps/api RlsMiddleware):
--   app.current_user_id  — UUID of the authenticated user
--   app.bypass_rls       — 'on' for SUPER_ADMIN / ADMIN; absent otherwise
--
-- ENABLE ROW LEVEL SECURITY (no FORCE) is intentional. The migration role
-- (typically the Postgres database owner) is not subject to RLS, so
-- migrations and seed scripts continue to run unhindered. In production,
-- the API must connect as a *non-owner* role (`gb_mis_app`) for which RLS
-- applies — see docs/pen-test/hardening-checklist.md item B4 for the
-- production role provisioning step.

-- ─── Helper function: org-unit subtree the current user can access ───────────
-- Includes the user's directly assigned units AND all descendants. Defined
-- once so policies stay readable. STABLE so PostgreSQL can cache results
-- within a single query.
CREATE OR REPLACE FUNCTION current_user_org_unit_scope() RETURNS UUID[]
LANGUAGE SQL STABLE AS $fn$
  WITH RECURSIVE assigned AS (
    SELECT "orgUnitId" AS id
    FROM user_org_unit_scopes
    WHERE "userId" = NULLIF(current_setting('app.current_user_id', true), '')::UUID
  ),
  subtree AS (
    SELECT id FROM org_units WHERE id IN (SELECT id FROM assigned)
    UNION ALL
    SELECT o.id FROM org_units o
    JOIN subtree s ON o."parentId" = s.id
  )
  SELECT COALESCE(array_agg(id), ARRAY[]::UUID[]) FROM subtree;
$fn$;

COMMENT ON FUNCTION current_user_org_unit_scope() IS
  'Returns the UUID[] of org units the current user can access (assigned + descendants). Reads app.current_user_id session variable. Empty array if unset.';

-- ─── Direct-scoped tables ────────────────────────────────────────────────────

-- beneficiaries
ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_beneficiaries_scope ON beneficiaries
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR "orgUnitId" = ANY(current_user_org_unit_scope())
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR "orgUnitId" = ANY(current_user_org_unit_scope())
  );

-- households
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_households_scope ON households
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR "orgUnitId" = ANY(current_user_org_unit_scope())
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR "orgUnitId" = ANY(current_user_org_unit_scope())
  );

-- vsla_groups
ALTER TABLE vsla_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_vsla_groups_scope ON vsla_groups
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR "orgUnitId" = ANY(current_user_org_unit_scope())
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR "orgUnitId" = ANY(current_user_org_unit_scope())
  );

-- community_sessions
ALTER TABLE community_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_community_sessions_scope ON community_sessions
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR "orgUnitId" = ANY(current_user_org_unit_scope())
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR "orgUnitId" = ANY(current_user_org_unit_scope())
  );

-- gbv_cases
ALTER TABLE gbv_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_gbv_cases_scope ON gbv_cases
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR "orgUnitId" = ANY(current_user_org_unit_scope())
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR "orgUnitId" = ANY(current_user_org_unit_scope())
  );

-- ─── Indirect via gbv_cases (caseId join) ────────────────────────────────────

-- incidents
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_incidents_scope ON incidents
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM gbv_cases c
      WHERE c.id = incidents."caseId"
        AND c."orgUnitId" = ANY(current_user_org_unit_scope())
    )
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM gbv_cases c
      WHERE c.id = incidents."caseId"
        AND c."orgUnitId" = ANY(current_user_org_unit_scope())
    )
  );

-- services_provided
ALTER TABLE services_provided ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_services_provided_scope ON services_provided
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM gbv_cases c
      WHERE c.id = services_provided."caseId"
        AND c."orgUnitId" = ANY(current_user_org_unit_scope())
    )
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM gbv_cases c
      WHERE c.id = services_provided."caseId"
        AND c."orgUnitId" = ANY(current_user_org_unit_scope())
    )
  );

-- referrals
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_referrals_scope ON referrals
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM gbv_cases c
      WHERE c.id = referrals."caseId"
        AND c."orgUnitId" = ANY(current_user_org_unit_scope())
    )
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM gbv_cases c
      WHERE c.id = referrals."caseId"
        AND c."orgUnitId" = ANY(current_user_org_unit_scope())
    )
  );

-- case_attachments
ALTER TABLE case_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_case_attachments_scope ON case_attachments
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM gbv_cases c
      WHERE c.id = case_attachments."caseId"
        AND c."orgUnitId" = ANY(current_user_org_unit_scope())
    )
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM gbv_cases c
      WHERE c.id = case_attachments."caseId"
        AND c."orgUnitId" = ANY(current_user_org_unit_scope())
    )
  );

-- ─── Indirect via beneficiaries (beneficiaryId join) ─────────────────────────

-- consent_records
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_consent_records_scope ON consent_records
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM beneficiaries b
      WHERE b.id = consent_records."beneficiaryId"
        AND b."orgUnitId" = ANY(current_user_org_unit_scope())
    )
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM beneficiaries b
      WHERE b.id = consent_records."beneficiaryId"
        AND b."orgUnitId" = ANY(current_user_org_unit_scope())
    )
  );

-- livelihood_grants
ALTER TABLE livelihood_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_livelihood_grants_scope ON livelihood_grants
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM beneficiaries b
      WHERE b.id = livelihood_grants."beneficiaryId"
        AND b."orgUnitId" = ANY(current_user_org_unit_scope())
    )
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM beneficiaries b
      WHERE b.id = livelihood_grants."beneficiaryId"
        AND b."orgUnitId" = ANY(current_user_org_unit_scope())
    )
  );

-- vsla_memberships (scoped via beneficiary; vsla_group is also scoped but
-- using beneficiary keeps the policy single-source)
ALTER TABLE vsla_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_vsla_memberships_scope ON vsla_memberships
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM beneficiaries b
      WHERE b.id = vsla_memberships."beneficiaryId"
        AND b."orgUnitId" = ANY(current_user_org_unit_scope())
    )
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM beneficiaries b
      WHERE b.id = vsla_memberships."beneficiaryId"
        AND b."orgUnitId" = ANY(current_user_org_unit_scope())
    )
  );

-- household_members (scoped via beneficiary)
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_household_members_scope ON household_members
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM beneficiaries b
      WHERE b.id = household_members."beneficiaryId"
        AND b."orgUnitId" = ANY(current_user_org_unit_scope())
    )
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM beneficiaries b
      WHERE b.id = household_members."beneficiaryId"
        AND b."orgUnitId" = ANY(current_user_org_unit_scope())
    )
  );

-- session_attendances (scoped via session.orgUnitId; beneficiary is optional)
ALTER TABLE session_attendances ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_session_attendances_scope ON session_attendances
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM community_sessions s
      WHERE s.id = session_attendances."sessionId"
        AND s."orgUnitId" = ANY(current_user_org_unit_scope())
    )
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR EXISTS (
      SELECT 1 FROM community_sessions s
      WHERE s.id = session_attendances."sessionId"
        AND s."orgUnitId" = ANY(current_user_org_unit_scope())
    )
  );
