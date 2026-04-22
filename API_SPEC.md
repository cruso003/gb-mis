# API Specification

This document describes the HTTP API that the web, mobile, and integration partners consume. The runnable source of truth is the OpenAPI 3.1 document generated at `apps/api/openapi.json` — this document explains the contract and conventions.

---

## Foundations

### Base URL

```
Production       https://api.gbmis.gov.lr/v1
Staging          https://api.staging.gbmis.gov.lr/v1
Local dev        http://localhost:4000/v1
```

### Transport

- HTTPS only in all environments except `localhost`
- TLS 1.3 preferred; TLS 1.2 minimum
- HSTS enabled with a 1-year max-age
- HTTP/2 at the load balancer

### Versioning

- Path versioning: `/v1/...`
- Breaking changes increment the major. Non-breaking changes (new fields, new endpoints, new optional query parameters) do not.
- A `Deprecation` header and a `Sunset` date are emitted for six months before any endpoint is removed.

### Authentication

OAuth 2.0 / OIDC against Keycloak.

- **Web app** uses the authorisation-code flow with PKCE
- **Mobile app** uses the authorisation-code flow with PKCE plus refresh-token rotation
- **Partner integrations** (DHIS2 sync, REALISE sync) use client-credentials with mTLS

Access tokens are short-lived JWTs (15 min). Refresh tokens are long-lived (30 days for web, 7 days for mobile) and are rotated on each use. Sessions can be revoked from Keycloak; the API verifies the Keycloak-published revocation list every 30 seconds.

Every authenticated request carries `Authorization: Bearer <jwt>`.

### Content types

