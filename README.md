# Liberia GB MIS — Gender-Based Management Information System

> Developed for the **Ministry of Gender, Children and Social Protection (MOGCSP)** under the **Liberia Women Empowerment Project (LWEP)**, funded by the **World Bank (IDA)**.

---

## What this is

The GB MIS is a national platform for tracking gender equality indicators and managing gender-based violence (GBV) cases across Liberia. It serves two distinct workloads in one coherent system:

1. **Aggregate indicator tracking** — the 22 minimum indicators agreed by MOGCSP plus the 48-indicator UN SDG minimum set, Beijing Platform for Action, CEDAW, Maputo Protocol, and AU Women Peace & Security framework metrics, sourced from authoritative ministries and national surveys.
2. **Case-level GBV management & livelihood beneficiary tracking** — survivor-centered case management, referral pathways, and tracking of LWEP beneficiaries across six counties (Bomi, Gbarpolu, Grand Cape Mount, Grand Gedeh, Rural Montserrado, River Cess).

The system is designed as a **locally-owned, source-code-controlled asset of MOGCSP** that will survive project closure (June 30, 2027).

---

## Documentation map

Read in this order if you're new to the project.

### Orientation
- **[PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md)** — LWEP background, MOGCSP mandate, stakeholders, counties, timeline
- **[GLOSSARY.md](./GLOSSARY.md)** — acronyms and domain terms (BPfA, CEDAW, SASA, ASRH, etc.)

### Build specification
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — system architecture, components, data flow, DHIS2 interop decision
- **[TECH_STACK.md](./TECH_STACK.md)** — exact libraries, versions, hosting, rationale
- **[DATA_MODEL.md](./DATA_MODEL.md)** — entities, relationships, ER diagram, conventions
- **[INDICATORS_CATALOG.md](./INDICATORS_CATALOG.md)** — the indicator universe with source, periodicity, formula
- **[API_SPEC.md](./API_SPEC.md)** — REST conventions, resource model, REALISE integration contract

### Governance
- **[SECURITY.md](./SECURITY.md)** — encryption, MFA, audit logs, key management, threat model
- **[COMPLIANCE.md](./COMPLIANCE.md)** — Liberia DPA, GDPR mapping, WHO ethics for GBV data
- **[ROLES_PERMISSIONS.md](./ROLES_PERMISSIONS.md)** — the seven roles and the permission matrix

### Delivery
- **[ROADMAP.md](./ROADMAP.md)** — 16-week TOR-aligned delivery plan with acceptance gates
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — branching, commits, PR review, testing standards
- **[CLAUDE.md](./CLAUDE.md)** — operating guide for Claude Code and other AI coding assistants

---

## Repository layout (target)

```
gb-mis/
├── apps/
│   ├── web/          # Next.js 15 admin + dashboards (MOGCSP HQ users)
│   ├── mobile/       # React Native (Expo) offline data capture (county staff)
│   └── api/          # NestJS REST + GraphQL API
├── packages/
│   ├── db/           # Prisma schema + migrations
│   ├── types/        # Shared TypeScript types
│   ├── indicators/   # Indicator metadata + calculation formulas
│   └── ui/           # Shared design system
├── services/
│   ├── dhis2-sync/   # Bi-directional DHIS2 interop worker
│   ├── realise-sync/ # REALISE project integration worker
│   └── etl/          # Scheduled ingestion from LISGIS, DHS, MoH etc.
├── infra/
│   ├── docker/
│   ├── k8s/          # or terraform/, depending on final hosting decision
│   └── scripts/
└── docs/             # ← you are here
```

---

## Current build state (as of April 2026)

The monorepo is in **Stage 3 — Core Development** of the ROADMAP. All Stage 2 work is complete and committed. The following are done and merged to `main`:

