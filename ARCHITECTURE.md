# Architecture

This document describes the system architecture and the reasoning behind the major design choices. It is the controlling reference when choices have to be made during implementation; deviations require an Architecture Decision Record in `docs/adr/`.

---

## Architectural principles

Before specifics, these are the principles every decision is measured against:

1. **Survivor safety before feature velocity.** GBV survivor data is the most sensitive payload this system carries. Any design choice that trades data safety for convenience is wrong.
2. **MOGCSP sovereignty.** The Ministry can run, modify, extend, and migrate this system without the consultant. No SaaS dependency exists whose withdrawal would disable core functionality.
3. **Offline as a first-class mode.** The mobile app's offline path is the reference path; online is a latency optimisation of it, not a fallback.
4. **Interoperability through standards, not point-to-point hacks.** Every inbound/outbound integration speaks an open protocol (REST/JSON, OpenAPI, DHIS2 ADX, HL7 FHIR where applicable, SDMX for statistical data).
5. **One code path per concern.** We do not maintain parallel admin panels, duplicate validation rules on client and server, or two copies of indicator formulae.
6. **Boring technology.** Widely taught, well-documented, large ecosystem. This system must be maintainable by junior Liberian developers in 2028 and 2030, not only by the delivery team in 2026.

---

## The fundamental architectural decision: Custom-primary with DHIS2 as an interoperability peer

### The two workloads this system must carry

| Workload | Examples | Natural fit |
|---|---|---|
| **Aggregate indicator tracking** | "Maternal mortality ratio, 2024, Grand Gedeh = X per 100,000"; Beijing/SDG/CEDAW indicator values; dashboard for MOGCSP leadership | DHIS2 excels — it is the global standard for this exact shape of data |
| **Case & beneficiary management** | Individual GBV case records with referral pathway; LWEP livelihood grant beneficiary lifecycle; community mobilization session attendance; VSLA group rosters | Custom application — DHIS2 Tracker can model it but the workflows (supervisor review, survivor-centered UX, grant disbursement logic, SASA! session tracking) are poorly served out-of-the-box |

### The three options we considered

1. **Pure DHIS2 + Tracker.** Fast to stand up, free interoperability with MoH, but GBV case management UX would be forced into a health-centric form model and survivor-centered workflows would need heavy customization anyway.
2. **Pure custom build.** Total control over UX and workflows, but forfeits the free alignment with Liberia's health MIS, the built-in Beijing/SDG metadata bundles, and the opportunity to reuse LISGIS/MoH data pipelines already feeding DHIS2.
3. **Hybrid — custom application with DHIS2 as an interoperability peer.** The primary system MOGCSP staff use is a custom NestJS API + Next.js web app + React Native mobile app. A dedicated **`dhis2-sync` service** pushes aggregate indicator values to a DHIS2 instance on a schedule and pulls authoritative reference data (organisation units, data elements) back. DHIS2 becomes the national-interop bus, not the primary UI.

**We chose option 3.** It honours MOGCSP ownership (custom code, custom DB, MOGCSP-controlled hosting), survivor-centered UX (purpose-built GBV workflows), and national interoperability (DHIS2 is how MoH, MoE, and donors read our data) simultaneously. It costs one additional worker service and a mapping layer — cheap in exchange for not compromising either side.

The DHIS2 instance itself can be a separate MOGCSP-run deployment, or — preferably — the instance MoH already runs with a dedicated GB-MIS organisation unit and data set. The final choice is negotiated during Inception (Week 1) with MoH and LISGIS.

---

## System components

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USERS                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   MOGCSP HQ             County field staff          Public / partners    │
│   (laptop, browser)     (Android tablet, offline)   (browser, read-only) │
│        │                        │                           │            │
└────────┼────────────────────────┼───────────────────────────┼────────────┘
         │                        │                           │
         ▼                        ▼                           ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  Next.js 15 web     │  │  React Native (Expo)│  │  Public dashboard   │
