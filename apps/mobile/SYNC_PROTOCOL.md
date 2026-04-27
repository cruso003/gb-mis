# Mobile Sync Protocol

> Status: **Draft** — wire format implemented in `apps/mobile/src/sync/SyncEngine.ts` and `apps/api/src/modules/sync/`. Field-test refinements expected during Stage 4.

## Principles

- Server is authoritative on all conflicts
- Rejected records are NEVER silently dropped — they stay in `sync_records` with status=FAILED and surface in the Sync screen
- Pull happens before push every sync cycle
- Push batches capped at 100 records per call
- Cursor is a UTC ISO 8601 timestamp returned by the server's last pull response

## Wire Format

### Pull

```
GET /v1/sync/pull?cursor=2024-01-15T10:00:00.000Z&resources=cases,beneficiaries
Authorization: Bearer <keycloak_access_token>
```

Response:
```json
{
  "cursor": "2024-01-15T10:05:00.000Z",
  "data": {
    "cases": [ ...server_records... ],
    "beneficiaries": [ ...server_records... ]
  }
}
```

### Push

```
POST /v1/sync/push
Authorization: Bearer <keycloak_access_token>
Content-Type: application/json

{
  "records": [
    {
      "clientEventId": "<uuid-v4-generated-on-device>",
      "resource": "cases",
      "operation": "CREATE",
      "payload": { ... },
      "clientCreatedAt": "2024-01-15T09:00:00.000Z",
      "clientUpdatedAt": "2024-01-15T09:00:00.000Z"
    }
  ]
}
```

Response:
```json
{
  "accepted": ["<uuid1>", "<uuid2>"],
  "rejected": [
    { "clientEventId": "<uuid3>", "reason": "Beneficiary not found on server" }
  ]
}
```

## Conflict Resolution

1. Client compares `clientUpdatedAt` with `serverUpdatedAt`
2. If server record is newer → server wins, client discards its version
3. If client record is newer → server still wins (field worker may have stale schema)
4. User is notified of conflicts via the Sync screen — no silent overwrites

## At-Rest Encryption

The on-device database is a SQLCipher-encrypted SQLite file
(`gb_mis.db`, AES-256-CBC). The encryption key:

- Is a 256-bit random value generated on first launch by
  `apps/mobile/src/db/deviceKey.ts` (`expo-crypto`)
- Is persisted in `expo-secure-store`, which on Android 10+ wraps it
  with the hardware-backed Android Keystore
- Is read at app startup by `initDatabase()` and passed as the
  `passphrase` option to WatermelonDB's `SQLiteAdapter`
- Is not transmitted off the device

If the device is wiped or app data is cleared, the key is destroyed and
the database file becomes permanently unreadable. This is the intended
lost/stolen-device behaviour.

The native build linkage that turns WatermelonDB's bundled SQLite into
SQLCipher is wired by `apps/mobile/plugins/withSqlcipher.js` during
`expo prebuild` and verified per `MOBILE_SQLCIPHER_BUILD.md`.

## In-Transit Encryption

- All sync traffic is over TLS 1.2+ to the Keycloak-protected API
- PII is never written to logs (mobile or server)
- The mobile-to-server channel is the only egress; no third-party
  analytics SDKs are bundled
