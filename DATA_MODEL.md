# Data Model

This document defines the core entities, their relationships, and the conventions we use throughout the schema. The Prisma schema in `packages/db/prisma/schema.prisma` is the source of truth; this document explains the *why* behind that schema.

---

## Conventions

### Identifiers
- All tables use **UUID v7** primary keys named `id`. UUID v7 retains time-ordering (unlike v4) which matters for index locality.
- For rows that correspond to things people refer to in the real world (case numbers, beneficiary codes), we also carry a **human-readable business identifier** — e.g. `caseNumber = "BOMI-2026-00042"` — generated server-side.
- Mobile-originated rows carry a `clientEventId` (UUID v4 generated on the device) so the client can reconcile records before the server has assigned a canonical id.

### Timestamps
- Every table has `createdAt` and `updatedAt` (both `timestamptz`).
- Soft-deletable entities additionally carry `deletedAt`. **Survivor records are never hard-deleted** outside a court-ordered erasure process — see [COMPLIANCE.md](./COMPLIANCE.md).
- `createdById` and `updatedById` reference the actor responsible.

### Encryption
- Columns holding direct identifiers (survivor full name, national ID number, phone number, email, precise address) are encrypted at the column level using `pgcrypto`. The key is held in the KMS, not in the database.
- The encrypted column stores ciphertext; a parallel `*_search_hash` column stores a deterministic keyed hash used for equality lookups (e.g. "does this national ID already exist?") without revealing plaintext.
- Survivor names and demographic attributes are pseudonymised wherever a workflow does not strictly require the real value. Dashboards never see plaintext identifiers.

### Row-level security
- Every table containing county-scoped data has RLS policies that restrict reads/writes by the actor's assigned organisation units. See [SECURITY.md § RLS](./SECURITY.md#row-level-security).
- Superadmin bypass is explicit, logged, and role-gated.

### Naming
- Tables are plural, snake_case in SQL (`gbv_cases`) but the Prisma models are singular PascalCase (`GbvCase`).
- Enums are PascalCase with explicit values — we never rely on numeric ordering.

---

## The bounded contexts

The schema is organised into seven bounded contexts. Each has a schema file in `packages/db/prisma/` and a NestJS module in `apps/api/src/`.

1. **Identity** — users, roles, permissions, sessions, MFA
2. **Organisation** — counties, districts, communities, MOGCSP offices, partner agencies
3. **Beneficiaries** — individuals and households enrolled in LWEP activities
4. **Cases** — GBV case records, incidents, services, referrals
5. **Indicators** — the gender-indicator catalog and its computed values
6. **Secondary data** — ingested datapoints from LISGIS, MoH, DHS, census etc.
7. **Audit** — append-only activity log, access log, change log

---

## 1. Identity context

```
User
  id                uuid (PK)
  keycloakSubject   text (unique)          -- OIDC `sub` claim
  email             text (encrypted)
  displayName       text
  roles             UserRole[]
  orgUnitScopes     UserOrgUnitScope[]     -- which org units this user can see
  mfaEnrolled       bool
  status            UserStatus             -- ACTIVE | SUSPENDED | DISABLED
  lastLoginAt       timestamptz
  createdAt, updatedAt, deletedAt

UserRole
  userId            uuid (FK User)
  role              Role                   -- enum: see ROLES_PERMISSIONS.md
  assignedById      uuid (FK User)
  assignedAt        timestamptz

UserOrgUnitScope
  userId            uuid (FK User)
  orgUnitId         uuid (FK OrgUnit)
  assignedById      uuid (FK User)
  assignedAt        timestamptz

Session
  id                uuid (PK)
  userId            uuid (FK User)
  deviceFingerprint text
  ipAddress         inet
  userAgent         text
  startedAt         timestamptz
  endedAt           timestamptz
  revokedAt         timestamptz
```

Notes:
- `keycloakSubject` is the foreign link to Keycloak. The application never stores passwords.
- `Role` values match [ROLES_PERMISSIONS.md](./ROLES_PERMISSIONS.md) exactly: `SUPER_ADMIN`, `ADMIN`, `SUPERVISOR`, `CASE_WORKER`, `DATA_ENTRY_CLERK`, `ANALYST`, `VIEWER`.
- A user can hold multiple roles and be scoped to multiple org units — a supervisor in Bomi who is also an analyst for the HQ dashboards.

---

## 2. Organisation context

