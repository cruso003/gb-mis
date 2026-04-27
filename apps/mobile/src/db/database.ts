import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { getOrCreateDeviceKey } from './deviceKey';
import { BeneficiaryModel } from './models/BeneficiaryModel';
import { GbvCaseModel } from './models/GbvCaseModel';
import { SyncRecordModel } from './models/SyncRecordModel';
import { schema } from './schema';

// SQLCipher integration: the WatermelonDB Android native module is built
// with SQLCipher linked in (see plugins/withSqlcipher.js + MOBILE_SQLCIPHER_BUILD.md).
// At runtime we open the database with a passphrase derived from the device-bound
// key in expo-secure-store, so the on-disk SQLite file is AES-256-CBC encrypted.

let initPromise: Promise<Database> | null = null;
let databaseInstance: Database | null = null;

export function initDatabase(): Promise<Database> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const passphrase = await getOrCreateDeviceKey();

    const adapter = new SQLiteAdapter({
      schema,
      dbName: 'gb_mis',
      jsi: true,
      passphrase,
      migrationEvents: { onSuccess: () => {}, onStart: () => {}, onError: () => {} },
    } as ConstructorParameters<typeof SQLiteAdapter>[0] & { passphrase: string });

    databaseInstance = new Database({
      adapter,
      modelClasses: [GbvCaseModel, BeneficiaryModel, SyncRecordModel],
    });

    return databaseInstance;
  })();

  return initPromise;
}

export function getDatabase(): Database {
  if (!databaseInstance) {
    throw new Error(
      'Database not initialised. initDatabase() must complete before getDatabase() is called.',
    );
  }
  return databaseInstance;
}
