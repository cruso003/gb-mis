# Roles & Permissions

The TOR names six user categories explicitly (administrators, case workers, supervisors, data entry clerks, analysts, viewers) and a seventh is implicit (a restricted super-admin for break-glass operations). This document defines those roles precisely and enumerates the permission matrix.

---

## The seven roles

### 1. `SUPER_ADMIN`

A very small number of people — typically one or two named individuals in MOGCSP's ICT unit plus a backup. Used for break-glass operations only: provisioning the first `ADMIN`, rotating cryptographic keys, recovering from a disaster, performing schema migrations in production.

- Cannot create or modify GBV cases
- Cannot decrypt column-level encrypted survivor data without completing a two-person authorisation flow
- Every `SUPER_ADMIN` session requires WebAuthn hardware-key MFA
- Every action is audit-logged with elevated scrutiny; a weekly report of all `SUPER_ADMIN` activity is sent to the Deputy Minister

### 2. `ADMIN`

The system administrators who run day-to-day platform operations. Typically MOGCSP's ICT unit plus designated consultants during delivery and support phases.

- Manages users, roles, org-unit scopes
- Configures integrations (DHIS2, REALISE, notification gateways)
- Manages the indicator catalog and DHIS2 mapping
- Reviews audit logs
- Triggers manual indicator recomputation
- Cannot directly read survivor-linked case notes — an admin who needs to see a specific case must request supervisor-level access via an audited workflow

### 3. `SUPERVISOR`

County-level supervisors overseeing case workers and data entry clerks in their jurisdiction. Examples: the LWEP coordinator for Bomi County, the senior MOGCSP officer in Grand Gedeh.

- Reviews and approves new GBV cases entered by case workers in their org-unit scope
- Assigns and reassigns cases within their team
- Reads full case detail including notes
- Can grant time-limited cross-org-unit access to a specific case for referrals
- Manages their team's user records (add/remove, not role elevation)
- Reviews local audit logs for their org unit
- Generates county-level reports

### 4. `CASE_WORKER`

Frontline case management staff. GBV case intake, service provision, referral execution. Typically the people with the most direct survivor contact.

- Creates new GBV cases within their org-unit scope
- Adds incidents, services, referrals to cases they own or are assigned
- Reads and updates cases they are assigned to
- Reads (but does not update) other cases in their org-unit scope — unless the case has been routed to them for referral
- Operates primarily on the mobile app; has limited web app access
- Cannot export case data in bulk

### 5. `DATA_ENTRY_CLERK`

Staff who perform high-volume data entry — community session attendance, livelihood grant disbursement records, beneficiary enrolment forms. Can work on the mobile app (for field events) or web app (for batch entry from paper records).

- Creates beneficiary records with the required consent workflow
- Records community session attendance
- Enters livelihood grant disbursement records (does not initiate the disbursement)
- Enters beneficiary visits and VSLA activity
- Cannot open GBV cases
- Cannot read GBV case details
- Can read aggregate dashboards

### 6. `ANALYST`

M&E staff and researchers. Focuses on indicator values, dashboards, exports for reporting.

- Reads all indicator values and metadata
- Enters manual indicator values with a provenance note (subject to supervisor approval for published values)
- Views all dashboards
- Generates and exports aggregate reports
- Exports anonymised, k-anonymity-protected datasets for research purposes (with REC approval)
- Cannot read row-level case or beneficiary data

### 7. `VIEWER`

Read-only access for executives, policy advisors, donor liaisons, and partner ministries. A Minister's chief of staff, a World Bank task team leader, or a LISGIS counterpart.

- Views aggregate dashboards and indicator values
- Reads the indicator catalog
- Reads public-facing reports
- Cannot see any individual-level data
- Cannot export (beyond downloading a dashboard image)

---

## Permission matrix

Each row is a capability; each column is a role. ✅ = permitted, ⚠️ = permitted with extra control (MFA re-challenge, supervisor approval, or scoping), ❌ = denied.

### Cases (GBV)