```
OrgUnit
  id                uuid (PK)
  parentId          uuid (FK OrgUnit, nullable)
  level             OrgUnitLevel           -- NATIONAL | COUNTY | DISTRICT | COMMUNITY | FACILITY
  code              text (unique)          -- aligns with LISGIS admin code where possible
  name              text
  shortName         text
  geometry          geometry(Geometry, 4326)  -- PostGIS
  centroid          geometry(Point, 4326)
  dhis2Id           text (nullable)        -- mapping key to DHIS2 orgUnit
  lwepCovered       bool                   -- is this org unit in scope for LWEP?
  createdAt, updatedAt, deletedAt

OrgUnitGroup
  id                uuid (PK)
  name              text                   -- e.g. "LWEP Counties", "Coastal Counties"
  members           OrgUnit[] (via join table)
```

A single hierarchy: Nation → County → District → Community. Facilities (health clinics, one-stop centres, police stations) are attached at the community level. The hierarchy aligns with LISGIS administrative codes so LISGIS data is joinable without translation tables for each upstream feed.

The six LWEP counties are identifiable by `lwepCovered = true` at the county level; the flag cascades conceptually to their descendants but isn't physically duplicated.

---

## 3. Beneficiaries context

```
Beneficiary
  id                     uuid (PK)
  beneficiaryCode        text (unique)     -- e.g. "BM-LW-000042"
  nationalId             text (encrypted, nullable)
  nationalIdSearchHash   bytea (nullable, indexed)
  fullName               text (encrypted)
  dateOfBirth            date
  sex                    Sex               -- FEMALE | MALE | INTERSEX | UNDISCLOSED
  genderIdentity         text (nullable, encrypted)
  disabilityStatus       DisabilityStatus[]
  orgUnitId              uuid (FK OrgUnit) -- community-level residence
  householdId            uuid (FK Household, nullable)
  enrollmentSource       EnrollmentSource  -- LWEP_COMPONENT_1 | 2 | 3 | REALISE_XREF | OTHER
  realiseHouseholdRef    text (nullable)   -- for dedup against REALISE registry
  consentRecordId        uuid (FK ConsentRecord)
  status                 BeneficiaryStatus -- ENROLLED | ACTIVE | GRADUATED | WITHDRAWN | DECEASED
  createdAt, updatedAt, deletedAt

Household
  id                     uuid (PK)
  householdCode          text (unique)
  orgUnitId              uuid (FK OrgUnit)
  headOfHouseholdId      uuid (FK Beneficiary, nullable)
  memberCount            smallint
  createdAt, updatedAt, deletedAt

HouseholdMember
  householdId            uuid (FK Household)
  beneficiaryId          uuid (FK Beneficiary)
  relationship           HouseholdRelationship
  primaryResidence       bool

ConsentRecord
  id                     uuid (PK)
  beneficiaryId          uuid (FK Beneficiary)
  scope                  ConsentScope[]    -- DATA_COLLECTION | DHIS2_SHARING | PHOTO_USE | RESEARCH
  grantedAt              timestamptz
  expiresAt              timestamptz (nullable)
  revokedAt              timestamptz (nullable)
  evidenceObjectKey      text (nullable)   -- signed consent form in object storage

LivelihoodGrant
  id                     uuid (PK)
  beneficiaryId          uuid (FK Beneficiary)
  grantCycle             text              -- e.g. "LWEP-C3-2026-Q2"
  amountLrd              decimal(18,2)
  amountUsd              decimal(18,2)
  disbursedAt            timestamptz
  partnerFintechTxnRef   text              -- record of external payment; we don't move money
  status                 GrantStatus
  createdAt, updatedAt

VslaGroup
  id                     uuid (PK)
  name                   text
  orgUnitId              uuid (FK OrgUnit)
  formedAt               date
  members                VslaMembership[]
  createdAt, updatedAt, deletedAt

VslaMembership
  vslaGroupId            uuid (FK VslaGroup)
  beneficiaryId          uuid (FK Beneficiary)
  role                   VslaMemberRole    -- CHAIR | TREASURER | SECRETARY | MEMBER
  joinedAt               date
  leftAt                 date (nullable)

CommunitySession
  id                     uuid (PK)
  type                   SessionType       -- SASA_AWARENESS | SASA_SUPPORT | SASA_ACTION | ASRH | OTHER
  orgUnitId              uuid (FK OrgUnit)
  facilitatorId          uuid (FK User)
  heldAt                 timestamptz
  topic                  text
  notes                  text
  attendees              SessionAttendance[]
  createdAt, updatedAt

SessionAttendance
  sessionId              uuid (FK CommunitySession)
  beneficiaryId          uuid (FK Beneficiary, nullable)   -- null if anonymous attendance
  sexAgeBracket          text (nullable)                   -- used when attendance is anonymous
  attendedAt             timestamptz
```

