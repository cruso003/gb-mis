# Security

The GB MIS holds data that can endanger survivors of gender-based violence if it leaks or is misused. Every security control in this document is derived from that reality. This is the controlling document for security decisions; implementation teams follow it even when it conflicts with convenience or velocity.

---

## Threat model

We build for these adversaries, in this rough priority order:

1. **A compromised internal account** — e.g. a case worker's tablet is lost, stolen, or misused. Most probable, most frequent. The system's controls are optimised against this class first.
2. **A perpetrator with knowledge of the system** — a current or former employee, or someone with access to a county office, attempting to locate a survivor. Defences focus on minimising what any single account can see.
3. **An external opportunistic attacker** — internet-borne scanning, credential stuffing, common web vulnerabilities. Standard hardening.
4. **A targeted external attacker** — a well-resourced adversary specifically interested in the system. Controls focus on making exfiltration observable and raising the cost of success.
5. **A compromised hosting operator** — the cloud provider, the ISP, or the on-prem datacenter operator. Defences focus on end-to-end encryption with MOGCSP-held keys.

We do not build specifically for nation-state adversaries with supply-chain reach, although standard hygiene (reproducible builds, dependency scanning, SBOM tracking) raises their cost too.

---

## Data classification

Every column in the schema is labelled with one of four classifications. The classification determines the controls that apply.

| Classification | Examples | Controls |
|---|---|---|
| **Restricted (survivor-linked)** | GBV case notes, incident details, survivor names, perpetrator demographic brackets linked to a case | Column-level encryption; RLS; read audited; export requires MFA re-challenge and supervisor approval; never in logs |
| **Sensitive personal** | National ID, phone, precise address, date of birth of any beneficiary | Column-level encryption; read audited; never in logs |
| **Operational** | Org unit, case status, aggregated indicator values, non-linked metadata | Standard RLS; not encrypted at column level; allowed in structured logs |
| **Public** | Indicator catalog definitions, org-unit codes and names, dashboard aggregate values past the privacy threshold | No access restrictions; cacheable |

The classification is encoded in the Prisma schema via comments that generate a column-level policy matrix; migrations that introduce a `text` column without a classification are rejected in CI.

---

## Cryptography

### At rest

- **Database volume encryption** — LUKS on-prem or provider-managed (Azure Disk Encryption / AWS EBS encryption) in cloud. Keys held in the KMS.
- **Column-level encryption** for Restricted and Sensitive classifications — using `pgcrypto`'s authenticated encryption (AES-256-GCM). The data encryption key (DEK) is derived per-column; DEKs are wrapped by a key-encryption key (KEK) held in the KMS.
- **Object storage encryption** — SSE-KMS where available; for highly sensitive attachments (consent scans, medical reports, photos of injuries), the client encrypts with a per-case symmetric key before upload, so the storage operator sees only ciphertext.
- **Backups** — GPG-encrypted before being written to backup storage, with the private key in a separate key custody chain.
- **Mobile device storage** — SQLCipher-encrypted SQLite using AES-256 in CBC-HMAC-SHA256 mode. The per-device database key is derived via argon2id from the user's passphrase combined with a device-bound secret held in the Android Keystore (StrongBox where available).

### In transit

- TLS 1.3 everywhere, TLS 1.2 minimum
- mTLS between the API and the DHIS2 / REALISE / LISGIS partners — the partners' certificates are pinned
- The mobile app performs certificate pinning against the API's leaf certificate; certificate rotation is coordinated with a 30-day advance notice baked into the app's OTA update channel
- Internal service-to-service traffic (API ↔ Postgres, API ↔ Redis, workers ↔ Postgres) uses TLS even inside the trusted network

### Key management

- Keys live in a dedicated KMS — cloud-provider KMS if hosting is cloud (Azure Key Vault, AWS KMS), HashiCorp Vault if on-prem
- Keys are MOGCSP-owned — the consultant has operational access during delivery but administrative control transfers to MOGCSP at handover
- Key rotation schedule: KEKs every 12 months; DEKs regenerated on rotation and used to re-wrap existing data at the next maintenance window
- All key operations (create, rotate, wrap, unwrap) are logged to the audit store
- Break-glass access to keys requires two-person authorisation — no single administrator can unilaterally unwrap survivor data

---

## Authentication

### Identity provider

Keycloak 25+, MOGCSP-hosted. Authoritative for users, credentials, MFA enrolment, and session policy.

Password policy:
- Minimum 12 characters
- No dictionary words (Liberian dictionary attack corpus included)
- No reuse of last 10 passwords
- Rotation every 180 days for `ADMIN` and `SUPER_ADMIN`; not forced rotation for other roles (aligning with current NIST guidance — forced rotation without cause produces weaker passwords)
- argon2id hashing with tuned parameters (minimum 64 MB memory, 3 iterations)

### Multi-factor authentication

