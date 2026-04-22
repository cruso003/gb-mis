# CLAUDE.md

This file is an operating guide for Claude Code (and other AI coding assistants) working in this repository. Treat it as a coworker's handoff note: context you need, conventions you must follow, and behaviours that are non-negotiable for this project.

---

## What this project is

You are helping build the **Liberia GB MIS** — a gender-based management information system for Liberia's Ministry of Gender, Children and Social Protection (MOGCSP), under the World Bank-funded LWEP project. Read `README.md` and `PROJECT_CONTEXT.md` first if you haven't already. The short version:

- It tracks national gender-equality indicators (SDG, Beijing Platform, CEDAW, AU WPS frameworks)
- It manages GBV (gender-based violence) case records and LWEP beneficiary lifecycles
- It operates across six rural counties with poor connectivity
- It is a locally-owned MOGCSP asset that must outlive the project's June 2027 closure

**The data in this system can endanger survivors of violence if mishandled.** That reality shapes every technical decision. Read `SECURITY.md` and `COMPLIANCE.md` before doing anything that touches survivor data.

---

## How to navigate the docs

Read in this order before substantial work:

1. `README.md` — orientation
2. `PROJECT_CONTEXT.md` — who the users are, what counties, what ministries
3. `ARCHITECTURE.md` — system shape, the custom-primary-with-DHIS2-interop decision
4. `TECH_STACK.md` — exact libraries and versions
5. `DATA_MODEL.md` — entities, bounded contexts, conventions
6. `SECURITY.md` — threat model, encryption, RLS, audit
7. `COMPLIANCE.md` — consent, WHO ethics, data-subject rights
8. `ROLES_PERMISSIONS.md` — the seven roles and their permission matrix
9. `API_SPEC.md` — REST conventions and the resource catalogue
10. `INDICATORS_CATALOG.md` — the indicator universe
11. `ROADMAP.md` — delivery stages and gates
12. `CONTRIBUTING.md` — branching, commits, PR review
13. `GLOSSARY.md` — acronyms (BPfA, CEDAW, ASRH, LISGIS, DHS, VSLA, REALISE, WPS, etc.)

For a task involving a specific area, always re-read the relevant doc first. The docs are the source of truth; the code should conform to them. If the code and a doc disagree and the doc is correct, fix the code.

---

## The stack (one-screen reminder)

```
Language     TypeScript 5.4+  (strict mode everywhere)
Runtime      Node.js 22 LTS
Monorepo     Turborepo + pnpm workspaces
Web          Next.js 15 (App Router) + React 19 + Tailwind 4 + shadcn/ui + Recharts + react-leaflet
Mobile       React Native 0.76+ / Expo SDK 52+ / WatermelonDB + SQLCipher (Android 10+)
API          NestJS 10 with Fastify adapter; Prisma 5; OpenAPI 3.1 generated
DB           PostgreSQL 16 + PostGIS + pgcrypto; pgBouncer; row-level security
Workers      BullMQ on Redis 7
Auth         Keycloak 25 (OIDC + PKCE + MFA)
Storage      S3-compatible (MinIO on-prem or cloud provider)
Validation   Zod 3 (form + API); class-validator (DTO boundary)
Logging      pino + OpenTelemetry → Prometheus + Grafana + Loki
Errors       Self-hosted Sentry
Testing      Vitest (unit + integration), Playwright (web e2e), Jest + RNTL (mobile), Schemathesis (API contract), k6 (load), axe-core (a11y)
```

---

## Repository layout

```
gb-mis/
├── apps/
│   ├── web/          # Next.js admin + dashboards
│   ├── mobile/       # React Native offline data capture
│   └── api/          # NestJS REST API
├── packages/
│   ├── db/           # Prisma schema + migrations
│   ├── types/        # Shared TS types
│   ├── indicators/   # Indicator catalog + formulas
│   ├── auth/         # Permission registry + guards helpers
│   ├── ui/           # Design system (web + shared visuals)
│   └── eslint-config/
├── services/
│   ├── dhis2-sync/
│   ├── realise-sync/
│   └── etl/
├── infra/
│   ├── docker/
│   ├── k8s/ or terraform/ or ansible/   # depending on final hosting
│   └── scripts/
└── docs/             # ← the guide docs
```

---

## Ground rules (non-negotiable)

### Survivor safety

