import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

import { BeneficiaryModel } from './models/BeneficiaryModel';
import { GbvCaseModel } from './models/GbvCaseModel';
import { SyncRecordModel } from './models/SyncRecordModel';
import { schema } from './schema';

// SQLite adapter — uses the native SQLite bundled with @nozbe/watermelondb.
// For production, replace with a SQLCipher-backed adapter by providing a custom
// SQLiteAdapter with dbName + encryption key derived from expo-secure-store.
// See apps/mobile/SYNC_PROTOCOL.md for the encryption key derivation plan.
const adapter = new SQLiteAdapter({
  schema,
  dbName: 'gb_mis',
  jsi: true,
  migrationEvents: { onSuccess: () => {}, onStart: () => {}, onError: () => {} },
});

export const database = new Database({
  adapter,
  modelClasses: [GbvCaseModel, BeneficiaryModel, SyncRecordModel],
});