| Capability | SUPER_ADMIN | ADMIN | SUPERVISOR | CASE_WORKER | DATA_ENTRY_CLERK | ANALYST | VIEWER |
|---|---|---|---|---|---|---|---|
| List cases (metadata only) within own scope | ⚠️ break-glass | ⚠️ break-glass | ✅ | ✅ | ❌ | ❌ | ❌ |
| Read case detail (including notes) within own scope | ⚠️ break-glass | ⚠️ break-glass | ✅ | ✅ (assigned or own org) | ❌ | ❌ | ❌ |
| Create case | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update case | ❌ | ❌ | ✅ | ✅ (assigned) | ❌ | ❌ | ❌ |
| Add incident / service / referral | ❌ | ❌ | ✅ | ✅ (assigned) | ❌ | ❌ | ❌ |
| Assign / reassign case worker | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Supervisor review sign-off | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Grant cross-org access (time-bounded) | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Close case | ❌ | ❌ | ✅ | ✅ (assigned, with supervisor approval on close) | ❌ | ❌ | ❌ |
| Export case-level data | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Export aggregate case statistics (k-anonymity protected) | ⚠️ | ⚠️ | ✅ (own scope) | ❌ | ❌ | ✅ | ❌ |

### Beneficiaries

| Capability | SUPER_ADMIN | ADMIN | SUPERVISOR | CASE_WORKER | DATA_ENTRY_CLERK | ANALYST | VIEWER |
|---|---|---|---|---|---|---|---|
| List beneficiaries within scope | ⚠️ | ⚠️ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Read beneficiary detail | ⚠️ | ⚠️ | ✅ | ✅ (with consent) | ✅ (with consent) | ❌ | ❌ |
| Create beneficiary | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Update beneficiary | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Soft-delete / withdraw | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage consent record | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Record livelihood grant | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Export beneficiary-level data | ❌ | ❌ | ⚠️ (MFA + reason) | ❌ | ❌ | ❌ | ❌ |

### Community sessions and VSLAs

| Capability | SUPER_ADMIN | ADMIN | SUPERVISOR | CASE_WORKER | DATA_ENTRY_CLERK | ANALYST | VIEWER |
|---|---|---|---|---|---|---|---|
| Create / manage session records | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Record attendance | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create / manage VSLA groups | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| View session / VSLA reports | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ (aggregates) |

### Indicators and dashboards

| Capability | SUPER_ADMIN | ADMIN | SUPERVISOR | CASE_WORKER | DATA_ENTRY_CLERK | ANALYST | VIEWER |
|---|---|---|---|---|---|---|---|
| View indicator catalog | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View indicator values (verified) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| View indicator values (unverified) | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Manually enter indicator value | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (requires approval for publish) | ❌ |
| Approve manually entered value for publication | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Trigger indicator recomputation | ⚠️ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View dashboards (aggregate) | ✅ | ✅ | ✅ (scoped) | ✅ (scoped) | ✅ (scoped) | ✅ | ✅ |
| Export indicator dataset (aggregate) | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ⚠️ (dashboard image) |
| Manage indicator catalog entries | ❌ | ✅ (with M&E sign-off) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Edit indicator targets | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### User and role management

| Capability | SUPER_ADMIN | ADMIN | SUPERVISOR | CASE_WORKER | DATA_ENTRY_CLERK | ANALYST | VIEWER |
|---|---|---|---|---|---|---|---|
| Create user | ✅ | ✅ | ✅ (within own scope, non-elevated roles only) | ❌ | ❌ | ❌ | ❌ |
| Grant `SUPER_ADMIN` role | ⚠️ (two-person) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Grant `ADMIN` role | ⚠️ | ✅ (with written auth) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Grant `SUPERVISOR` / `ANALYST` role | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Grant `CASE_WORKER` / `DATA_ENTRY_CLERK` / `VIEWER` role | ✅ | ✅ | ✅ (own scope) | ❌ | ❌ | ❌ | ❌ |
| Suspend / reactivate user | ✅ | ✅ | ✅ (own scope) | ❌ | ❌ | ❌ | ❌ |
| Force password reset | ✅ | ✅ | ✅ (own scope) | ❌ | ❌ | ❌ | ❌ |
| Mark device as lost (trigger wipe on next contact) | ✅ | ✅ | ✅ (own scope) | ❌ | ❌ | ❌ | ❌ |
| View user audit | ✅ | ✅ | ✅ (own scope) | ❌ | ❌ | ❌ | ❌ |

