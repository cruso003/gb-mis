import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'gbv_cases',
      columns: [
        { name: 'client_event_id', type: 'string', isIndexed: true },
        { name: 'violence_type', type: 'string' },
        { name: 'intake_channel', type: 'string' },
        { name: 'org_unit_id', type: 'string' },
        { name: 'notes', type: 'string', isOptional: true },
        { name: 'perpetrator_relationship', type: 'string', isOptional: true },
        { name: 'upload_status', type: 'string' }, // PENDING | SYNCED | FAILED
        { name: 'sync_error', type: 'string', isOptional: true },
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'beneficiaries',
      columns: [
        { name: 'server_id', type: 'string', isIndexed: true },
        { name: 'beneficiary_code', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'sex', type: 'string' },
        { name: 'org_unit_id', type: 'string' },
        { name: 'synced_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'sync_records',
      columns: [
        { name: 'client_event_id', type: 'string', isIndexed: true },
        { name: 'resource', type: 'string' },
        { name: 'operation', type: 'string' }, // CREATE | UPDATE
        { name: 'entity_local_id', type: 'string' },
        { name: 'payload_json', type: 'string' },
        { name: 'upload_status', type: 'string' }, // PENDING | SYNCED | FAILED
        { name: 'error_message', type: 'string', isOptional: true },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
});