Enforced for `SUPER_ADMIN`, `ADMIN`, `ANALYST`, and `SUPERVISOR` roles from first login. Optional but strongly encouraged for `CASE_WORKER` and `DATA_ENTRY_CLERK`.

Supported factors:
- TOTP (Google Authenticator, Microsoft Authenticator, Authy, 2FAS) — primary
- WebAuthn security keys (YubiKey etc.) — recommended for admins
- SMS backup — permitted only as a recovery factor, never as a primary factor (SMS is vulnerable to SIM swap)

Re-authentication required for sensitive actions: changing another user's role, exporting PII, accessing a case outside one's org unit scope via a supervisor override.

### Session management

- Access token: 15 minutes, JWT, signed with an ES256 key rotated quarterly
- Refresh token: 30 days (web), 7 days (mobile); rotated on each use
- Revocation check: 30-second max staleness against the Keycloak revocation list
- Simultaneous sessions limit: 3 per user; oldest is evicted
- Idle timeout: 30 min (web), 4 hours (mobile inside the encrypted app); hard timeout: 12 hours
- Forced logout capability for admins with reason-code logging

---

## Authorisation

### Role-based access control

Seven roles, defined in [ROLES_PERMISSIONS.md](./ROLES_PERMISSIONS.md). RBAC is the first gate — a role either has a capability or it doesn't.

### Org-unit-scoped access

Every user carries a set of `UserOrgUnitScope` entries. A user with `CASE_WORKER` role and scope `Bomi County` can see cases in Bomi County only; they cannot see Grand Gedeh cases even if their role would otherwise permit case-reading. This is enforced at two layers:

1. **Application layer** — the API injects the scope into every query
2. **Database layer** — PostgreSQL Row Level Security policies enforce the same constraint independent of API code

Defence-in-depth matters here because an API bug should not leak survivor data across counties.

### Row-level security

Every table carrying county-scoped data (`Beneficiary`, `GbvCase`, `Incident`, `ServiceProvided`, `Referral`, `CaseAttachment`, `Household`, `VslaGroup`, `CommunitySession`, all their join tables) has RLS policies enabled.

Example policy sketch for `gbv_cases`:

```sql
CREATE POLICY gbv_cases_read ON gbv_cases
  FOR SELECT
  USING (
    org_unit_id IN (SELECT descendant_org_unit_ids(
      current_setting('app.current_user_scope_org_units')::uuid[]
    ))
    OR current_setting('app.current_user_is_super_admin')::bool
  );
```

Every authenticated API request sets the session variables `app.current_user_id`, `app.current_user_scope_org_units`, and `app.current_user_is_super_admin` at the beginning of its transaction. The API uses a per-request Postgres role rather than a shared high-privilege role.

### Case-specific overrides

A supervisor can temporarily grant cross-org-unit access to a case (e.g. a referral from Bomi to Rural Montserrado). The grant:
- Requires a written justification captured in the audit log
- Is time-bounded (default 30 days)
- Is logged at creation, use, and expiry
- Is visible to other supervisors and to MOGCSP admins

---

## Audit logging

### What is logged

- All authentication events (login, logout, MFA challenge, failure, password change)
- All authorisation decisions for Restricted and Sensitive data (grant and deny)
- All mutations on `GbvCase`, `Beneficiary`, `User`, `UserRole`, `UserOrgUnitScope`, `ConsentRecord`, and any configuration table
- All reads on `GbvCase` and `Beneficiary` — yes, reads
- All exports (`AuditAction.EXPORT`) with the full filter parameters and row count
- All cryptographic key operations
- All admin actions on integration configuration
- All feature-flag changes

### What is not logged

- The decrypted content of Restricted or Sensitive fields — audit logs carry entity IDs and field names, never the decrypted values
- User passwords, MFA codes, or tokens (even hashes — we log only the fact of the event)
- GBV case notes verbatim

### Properties

- **Append-only** at the database level: the audit Postgres role has `INSERT` only; even `SUPER_ADMIN` cannot `UPDATE` or `DELETE` audit rows via the application
- **Tamper-evident**: each audit row carries a hash chain — `rowHash = sha256(previousRowHash || canonicalisedRow)`. A background job verifies the chain nightly and alerts on discrepancy
- **Retention**: 7 years. Hot in Postgres for 90 days, then tiered to encrypted object storage
- **Exportable** for compliance audits — the `compliance-audit` role has read-only access

---

## Hosting & network

### Perimeter

- A managed WAF (Cloudflare if cloud; NGINX with ModSecurity if on-prem) in front of the load balancer
- DDoS protection at the edge
- Rate limiting at the edge before requests reach the API
- Geo-blocking is not used — MOGCSP needs to be reachable by international partners and diaspora

### Private network

- Database and Redis never have public IP addresses
- Inter-service traffic uses private VPC (cloud) or VLAN (on-prem) networking
- Administrative access to infrastructure requires a VPN (WireGuard) and a personal client certificate, plus MFA at the bastion

### Secrets

