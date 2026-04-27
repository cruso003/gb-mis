/**
 * SyncEngine — offline-first mobile sync.
 *
 * Protocol:
 * 1. Pull: GET /v1/sync/pull?cursor=<last_cursor> — server-authoritative changes applied to WatermelonDB
 * 2. Push: POST /v1/sync/push { records: [...] } — PENDING SyncRecords uploaded in batches of ≤100
 * 3. Accepted records → status=SYNCED; rejected records → status=FAILED + errorMessage
 * 4. FAILED records are never silently dropped — they stay in sync_records for user review
 * 5. Server is authoritative on all conflicts
 *
 * See SYNC_PROTOCOL.md for full wire-format specification.
 */

import * as SecureStore from 'expo-secure-store';

import { getDatabase } from '../db/database';
import type { BeneficiaryModel } from '../db/models/BeneficiaryModel';
import type { GbvCaseModel } from '../db/models/GbvCaseModel';
import type { SyncRecordModel } from '../db/models/SyncRecordModel';

const API_BASE = process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:4000';
const CURSOR_KEY = 'gbmis.syncCursor';
const PUSH_BATCH_SIZE = 100;

let isSyncing = false;

export async function triggerSync(accessToken?: string): Promise<SyncSummary> {
  if (isSyncing) throw new Error('Sync already in progress');
  isSyncing = true;

  try {
    const pulled = await pull(accessToken);
    const { accepted, rejected } = await push(accessToken);
    return { pulled, pushed: accepted, failed: rejected };
  } finally {
    isSyncing = false;
  }
}

export interface SyncSummary {
  pulled: number;
  pushed: number;
  failed: number;
}

// ─── Pull ─────────────────────────────────────────────────────────────────────

async function pull(accessToken?: string): Promise<number> {
  const database = getDatabase();
  const cursor = await SecureStore.getItemAsync(CURSOR_KEY);

  const url = `${API_BASE}/v1/sync/pull?resources=cases,beneficiaries${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
  const res = await fetch(url, {
    headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
  });

  if (!res.ok) throw new Error(`Pull failed: ${res.status}`);

  const body = (await res.json()) as {
    cursor: string;
    data: {
      cases?: ServerCase[];
      beneficiaries?: ServerBeneficiary[];
    };
  };

  let written = 0;

  await database.write(async () => {
    // Apply server cases.
    const cases = body.data.cases ?? [];
    for (const serverCase of cases) {
      const existing = await database
        .get<GbvCaseModel>('gbv_cases')
        .query()
        .then((all) => all.find((c) => c.serverId === serverCase.id));

      if (existing) {
        await existing.update((record: GbvCaseModel) => {
          record.uploadStatus = 'SYNCED';
          record.serverId = serverCase.id;
        });
      }
      written++;
    }

    // Apply server beneficiaries — upsert by serverId.
    const beneficiaries = body.data.beneficiaries ?? [];
    const beneficiaryCollection = database.get<BeneficiaryModel>('beneficiaries');
    const existing = await beneficiaryCollection.query();
    const existingByServerId = new Map(existing.map((b) => [b.serverId, b]));

    for (const serverBen of beneficiaries) {
      const local = existingByServerId.get(serverBen.id);
      if (local) {
        await local.update((record: BeneficiaryModel) => {
          record.status = serverBen.status;
        });
      } else {
        await beneficiaryCollection.create((record: BeneficiaryModel) => {
          record.serverId = serverBen.id;
          record.beneficiaryCode = serverBen.beneficiaryCode;
          record.status = serverBen.status;
          record.sex = serverBen.sex ?? '';
          record.orgUnitId = serverBen.orgUnitId;
        });
      }
      written++;
    }
  });

  // Persist the new cursor so next pull only fetches deltas.
  await SecureStore.setItemAsync(CURSOR_KEY, body.cursor);

  return written;
}

// ─── Push ─────────────────────────────────────────────────────────────────────

async function push(accessToken?: string): Promise<{ accepted: number; rejected: number }> {
  const database = getDatabase();
  const syncRecordCollection = database.get<SyncRecordModel>('sync_records');
  const pending = await syncRecordCollection
    .query()
    .then((all) => all.filter((r) => r.uploadStatus === 'PENDING'));

  if (pending.length === 0) return { accepted: 0, rejected: 0 };

  let totalAccepted = 0;
  let totalRejected = 0;

  // Push in batches to stay within server's 100-record limit.
  for (let offset = 0; offset < pending.length; offset += PUSH_BATCH_SIZE) {
    const batch = pending.slice(offset, offset + PUSH_BATCH_SIZE);

    const records = batch.map((r) => ({
      clientEventId: r.clientEventId,
      resource: r.resource,
      operation: r.operation,
      payload: JSON.parse(r.payloadJson) as Record<string, unknown>,
      clientCreatedAt: r.createdAt.toISOString(),
      clientUpdatedAt: r.createdAt.toISOString(),
    }));

    const res = await fetch(`${API_BASE}/v1/sync/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ records }),
    });

    if (!res.ok) {
      // Network-level failure: mark all as FAILED to surface to user.
      await database.write(async () => {
        for (const record of batch) {
          await record.update((r: SyncRecordModel) => {
            r.uploadStatus = 'FAILED';
            r.errorMessage = `HTTP ${res.status}`;
          });
        }
      });
      totalRejected += batch.length;
      continue;
    }

    const result = (await res.json()) as {
      accepted: string[];
      rejected: Array<{ clientEventId: string; reason: string }>;
    };

    const acceptedSet = new Set(result.accepted);
    const rejectionMap = new Map(result.rejected.map((r) => [r.clientEventId, r.reason]));

    await database.write(async () => {
      for (const record of batch) {
        if (acceptedSet.has(record.clientEventId)) {
          await record.update((r: SyncRecordModel) => {
            r.uploadStatus = 'SYNCED';
            r.syncedAt = Date.now();
          });
          // Mark the corresponding GBV case as synced.
          const caseRecord = await database
            .get<GbvCaseModel>('gbv_cases')
            .find(record.entityLocalId)
            .catch(() => null);
          if (caseRecord) {
            await caseRecord.update((c: GbvCaseModel) => {
              c.uploadStatus = 'SYNCED';
            });
          }
        } else {
          const reason = rejectionMap.get(record.clientEventId) ?? 'Unknown error';
          // NEVER silently drop — set FAILED + reason for user review.
          await record.update((r: SyncRecordModel) => {
            r.uploadStatus = 'FAILED';
            r.errorMessage = reason;
          });
          const caseRecord = await database
            .get<GbvCaseModel>('gbv_cases')
            .find(record.entityLocalId)
            .catch(() => null);
          if (caseRecord) {
            await caseRecord.update((c: GbvCaseModel) => {
              c.uploadStatus = 'FAILED';
              c.syncError = reason;
            });
          }
        }
      }
    });

    totalAccepted += result.accepted.length;
    totalRejected += result.rejected.length;
  }

  return { accepted: totalAccepted, rejected: totalRejected };
}