### Configuration and integration

| Capability | SUPER_ADMIN | ADMIN | SUPERVISOR | CASE_WORKER | DATA_ENTRY_CLERK | ANALYST | VIEWER |
|---|---|---|---|---|---|---|---|
| View integration configuration | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Edit integration configuration (DHIS2, REALISE, notification) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Test integration connection | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Toggle feature flags | ⚠️ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Run schema migration | ⚠️ (via CI/CD) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Rotate cryptographic keys | ⚠️ (two-person) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Audit and compliance

| Capability | SUPER_ADMIN | ADMIN | SUPERVISOR | CASE_WORKER | DATA_ENTRY_CLERK | ANALYST | VIEWER |
|---|---|---|---|---|---|---|---|
| View audit events (all) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View audit events (own scope) | — | — | ✅ | ✅ (own actions) | ✅ (own actions) | ✅ (own actions) | — |
| Export audit logs | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Process data-subject rights requests | ❌ | ⚠️ (with DPO sign-off) | ❌ | ❌ | ❌ | ❌ | ❌ |
| Approve erasure request | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (reserved to DPO alone) |

---

## Special roles (not primary RBAC roles)

These roles are attributes on a user rather than a seventh-order role. A user can hold them alongside any primary role.

### `DPO` (Data Protection Officer)
- Exclusively responsible for approving erasure requests and signing off on data-subject rights decisions
- Receives breach notifications directly
- Assigned to a single named MOGCSP official by the Deputy Minister

### `M_AND_E_OFFICER`
- Approves changes to the indicator catalog
- Signs off on publishing manually entered indicator values
- Typically held alongside `ADMIN` or `ANALYST`

### `CHILD_PROTECTION_LEAD`
- Signs off on cases involving survivors under 13
- Co-ordinates with MOGCSP Child Protection Services
- Typically held alongside `SUPERVISOR`

### `COMPLIANCE_AUDITOR`
- Read-only access to the full audit log
- Read-only access to configuration
- Assigned for specific audit engagements, time-bounded

---

## Role assignment rules

1. A user may hold multiple roles simultaneously. Effective permissions are the union.
2. Elevation is asymmetric: a `SUPERVISOR` can assign `CASE_WORKER` but not `SUPERVISOR`; an `ADMIN` can assign `SUPERVISOR` but not `ADMIN`. Only `SUPER_ADMIN` can create `ADMIN`.
3. Every role grant and revoke is audit-logged with the grantor, grantee, timestamp, and reason.
4. Role changes take effect on the user's next request (session-level invalidation).
5. Org-unit scope is orthogonal to role — a user with a national-level org-unit scope still gets the permissions of their role for their entire scope.
6. Role separation is enforced: the same individual cannot be the approver of their own action. For example, a supervisor who created a case cannot be the one signing off on its supervisor review.

---

## Mobile app role availability

Not every role uses the mobile app. The Android app has two active role profiles; others use the web app exclusively.

| Role | Mobile app? |
|---|---|
| `SUPER_ADMIN` | No |
| `ADMIN` | No (sensitive operations must come from a controlled endpoint) |
| `SUPERVISOR` | Limited — read cases for review, sign off, view team |
| `CASE_WORKER` | Primary |
| `DATA_ENTRY_CLERK` | Primary |
| `ANALYST` | No |
| `VIEWER` | No |

---

## Implementation references

- Role enum: `packages/db/prisma/schema.prisma` — `Role`
- Permission registry: `packages/auth/src/permissions.ts`
- Guards: `apps/api/src/common/guards/role.guard.ts`, `apps/api/src/common/guards/scope.guard.ts`
- RLS policies: `packages/db/prisma/migrations/*_rls_*.sql`
- Admin UI for user/role management: `apps/web/app/admin/users/`
- Audit of role changes: any change to `UserRole` emits `AuditEvent` with `action = ROLE_GRANT` or `ROLE_REVOKE`