- Request bodies: `application/json` (UTF-8)
- Response bodies: `application/json` except `/v1/exports/*` which returns `application/pdf` or `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- File uploads: pre-signed URL flow against object storage; the API issues a short-lived signed URL and the client PUTs directly to storage

### Common response envelope

```json
{
  "data": { /* resource or array of resources */ },
  "meta": {
    "requestId": "01J2W9F6QKXH7Z6C3B0W7D9Y8V",
    "nextCursor": "eyJpZCI6IjAxSjJX..."
  }
}
```

Errors follow RFC 7807:

```json
{
  "type": "https://api.gbmis.gov.lr/errors/validation",
  "title": "Validation failed",
  "status": 422,
  "detail": "Field `dateOfBirth` must be a valid ISO 8601 date",
  "instance": "/v1/beneficiaries",
  "violations": [
    { "field": "dateOfBirth", "code": "INVALID_FORMAT" }
  ],
  "requestId": "01J2W9F6QKXH7Z6C3B0W7D9Y8V"
}
```

### Pagination

Cursor-based only.

```
GET /v1/cases?limit=50&cursor=eyJpZCI6IjAxSjJX...
```

Response `meta.nextCursor` is opaque to the client. When absent, there are no more results. `limit` is clamped to 100.

### Filtering and sorting

- Simple filters as query parameters: `?status=OPEN&orgUnitId=<uuid>`
- Date ranges: `?createdAtFrom=2026-01-01&createdAtTo=2026-03-31`
- Sorting: `?sort=createdAt:desc`
- Full-text search: `?q=<term>` — applies only to non-encrypted fields

### Idempotency

Every mutating request may carry an `Idempotency-Key` header (a UUID). If the API has seen that key in the last 24 hours with the same user, path, and body hash, the previous response is replayed. This is mandatory for mobile sync operations.

### Rate limits

| Role | Limit |
|---|---|
| `VIEWER` | 120 req/min per user |
| `CASE_WORKER`, `DATA_ENTRY_CLERK` | 300 req/min |
| `SUPERVISOR`, `ANALYST` | 600 req/min |
| `ADMIN`, `SUPER_ADMIN` | unlimited (monitored) |
| Partner client credentials | 60 req/min per client |

Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

---

## Resource catalogue

Paths are documented exhaustively in the OpenAPI file; this section is the narrative overview.

### `/v1/auth`

Out-of-band. Authentication goes to Keycloak, not to this API. The API exposes only:

- `GET /v1/auth/whoami` — returns the current actor's profile, roles, and org-unit scopes
- `POST /v1/auth/logout` — revokes the refresh token (calls Keycloak)

### `/v1/users`

- `GET /v1/users` — admins only
- `GET /v1/users/{id}`
- `POST /v1/users` — creates a shell user; Keycloak invitation is triggered
- `PATCH /v1/users/{id}` — profile fields only
- `POST /v1/users/{id}/roles` — grant or revoke; audited
- `POST /v1/users/{id}/org-unit-scopes` — assign coverage; audited
- `POST /v1/users/{id}/status` — suspend / reactivate

### `/v1/org-units`

- `GET /v1/org-units` — paginated, filterable by `level`, `parentId`, `lwepCovered`
- `GET /v1/org-units/{id}`
- `GET /v1/org-units/{id}/children`
- `GET /v1/org-units/tree` — returns the full hierarchy (cached 10 min)
- `GET /v1/org-units/{id}/geometry` — GeoJSON
- Mutations are admin-only; the hierarchy changes rarely

### `/v1/beneficiaries`

- `GET /v1/beneficiaries` — filtered by org unit, enrolment status, LWEP component
- `GET /v1/beneficiaries/{id}`
- `POST /v1/beneficiaries` — requires a consent record in the same transaction
- `PATCH /v1/beneficiaries/{id}`
- `POST /v1/beneficiaries/{id}/consent` — update consent scope
- `GET /v1/beneficiaries/{id}/grants`
- `GET /v1/beneficiaries/{id}/sessions` — community sessions attended
- `GET /v1/beneficiaries/{id}/vsla-memberships`
- `POST /v1/beneficiaries/dedup-check` — given identifying info, return potential matches without exposing full records

### `/v1/households`

- `GET /v1/households`
- `POST /v1/households`
- `POST /v1/households/{id}/members`
- `DELETE /v1/households/{id}/members/{beneficiaryId}`

### `/v1/cases`

The GBV case namespace. RLS enforces org-unit scoping; supervisors additionally see their own team's cases regardless of org unit.

- `GET /v1/cases` — paginated; sensitive fields redacted unless the caller has `cases:read:details` permission for that specific case
- `GET /v1/cases/{id}`
- `POST /v1/cases` — creates a case; automatically flags for supervisor review
- `PATCH /v1/cases/{id}` — limited fields; reassignment and closure are separate endpoints
- `POST /v1/cases/{id}/incidents`
- `POST /v1/cases/{id}/services`
- `POST /v1/cases/{id}/referrals`
- `POST /v1/cases/{id}/referrals/{referralId}/acknowledge`
- `POST /v1/cases/{id}/referrals/{referralId}/close`
- `POST /v1/cases/{id}/attachments` — returns a pre-signed upload URL
- `POST /v1/cases/{id}/assign` — reassign case worker or supervisor
- `POST /v1/cases/{id}/close` — with outcome
- `POST /v1/cases/{id}/supervisor-review` — supervisor sign-off
- `GET /v1/cases/{id}/audit` — case-specific audit trail (supervisor and above)

### `/v1/community-sessions`

- `GET /v1/community-sessions`
- `POST /v1/community-sessions`
- `POST /v1/community-sessions/{id}/attendance` — accepts an array so a field worker can record all attendees in one request

### `/v1/indicators`

- `GET /v1/indicators` — the catalog, filterable by framework, area
- `GET /v1/indicators/{code}` — single indicator metadata
- `GET /v1/indicators/{code}/values` — paginated time series
- `POST /v1/indicators/{code}/values` — analyst-level manual entry
- `POST /v1/indicators/{code}/compute` — trigger a recomputation for a specific org unit and period (admin only)
- `GET /v1/indicators/{code}/targets`
- `POST /v1/indicators/{code}/targets`

### `/v1/dashboards`

- `GET /v1/dashboards/overview` — aggregate view for HQ
- `GET /v1/dashboards/county/{orgUnitId}` — county snapshot
- `GET /v1/dashboards/cedaw-follow-up`
- `GET /v1/dashboards/lwep-component/{componentNumber}`
- `GET /v1/dashboards/wps`

Dashboards are computed server-side — the endpoint returns a pre-joined shape suitable for direct rendering. Cache TTL 5 minutes.

### `/v1/reports`

- `POST /v1/reports` — submit a report generation job (returns `reportId`)
- `GET /v1/reports/{id}` — poll for status and download link
- `GET /v1/reports/templates` — available templates (annual CEDAW, quarterly LWEP, monthly county, custom)

### `/v1/exports`

- `POST /v1/exports/beneficiaries?format=xlsx` — returns a job; PII export requires elevated consent (MFA re-challenge)
- `POST /v1/exports/cases?format=xlsx` — anonymised aggregate only; row-level PII export is forbidden
- `POST /v1/exports/indicators?format=xlsx` — free
- `POST /v1/exports/indicators?format=csv`

Every export is logged as an `AuditEvent` with `action = 'EXPORT'`, including the filter parameters and row count.

### `/v1/sync` (mobile only)

The dedicated mobile sync endpoint.

- `POST /v1/sync/push` — client sends a batch of local changes; server returns server-canonical IDs and rejections
- `POST /v1/sync/pull` — client requests server changes since a given cursor

Sync semantics are documented in `apps/mobile/SYNC_PROTOCOL.md`; the important contract guarantees are:

1. Pushes are transactional at the record level — a malformed record does not poison the batch
2. The server is authoritative on conflicts — the client always applies the server's resolution
3. GBV case pushes are automatically routed to supervisor review regardless of offline duration
4. Pushes fail closed — a rejected record stays in `pending_sync` and the user is notified, never silently dropped
5. Rate-limited to one push per device every 60 seconds

### `/v1/audit`

- `GET /v1/audit/events` — admin and above; paginated, filterable by actor, entity, date range, action
- `GET /v1/audit/events/{id}`
- `GET /v1/audit/access-log`

Audit endpoints are read-only. There is no `POST` or `DELETE`.

### `/v1/config` (admin only)

- `GET /v1/config/feature-flags`
- `PATCH /v1/config/feature-flags`
- `GET /v1/config/integrations/dhis2`
- `PATCH /v1/config/integrations/dhis2`
- `POST /v1/config/integrations/dhis2/test` — dry-run the DHIS2 connection

---

## Integration contracts

### DHIS2 integration

The GB MIS operates as a **DHIS2 aggregate data POSTer** and a **metadata puller**, using the DHIS2 Web API.

#### Outbound (we push)

Target endpoint: `POST {dhis2}/api/dataValueSets`

Payload shape (DHIS2 standard):

```json
{
  "dataSet": "<dhis2 dataSet id>",
  "completeDate": "2026-04-01",
  "period": "2026Q1",
  "orgUnit": "<dhis2 orgUnit id>",
  "dataValues": [
    {
      "dataElement": "<dhis2 dataElement id>",
      "categoryOptionCombo": "<dhis2 coc id>",
      "value": "47.3",
      "comment": "computed from LWEP case records"
    }
  ]
}
```

Mapping between `Indicator.code` and DHIS2 `dataElement` / `categoryOptionCombo` is maintained in `packages/indicators/src/dhis2-mapping.ts` and reviewed quarterly with the MoH DHIS2 administrator.

Sync cadence: hourly for dashboard freshness, full catalog daily at 02:00 Liberian time.

Error handling: rejections are retried with exponential backoff (5 attempts over 4 hours), then queued for human review via the admin dashboard. No value is silently dropped.

#### Inbound (we pull)

Target endpoint: `GET {dhis2}/api/organisationUnits?fields=id,name,parent[id],level&paging=false`

The pull keeps our `OrgUnit.dhis2Id` mapping current when DHIS2 adds new facilities or renames existing ones. We never mutate our own org-unit hierarchy based on DHIS2 — mismatches raise alerts for the MOGCSP M&E officer.

### REALISE Project integration

REALISE is a World Bank sibling project in Liberia. The GB MIS integrates with REALISE to avoid double-counting beneficiaries across projects.

- **Outbound**: we do not push data to REALISE.
- **Inbound**: the `realise-sync` worker pulls the REALISE household registry daily and populates a dedup reference table. When a new LWEP beneficiary is enrolled, the API calls `POST /v1/beneficiaries/dedup-check` which includes REALISE matches in the response.

The exact REALISE API surface is confirmed during Inception. If REALISE does not yet expose an API, the integration starts with a weekly secure file drop and upgrades to API-based sync when available.

### LISGIS integration

LISGIS is the national statistical authority. The MIS ingests:

- Administrative boundaries (county / district / community codes)
- DHS microdata relevant to indicators
- Labour Force Survey results
- Census data

Method: sanctioned data-sharing endpoints where they exist; otherwise a formal MOU-based file exchange. **No uncontrolled web scraping** — the TOR prohibits it and so do we.

### MoH / MoE / MoA integrations

Scoped during Inception. The default pattern is DHIS2-as-bus: MoH publishes to DHIS2, we consume from DHIS2. Where a ministry has no DHIS2 presence for a given dataset, a direct API or file-drop integration is negotiated.

### Notification gateways

- **Email**: SMTP via a Liberian ISP or a transactional service (SendGrid, Postmark) — no PII in email bodies; messages are links to authenticated views
- **SMS**: a Liberian gateway (e.g. via Orange Liberia or Lonestar Cell MTN) — no PII in SMS content; codes and IDs only

---

## OpenAPI generation

- The OpenAPI document is generated from NestJS controllers + DTOs + Swagger decorators
- CI fails if the generated `openapi.json` differs from the committed copy
- The document is published to `https://api.gbmis.gov.lr/docs` (Swagger UI) and `https://api.gbmis.gov.lr/redoc` (Redoc)
- Partner SDKs (TypeScript, Python) are generated from the OpenAPI document on each release and published to `packages/sdk-ts/` and `packages/sdk-py/`

---

## API conventions quick reference

| Concern | Convention |
|---|---|
| HTTP methods | `GET` read, `POST` create / command, `PATCH` partial update, `PUT` not used, `DELETE` soft-delete only |
| Status codes | `200` OK, `201` Created, `202` Accepted (async), `204` No Content, `400` client error, `401` unauth, `403` forbidden, `404` not found, `409` conflict, `410` gone, `422` validation, `429` rate-limited, `500` server error, `503` downstream unavailable |
| IDs in URLs | UUIDs only; business identifiers (`caseNumber`, `beneficiaryCode`) are query-only |
| Timestamps | ISO 8601 UTC (`2026-04-22T14:33:12.000Z`) |
| Booleans | Lowercase `true` / `false` |
| Enums | UPPER_SNAKE_CASE strings, never numeric |
| Money | Integer minor units + currency code (`{"amount": 15000, "currency": "LRD"}`) |
| Empty arrays | `[]`, not `null` |
| Empty strings | Rejected at validation; use `null` or omit the field |