- No secrets in Git. Ever.
- Runtime secrets come from the KMS via a sidecar that mounts them at runtime
- Developer secrets for local development use `.env.local` which is in `.gitignore`, seeded from `infosec/dev-secrets.example`
- Rotation after any suspected exposure

### Hosting option security implications

Three hosting options are kept open until Inception (see [ARCHITECTURE.md § Hosting](./ARCHITECTURE.md#hosting)). Each has different security implications:

| Option | Implication |
|---|---|
| **Cloud primary (Azure / AWS)** | Strongest baseline hardening, best DDoS protection, but data residency is outside Liberia — a legal review is needed to confirm this is acceptable for survivor data. Key custody in a cloud KMS is operationally excellent but requires a trust decision about the provider's compliance posture. |
| **On-prem primary** | Maximal data-residency control. But the MOGCSP Ops team becomes responsible for OS hardening, patching cadence, physical security, and datacenter reliability — a bigger capability build than is often initially planned. |
| **Hybrid (on-prem primary, cloud DR)** | Best of both for data residency. Cross-region encrypted replication requires careful key management so the cloud-DR side can restore without the on-prem KMS being reachable. |

The Inception decision bundles hosting and a matching security runbook.

---

## Vulnerability management

- **SAST**: Semgrep runs in CI on every PR. Custom rules enforce the "no plaintext survivor-linked data in logs" invariant.
- **Dependency scanning**: `pnpm audit` and GitHub Dependabot (or equivalent) for Node packages; `trivy` for container images.
- **SBOM**: generated per release, published with the release artifacts.
- **DAST**: OWASP ZAP scans against staging weekly; before each production release, a manual review is performed.
- **Penetration test**: external penetration test before Go-Live (Week 11) and annually after.

### Patching SLAs

| Severity | SLA |
|---|---|
| Critical (CVSS ≥ 9) | Patch within 72 hours |
| High (7–8.9) | Patch within 7 days |
| Medium (4–6.9) | Patch at the next scheduled maintenance window (≤ 30 days) |
| Low (< 4) | Next feature release |

---

## Incident response

### Playbook structure

Every incident type has a playbook in `docs/runbooks/incident/`. The playbooks cover:
- **Confirmed data breach involving survivor data** — highest severity; playbook specifies Deputy Minister notification within 2 hours, World Bank PMU within 24 hours
- **Suspected credential compromise**
- **DDoS**
- **DHIS2 / REALISE / LISGIS integration outage**
- **Accidental data disclosure (internal)**
- **Lost / stolen mobile device**

### Immediate response

On detection, the on-call engineer:
1. Preserves evidence (snapshots, logs, hashes)
2. Contains the incident without destroying evidence
3. Notifies the incident commander (rotation published internally)
4. Begins the playbook for the incident type

### Communications

- Internal: Slack or Signal channel reserved for incidents
- To the Deputy Minister: direct phone + written follow-up
- To the World Bank PMU: written notification within 24 hours of confirmed severity-high+ incidents
- To affected individuals: per the incident playbook and the Data Protection Officer's direction, never before MOGCSP leadership has been informed and a remediation plan is in place

---

## Mobile-specific security

### Device posture

- Root / jailbreak detection on app launch; rooted devices cannot complete login
- Code obfuscation applied to production builds (JavaScriptCore bytecode + Hermes bundle)
- No debug builds distributed outside a sealed test group; production builds are signed with the MOGCSP-held signing key
- App transport security: network requests via the React Native networking stack are pinned; direct HTTP is disabled
- Clipboard is disabled for decrypted survivor data
- Screenshots disabled on sensitive screens (case detail, beneficiary detail)

### Lost or stolen device

- A user with `ADMIN` role can mark a device as "lost" in the admin panel
- On next network contact, the app performs a wipe of the local encrypted database
- If the device never reconnects, the encryption-at-rest controls (SQLCipher + Keystore-bound secret) protect the data against offline attack — but we do not rely on that alone; the local DB is deliberately small (a few days of pending sync at most)
- Device-lost events trigger a review of all records the user had access to, to identify whether any required re-contact with beneficiaries

---

## Supply chain

- Container base images are pinned by digest, not tag
- Third-party libraries are reviewed before introduction; license compatibility is checked; sensitive libraries (crypto, auth) require a lead-engineer sign-off
- CI runners are ephemeral and attestation-signed
- Releases are tagged in git, signed with a GPG key from the MOGCSP key custody chain, and published with a checksum manifest

---

## Security testing in CI

Every PR runs:
- Type check
- Lint (including security-focused rules)
- Unit + integration tests
- Semgrep SAST with custom GB MIS rules
- Dependency vulnerability scan
- Container build + trivy scan
- OpenAPI diff — fails if the committed OpenAPI document doesn't match generated output
- Secret scanner (gitleaks)
- Accessibility checks (axe-core)

A failing security check blocks the merge. Overrides require a security-lead approval and are logged.
