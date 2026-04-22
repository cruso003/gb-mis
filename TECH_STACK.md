# Tech Stack

Every entry in this document is a binding choice for the codebase. Substitutions require an Architecture Decision Record in `docs/adr/`. Versions below are the minimum target; upgrades within the same major version are always allowed.

---

## Language and runtime

| Choice | Version | Why |
|---|---|---|
| **TypeScript** | 5.4+ | Strict mode enabled everywhere. End-to-end typing from mobile → web → API → DB via Prisma-generated types. Liberian universities increasingly teach TypeScript and the labour market is far larger than C#/.NET for web work. |
| **Node.js** | 22 LTS | Active LTS through April 2027 — perfectly aligned with the LWEP closure date. |
| **pnpm** | 9+ | Monorepo package manager. Fast, disk-efficient, workspace-aware. npm and yarn are acceptable on developer machines but CI uses pnpm. |

TypeScript across the whole stack is a deliberate consolidation decision. The TOR originally specified ASP.NET/.NET 4+ but was explicitly relaxed to "any secure, scalable, maintainable stack with full documentation and knowledge transfer to MoGCSP ICT." TypeScript + Node is a better fit for the available talent pool and lowers the context-switching cost of working across mobile, web, and server.

---

## Monorepo

| Choice | Version | Why |
|---|---|---|
| **Turborepo** | 2+ | Pipeline-aware task runner, good caching behaviour in CI, clean dev experience. |
| **pnpm workspaces** | — | Packages in `/packages`, apps in `/apps`, services in `/services`. |

---

## Web application (`apps/web`)

| Choice | Version | Role |
|---|---|---|
| **Next.js** | 15+ | React framework. App Router only. Server Components for data-heavy pages, Client Components only where interactivity requires it. |
| **React** | 19+ | Paired with Next.js 15. |
| **Tailwind CSS** | 4+ | Utility-first styling. No Tailwind-in-Tailwind plugin soup — we keep it vanilla. |
| **shadcn/ui** | current | Component primitives, copy-into-repo model (not a dependency). Gives us ownership of the design system, aligning with the MOGCSP sovereignty principle. |
| **Recharts** | 2+ | Dashboard charting. Good accessibility defaults, reasonable default aesthetics, adequate for the chart types the TOR requests (maps, bars, lines, trend infographics). |
| **react-leaflet** + **Leaflet** | current | Interactive maps. Open-source tile sources (OpenStreetMap + custom Liberia tiles). Avoids Google Maps licensing. |
| **Zod** | 3+ | Schema validation. The canonical source of form validation rules — the API and mobile app import the same schemas. |
| **react-hook-form** | 7+ | Form state. Plugs into Zod via the zod resolver. |
| **TanStack Query** | 5+ | Client-side data fetching / caching. Used only on Client Components; Server Components fetch directly. |
| **next-intl** | current | i18n scaffolding. English is the primary language at launch; Liberian Kreyol and any additional languages are added through translation files without code changes. |

### Web accessibility

WCAG 2.1 AA is the minimum. Every component from shadcn/ui ships with sensible ARIA defaults; we do not regress them. Colour contrast, keyboard navigation, and screen-reader testing are CI-gated.

---

## Mobile application (`apps/mobile`)

| Choice | Version | Role |
|---|---|---|
| **React Native** | 0.76+ (New Architecture enabled) | Cross-platform app. |
| **Expo** (managed workflow with prebuild where needed) | SDK 52+ | Delivery pipeline, OTA updates, easier upgrades, rich library ecosystem. |
| **WatermelonDB** | current | Offline-first local database. Scales to 10k+ records with smooth UI. Has a mature sync protocol well-documented for this exact use case. |
| **expo-sqlite** + **SQLCipher** bindings | current | Encrypted SQLite underlying WatermelonDB. Per-device encryption key derived from user credentials + Android Keystore-stored device secret. |
| **expo-secure-store** | current | Stores the device secret and tokens behind the Android Keystore / iOS Keychain. |
| **expo-local-authentication** | current | Biometric unlock (fingerprint / face) for routine app reopen. |
| **expo-file-system** + **expo-image-manipulator** | current | Attachment capture, compression, and local encrypted staging before sync. |
| **expo-location** | current | GPS capture for beneficiary visit geotagging. |
| **React Navigation** | 7+ | Screen navigation. Native stack navigators. |
| **Zod** | 3+ | Same validation schemas as web. |
| **TanStack Query** (with offline persister) | 5+ | Fetch + cache against the API when online. |

