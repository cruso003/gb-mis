import * as LocalAuthentication from 'expo-local-authentication';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuth } from '../auth/AuthProvider';

export function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    LocalAuthentication.hasHardwareAsync()
      .then((has) => setBiometricAvailable(has))
      .catch(() => setBiometricAvailable(false));
  }, []);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7b2d8b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>GB</Text>
        </View>
        <Text style={styles.title}>GB MIS</Text>
        <Text style={styles.subtitle}>Ministry of Gender{'\n'}Children and Social Protection</Text>
        <Text style={styles.country}>Republic of Liberia</Text>

        <TouchableOpacity style={styles.button} onPress={() => void login()}>
          <Text style={styles.buttonText}>Sign in with MOGCSP Account</Text>
        </TouchableOpacity>

        {biometricAvailable && (
          <Text style={styles.biometricHint}>
            Biometric unlock available after first sign-in
          </Text>
        )}

        <Text style={styles.disclaimer}>
          This device is authorised for GB MIS field data collection. All data is encrypted.
          Activity is logged.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#7b2d8b',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
  country: { fontSize: 12, color: '#9ca3af', marginTop: 4, marginBottom: 32 },
  button: {
    width: '100%',
    backgroundColor: '#7b2d8b',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  biometricHint: { marginTop: 12, fontSize: 12, color: '#6b7280' },
  disclaimer: {
    marginTop: 24,
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 16,
  },
});
