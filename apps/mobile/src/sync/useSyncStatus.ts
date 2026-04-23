import { useEffect, useState } from 'react';

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

// Stage 3: replace with WatermelonDB reactive queries
export function useSyncStatus(): SyncStatus {
  const [status] = useState<SyncStatus>({
    pendingCount: 0,
    failedCount: 0,
    lastSyncAt: null,
    isSyncing: false,
    recentFailures: [],
  });

  useEffect(() => {
    // Placeholder — will subscribe to WatermelonDB SyncRecord table in Stage 3
    return () => {};
  }, []);

  return status;
}
