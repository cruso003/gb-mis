# Penetration test — scope and rules of engagement

**Audience.** External penetration testing firm engaged for the GB MIS
Stage-4 assessment, plus the MOGCSP ICT Director and DPO for sign-off.

**Engagement window.** Per [`ROADMAP.md § Stage 4`](../../ROADMAP.md), the
external test takes place in Week 11 of Phase 1, and is repeated annually
in Phase 2.

> 🔒 **MOGCSP approval required**: this document must be signed by the
> MOGCSP ICT Director and the DPO before the engagement begins. The
> tester acknowledges its terms in writing.

---

## 1. Objectives

The pen-test verifies that:

1. The threat model in [`SECURITY.md § Threat model`](../../SECURITY.md#threat-model) is honoured by the implementation.
2. No combination of public surface and authenticated user role can read survivor-linked data outside the actor's scope.
3. The mobile app's offline store is not recoverable from a stolen-device snapshot.
4. The audit log is tamper-evident in practice, not only by design.
5. No critical or high-severity OWASP Top 10 (2021) issue is present.

The pen-test does **not** validate operational controls (DR rehearsal, backup integrity, key custody). Those are exercised separately per the `runbooks/`.

---

## 2. Assets in scope

### 2.1 Web

- `https://staging.$DOMAIN` — Next.js production build
- `https://staging-api.$DOMAIN` — NestJS API, all routes under `/v1/*`
- `https://staging-auth.$DOMAIN` — Keycloak realm `gb-mis`
- `https://staging.$DOMAIN/public/dashboard` — unauthenticated public surface

### 2.2 Mobile

- Android APK (debug-signed, identical to production AAB except for the signing key) for **Android 10+**
- The on-device SQLCipher store is in scope for offline-attack analysis
- iOS is **out of scope** (Phase 1 ships Android only per `ROADMAP.md`)

### 2.3 Infrastructure

- The staging Docker Compose stack: API, web, Keycloak, Postgres, pgBouncer, Redis, MinIO, NGINX
- The staging deployment process is **out of scope** for active testing — review the runbook (`runbooks/deploy.md`) for documentation review only
- The KMS sidecar is in scope for the **interface** (how the API consumes secrets), not the KMS itself

### 2.4 Source code

- The MOGCSP-controlled Git repository for the GB MIS, read-only access provided to the tester for the engagement window only.
- Access is revoked at engagement close.

---

## 3. Assets out of scope — do not test

- Production environment (`api.$DOMAIN`, `app.$DOMAIN`). Any finding affecting production is reported but not actively probed.
- The MoH DHIS2 instance, REALISE PMU systems, LISGIS portal — these are partner systems integrated via API
- The Keycloak operator's underlying database (we test Keycloak as a black-box IdP, not its internals)
- Physical security of the MOGCSP datacenter
- Social engineering of MOGCSP staff
- Denial-of-service against staging beyond throughput sanity checks (use `k6` configured at the documented load levels in `SECURITY.md`)
- The on-prem network perimeter beyond the public-facing assets above

---

## 4. Test data

> 🔒 **DPO approval required.** This section is non-negotiable.

1. **No real survivor data.** The staging environment is seeded with synthetic
   data only. Confirm before testing — every `Beneficiary` and `GbvCase`
   record carries a `synthetic = true` flag and the names are clearly
   non-Liberian (per CLAUDE.md "Don't let test data look like real survivor
   data"; phone numbers use the `+1-555-` prefix).
2. **If real-looking data is encountered**, stop immediately and notify the
   MOGCSP ICT Director. Do not exfiltrate, screenshot, or document the
   record content.
3. **Discovered data classifications must be respected.** Restricted
   columns (`gbv_cases.notes`, `beneficiaries.full_name_ciphertext`, etc.)
   carry no informational value to the test — focus on access-control
   and crypto bypass, not on reading the values.
4. **Findings must not include sample data**. Use the entity ID and field
   name only.

---

## 5. Rules of engagement

### 5.1 Time window

- Active testing: 09:00–18:00 Africa/Monrovia, Monday–Friday, for the
  agreed engagement window
- Out-of-hours testing requires explicit ICT Director approval per
  occurrence
- The on-call engineer is staffed during all active windows

### 5.2 Permitted techniques

- Authenticated and unauthenticated dynamic web testing (DAST)
- API fuzzing against the OpenAPI document at `apps/api/openapi.json`
- Mobile reverse-engineering and on-device storage analysis (Android only)
- Network-path inspection on the staging perimeter
- Code review of the read-only repository checkout
- Credential-stuffing simulation **only** against the test accounts
  (M2 in `hardening-checklist.md`), never against real MOGCSP accounts
- Crypto verification: prove the on-disk SQLCipher file is unreadable
  with stock SQLite (per `apps/mobile/MOBILE_SQLCIPHER_BUILD.md` smoke test)

### 5.3 Forbidden techniques

- Persistent backdoors of any kind
- Modification of production state
- Probing of any third-party endpoint that is not part of the GB MIS
  surface (DHIS2, REALISE, LISGIS — these belong to other ministries)
- Exhaustive DoS or amplification attacks
- Any test that would leave the staging environment in an unrecoverable
  state — coordinate destructive tests with the on-call engineer
- Testing of GBV case workflows in a way that would generate
  notifications or referrals to real services

### 5.4 Communication

- A dedicated Signal or Slack channel is created for the engagement
- The on-call engineer announces every system-wide event (deploy,
  restart, backup) so the tester can correlate
- The tester announces the start of any session intended to generate
  unusual load
- Emergency stop: the ICT Director or the engineering lead can call a
  halt via the channel; the tester acknowledges within 15 minutes

---

## 6. Test account roster

Provisioned in the staging Keycloak realm before engagement start.
Passwords rotated to one-time values held in the engagement vault.

| Account | Role | County scope | MFA |
|---|---|---|---|
| `test_super_admin@gb-mis.test` | `SUPER_ADMIN` | All | TOTP |
| `test_admin@gb-mis.test` | `ADMIN` | All | TOTP |
| `test_supervisor_bomi@gb-mis.test` | `SUPERVISOR` | Bomi | TOTP |
| `test_caseworker_bomi@gb-mis.test` | `CASE_WORKER` | Bomi | TOTP optional |
| `test_caseworker_grand_gedeh@gb-mis.test` | `CASE_WORKER` | Grand Gedeh | TOTP optional |
| `test_data_clerk@gb-mis.test` | `DATA_ENTRY_CLERK` | Bomi | None |
| `test_analyst@gb-mis.test` | `ANALYST` | All | TOTP |
| `test_viewer@gb-mis.test` | `VIEWER` | All | None |

**Cross-scope test**: the tester must verify that
`test_caseworker_bomi@` cannot read any case under `test_caseworker_grand_gedeh@`'s
scope. This is the primary RLS regression test.

---

## 7. Findings classification & SLAs

Severity per CVSS 3.1, SLA per [`SECURITY.md § Patching SLAs`](../../SECURITY.md#patching-slas).

| Severity | CVSS | Patch SLA | Engagement obligation |
|---|---|---|---|
| Critical | ≥ 9.0 | 72 hours | Reported immediately, before report compilation |
| High | 7.0–8.9 | 7 days | Reported within 24 hours of identification |
| Medium | 4.0–6.9 | Next maintenance window (≤ 30 days) | Included in final report |
| Low | < 4.0 | Next feature release | Included in final report |
| Informational | n/a | Acknowledged | Optional, included if illustrative |

The known gaps already documented in `hardening-checklist.md` are **not
findings** — the pen-tester confirms whether they are present and notes
the compensating controls in their report.

---

## 8. Report deliverables

The pen-tester delivers, no later than 10 working days after engagement
close:

1. **Executive summary** (1 page) — methodology, surface tested, total
   findings by severity, headline conclusions. Suitable for the Deputy
   Minister.
2. **Detailed findings report** — one section per finding:
   - Title, severity, CVSS vector
   - Affected asset
   - Reproduction steps (without sample survivor data — entity IDs and
     field names only)
   - Recommended remediation
   - Suggested verification test
3. **Methodology appendix** — what was attempted, what was out of
   scope, total time spent per surface
4. **Raw artefacts** — encrypted archive of relevant traffic captures,
   scan logs, and POC scripts. Encryption key delivered through a
   separate channel
5. **Re-test offer** — written commitment to re-test up to N agreed
   findings within 30 days at no additional cost

The report **must not** include screenshots or excerpts of any
seemingly real survivor data even if encountered (per § 4 above).

---

## 9. Joint review and remediation

Within 5 working days of report receipt:

1. The MOGCSP ICT Director, the engineering lead, and the DPO meet to
   triage every finding.
2. Critical and High findings are assigned an owner and an SLA-aligned
   due date in the project tool.
3. Medium and Low findings are batched into the next maintenance window.
4. The triage outcome is communicated back to the pen-tester so they
   know which findings will be re-tested.

🔒 **MOGCSP approval required** to close any finding. The DPO signs off on
remediation of any finding involving survivor-linked data.

---

## 10. Engagement close

Engagement is complete when:

1. The detailed report has been delivered and accepted.
2. All Critical and High findings have been remediated and re-tested
   (or the deviations documented and signed by the ICT Director).
3. The pen-tester's repository access is revoked.
4. Test accounts and credentials are rotated; the engagement vault is
   wiped.
5. The post-engagement report is filed with the World Bank PMU per
   `SECURITY.md § Communications`.

---

## 11. Annual repeat (Phase 2)

Per `ROADMAP.md § Phase 2 — Month 5–6 after Go-Live`, the engagement
repeats annually with the same external provider where practical. The
hardening checklist and this scope document are reviewed and updated
in the two weeks before each annual engagement.

---

## Sign-off

| Role | Name (role-holder) | Date | Signature |
|---|---|---|---|
| MOGCSP ICT Director | | | |
| MOGCSP DPO | | | |
| Engineering Lead (consultant) | | | |
| Pen-test firm — engagement lead | | | |
