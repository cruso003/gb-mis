-- RLS Policy Template for county-scoped tables
-- Usage: replace :table_name and :fk_column with actual values.
-- Run this in the migration for every new table carrying county-scoped data.
-- See SECURITY.md § Row-level security for the full policy rationale.

-- 1. Enable RLS on the table
ALTER TABLE :table_name ENABLE ROW LEVEL SECURITY;
ALTER TABLE :table_name FORCE ROW LEVEL SECURITY;

-- 2. Read policy — user can read rows in their assigned org units
CREATE POLICY rls_:table_name_read ON :table_name
  FOR SELECT
  USING (
    -- SUPER_ADMIN bypass (requires two-person auth, always logged)
    current_setting('app.bypass_rls', true) = 'on'
    OR
    -- User can see rows within their org unit scope (including parent scopes)
    :fk_column IN (
      SELECT ou.id FROM org_units ou
      WHERE ou.id IN (
        SELECT uos.org_unit_id FROM user_org_unit_scopes uos
        WHERE uos.user_id = current_setting('app.current_user_id', true)::uuid
      )
      -- Supervisors see the full subtree of their assigned org units
      OR ou.id IN (
        WITH RECURSIVE subtree AS (
          SELECT id FROM org_units
          WHERE id IN (
            SELECT org_unit_id FROM user_org_unit_scopes
            WHERE user_id = current_setting('app.current_user_id', true)::uuid
          )
          UNION ALL
          SELECT o.id FROM org_units o
          JOIN subtree s ON o.parent_id = s.id
        )
        SELECT id FROM subtree
      )
    )
  );

-- 3. Write policies — same scope restriction applies to INSERTs and UPDATEs
CREATE POLICY rls_:table_name_insert ON :table_name
  FOR INSERT
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR
    :fk_column IN (
      SELECT uos.org_unit_id FROM user_org_unit_scopes uos
      WHERE uos.user_id = current_setting('app.current_user_id', true)::uuid
    )
  );

CREATE POLICY rls_:table_name_update ON :table_name
  FOR UPDATE
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR
    :fk_column IN (
      SELECT uos.org_unit_id FROM user_org_unit_scopes uos
      WHERE uos.user_id = current_setting('app.current_user_id', true)::uuid
    )
  );

-- Note: DELETE is intentionally absent from survivor-linked tables.
-- Use soft deletes (deletedAt) instead.
