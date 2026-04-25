import { useEffect, useState } from 'react';

import { database } from '../db/database';
import type { SyncRecordModel } from '../db/models/SyncRecordModel';

interface SyncFailure {
  clientId: string;
  reason: string;
}

interface SyncStatus {
  pendingCount: number;
  failedCount: number;
  lastSyncAt: Date | null;
  isSyncing: boolean;
  recentFailures: SyncFailure[];
}

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>({
    pendingCount: 0,
    failedCount: 0,
    lastSyncAt: null,
    isSyncing: false,
    recentFailures: [],
  });

  useEffect(() => {
    // Subscribe to sync_records with WatermelonDB's reactive query.
    const subscription = database
      .get<SyncRecordModel>('sync_records')
      .query()
      .observe()
      .subscribe((records: SyncRecordModel[]) => {
        const pending = records.filter((r) => r.uploadStatus === 'PENDING');
        const failed = records.filter((r) => r.uploadStatus === 'FAILED');
        const synced = records.filter((r) => r.uploadStatus === 'SYNCED' && r.syncedAt !== null);

        const lastSynced = synced.reduce<number | null>((max, r) => {
          const t = r.syncedAt;
          return t !== null && (max === null || t > max) ? t : max;
        }, null);

        setStatus((prev) => ({
          ...prev,
          pendingCount: pending.length,
          failedCount: failed.length,
          lastSyncAt: lastSynced !== null ? new Date(lastSynced) : null,
          recentFailures: failed.slice(0, 10).map((r) => ({
            clientId: r.clientEventId,
            reason: r.errorMessage ?? 'Unknown error',
          })),
        }));
      });

    return () => subscription.unsubscribe();
  }, []);

  return status;
}