### Android targeting

- Minimum SDK: 29 (Android 10)
- Target SDK: latest stable
- Architectures built: arm64-v8a (primary), armeabi-v7a (legacy tablet support)
- APK size budget: < 60 MB

### iOS

Out of scope for Phase 1. The codebase is written so iOS support is a Phase 2 enabling activity, not a rewrite.

---

## API (`apps/api`)

| Choice | Version | Role |
|---|---|---|
| **NestJS** | 10+ | Structured TypeScript server framework. Decorator-based, module-oriented, good testing story, well-documented for new engineers. |
| **Fastify** | 4+ (as NestJS HTTP adapter) | Faster and lower-memory than the default Express adapter. Meets our p95 latency budgets comfortably. |
| **Prisma** | 5+ | ORM. Schema-first, generates typed client, has a mature migrations story. |
| **class-validator** + **class-transformer** | current | DTO validation at the controller boundary (separate layer from Zod, which lives at the form boundary). |
| **nestjs-pino** | current | Structured JSON logging; one log line per request. |
| **@nestjs/schedule** | current | In-process cron for light tasks. Heavy workloads go to BullMQ workers. |
| **@nestjs/bullmq** | current | Queue integration. |
| **@nestjs/swagger** | current | Generates OpenAPI 3.1 spec from controllers + DTOs. The spec is committed and reviewed — it is a source artefact, not a byproduct. |
| **Passport** + **passport-jwt** | current | JWT strategy. |
| **OIDC via `openid-client`** | current | Relying-party flow to Keycloak. |

### API design rules

- REST + JSON, resource-oriented, plural-noun collection paths
- Versioned under `/v1/...` — breaking changes bump to `/v2/...`
- Pagination is cursor-based with `nextCursor` in the response meta
- Timestamps are ISO 8601 UTC strings
- Field names are camelCase
- Every mutating endpoint emits an audit event
- Every response carries `requestId` for traceability

---

## Database

| Choice | Version | Role |
|---|---|---|
| **PostgreSQL** | 16+ | Primary store. |
| **PostGIS** | 3.4+ | Spatial types, geographic queries. County/district/community hierarchy and beneficiary geolocation. |
| **pgcrypto** | — | Column-level encryption for direct identifiers (survivor names, ID numbers, phone numbers). Keys managed outside the DB via KMS. |
| **pg_stat_statements** | — | Performance diagnostics. |
| **pgBouncer** | 1.22+ | Connection pooling between the API and Postgres. |

### Migration strategy

Prisma Migrate is the migration tool. Migrations are:
- Additive-first (add columns, deploy, backfill, then drop)
- Reviewed in PRs like any other code
- Run by CI on a staging copy of production before being applied to production
- Tagged in git with the release they ship with

### Backup & replication

- Nightly `pg_basebackup` + WAL archiving to encrypted object storage (15-minute PITR window)
- One hot standby for read replica duties (dashboards, exports)
- Quarterly restore rehearsal — documented and signed off by the Ops lead

---

## Background workers & queues

| Choice | Version | Role |
|---|---|---|
| **BullMQ** | current | Queue library on top of Redis. |
| **Redis** | 7+ | Queue backing store. Also the cache for idempotency keys and short-lived rate-limit counters. |

Workers live in `services/` and are deployed as independent processes. Each queue has a dead-letter queue and a metrics dashboard.

---

## Identity & access

| Choice | Version | Role |
|---|---|---|
| **Keycloak** | 25+ | IdP, user directory, MFA enrolment, session policy, social federation hooks if needed later. |
| **OIDC** (standard) | — | Protocol the web and mobile apps use to authenticate. PKCE flow mandatory for the mobile app. |

Keycloak is self-hosted by MOGCSP. The choice is revisited only if the Ministry decides to federate with a Government of Liberia SSO in the future — in which case Keycloak can broker the federation rather than be replaced.

---

## Object storage

