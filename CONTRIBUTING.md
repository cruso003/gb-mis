# Contributing

This document describes how we develop this codebase. It applies equally to consultants during delivery and to MOGCSP staff after handover.

---

## Development environment

### Prerequisites

- **Node.js 22 LTS** — managed via `nvm` or `fnm`
- **pnpm 9+**
- **Docker** with Compose — for Postgres, Redis, Keycloak, MinIO in development
- **Android Studio** — only if working on the mobile app
- **git** with your commits signed (GPG or SSH signing; see `docs/runbooks/signing-setup.md`)

### First-time setup

```bash
git clone <repo-url> gb-mis
cd gb-mis
pnpm install
cp infra/dev-secrets.example .env.local
docker compose -f infra/docker/dev-compose.yaml up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

After `pnpm dev`, the web app is at `http://localhost:3000`, the API at `http://localhost:4000`, Keycloak admin at `http://localhost:8080/admin` (default credentials in `infra/dev-secrets.example`), and Prisma Studio at `http://localhost:5555`.

---

## Branching model

Trunk-based development, small short-lived branches.

```
main                               (always deployable; CI-enforced green)
├── feat/case-supervisor-review    (feature branches; squash-merged)
├── fix/indicator-computation-bug
├── docs/update-security-threat-model
└── chore/bump-prisma-5.22
```

- `main` is protected. Direct pushes are forbidden. Merges only via approved PR.
- Branches are deleted after merge.
- Long-running feature branches (> 5 days) are a code smell. Ship behind a feature flag instead.
- Release tags follow the form `v1.0.0`, `v1.1.0`, `v1.1.1` — semantic versioning at the release (not package) level.

---

## Commit messages

Conventional Commits, lowercase. One logical change per commit.

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `build`, `ci`, `style`, `revert`.

**Scopes** (the module or app primarily touched): `web`, `mobile`, `api`, `db`, `auth`, `indicators`, `cases`, `beneficiaries`, `dhis2-sync`, `realise-sync`, `etl`, `infra`, `docs`, etc.

**Subject**: imperative, present tense, no trailing period, ≤ 72 chars.

Footer references the ticket: `Closes #142` or `Refs #87`.

Examples:

```
feat(cases): add supervisor review sign-off workflow

A new case cannot be read by analysts until a supervisor in the same
org unit has signed off. Adds a guard, a dedicated endpoint, and a
supervisor-facing queue in the web admin.

Closes #142
```

```
fix(indicators): round maternal mortality ratio to integer per WHO convention

WHO reports MMR as integers per 100,000. We were computing and
displaying two decimal places, which produced false precision in
county-level dashboards.

Closes #201
```

commitlint runs in CI and rejects malformed messages.

---

## Pull requests

### Size

Small. A PR that's more than ~400 lines of changed code (excluding tests, generated files, and lockfile) is pushing the limit and needs a strong justification.

### Description template

```markdown
## What

One-paragraph description of what this PR does.

## Why

One paragraph on motivation / context. Reference the issue.

## Docs consulted

- [x] README.md
- [x] DATA_MODEL.md
- [x] SECURITY.md
(tick the docs you read or re-read for this change)

## Privacy impact

- [ ] This change does not touch classified data
- [ ] This change touches Restricted / Sensitive classified data — impact paragraph below
- [ ] This change modifies a RLS policy — test evidence below

(if either of the last two is checked, describe the impact and the controls)

## Test evidence

- [ ] Unit tests added or updated
- [ ] Integration tests added or updated
- [ ] E2E tests added or updated (if UI changed)
- [ ] Manual verification steps: ...

## Screenshots / recordings

(UI changes only)
```

### Review

- One reviewer minimum
- Two reviewers for changes that touch `GbvCase`, `Beneficiary`, `User`, `UserRole`, `ConsentRecord`, RLS policies, encryption helpers, the sync protocol, or any audit behaviour
- DPO sign-off on any `ConsentRecord` schema change
- Security lead sign-off on any change to authentication or authorisation

A reviewer is expected to run the change locally for non-trivial PRs, not just scan the diff.

### Merge

- Squash merge into `main`
- The squash commit message must be Conventional-Commit-shaped
- The PR author is responsible for ensuring the title is correct before merge

---

## CI pipeline

Every PR and every push to `main` runs:

1. **Install** — `pnpm install --frozen-lockfile`
2. **Type check** — `pnpm typecheck`
3. **Lint** — `pnpm lint` (ESLint + Prettier + markdownlint)
4. **Unit + integration tests** — `pnpm test` with coverage reporting
5. **E2E** — Playwright (web) and Jest + RNTL (mobile)
6. **Contract** — Schemathesis against OpenAPI
7. **SAST** — Semgrep with custom rules
8. **Dependency scan** — `pnpm audit` + Dependabot-equivalent
9. **Secret scan** — gitleaks
10. **Container scan** — trivy against built images
11. **OpenAPI drift check** — fails if generated spec differs from committed
12. **Accessibility** — axe-core via Playwright on key pages
13. **Build** — all apps build successfully

A failure at any stage blocks merge. Overrides require security-lead or tech-lead approval and are logged.

---

## Testing standards

### Coverage expectations

| Layer | Minimum coverage |
|---|---|
| `packages/indicators` (calculation logic) | 90% |
| `packages/auth` (permission logic) | 90% |
| `apps/api` business logic | 80% |
| `apps/web` (UI) | 60% line, 90% on forms and data mutations |
| `apps/mobile` (sync paths and forms) | 80% |
| `services/*` workers | 80% |

A PR that reduces overall coverage requires a justification paragraph.

### Test flavour