### Stage 2 — complete
- Turborepo + pnpm workspaces monorepo with `apps/web`, `apps/mobile`, `apps/api`, `packages/*`, `services/*`
- PostgreSQL 16 + PostGIS + pgcrypto schema via Prisma 5 (`packages/db`); full data model from `DATA_MODEL.md`
- Row-level security policies for county-scoped tables
- Keycloak OIDC integration with PKCE; NestJS `JwtAuthGuard` + `PermissionsGuard`
- Full RBAC permission registry (`packages/auth`) covering all seven roles
- Org-unit hierarchy seeded with LISGIS county codes
- Indicator catalog seeded — 48+ indicators from `INDICATORS_CATALOG.md` (`packages/indicators`)
- CI/CD pipeline (GitHub Actions): typecheck, lint, test, SAST, Docker build smoke test
- Docker Compose stack: PostgreSQL 16, Redis 7, Keycloak 25, MinIO
- Shared design system (`packages/ui`) on shadcn/ui + Tailwind 4 with MOGCSP brand palette
- OpenAPI spec v0.1 committed

### Stage 3 — in progress

**Done:**

| Area | What's built |
|---|---|
| **Beneficiaries** | Creation flow, consent capture, household linking, REALISE dedup hook, livelihood grant recording, VSLA and community-session tracking |
| **Cases** | Intake, supervisor review workflow, incidents, services, referrals, attachments with client-side encryption |
| **Indicators** | Computation engine, manual-entry workflow, target-setting, DHIS2 mapping |
| **Secondary data (ETL)** | LISGIS CSV and DHS ingestion jobs; `SecondaryDataset` / `SecondaryDataPoint` models; BullMQ queue; dataset API endpoints; web datasets page |
| **Reports** | `ReportsService` with monthly county, quarterly LWEP, annual CEDAW templates; report-template cards in the web UI |
| **Audit** | Audit event emission across all mutations and sensitive reads; hash-chain verification job |
| **DHIS2 sync worker** | BullMQ worker stub wired; push-aggregate and pull-org-unit jobs scaffolded |
| **Mobile offline** | WatermelonDB schema (`gbv_cases`, `beneficiaries`, `sync_records`); `GbvCaseModel`, `BeneficiaryModel`, `SyncRecordModel`; `SyncEngine` (delta pull + batch push, PENDING → SYNCED/FAILED); `CaseIntakeScreen` writing offline; `useSyncStatus` hook; quick-exit control; biometric unlock |
| **Web admin** | Users, roles, audit review, indicator catalog management, secondary datasets |
| **Public dashboard** | `GET /public/indicators` and `GET /public/counties` (no auth); Next.js ISR page at `/public/dashboard` with MOGCSP branding and framework-grouped indicator table |

**Remaining for Stage 3:**

- Localisation scaffolding — externalise English strings; translation workflow
- Comprehensive test coverage — unit (Vitest), integration, Playwright e2e, Schemathesis contract, axe-core a11y
- Penetration test preparation — hardening checklist
- Runbooks — deploy, rollback, backup/restore, disaster recovery, incident response
- Operational Grafana dashboards

---

## Non-negotiable commitments

These come directly from the TOR and the MOGCSP-World Bank agreement. Every implementation decision defers to them.

1. **Survivor-centered GBV data handling.** No identifying detail is stored unencrypted. Access to case records is logged and role-gated. Data collection follows WHO ethical and safety recommendations.
2. **MOGCSP ownership.** Source code, database credentials, signing keys, and documentation are the property of MOGCSP. No vendor lock-in to any proprietary SaaS where a viable open alternative exists.
3. **Offline-first for county field work.** The six LWEP counties have unreliable connectivity. Data entry works fully offline with encrypted sync-on-connect and supervisor review workflow.
4. **Interoperability over duplication.** Whenever LISGIS, MOH, MOE, MOA, or REALISE has authoritative data, we consume it through a sanctioned API — no re-collection, no web scraping.
5. **Sustainability beyond June 2027.** The stack is buildable and maintainable by Liberian developers with widely-taught skills. Hosting costs are covered by MOGCSP's operating budget alone after project closure.

---

## Quick links

- LWEP project brochure: `/project-materials/LWEP_Brochure.pdf`
- UN SDG Minimum Set of Gender Indicators: `/project-materials/MinSet_ListIndicator_20240412.pdf`
- LWEP county coverage map: `/project-materials/LWEP_Counties_circles.pdf`
- Final TOR (March 2026): `/project-materials/Final_TOR_GB_MIS_30-03-2026.docx`