│  app (admin,        │  │  mobile app         │  │  (Next.js static    │
│  case workflows,    │  │  offline-first      │  │  export, read-only  │
│  dashboards)        │  │  WatermelonDB       │  │  indicator portal)  │
└──────────┬──────────┘  └──────────┬──────────┘  └──────────┬──────────┘
           │                         │                         │
           │              HTTPS + OAuth2 (PKCE) + mTLS for sync│
           └─────────────────────────┼─────────────────────────┘
                                     │
                                     ▼
                  ┌──────────────────────────────────────┐
                  │   API Gateway (NestJS, TypeScript)   │
                  │   - OAuth2/OIDC via Keycloak         │
                  │   - Role-based access control        │
                  │   - Request-level audit logging      │
                  │   - Rate limiting                    │
                  │   - OpenAPI 3.1 spec (source of truth)│
                  └──────────────────┬───────────────────┘
                                     │
            ┌────────────┬───────────┼───────────┬────────────────┐
            │            │           │           │                │
            ▼            ▼           ▼           ▼                ▼
     ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐ ┌────────────────┐
     │ Cases    │ │ Benefic- │ │ Indicat-│ │ Orgunit/ │ │ Audit & AuthN  │
     │ module   │ │ iaries   │ │ ors     │ │ Geography│ │ module         │
     │ (GBV)    │ │ module   │ │ module  │ │ module   │ │                │
     └────┬─────┘ └────┬─────┘ └────┬────┘ └────┬─────┘ └────┬───────────┘
          │            │            │            │            │
          └────────────┴────────────┼────────────┴────────────┘
                                    │
                                    ▼
                       ┌───────────────────────────┐
                       │   PostgreSQL 16           │
                       │   - row-level security    │
                       │   - pgcrypto for PII      │
                       │   - PostGIS for geodata   │
                       │   - logical replicas      │
                       └──────────┬────────────────┘
                                  │
                       ┌──────────┴────────────────┐
                       │                           │
                       ▼                           ▼
              ┌───────────────────┐      ┌──────────────────────┐
              │  Object storage   │      │  Background workers  │
              │  (S3-compatible)  │      │  (BullMQ + Redis)    │
              │  encrypted files, │      │  - dhis2-sync        │
              │  attachments,     │      │  - realise-sync      │
              │  exports          │      │  - etl (LISGIS, DHS) │
              │                   │      │  - scheduled reports │
              └───────────────────┘      │  - notification send │
                                         └──────────┬───────────┘
                                                    │
                     ┌──────────────────────────────┼──────────────────────┐
                     │                              │                      │
                     ▼                              ▼                      ▼
            ┌────────────────┐           ┌────────────────┐      ┌──────────────┐
            │  DHIS2 Web API │           │  REALISE API   │      │  LISGIS/DHS  │
            │  (MoH/MOGCSP)  │           │  (World Bank   │      │  scheduled   │
            │  aggregate     │           │  sibling proj) │      │  ingestion   │
            │  indicator bus │           │  household     │      │              │
            │                │           │  beneficiary   │      │              │
            │                │           │  dedup         │      │              │
            └────────────────┘           └────────────────┘      └──────────────┘
