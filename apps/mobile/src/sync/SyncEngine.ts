/**
 * SyncEngine — offline-first mobile sync.
 *
 * Protocol:
 * 1. Pull: GET /sync/pull?cursor=<last_cursor> — server-authoritative changes applied to local DB
 * 2. Push: POST /sync/push { records: [...] } — local pending records uploaded
 * 3. Rejected records stay in pending_sync with status=FAILED — never silently dropped
 * 4. Server wins on all conflicts — client applies server version
 *
 * See apps/mobile/SYNC_PROTOCOL.md for full wire-format spec (Stage 3).
 */

const API_BASE = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:4000';
const CURSOR_KEY = 'gbmis.syncCursor';

let isSyncing = false;

export async function triggerSync(accessToken?: string): Promise<void> {
  if (isSyncing) return;
  isSyncing = true;

  try {
    await pull(accessToken);
    await push(accessToken);
  } finally {
    isSyncing = false;
  }
}

async function pull(accessToken?: string): Promise<void> {
  const cursor = null; // Stage 3: load from SecureStore

  const res = await fetch(
    `${API_BASE}/v1/sync/pull${cursor ? `?cursor=${cursor}` : ''}`,
    {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  );

  if (!res.ok) throw new Error(`Pull failed: ${res.status}`);

  const body = (await res.json()) as { cursor: string; data: Record<string, unknown[]> };

  // Stage 3: write body.data into WatermelonDB tables
  // Stage 3: persist body.cursor to SecureStore(CURSOR_KEY)
  void body;
  void CURSOR_KEY;
}

async function push(accessToken?: string): Promise<void> {
  // Stage 3: read pending SyncRecord rows from WatermelonDB
  const pendingRecords: unknown[] = [];
  if (pendingRecords.length === 0) return;

  const res = await fetch(`${API_BASE}/v1/sync/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ records: pendingRecords }),
  });

  if (!res.ok) throw new Error(`Push failed: ${res.status}`);

  const result = (await res.json()) as { accepted: string[]; rejected: Array<{ clientId: string; reason: string }> };

  // Stage 3: mark accepted records as SYNCED, rejected as FAILED in WatermelonDB
  // NEVER silently drop rejected records — they remain in pending_sync with error reason
  void result;
}