| Choice | Role |
|---|---|
| **S3-compatible storage** — MinIO (on-prem) or AWS S3 / Azure Blob (cloud) | Attachments, exports, backups. Server-side encryption (SSE-KMS where available). Client-side encryption for survivor-linked attachments. |

The S3 API is the abstraction — the application code doesn't know or care which backend is behind it. This preserves the hosting flexibility described in [ARCHITECTURE.md § Hosting](./ARCHITECTURE.md#hosting).

---

## Observability

| Choice | Role |
|---|---|
| **OpenTelemetry** (SDK + collector) | Traces, metrics, logs from all services. |
| **Prometheus** | Metrics store. |
| **Grafana** | Dashboards, alerting. |
| **Loki** | Log aggregation (or Elasticsearch if a security ops team prefers it). |
| **Sentry** (self-hosted) | Error tracking for web, mobile, and API. Self-hosted to keep PII-adjacent payloads in country. |

Audit logs are **not** in Loki — they go to a write-once Postgres audit schema and are tiered to object storage after 90 days. See [SECURITY.md](./SECURITY.md).

---

## Build & deploy

| Choice | Role |
|---|---|
| **Docker** | Every service ships as a container. Multi-stage builds, distroless runtime images. |
| **GitHub Actions** or **GitLab CI** (decided at Inception) | CI/CD. |
| **Terraform** (if cloud) or **Ansible** (if on-prem) | Infrastructure as code. Hosting choice drives this. |
| **Kubernetes** (k3s if on-prem, EKS/AKS if cloud) | Orchestration. Overkill for a small deployment but standardises operational runbooks. |

---

## Testing

| Layer | Tool | Target |
|---|---|---|
| Unit | **Vitest** | 80%+ line coverage on business logic modules |
| API integration | **Vitest + supertest** against a test Postgres in Docker | Critical endpoints covered end-to-end |
| Mobile UI | **Jest + React Native Testing Library** | All forms and sync paths |
| Web UI | **Playwright** | Critical user journeys (login, create case, view dashboard, export report) |
| Contract | **Schemathesis** against OpenAPI spec | API and spec cannot drift |
| Load | **k6** | Run against staging before each major release |
| Accessibility | **axe-core** via Playwright | WCAG 2.1 AA gates |

A change that decreases coverage requires a justification in the PR description.

---

## Developer tooling

- **ESLint** (with `@typescript-eslint` and a shared config in `packages/eslint-config`)
- **Prettier** — auto-formatted on save; CI fails on unformatted code
- **Husky** + **lint-staged** — pre-commit hooks (format, lint, typecheck on changed files)
- **commitlint** with Conventional Commits — enforces commit message shape
- **changesets** — per-package versioning and changelog generation

---

## What is explicitly not in the stack

These were considered and rejected. If anyone on the team wants to bring one back, they need an ADR.

| Rejected | Why |
|---|---|
| GraphQL as the primary API | Consumer list is small and well-known; REST + OpenAPI + codegen'd TypeScript clients give us typed end-to-end calls without the GraphQL operational tax. |
| Ionic / Capacitor / Cordova for mobile | Offline performance and native sync behaviour are too critical to accept the web-view overhead. React Native's JS-to-native bridge meets the requirement. |
| Firebase / Firestore | Vendor lock-in to Google Cloud violates the MOGCSP sovereignty principle. |
| Supabase as the primary backend | Same lock-in concern. Supabase is fine for internal prototypes but not for the production handover. |
| MongoDB | The data is inherently relational (cases ↔ beneficiaries ↔ orgunits ↔ indicators). Trying to shape it with embedded documents loses referential integrity we need for audit defensibility. |
| Microservices from day one | Single NestJS app with well-bounded modules is easier to operate, easier to hand over, and can be decomposed later if scale demands it. |
| Raw SQL-only (no ORM) | Team productivity and migration safety outweigh the minor performance gains; we drop to raw SQL where Prisma struggles (spatial queries, RLS). |
| DHIS2 as the primary system | See [ARCHITECTURE.md § The fundamental architectural decision](./ARCHITECTURE.md#the-fundamental-architectural-decision-custom-primary-with-dhis2-as-an-interoperability-peer). |