1. **Never store perpetrator names.** Only relationship category and demographic bracket. If a requirement seems to ask for a perpetrator name, push back and re-read `COMPLIANCE.md`.
2. **Never log decrypted survivor-linked data.** Audit logs carry entity IDs and field names, never decrypted values. If a log line might contain a name, a phone, or a national ID, scrub it.
3. **Never weaken k-anonymity.** The threshold for aggregate outputs is 5. Don't lower it "just for this endpoint." If an analyst claims to need it, that's a conversation with the DPO, not a code change.
4. **Survivor-linked data does not leave Liberia** without a specific legal basis. Treat cross-border considerations as first-class design constraints, not afterthoughts.
5. **The quick-exit control on the mobile app is sacred.** Don't disable it, don't wrap it in a confirmation, don't hide it on any survivor-facing screen.

### Sovereignty

6. **No vendor lock-in.** Reject any proposal that introduces a proprietary SaaS as a core dependency where an open alternative exists. MOGCSP must be able to run this system without calling the consultant.
7. **The source is open to MOGCSP.** No "proprietary library" components, no obfuscated modules, no per-seat licensed dependencies in the critical path.

### Data integrity

8. **Every mutating endpoint emits an audit event.** No exceptions. If you add a mutation, add an audit call.
9. **Every read of `GbvCase` and `Beneficiary` emits an audit event.** Reads on these are sensitive.
10. **The audit store is append-only.** Do not add an UPDATE or DELETE path on audit tables, ever.
11. **RLS policies are defence-in-depth.** Do not rely on application-layer filtering alone for county-scoped data. If you add a new table carrying county-scoped data, add RLS policies for it in the same migration.

### Offline-first

12. **The mobile app's offline path is the reference path.** If a feature works online but not offline, that's a bug. Design offline first, then optimise the online case.
13. **Never silently drop a sync record.** Rejections are reported back to the user; records stay in `pending_sync` until they succeed or are explicitly discarded through the reconciliation UI.
14. **Server is authoritative on conflicts.** Client always applies the server's resolution.

### Standards

15. **OpenAPI is a source artefact.** If you change an endpoint, the committed OpenAPI document must change too. CI enforces.
16. **Validation schemas are shared.** The same Zod schema validates on the form, on the API, and drives the generated OpenAPI — don't duplicate validation rules.
17. **TypeScript strict, everywhere.** No `any`, no `// @ts-ignore` without a comment explaining why and a TODO to remove it.

---

## Conventions

### Commits

Conventional Commits, lowercase. Reference tickets in the footer:

```
feat(cases): add supervisor review sign-off workflow

Closes #142
```

Allowed types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `build`, `ci`, `style`, `revert`.

### Branches

- `main` — always deployable
- `feat/<short-slug>`, `fix/<short-slug>`, `chore/<short-slug>`, `docs/<short-slug>`
- Long-lived branches are discouraged; small, frequent PRs preferred

### PRs

- Title follows Conventional Commit shape
- Description includes: what changed, why, which docs were consulted, any privacy-impact notes
- Linked issue is required for non-trivial changes
- CI must be green; reviewers require the privacy-impact checkbox to be completed for any change touching `GbvCase`, `Beneficiary`, `User`, `UserRole`, or `ConsentRecord`

Full details in `CONTRIBUTING.md`.

### Code style

- Prettier for formatting, auto-run on save and in pre-commit
- ESLint with the shared config in `packages/eslint-config`
- Import order: Node built-ins, external packages, internal packages (`@gb-mis/*`), relative imports — separated by blank lines
- No default exports except for Next.js pages and React Native screens where the framework requires them

### Naming

- Files: `kebab-case.ts`, React components `PascalCase.tsx`
- React components: PascalCase; hooks: `useCamelCase`
- Test files: `*.test.ts` (unit), `*.e2e.ts` (Playwright), `*.contract.ts` (Schemathesis)
- Database tables: plural snake_case; Prisma models: singular PascalCase
- Enums: UPPER_SNAKE_CASE values, PascalCase names

---

## Commands you'll use often