```

---

## Component responsibilities

### Web application (`apps/web`)
Next.js 15 with the App Router. Used by MOGCSP HQ staff, county supervisors, analysts, and the Deputy Minister.

Scope: case management review and assignment, beneficiary lifecycle management, indicator dashboards with drill-down, report generation, user administration, audit log review, DHIS2 sync monitoring, bulk import from CSV/XLSX.

Rendering: Server Components for data-heavy views (dashboards, tables), Client Components for interactive forms and maps. All data fetching goes through the API — no direct database access from the web app.

Authentication: OIDC redirect flow against Keycloak. Session is a short-lived JWT refreshed through an httpOnly cookie.

### Mobile application (`apps/mobile`)
React Native with Expo (managed workflow), TypeScript, targeting Android 10+ (Liberia's dominant tablet OS). iOS is not a Phase 1 target.

Scope: offline data capture for case workers and data entry clerks in the field — new GBV case intake, community session attendance, beneficiary visits, household surveys.

Offline storage: **WatermelonDB** on top of SQLite, selected because it scales to tens of thousands of local records without the UI jank of AsyncStorage-based alternatives and has a mature sync protocol.

Encryption at rest: the SQLite file is encrypted with **SQLCipher** using a per-device key derived from the user's credentials (argon2id) and a device-bound secret stored in the Android Keystore. A failed-auth wipe threshold is configurable.

Sync: additive bi-directional sync with server-authoritative conflict resolution. Conflicts involving case data are never silently resolved — they are flagged to a supervisor for review. Sync requires a fresh access token; long-offline devices must re-authenticate before sync.

Biometric unlock (fingerprint/face) can shortcut the password step for routine reopening but never replaces the credentials needed for sync.

### API (`apps/api`)
NestJS (TypeScript) exposing a REST interface documented with OpenAPI 3.1. Not a GraphQL-first system — the consumers (our own web + mobile apps, plus two or three well-known integration partners) are better served by REST + typed SDKs than by GraphQL. A thin GraphQL gateway can be added later if public-facing researcher access becomes a requirement.

Module structure mirrors the bounded contexts in [DATA_MODEL.md](./DATA_MODEL.md): `auth`, `users`, `orgunits`, `cases`, `beneficiaries`, `indicators`, `datasets`, `reports`, `audit`, `sync`. Each module owns its routes, services, and persistence.

Persistence: Prisma ORM against PostgreSQL. Prisma is chosen for its type-safety guarantees and migration tooling; it is mature enough for production work at this scale (thousands of users, millions of records) and compatible with complex queries through raw SQL escape hatches where needed (especially for PostGIS spatial queries and RLS policies).

### Database
PostgreSQL 16 with three extensions: **PostGIS** for geographic queries (county/district/community hierarchies, beneficiary geolocation, heatmap aggregations), **pgcrypto** for column-level encryption of direct identifiers, and **pg_stat_statements** for performance monitoring.

Row-level security (RLS) enforces that a county supervisor cannot read cases outside their assigned county, at the database level, independent of API code. This defense-in-depth matters because an API bug should not leak survivor data across counties.

Logical replication feeds a read replica used by the dashboard service and export jobs, so analytical workloads do not contend with transactional writes.

### Background workers
**BullMQ on Redis 7.** Workers handle:
- `dhis2-sync`: pushes aggregate indicator values to DHIS2 on a schedule (hourly for dashboard freshness, daily for full catalog), pulls organisation unit updates back
- `realise-sync`: household-level deduplication against the REALISE project's beneficiary registry — a beneficiary enrolled under REALISE must not be double-counted in LWEP
- `etl`: scheduled ingestion of LISGIS DHS data, MoH DHIS2 extracts, MoE EMIS data, and other authoritative upstream sources
- `report-generation`: compute monthly/quarterly reports and render PDFs
- `notifications`: email, SMS (via a Liberian gateway), and in-app push
- `audit-archive`: tiered storage of audit logs beyond the hot retention window

### Object storage
S3-compatible (choose MinIO on-premises if hosting on-prem, or AWS S3 / Azure Blob if cloud). Holds case attachments (medical reports, ID scans, consent forms), training materials served to the mobile app, and generated report artefacts. Every object is encrypted server-side; sensitive objects are additionally encrypted client-side before upload so the storage operator cannot read them.

### Identity provider
**Keycloak** (self-hosted). Single source of truth for users, roles, groups, MFA enrolment, and session policy. Integrated with the Ministry's Active Directory if one becomes available; otherwise operates standalone.

MFA is enforced for `admin`, `analyst`, and `supervisor` roles; case workers use password + biometric device unlock.

### DHIS2 peer instance
Not part of the codebase — a peer system accessed via HTTP. The interop contract is:
- **Outbound**: the GB MIS pushes completed indicator values (calculated from cases + beneficiaries + ingested secondary data) to DHIS2 as aggregate data values with full metadata alignment.
- **Inbound**: the GB MIS pulls organisation unit definitions and authoritative data element catalogs so the indicator namespace stays in lockstep with the national system.

See [API_SPEC.md § DHIS2 Integration](./API_SPEC.md#dhis2-integration) for the mapping tables.

### Public dashboard
A separate Next.js deployment that consumes a read-only, aggregated, anonymised subset of the indicator API. No login. Serves journalists, researchers, civil society, and international partners. Fully static-generated daily to minimise attack surface — no server-side request goes from the public internet into the protected indicator store.

---

## Data flow scenarios

### Scenario A: county case worker registers a new GBV case (offline, rural Gbarpolu)

1. Worker opens the mobile app (already authenticated this morning). Biometric unlocks the encrypted local DB.
2. Worker completes the intake form with the survivor's consent. The form's validation rules are the same rules the server will enforce — there is one schema.
3. The record is written to the local WatermelonDB store, marked `pending_sync`. An immutable client-side event ID is assigned.
4. Worker completes several more interviews throughout the day, each written locally.
5. In the evening, the worker returns to a connected area. The app detects connectivity, acquires a fresh access token (re-prompting for password if the token has expired), and begins sync.
6. Sync batches the day's pending records into atomic transactions. Each record is transmitted with its client event ID; the server assigns a canonical database ID and returns the mapping.
7. On the server, every created/modified record goes through the validation pipeline, an automatic duplicate-detection check (against the REALISE registry for beneficiaries), and an audit log entry.
8. Records that require supervisor review (all new GBV cases by default) are routed to the county supervisor's queue.
9. Attachments (photos, scanned forms) are encrypted on the device, uploaded to object storage, and linked by reference in the database row.

### Scenario B: MOGCSP Deputy Minister views the maternal mortality dashboard

1. Deputy Minister signs in on the web app. MFA challenge is presented.
2. Dashboard page is requested. The request carries the user's JWT, which the API gateway introspects.
3. The dashboard service queries the indicator module for "I.3 — Maternal mortality ratio" across all six counties over the last 5 years. The query goes to the read replica.
4. The returned series is joined with metadata (source: WHO/UNICEF/UNFPA; custodian: MoH; last updated: 2024; periodicity: annual) and rendered with Recharts.
5. Every view of a dashboard is logged at INFO level; exports are logged at AUDIT level.

### Scenario C: a DHIS2 sync cycle

1. The `dhis2-sync` worker wakes on a cron schedule.
2. It queries the indicator module for all indicator values modified since the last successful sync tick.
3. Each value is mapped to its DHIS2 `dataElement`, `orgUnit`, `period`, and `categoryOptionCombo` using the mapping tables maintained by the indicator module.
4. Values are POSTed in batches to the DHIS2 Web API's `dataValueSets` endpoint.
5. Any rejections are recorded with full payload and retried with exponential backoff; persistent failures raise alerts to the Ops channel.

### Scenario D: ingesting LISGIS DHS data

1. The `etl` worker pulls the latest DHS microdata from LISGIS's sanctioned data-sharing endpoint (or CSV drop if no API yet exists — during Inception we negotiate for an API).
2. Records are validated against the expected schema. Malformed records go to a quarantine table with a reviewer task.
3. Valid records are upserted into the `secondary_data_points` table with full provenance (source, collection year, custodian).
4. Indicator values that derive from DHS (contraceptive prevalence, adolescent birth rate, early marriage prevalence) are recomputed.
5. A change notification fires; downstream DHIS2 sync and dashboards pick up the updates.

---

## Non-functional targets

| Dimension | Target | Why |
|---|---|---|
| Availability | 99.5% monthly (≈ 3.5 h of downtime/month allowed) | MOGCSP operational tolerance; this is not a life-critical system but supports policy decisions |
| API p95 latency | < 400 ms for read, < 800 ms for write | Usable on Liberian DSL and 3G/4G from county offices |
| Mobile app cold start | < 3 s on mid-range Android tablet | Field usability |
| Sync of a full day's field work | < 60 s over a stable 3G connection | Feasible overnight sync |
| RPO (recovery point objective) | 15 minutes | Backup frequency |
| RTO (recovery time objective) | 4 hours | Restore procedure documented and rehearsed quarterly |
| Data retention — case data | Per consent + legal minimum; default 7 years, survivor-right-to-erasure respected | Ethical standard for survivor data |
| Data retention — audit logs | 7 years | Audit defensibility |

---

## Hosting

Three options remain open until Inception, all capable of meeting the targets above:

1. **Cloud primary, on-premise DR** (recommended): Microsoft Azure or AWS primary region in Cape Town or Frankfurt; an on-premise MOGCSP backup for sovereignty. Lower ops burden, higher monthly cost.
2. **On-premise primary, cloud DR**: a MOGCSP data-centre instance as primary, with nightly encrypted backups to a cloud bucket. Higher control, higher ops demand.
3. **Fully on-premise** with a second site for DR: maximal sovereignty, maximal ops burden, highest upfront cost.

The TOR explicitly requires bidders to price all three — the consultant presents a comparison during Inception and MOGCSP chooses. Whichever is chosen, the application code is hosting-agnostic (containers + 12-factor config). See [SECURITY.md § Hosting & Network](./SECURITY.md#hosting--network) for the security implications of each.

---

## What this architecture deliberately does not do

To prevent scope creep during Phase 1, these are explicitly out of scope and require a change order:

- Real-time video/voice case intake
- Biometric deduplication of beneficiaries (fingerprint matching) — we use national-ID-based dedup
- Native iOS app (Android only until Phase 2)
- Machine-learning case triage or predictive analytics
- Payment disbursement (livelihood grants flow through a partner fintech; the MIS records the transaction, it doesn't execute it)
- Public-facing survivor self-reporting — legal, ethical, and safety review must precede any such feature

---

## Architecture Decision Records

All material deviations from this document must be captured as an ADR in `docs/adr/NNNN-short-slug.md` following the Michael Nygard template. The ADR is reviewed with the MOGCSP Technical Team before merging.
