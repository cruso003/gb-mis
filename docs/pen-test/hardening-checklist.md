# Pen-test hardening checklist

**Audience.** MOGCSP ICT operations and the engineering lead.

**Purpose.** Internal pre-flight performed in the two weeks before the
Stage-4 external penetration test. Each item is one of:

- ✅ **Done** — implemented, with the file/control to point at
- ⚠️ **Partial** — some of it is in place; remediation is described
- ❌ **Not done** — must be completed before the external tester arrives
- 🔒 **MOGCSP approval required** — checkpoint that needs explicit sign-off

The goal is to avoid spending the pen-test budget on findings we already
know about. Items marked ❌ are real production risks today, not
hypothetical concerns; address them before the engagement starts.

This document maps to the OWASP Top 10 (2021) and the GB MIS-specific
threats in [`SECURITY.md § Threat model`](../../SECURITY.md#threat-model).

---

## A — Authentication & session management

| # | Item | Status |
|---|---|---|
| A1 | OIDC + PKCE auth via Keycloak 25 (no password handling in app code) | ✅ `apps/api/src/modules/auth/auth.module.ts`, `apps/web/src/app/(auth)/`, `apps/mobile/src/auth/AuthProvider.tsx` |
| A2 | JWT signature verified against Keycloak JWKS with key rotation | ✅ `apps/api/src/modules/auth/jwt.strategy.ts` (RS256 + jwks-rsa) |
| A3 | Access token TTL ≤ 15 min, refresh ≤ 30 days web / 7 days mobile | ✅ `infra/keycloak/realm-export.json` |
| A4 | MFA enforced for `SUPER_ADMIN`, `ADMIN`, `ANALYST`, `SUPERVISOR` | ✅ Keycloak realm — verify TOTP requirement is on these roles before pen-test |
| A5 | Brute-force protection on Keycloak (lockout after N failures) | ✅ `infra/keycloak/realm-export.json` brute-force settings |
| A6 | Session revocation propagates within 30 s | ⚠️ Application caches JWKS for 60s; verify Keycloak revocation list polling matches the SECURITY.md target |
| A7 | Re-authentication required for sensitive actions (role grant, export, cross-scope read) | ❌ Step-up auth not implemented. Add an `acr` claim check in the permissions guard before the engagement |
| A8 | Simultaneous-session limit ≤ 3 per user | ⚠️ Configurable in Keycloak — confirm it's set in the production realm export, not just dev |

🔒 **MOGCSP approval required**: signed-off Keycloak production realm export reviewed by the ICT Director.

---

## B — Authorisation & data scoping

| # | Item | Status |
|---|---|---|
| B1 | Permission registry covers all 7 roles with effective-permission union | ✅ `packages/auth/src/permissions.ts` + `permissions.test.ts` (17 unit tests) |
| B2 | Global `JwtAuthGuard` + `PermissionsGuard` applied via `APP_GUARD` | ✅ `apps/api/src/modules/auth/auth.module.ts` |
| B3 | `@Public()` decorator audited — every public endpoint enumerated and intentional | ✅ `apps/api/src/modules/public/public.controller.test.ts` (contract test enforces) |
| B4 | RLS policies on every county-scoped table (`GbvCase`, `Beneficiary`, `Incident`, `ServiceProvided`, `Referral`, `CaseAttachment`, `Household`, `VslaGroup`, `CommunitySession`) | ❌ **Critical gap.** `packages/db/src/rls-template.sql` exists as a template but no migration applies the policies. CLAUDE.md rule #11 is not yet honoured. Ship an RLS migration before the pen-test or this is a guaranteed finding |
| B5 | RLS session variables set per request (org-unit IDs, user ID) | ⚠️ `apps/api/src/modules/auth/rls.middleware.ts` exists but has no value to set against absent policies (B4); will become useful when B4 lands |
| B6 | Cross-scope reads require supervisor override + are audited | ❌ Override workflow not implemented; track with B4 |
| B7 | k-anonymity threshold 5 enforced on every aggregate response | ✅ `apps/api/src/modules/reports/reports.k-anonymity.test.ts` locks K=5; `suppress()` applied across reports service |

🔒 **MOGCSP approval required**: B4 + B6 closure must be signed off by the ICT Director **before** the external tester is scheduled.

---

## C — Cryptography

| # | Item | Status |
|---|---|---|
| C1 | TLS 1.3 (TLS 1.2 minimum) at the edge with valid certificate | ⚠️ Configured at NGINX in `infra/docker/nginx.conf`; verify cipher suites and HSTS header in production before pen-test |
| C2 | Column-level encryption helpers wired (`pgcrypto` AES-256-GCM) | ✅ `packages/db/src/encryption.ts`; verify every Restricted/Sensitive column actually uses them in the schema |
| C3 | Per-column DEKs wrapped by KMS-resident KEK | ❌ Current `encryption.ts` reads keys from environment variables, not from a KMS sidecar. Contract: **deploy time only**, not at request time. Acceptable for Phase 1 if env vars are tmpfs-mounted from KMS via the sidecar described in `runbooks/deploy.md § 3` |
| C4 | Mobile on-disk store is SQLCipher-encrypted | ⚠️ JS plumbing complete (`apps/mobile/src/db/database.ts`, `deviceKey.ts`); native SQLCipher binding requires the prebuild verification step in `apps/mobile/MOBILE_SQLCIPHER_BUILD.md`. **The on-device smoke test in that doc must pass before the mobile pen-test** |
| C5 | Backups GPG-encrypted before leaving the database host | ⚠️ Documented in `runbooks/backup-restore.md`; verify the `wal-archive.sh` and base-backup scripts ship with the production image and use the production GPG key |
| C6 | Two-person break-glass for KMS unwrap | ❌ Operational control — verify with MOGCSP key custody role-holders |
| C7 | mTLS to DHIS2 / REALISE / LISGIS partners with pinned certs | ❌ Not implemented. Defer to integration phase but document for the tester so they don't flag the absence as a defect |

---

## D — Input validation & injection

| # | Item | Status |
|---|---|---|
| D1 | Global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true, transform: true` | ✅ `apps/api/src/main.ts:35` |
| D2 | All DTOs use class-validator decorators | ⚠️ Verify on every controller; spot-check during code freeze |
| D3 | Prisma is the only DB access layer (no raw queries except in scoped helpers) | ✅ Confirm via `grep -r 'prisma.\$queryRaw\|\$executeRaw'`; document any exception |
| D4 | Mobile sync payloads validated server-side (server is authoritative per CLAUDE.md rule #14) | ✅ `apps/api/src/modules/sync/sync.service.ts` |
| D5 | File uploads (case attachments) virus-scanned + size-limited at the edge | ❌ Virus scanner not wired; size limit enforced at NGINX (`client_max_body_size`). Pen-test should test for archive bombs and oversized uploads |

---

## E — Output handling & HTTP security headers

| # | Item | Status |
|---|---|---|
| E1 | `helmet` (or equivalent) on the API setting CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy | ❌ **Not installed.** Add `@fastify/helmet` to `apps/api` and register it in `main.ts` before pen-test |
| E2 | CORS limited to the production web app origin | ⚠️ `apps/api/src/main.ts:45` reads `API_CORS_ORIGINS` env; default falls back to `http://localhost:3000`. Verify the production env is set and the dev fallback is **not** included |
| E3 | Cookies are `Secure`, `HttpOnly`, `SameSite=Lax` on the web app | ⚠️ Verify in `apps/web/src/auth.ts` (NextAuth) configuration before pen-test |
| E4 | No survivor data ever serialised into a URL (query string or path segment) | ✅ Endpoints take server-generated UUIDs; verify `apps/api/src/modules/cases/cases.controller.ts` parameters do not include survivor PII |
| E5 | API never returns stack traces in production responses | ✅ `apps/api/src/common/filters/global-exception.filter.ts` — confirm error shape in production mode |

---

## F — Rate limiting, abuse prevention

| # | Item | Status |
|---|---|---|
| F1 | Rate limiting at the edge (NGINX `limit_req_zone`) | ⚠️ Verify in `infra/docker/nginx.conf`; document rate per route class |
| F2 | API-level rate limiting as defence in depth | ❌ Not implemented. Add `@fastify/rate-limit` with route-specific overrides for `/v1/auth/*` and `/v1/sync/*` before pen-test |
| F3 | Brute-force protection on Keycloak login | ✅ See A5 |
| F4 | Public endpoints rate-limited more aggressively than authenticated ones | ⚠️ Define in NGINX config; not yet present |

---

## G — Secrets management

| # | Item | Status |
|---|---|---|
| G1 | No secrets in Git | ⚠️ Audit: run `git log -p -- '*.env' '*.pem' '*credentials*'` and any history-rewriting tool (truffleHog) before pen-test |
| G2 | `.env` files in `.gitignore` | ✅ `.gitignore` covers `.env*` |
| G3 | Production secrets sourced from KMS sidecar at runtime, written to tmpfs | ⚠️ Documented in `runbooks/deploy.md § 3 step 4`; confirm the sidecar exists and mounts to `/run/gb-mis/env` |
| G4 | CI uses GitHub Actions secrets, not committed values | ✅ `.github/workflows/ci.yml` references `${{ secrets.* }}` for any sensitive value |
| G5 | Test fixtures use clearly fake names + `+1-555-` phone codes (CLAUDE.md "behaviours to avoid") | ⚠️ Verify seed scripts in `packages/db/src/seed/` |

---

## H — Audit log integrity

| # | Item | Status |
|---|---|---|
| H1 | Every mutating endpoint emits an audit event (CLAUDE.md rule #8) | ⚠️ Audit-event decorator applied on 8 controllers. Verify every `@Post`/`@Patch`/`@Put`/`@Delete` carries `@AuditEvent(...)` |
| H2 | Reads of `GbvCase` and `Beneficiary` emit audit events (CLAUDE.md rule #9) | ⚠️ Verify the `findOne` / list endpoints in `cases.controller.ts` and `beneficiaries.controller.ts` |
| H3 | Audit table is `INSERT`-only — no `UPDATE` or `DELETE` path (CLAUDE.md rule #10) | ⚠️ Enforce via Postgres role grants in the migration; verify before pen-test |
| H4 | Hash-chain emitted per row and verified nightly | ⚠️ Verification job referenced in runbooks; locate the implementation or build it (`docker exec gb-mis-api node dist/scripts/verify-audit-chain.js`) |
| H5 | Audit interceptor never silently drops events | ❌ **Current `apps/api/src/common/interceptors/audit.interceptor.ts:104` swallows the catch.** A failed audit emit currently lets the request succeed unaudited. Decide and implement: fail-closed (return 500) or fail-loud (alert + mark request "audit-pending"). Either is fine; silent-drop is not |
| H6 | Audit log redacted of decrypted survivor-linked data (CLAUDE.md rule #2) | ✅ Audit row stores `entityId` and `field`, never decrypted values; verify by reading the audit table after a write |

🔒 **MOGCSP approval required**: H5 fix decision (fail-closed vs fail-loud) signed off by the DPO before the engagement.

---

## I — Logging & monitoring

| # | Item | Status |
|---|---|---|
| I1 | Structured JSON logs via pino with PII redaction | ✅ `apps/api/src/app.module.ts:32` redact list |
| I2 | Redact list covers `nationalId`, `fullName`, `phoneNumber` at minimum | ✅ Verify completeness against `DATA_MODEL.md` Restricted/Sensitive columns |
| I3 | Errors shipped to Sentry (self-hosted) | ❌ Sentry SDK not yet wired; install `@sentry/node` + `@sentry/nextjs` before pen-test so findings are observable |
| I4 | Metrics exported to Prometheus + Grafana dashboards live | ❌ OTel + Prometheus exporter not yet wired. Tracked separately as a Stage 3 follow-up; not blocking but reduces investigative power during the pen-test |
| I5 | Anomalous audit volume alerts (sudden drop or spike) | ❌ Depends on I4 |

---

## J — Dependency & supply-chain hygiene

| # | Item | Status |
|---|---|---|
| J1 | `pnpm audit` clean on production dependencies | ⚠️ Run before code freeze: `pnpm audit --prod`; triage anything `high+` |
| J2 | CodeQL SAST runs on every PR | ✅ `.github/workflows/ci.yml` `sast` job |
| J3 | Container base images pinned by digest (not tag) | ⚠️ Verify in `infra/docker/Dockerfile.*` — `FROM node:22@sha256:…` not `FROM node:22` |
| J4 | SBOM generated per release | ❌ Add `cyclonedx-npm` or `syft` to the release pipeline; required for Stage 6 handover anyway |
| J5 | Releases tagged + GPG-signed | ⚠️ Process documented in `runbooks/deploy.md § 1`; verify with the first release-candidate tag |

---

## K — Container & host security

| # | Item | Status |
|---|---|---|
| K1 | Containers run as non-root user | ⚠️ Verify each Dockerfile sets `USER node` (or similar) |
| K2 | Read-only root filesystem where possible | ⚠️ Add `read_only: true` to non-state services in `docker-compose.yml`; carve out `/tmp` |
| K3 | Postgres + Redis not exposed publicly | ✅ Confirm in production `docker-compose` overlay — only the LB host has public IPs |
| K4 | Trivy scan in CI on built images | ⚠️ Add a `trivy` step alongside the existing `docker` smoke job |
| K5 | Restrict outbound egress (firewall) | ❌ Operational control; document for MOGCSP Ops |

---

## L — Mobile-specific

| # | Item | Status |
|---|---|---|
| L1 | SQLCipher binding verified on a built APK (per `apps/mobile/MOBILE_SQLCIPHER_BUILD.md`) | ❌ **Must run the on-device smoke test before mobile pen-test** — without it the on-disk file is plain SQLite |
| L2 | `android:allowBackup="false"` in the manifest | ✅ Set via `expo-build-properties` in `apps/mobile/app.json` |
| L3 | Device key stored in `expo-secure-store` (Android Keystore-backed) | ✅ `apps/mobile/src/db/deviceKey.ts` |
| L4 | Quick-exit control on every survivor-facing screen | ✅ `QuickExitButton` component; verify on every new screen |
| L5 | Biometric unlock at app launch | ⚠️ `expo-local-authentication` declared as a dep; verify the unlock flow gates DB access |
| L6 | Root / jailbreak detection (per `SECURITY.md § Mobile-specific`) | ❌ Not yet implemented. Consider `expo-device` checks or a JS root-detection library before pen-test |
| L7 | Code obfuscation on production builds (Hermes bytecode) | ⚠️ Verify Expo config sets `enableHermes: true` and the production AAB is bytecode-only |
| L8 | Certificate pinning against the API leaf cert | ❌ Not yet wired. Add via Expo's network security config before mobile pen-test |
| L9 | Screenshots disabled on case-detail and beneficiary-detail screens | ⚠️ Verify with `FLAG_SECURE` window flag on those screens |
| L10 | Clipboard disabled for decrypted survivor data | ⚠️ Verify input fields holding Restricted data set `contextMenuHidden` and copy-action stripping |

---

## M — Pre-engagement housekeeping

| # | Item | Status |
|---|---|---|
| M1 | Production-equivalent staging environment provisioned for the test | ❌ Document the staging URL + access for the tester in `scope-and-roe.md` |
| M2 | Test accounts seeded — one per role, named clearly as test (`test_admin@`, `test_caseworker_bomi@`) | ❌ Provision and rotate after engagement |
| M3 | **No real survivor data** in the staging environment | 🔒 **MOGCSP DPO approval required**. Use only synthetic data per `CLAUDE.md` "Don't let test data look like real survivor data" |
| M4 | Backups taken immediately before the engagement window | ⚠️ Per `runbooks/backup-restore.md § 3` |
| M5 | On-call engineer staffed throughout the engagement | ⚠️ Schedule before tester arrives |
| M6 | Findings triage SLA known: Critical ≤ 72 h, High ≤ 7 d, Medium ≤ 30 d, Low next release (`SECURITY.md § Patching SLAs`) | ✅ Documented |
| M7 | Findings reviewed jointly with MOGCSP ICT Director within 5 working days of report receipt | 🔒 **MOGCSP approval required** to set the joint review meeting before the engagement starts |

---

## Sign-off

This checklist is signed off when:

1. Every ❌ item above is either **closed** or **explicitly accepted as a known limitation** by the ICT Director with a documented compensating control.
2. The DPO has signed off on M3 (no real survivor data in the staging environment).
3. The MOGCSP ICT Director has signed off on B4, B6, and H5 specifically — these three are the highest-risk gaps and **the engagement should not start until they are closed**.

| Role | Name (role-holder, not individual) | Date | Signature |
|---|---|---|---|
| MOGCSP ICT Director | | | |
| MOGCSP DPO | | | |
| Engineering Lead (consultant) | | | |
| World Bank PMU (informational) | | | — |

---

## How to keep this current

This checklist is a living document. Every PR that touches a security-relevant
file (auth, RLS, audit, encryption, validation) updates the relevant row.
Drift between this document and the code is itself a finding.

Re-run before every annual pen-test (per `ROADMAP.md` Phase 2 month 5–6).