- **Unit tests** for pure logic (Vitest). Fast, no I/O.
- **Integration tests** for API modules (Vitest + supertest against a test Postgres in Docker). Start each test with a clean schema snapshot.
- **Contract tests** generated from the OpenAPI spec (Schemathesis). CI runs them against a staging-equivalent build.
- **E2E tests** for critical user journeys (Playwright for web; Jest + RNTL + Detox for mobile). Journey list is enumerated in `docs/test-journeys.md`.
- **Load tests** in `infra/load/` run on-demand before releases. Targets documented in `ARCHITECTURE.md`.
- **Security tests** — every permission change must be paired with at least one test that asserts the wrong-role user is denied.

### Test data

- Never use real survivor-like data in tests, even in local development
- Seeded test data uses clearly fictional names and a `+1-555-` phone prefix
- If a test needs "realistic" Liberian data, use the fixtures in `packages/testing/fixtures/` which are professionally curated fakes

---

## Database changes

Every Prisma migration is reviewed like code.

Rules:

- **Additive first**: add columns as nullable, deploy, backfill, then tighten constraints in a subsequent migration
- **No `DROP` on a column that was ever in production** without an ADR — the column becomes reserved, renamed to `__deprecated_<col>`, and dropped two releases later
- **New scoped tables ship with their RLS policy in the same migration**
- **New classified columns carry a classification comment** — CI checks for it
- **Backfills over 10k rows** are chunked and run as jobs, not inline with the migration
- **Production migrations are reviewed on a staging copy** before being applied to production; the deployer records the migration in the release log

---

## Feature flags

We use feature flags aggressively to ship incomplete features behind a toggle. Flags are stored in the database and managed by `ADMIN` users through the web admin.

Rules:

- Flags have expiry dates — a flag not removed within 90 days is a tech-debt ticket
- No flag should hide a security-relevant change — security fixes ship straight
- Flags are tested in both states; a feature that only works with the flag on is a bug

---

## Release process

### Versioning

- **Major** (`v2.0.0`): breaking API or data-model changes
- **Minor** (`v1.1.0`): new functionality, backward compatible
- **Patch** (`v1.1.1`): bug and security fixes

### Cadence

- One minor release per delivery stage during Phase 1
- Ad-hoc patches during Phase 2 as needed
- Security patches are out-of-band and may merge directly to `main` after expedited review

### Checklist

- [ ] `CHANGELOG.md` updated (or changesets generated the entry)
- [ ] All tests green on `main`
- [ ] Staging deployment smoke-tested
- [ ] Database migrations validated on a staging copy of production
- [ ] Release notes drafted
- [ ] Rollback plan documented (always)
- [ ] Announcement message prepared for the operations channel

### Deploy

- Tag `vX.Y.Z` on `main`; CI builds artefacts and pushes to the container registry
- Terraform / Ansible pipeline applies the change to staging, smoke-tests, then to production
- Deployer monitors dashboards for 30 minutes post-deploy; rollback threshold documented in the release notes

---

## Documentation

### What to update with a code change

- **`README.md`** — if the repo layout or the core pitch changes
- **`ARCHITECTURE.md`** — if a component, data flow, or hosting decision changes
- **`TECH_STACK.md`** — if a library is added, removed, or changes major version
- **`DATA_MODEL.md`** — if entities or relationships change
- **`API_SPEC.md`** — if API conventions or high-level resource model changes (the OpenAPI doc is generated; this doc is the narrative)
- **`SECURITY.md`** / **`COMPLIANCE.md`** — if a control, policy, or data-subject flow changes
- **`INDICATORS_CATALOG.md`** — if indicators are added, removed, or renamed
- **`ROLES_PERMISSIONS.md`** — if a role or permission changes
- **`ROADMAP.md`** — if the schedule or scope boundaries shift materially

Docs-only PRs are welcome and go through the same review process.

### Architecture Decision Records

Material deviations from the current documented design require an ADR in `docs/adr/NNNN-short-slug.md` following the Michael Nygard template:

```markdown
# NNNN. Short decision title

Date: 2026-05-15
Status: Proposed | Accepted | Superseded by NNNN | Deprecated

## Context

What is the issue we are facing?

## Decision

What have we decided?

## Consequences

What becomes easier? What becomes harder? What risks does this introduce?
```

---

## Communication

### Channels

- **Issues** for bug reports and feature requests — labelled, triaged weekly
- **Project board** for sprint tracking
- **Signal or MOGCSP-approved internal channel** for real-time coordination — no survivor data ever shared on these channels
- **Email** for formal stakeholder communication
- **Audit Trail Form** for deliverable-acceptance feedback from MOGCSP

### Reporting a security issue

- Security issues are not filed as public issues
- Email the security lead at the project-specific address in `SECURITY.md`
- Include reproduction steps and impact assessment
- The security lead acknowledges within 24 hours

---

## Onboarding a new contributor

1. Sign the NDA and the Code of Conduct
2. Complete the survivor-centered data handling training (tracked in the user record)
3. Obtain a MOGCSP email or a consultant project email
4. Receive Keycloak credentials for the staging environment
5. Clone the repo; complete the First-time setup
6. Read the doc set in the order listed in `CLAUDE.md`
7. Shadow an experienced team member on a small PR
8. First solo PR is a docs update or a simple bug fix, to verify the process

---

## Code of Conduct (summary)

The full CoC is in `CODE_OF_CONDUCT.md`. In short:

- We disagree about code, not people
- We call out behaviour that risks harm to survivors, users, or colleagues — without blame, with urgency
- We do not speculate publicly about specific cases in the system
- We respect the roles and scopes of our colleagues — a case worker's scoping decision isn't second-guessed by a developer
- We respect the time and expertise of our MOGCSP partners

Violations are addressed via the process in `CODE_OF_CONDUCT.md` with escalation to the consultant's engagement lead and the MOGCSP PMU as appropriate.