```bash
# Install
pnpm install

# Run everything in dev
pnpm dev

# Run a specific app
pnpm --filter=@gb-mis/web dev
pnpm --filter=@gb-mis/mobile start
pnpm --filter=@gb-mis/api dev

# Type-check
pnpm typecheck

# Lint
pnpm lint

# Run tests
pnpm test                        # unit + integration
pnpm --filter=@gb-mis/web e2e    # Playwright
pnpm --filter=@gb-mis/api contract  # Schemathesis
pnpm --filter=@gb-mis/mobile test

# Database
pnpm db:generate                 # Prisma client
pnpm db:migrate                  # apply migrations
pnpm db:seed                     # seed including indicator catalog
pnpm db:studio                   # Prisma Studio

# OpenAPI
pnpm openapi:generate            # regenerate spec
pnpm openapi:check               # fail if generated spec drifts from committed

# Mobile
pnpm --filter=@gb-mis/mobile prebuild
pnpm --filter=@gb-mis/mobile android

# Build for production
pnpm build
```

Workflow expectation: run `pnpm typecheck && pnpm lint && pnpm test` locally before pushing. CI will run them anyway but failing fast locally is faster for everyone.

---

## Project skills to reach for

Before writing code for a task, actively consider whether one of the following is relevant. These are agreements the team has already made.

- **Encrypting a new column** → use the helpers in `packages/db/src/encryption.ts`; don't roll your own pgcrypto calls
- **Adding a new entity with county scope** → follow the template in `packages/db/src/rls-template.sql`; every new scoped table must ship with its RLS policy in the same migration
- **Adding a new endpoint** → wire it through the permission registry in `packages/auth/src/permissions.ts`; the guard picks up the new permission automatically
- **Adding a new indicator** → `INDICATORS_CATALOG.md` lists the steps; don't change indicator codes once they're published
- **Working on the mobile sync protocol** → read `apps/mobile/SYNC_PROTOCOL.md` first and add a test case before changing behaviour
- **Adding a new audit event type** → add to the `AuditAction` enum; update the retention tiering policy if needed; add a Grafana alert for anomalous volumes
- **Changing anything about consent** → `ConsentRecord` changes require DPO sign-off before merge
- **Changing anything about RLS** → requires a security review; include a test that verifies a wrong-scope user is denied

---

## Behaviours to avoid

Things I've seen go wrong on similar projects — don't do these:

- **Don't add a "debug" endpoint that bypasses auth.** Not even temporarily. Use the existing `SUPER_ADMIN` role with the two-person flow.
- **Don't suggest "let's just use Firebase for the MVP."** See sovereignty rule #6.
- **Don't introduce a second ORM or query builder alongside Prisma.** If Prisma struggles with a query, drop to raw SQL in a clearly-scoped helper.
- **Don't add a new UI framework.** The design system is shadcn/ui. Building a parallel component library is a waste.
- **Don't skip `CompletedAt` audit events because "it's just a read."** Reads of `GbvCase` and `Beneficiary` are audited; the SLA for this was set once and doesn't need revisiting.
- **Don't write migration scripts that delete survivor data.** Even a "clean up test data" script needs DPO review if it touches any survivor-classified table.
- **Don't let test data look like real survivor data.** Seeded data uses clearly fake names and a fixed non-Liberian phone country code (+1-555-). If you ever see "Mary" or a local Monrovia phone in test data, replace it.
- **Don't check secrets into git.** A CI secret scanner will flag it; fix the leak and rotate the secret, don't just rewrite history.

---

## When you are genuinely uncertain

Prefer asking over guessing. Legitimate questions include:

- "The TOR is silent on whether [X] is Phase 1 or Phase 2 — should I defer?"
- "This would require adding PII to a log line; is there a different logging pattern I should use?"
- "I see two valid ways to model this; which is preferred by the team?"
- "This would be cleaner with a new library; may I add it?"

Skip asking for trivial things. Don't ask permission to rename a variable or refactor a small function.

---

## Working with Claude Code specifically

When you invoke the assistant on a task:

- Point it at this file and the specific docs it needs
- Give it the acceptance criteria up front, not piecemeal
- Let it run its own tests; don't hand-feed every error
- Review the resulting PR with the same rigour as a human PR — especially for anything security-adjacent

When the assistant works in this repo:

- Start by reading the relevant docs in the order above
- Announce which docs you've read in the PR description — it's both documentation and a reminder to yourself
- Keep PRs small and focused; split unrelated fixes into separate PRs
- Write tests first for anything touching the security model or the sync protocol
- If a change requires a decision that isn't covered by the docs, propose an ADR rather than inventing a convention

---

## One final thing

This project is not a typical app build. The data you'll touch represents some of the most vulnerable people in Liberia. Every time you type, a real MOGCSP case worker in Bomi or Grand Gedeh is going to rely on what you produce to do their job safely. Build accordingly.
