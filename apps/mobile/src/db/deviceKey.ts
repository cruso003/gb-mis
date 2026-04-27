/**
 * Device key management for the encrypted local database.
 *
 * The key is a 256-bit value generated on first launch with `expo-crypto`
 * and stored via `expo-secure-store`, which on Android wraps it with the
 * hardware-backed Android Keystore (EncryptedSharedPreferences, AES-256-GCM).
 * Wiping the app data or factory-resetting the device destroys the key,
 * making the on-disk database unreadable — the desired behaviour for a
 * lost or stolen device per SECURITY.md.
 *
 * The hex-encoded value is fed directly to SQLCipher as the passphrase.
 * SQLCipher applies PBKDF2 (configurable, default 256k iterations on v4)
 * to derive the actual encryption key. Because our input already has 256
 * bits of entropy, the PBKDF2 step is defence-in-depth, not the security
 * boundary.
 */

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const DEVICE_KEY_NAME = 'gbmis.db.deviceKey.v1';
const DEVICE_KEY_BYTES = 32;

export async function getOrCreateDeviceKey(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_KEY_NAME);
  if (existing && existing.length === DEVICE_KEY_BYTES * 2) {
    return existing;
  }

  const bytes = await Crypto.getRandomBytesAsync(DEVICE_KEY_BYTES);
  const hex = bytesToHex(bytes);

  await SecureStore.setItemAsync(DEVICE_KEY_NAME, hex, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });

  return hex;
}

export async function wipeDeviceKey(): Promise<void> {
  await SecureStore.deleteItemAsync(DEVICE_KEY_NAME);
}

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += (bytes[i] ?? 0).toString(16).padStart(2, '0');
  }
  return out;
}
