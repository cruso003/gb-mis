import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSyncStatus } from '../sync/useSyncStatus';
import { triggerSync } from '../sync/SyncEngine';

export function SyncScreen() {
  const insets = useSafeAreaInsets();
  const { pendingCount, failedCount, lastSyncAt, isSyncing, recentFailures } = useSyncStatus();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Sync Status</Text>

        <View style={styles.row}>
          <SyncStatCard label="Pending" value={pendingCount} color="#f59e0b" />
          <SyncStatCard label="Failed" value={failedCount} color="#dc2626" />
        </View>

        {lastSyncAt && (
          <Text style={styles.lastSync}>Last sync: {lastSyncAt.toLocaleString()}</Text>
        )}

        <TouchableOpacity
          style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
          onPress={() => void triggerSync()}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.syncButtonText}>Sync Now</Text>
          )}
        </TouchableOpacity>

        {failedCount > 0 && (
          <View style={styles.failedSection}>
            <Text style={styles.sectionTitle}>Failed Records</Text>
            <Text style={styles.hint}>
              These records could not be uploaded. They remain on your device.
              Tap a record to view the rejection reason.
            </Text>
            {recentFailures.map((f) => (
              <View key={f.clientId} style={styles.failedCard}>
                <Text style={styles.failedId}>{f.clientId}</Text>
                <Text style={styles.failedReason}>{f.reason}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SyncStatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 20 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: { fontSize: 32, fontWeight: '800' },
  statLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', marginTop: 4 },
  lastSync: { fontSize: 13, color: '#9ca3af', marginBottom: 20 },
  syncButton: {
    backgroundColor: '#7b2d8b',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  syncButtonDisabled: { opacity: 0.6 },
  syncButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  failedSection: { marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  hint: { fontSize: 12, color: '#9ca3af', marginBottom: 12, lineHeight: 18 },
  failedCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
    marginBottom: 8,
  },
  failedId: { fontFamily: 'monospace', fontSize: 12, color: '#374151' },
  failedReason: { fontSize: 12, color: '#6b7280', marginTop: 4 },
});
