# Mobile Sync Protocol

> Status: **Stub** — full wire-format to be specified in Stage 3 (field deployment sprint).

## Principles

- Server is authoritative on all conflicts
- Rejected records are NEVER silently dropped — they stay in `pending_sync` with status=FAILED
- Pull happens before push every sync cycle
- Batches capped at 100 records per push call
- Cursor is a UTC ISO 8601 timestamp of the server's last response

## Wire Format (draft)

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
      "clientId": "<uuid-v4-generated-on-device>",
      "resource": "cases",
      "operation": "CREATE",
      "payload": { ...encrypted_payload... },
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
    { "clientId": "<uuid3>", "reason": "Beneficiary not found on server" }
  ]
}
```

## Conflict Resolution

1. Client compares `clientUpdatedAt` with `serverUpdatedAt`
2. If server record is newer → server wins, client discards its version
3. If client record is newer → server still wins (field worker may have stale schema)
4. User is notified of conflicts via the Sync screen — no silent overwrites

## Security

- All PII in push payloads is encrypted with the device key before transmission
- Server decrypts using the key exchange established at device registration (Stage 3)
- Pull responses carry encrypted PII — decrypted locally with the device key
