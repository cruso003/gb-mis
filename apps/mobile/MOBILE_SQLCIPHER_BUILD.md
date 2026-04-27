# SQLCipher build integration (Android)

This document covers the native build step that turns the WatermelonDB
on-disk SQLite file into an AES-256-CBC encrypted SQLCipher file. It must
be verified on every Android build host as part of `expo prebuild`.

> Phase 1 ships Android only (see `ROADMAP.md`). iOS is not wired.

## What the JS side already does

- `apps/mobile/src/db/deviceKey.ts` generates a 256-bit random key on first
  launch via `expo-crypto` and persists it in `expo-secure-store` (Android
  Keystore-backed AES-256-GCM).
- `apps/mobile/src/db/database.ts` calls `getOrCreateDeviceKey()` at app
  start and passes the hex-encoded key as the `passphrase` option to
  `SQLiteAdapter`.
- `apps/mobile/plugins/withSqlcipher.js` is a config plugin run by
  `expo prebuild` that:
  - Adds the `net.zetetic:android-database-sqlcipher` dependency to
    `android/app/build.gradle`
  - Adds a `USE_SQLCIPHER=true` buildConfig field
  - Sets `gbmis.useSqlcipher=true` in `gradle.properties`

## What the Android build host must verify after `expo prebuild`

WatermelonDB's Android module (`@nozbe/watermelondb/native/android`)
ships its own bundled SQLite. To make `passphrase` actually encrypt
the on-disk file, the bundled SQLite must be replaced with SQLCipher's
`libsqlcipher.so`.

After running `pnpm --filter=@gb-mis/mobile prebuild`, perform these
checks on the generated `android/` directory:

1. **SQLCipher dependency present.** Open
   `android/app/build.gradle` and confirm:
   ```gradle
   implementation 'net.zetetic:android-database-sqlcipher:4.6.1'
   ```

2. **WatermelonDB native module patched.** Open
   `node_modules/@nozbe/watermelondb/native/android/build.gradle` (or
   the corresponding location in the autolinked module) and:
   - Confirm SQLCipher's `libsqlcipher.so` is on the JNI link path
     (replacing the bundled SQLite)
   - Confirm the `Database.java` / `DatabaseDriver.kt` calls
     `SQLiteDatabase.loadLibs(context)` from
     `net.sqlcipher.database` before opening any database
   - If the upstream WatermelonDB version does not yet ship a
     SQLCipher-aware build, apply the patch from
     `infra/patches/watermelondb-sqlcipher.patch` (to be added by the
     Android team during the first prebuild verification).

3. **Smoke test.** After `pnpm --filter=@gb-mis/mobile android`:
   - Pull the on-device database file:
     ```
     adb shell run-as org.mogcsp.gbmis cp \
       /data/data/org.mogcsp.gbmis/databases/gb_mis.db /sdcard/gb_mis.db
     adb pull /sdcard/gb_mis.db
     ```
   - Open it with the system `sqlite3` (no key):
     ```
     sqlite3 gb_mis.db "SELECT name FROM sqlite_master;"
     ```
     This **must fail** with `Error: file is not a database` or
     `Error: file is encrypted`. If the schema dumps cleanly, the file
     is unencrypted and the SQLCipher binding has not taken effect —
     do not ship the build.
   - Open it with the SQLCipher CLI (`sqlcipher gb_mis.db`) and the
     hex key from `expo-secure-store`:
     ```
     PRAGMA key = "x'<64-hex-chars>'";
     SELECT name FROM sqlite_master;
     ```
     The schema must list `gbv_cases`, `beneficiaries`, `sync_records`.

## Key rotation

Phase 1 does not rotate the device key. Rotation requires a
`PRAGMA rekey` migration and is out of scope for the consultant
delivery. Lost-device handling relies on app-data wipe (which destroys
the SecureStore key, rendering the on-disk file permanently unreadable).

## Threat model

| Threat | Mitigation |
| --- | --- |
| Device stolen, unlocked | App-level biometric prompt (`expo-local-authentication`) gates re-entry; SecureStore key only readable while device is unlocked |
| Device stolen, locked | SecureStore item flagged `WHEN_UNLOCKED_THIS_DEVICE_ONLY`; without the lockscreen credential the Keystore-wrapped key cannot be derived |
| App data dump via ADB | Encrypted file is unreadable without the SecureStore-resident key |
| Memory scraping while app is running | Out of scope for SQLCipher; mitigated by short session timeouts and not caching decrypted survivor data in JS state |
| Backup to Google Drive | Disabled — `android:allowBackup="false"` must be set in `AndroidManifest.xml` (verify after prebuild) |

## References

- SECURITY.md — encryption-at-rest requirements
- TECH_STACK.md — WatermelonDB + SQLCipher (Android 10+)
- CLAUDE.md rule #1 — never store decrypted survivor-linked data on disk
