import { NavigationContainer } from '@react-navigation/native';
import { registerRootComponent } from 'expo';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './auth/AuthProvider';
import { initDatabase } from './db/database';
import { RootNavigator } from './navigation/RootNavigator';

function App() {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    initDatabase()
      .then(() => setDbReady(true))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setDbError(msg);
      });
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          {dbError ? (
            <View style={styles.gate}>
              <Text style={styles.gateTitle}>Local data store unavailable</Text>
              <Text style={styles.gateBody}>{dbError}</Text>
              <Text style={styles.gateHint}>
                Contact your supervisor. Reinstalling the app will erase any
                unsynced records on this device.
              </Text>
            </View>
          ) : !dbReady ? (
            <View style={styles.gate}>
              <ActivityIndicator size="large" color="#7b2d8b" />
              <Text style={styles.gateBody}>Unlocking secure storage…</Text>
            </View>
          ) : (
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          )}
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  gate: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  gateTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  gateBody: { fontSize: 14, color: '#374151', textAlign: 'center' },
  gateHint: { fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 8 },
});

registerRootComponent(App);