// ─── Record creation helper (called from screens) ────────────────────────────

export async function createOfflineCase(data: {
  violenceType: string;
  intakeChannel: string;
  orgUnitId: string;
  notes?: string;
  perpetratorRelationship?: string;
}): Promise<string> {
  const database = getDatabase();
  const clientEventId = generateUUID();

  let localId = '';

  await database.write(async () => {
    const gbvCase = await database.get<GbvCaseModel>('gbv_cases').create((record: GbvCaseModel) => {
      record.clientEventId = clientEventId;
      record.violenceType = data.violenceType;
      record.intakeChannel = data.intakeChannel;
      record.orgUnitId = data.orgUnitId;
      record.notes = data.notes ?? null;
      record.perpetratorRelationship = data.perpetratorRelationship ?? null;
      record.uploadStatus = 'PENDING';
      record.syncError = null;
      record.serverId = null;
    });

    localId = gbvCase.id;

    const payload = {
      violenceType: data.violenceType,
      intakeChannel: data.intakeChannel,
      orgUnitId: data.orgUnitId,
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.perpetratorRelationship !== undefined && {
        perpetratorRelationship: data.perpetratorRelationship,
      }),
    };

    await database.get<SyncRecordModel>('sync_records').create((record: SyncRecordModel) => {
      record.clientEventId = clientEventId;
      record.resource = 'cases';
      record.operation = 'CREATE';
      record.entityLocalId = localId;
      record.payloadJson = JSON.stringify(payload);
      record.uploadStatus = 'PENDING';
      record.errorMessage = null;
      record.syncedAt = null;
    });
  });

  return localId;
}

// ─── Types (server response shapes) ──────────────────────────────────────────

interface ServerCase {
  id: string;
  status: string;
  priority: string;
  orgUnitId: string;
  updatedAt: string;
}

interface ServerBeneficiary {
  id: string;
  beneficiaryCode: string;
  status: string;
  sex: string | null;
  orgUnitId: string;
  updatedAt: string;
}

function generateUUID(): string {
  // crypto.randomUUID() is available in Expo SDK 52 via expo-crypto globals.
  // Falls back to a simple uuid-like string for environments that lack it.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