Notes:
- `beneficiaryCode` is the field-facing identifier used on printed cards; `nationalId` is stored encrypted for deduplication and government reporting but is not routinely displayed in the UI.
- `realiseHouseholdRef` is how the nightly REALISE dedup worker asserts "this household is already receiving REALISE benefits, don't double-count." The REALISE project exposes a reference API.
- Disability status is an array because a beneficiary may have multiple disabilities; we use the Washington Group Short Set categories.
- `ConsentRecord` is not optional — creating a `Beneficiary` without an associated consent record is a check-constraint violation. See [COMPLIANCE.md § Consent](./COMPLIANCE.md#consent).

---

## 4. Cases context (GBV)

This is the most sensitive area of the schema. Every design choice prioritises survivor safety.

```
GbvCase
  id                      uuid (PK)
  caseNumber              text (unique)    -- e.g. "BOMI-2026-00042"
  survivorId              uuid (FK Beneficiary, nullable)  -- nullable because anonymous cases are valid
  anonymisedSurvivor      AnonymisedSurvivor? (embedded)   -- used when survivorId is null
  orgUnitId               uuid (FK OrgUnit)                -- location of case intake
  intakeChannel           IntakeChannel    -- COMMUNITY | FACILITY | HOTLINE | REFERRAL | OTHER
  intakeDate              date
  intakeByUserId          uuid (FK User)
  firstIncidentDate       date (nullable)
  mostRecentIncidentDate  date (nullable)
  status                  CaseStatus       -- OPEN | IN_SERVICE | REFERRED | CLOSED_SUCCESSFUL | CLOSED_LOST_CONTACT | CLOSED_WITHDRAWN
  priority                CasePriority     -- ROUTINE | URGENT | CRITICAL
  assignedCaseWorkerId    uuid (FK User, nullable)
  assignedSupervisorId    uuid (FK User, nullable)
  supervisorReviewedAt    timestamptz (nullable)  -- all new cases require supervisor sign-off
  closedAt                timestamptz (nullable)
  createdAt, updatedAt, deletedAt

AnonymisedSurvivor (embedded type, not its own table)
  sex                     Sex
  ageBracket              text             -- "10-14", "15-19", "20-24", ...
  disabilityStatus        DisabilityStatus[]

Incident
  id                      uuid (PK)
  caseId                  uuid (FK GbvCase)
  occurredAt              timestamptz (nullable, precision: date-only allowed)
  occurrenceOrgUnitId     uuid (FK OrgUnit, nullable)
  types                   ViolenceType[]   -- PHYSICAL | SEXUAL | PSYCHOLOGICAL | ECONOMIC | NEGLECT | HARMFUL_PRACTICE
  perpetratorRelationship PerpetratorRelationship?
  perpetratorDemographics PerpetratorDemographics? (embedded)   -- never named; only category
  weaponUsed              bool
  notes                   text (encrypted)
  createdAt, updatedAt

ServiceProvided
  id                      uuid (PK)
  caseId                  uuid (FK GbvCase)
  type                    ServiceType      -- MEDICAL | PSYCHOSOCIAL | LEGAL | SHELTER | ECONOMIC | OTHER
  providerOrgUnitId       uuid (FK OrgUnit)
  providedAt              timestamptz
  outcome                 ServiceOutcome
  notes                   text (encrypted)
  createdAt, updatedAt

Referral
  id                      uuid (PK)
  caseId                  uuid (FK GbvCase)
  toOrgUnitId             uuid (FK OrgUnit)
  toService               ServiceType
  referredAt              timestamptz
  acknowledgedAt          timestamptz (nullable)
  completedAt             timestamptz (nullable)
  outcome                 ReferralOutcome? -- COMPLETED | DECLINED | UNREACHABLE | IN_PROGRESS
  notes                   text (encrypted)
  createdAt, updatedAt

CaseAttachment
  id                      uuid (PK)
  caseId                  uuid (FK GbvCase)
  kind                    AttachmentKind   -- CONSENT | MEDICAL_REPORT | POLICE_REPORT | PHOTO | OTHER
  objectKey               text             -- pointer to object storage; the file itself is encrypted client-side
  uploadedById            uuid (FK User)
  uploadedAt              timestamptz
  sha256                  bytea            -- integrity check
```

Survivor safety rules baked into the schema:
- `GbvCase.survivorId` may be null — the system supports fully anonymous case reporting.
- When `survivorId` is populated, access to the row is gated by **both** RLS (matching the survivor's home org unit) and an explicit access grant for cross-org referrals — a case worker in Grand Gedeh cannot see a Bomi survivor's case unless a formal referral transfers the case.
- `notes` fields are encrypted at the column level. Encrypted columns appear as "[encrypted]" in read queries performed by roles without the decrypt permission.
- Perpetrator names are **never** stored. Only a relationship category and demographic bracket. Naming a perpetrator is the police's job, not ours.
- Every read of a `GbvCase` row emits an `AuditEvent` — see [§ 7 Audit](#7-audit-context).

---

## 5. Indicators context

```
Indicator
  id                      uuid (PK)
  code                    text (unique)    -- e.g. "BPfA-REP-001", "SDG-5-2-1", "LWEP-OUT-003"
  name                    text
  description             text
  framework               Framework        -- BPFA | SDG | CEDAW | MAPUTO | AU_WPS | ARREST | LWEP | NATIONAL
  area                    text             -- "Representation", "Health", "Economy" — maps to BPfA 12 areas
  unit                    text             -- "%", "per 100,000", "ratio", "count"
  periodicity             Periodicity      -- ANNUAL | QUARTERLY | MONTHLY | EVENT_DRIVEN
  disaggregation          Disaggregation[] -- SEX | AGE | LOCATION | DISABILITY | WEALTH_QUINTILE
  custodianAgency         text             -- "WHO", "UNICEF", "UN Women", "LISGIS"
  leadMinistry            text             -- "MOGCSP", "MoH", "MoE"
  formula                 text (nullable)  -- either a computable expression or a reference to code
  dhis2DataElementId      text (nullable)
  dhis2CategoryComboId    text (nullable)
  active                  bool
  createdAt, updatedAt

IndicatorValue
  id                      uuid (PK)
  indicatorId             uuid (FK Indicator)
  orgUnitId               uuid (FK OrgUnit)
  periodStart             date
  periodEnd               date
  value                   decimal(18, 6)
  disaggregations         jsonb            -- e.g. {"sex": "F", "age": "15-19"}
  source                  IndicatorSource  -- COMPUTED_FROM_CASES | COMPUTED_FROM_BENEFICIARIES | IMPORTED_LISGIS | IMPORTED_MOH | MANUAL_ENTRY | DHIS2_PULL
  sourceReference         text (nullable)  -- e.g. "DHS 2019-2020, Table 14.2" or "LISGIS/LFS/2024"
  qualityFlag             QualityFlag      -- VERIFIED | UNVERIFIED | ESTIMATE | PROVISIONAL
  enteredById             uuid (FK User, nullable)
  importedAt              timestamptz (nullable)
  lastComputedAt          timestamptz (nullable)
  createdAt, updatedAt

IndicatorTarget
  id                      uuid (PK)
  indicatorId             uuid (FK Indicator)
  orgUnitId               uuid (FK OrgUnit, nullable)  -- null = national target
  targetYear              int
  targetValue             decimal(18, 6)
  source                  text             -- "LWEP PDO", "ARREST Agenda 2029", "SDG 2030"
  createdAt, updatedAt
```

Notes:
- The indicator catalog is seeded from the artefacts the Ministry provided — the 22 minimum indicators from the LWEP framework spreadsheet, plus the full UN Minimum Set (48 quantitative + qualitative indicators). See [INDICATORS_CATALOG.md](./INDICATORS_CATALOG.md).
- `formula` can be either a human-readable expression (for manual calculation or display) or a coded function reference like `"computeMmrPer100k"` that the `indicators` module resolves to TypeScript code. Complex computations live in code with tests; simple ratios can be expressed as formulas.
- `dhis2DataElementId` is what the `dhis2-sync` worker uses to POST aggregate values to DHIS2. Not every indicator is synced — internal LWEP output indicators stay internal.

---

## 6. Secondary data context

```
SecondaryDataset
  id                      uuid (PK)
  name                    text             -- e.g. "LISGIS DHS 2019-2020"
  sourceAgency            text
  collectionStart         date
  collectionEnd           date
  ingestedAt              timestamptz
  methodology             text
  documentationObjectKey  text (nullable)
  createdAt, updatedAt

SecondaryDataPoint
  id                      uuid (PK)
  datasetId               uuid (FK SecondaryDataset)
  indicatorId             uuid (FK Indicator, nullable)  -- if the datapoint maps to a tracked indicator
  orgUnitId               uuid (FK OrgUnit)
  periodStart             date
  periodEnd               date
  variable                text
  value                   jsonb            -- accommodates scalar, rate, or distribution
  disaggregations         jsonb
  qualityFlag             QualityFlag
  createdAt
```

Why a separate context: the indicator value store is authoritative for the MIS; the secondary data store is an archive of upstream data points from which indicator values are derived. Keeping them separate preserves provenance — we always know whether a value was directly imported or computed from a source.

---

## 7. Audit context

This context is **append-only**. No `UPDATE` or `DELETE` operations are issued against these tables — ever. PostgreSQL role permissions enforce it.

```
AuditEvent
  id                      uuid (PK)        -- UUID v7 for time-ordering
  occurredAt              timestamptz
  actorUserId             uuid (FK User, nullable)  -- null for system actions
  actorRole               Role (nullable)
  actorIp                 inet
  actorDeviceFingerprint  text (nullable)
  action                  AuditAction      -- CREATE | READ | UPDATE | DELETE | EXPORT | LOGIN | LOGIN_FAIL | MFA_CHALLENGE | ROLE_GRANT | CONFIG_CHANGE | ...
  entityType              text             -- e.g. "GbvCase"
  entityId                uuid (nullable)
  beforeSnapshot          jsonb (nullable) -- redacted
  afterSnapshot           jsonb (nullable) -- redacted
  requestId               uuid             -- correlates with the API request log
  success                 bool
  reasonCode              text (nullable)  -- for failures
  additionalContext       jsonb (nullable)

AccessLog
  id                      uuid (PK)
  occurredAt              timestamptz
  actorUserId             uuid (FK User)
  resourcePath            text
  method                  text             -- HTTP method
  responseStatus          smallint
  responseTimeMs          int
```

Retention: 7 years in Postgres with hot storage for 90 days, then tiered to encrypted object storage (still queryable via Athena-compatible tooling) for the remainder.

Every mutation against `GbvCase`, `Beneficiary`, `User`, `UserRole`, `ConsentRecord`, and any configuration table emits an `AuditEvent`. Every read of `GbvCase` and `Beneficiary` also emits one — reads of these entities are sensitive enough to warrant the storage cost.

---

## Entity-relationship overview

```
            ┌───────────┐       ┌──────────┐
            │  User     │◄─────►│  Role    │
            └─────┬─────┘       └──────────┘
                  │
                  │ scoped to
                  ▼
            ┌──────────────┐
            │  OrgUnit     │ (tree: nation → county → district → community → facility)
            └──────┬───────┘
                   │
      ┌────────────┼────────────┬──────────────────┐
      │            │            │                  │
      ▼            ▼            ▼                  ▼
┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────────────┐
│Beneficiary│ │GbvCase  │ │IndicatorValue│ │SecondaryDataPoint│
│          │ │          │ │              │ │                  │
│ ┌───────┐│ │ ┌──────┐ │ └──────┬───────┘ └────────┬─────────┘
│ │Consent││ │ │Incide│ │        │                  │
│ │Record ││ │ │nt    │ │        ▼                  │
│ └───────┘│ │ └──────┘ │  ┌──────────┐              │
│ ┌───────┐│ │ ┌──────┐ │  │Indicator │◄─────────────┘
│ │Grant  ││ │ │Servic│ │  └────┬─────┘
│ └───────┘│ │ │e     │ │       │
│ ┌───────┐│ │ └──────┘ │       │
│ │VSLA   ││ │ ┌──────┐ │       │ maps to
│ │Member ││ │ │Refer │ │       ▼
│ └───────┘│ │ │ral   │ │  ┌──────────┐
└──────────┘ │ └──────┘ │  │DHIS2     │
             │ ┌──────┐ │  │DataElement│
             │ │Attach│ │  │(external) │
             │ │ment  │ │  └──────────┘
             │ └──────┘ │
             └──────────┘

           All mutations + sensitive reads ──► AuditEvent (append-only)
```

---

## What the schema deliberately does not model

- **No perpetrator identities.** Repeated for emphasis — only relationship category and demographic bracket.
- **No family-tree or genealogy structures.** Household membership is what we track, not ancestry.
- **No location trails.** We geo-tag events, not people. A beneficiary's location is "where they live" (community-level), not a GPS history.
- **No free-text survivor quotes in search-indexable columns.** Notes are encrypted and not indexed for full-text search. An analyst who needs survivor narrative data can pull it through a gated review workflow.
- **No biometric templates.** Fingerprint/face are not in the database. Biometric unlock on the mobile app operates entirely against the Android Keystore; the server never sees biometric data.

---

## Change management

Schema changes are shipped as Prisma migrations. The PR must include:
1. The migration file
2. A doc update to this file if the entity model changes semantically
3. A test covering the new entity or relationship
4. A backfill plan if the change affects existing rows
5. For any change touching `GbvCase`, `Beneficiary`, or `User` — sign-off from the data-protection lead before merge
