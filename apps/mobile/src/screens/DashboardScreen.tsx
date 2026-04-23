import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { QuickExitButton } from '../components/QuickExitButton';
import { useSyncStatus } from '../sync/useSyncStatus';

export function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { pendingCount, lastSyncAt, isSyncing } = useSyncStatus();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <QuickExitButton />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Dashboard</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Sync Status</Text>
          <Text style={styles.cardValue}>
            {isSyncing ? 'Syncing…' : pendingCount > 0 ? `${pendingCount} pending` : 'Up to date'}
          </Text>
          {lastSyncAt ? (
            <Text style={styles.cardSub}>Last sync: {lastSyncAt.toLocaleTimeString()}</Text>
          ) : (
            <Text style={styles.cardSub}>Not yet synced on this device</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>County</Text>
          <Text style={styles.cardValue}>Assigned org unit</Text>
          <Text style={styles.cardSub}>Offline mode active when no connectivity</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingTop: 48 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLabel: { fontSize: 12, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardValue: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 4 },
  cardSub: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
});
