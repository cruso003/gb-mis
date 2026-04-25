import { Model } from '@nozbe/watermelondb';
import { field, date, text, readonly } from '@nozbe/watermelondb/decorators';

export type SyncOperation = 'CREATE' | 'UPDATE';
export type SyncRecordStatus = 'PENDING' | 'SYNCED' | 'FAILED';

export class SyncRecordModel extends Model {
  static table = 'sync_records';

  @text('client_event_id') clientEventId!: string;
  @text('resource') resource!: string;
  @text('operation') operation!: SyncOperation;
  @text('entity_local_id') entityLocalId!: string;
  @text('payload_json') payloadJson!: string;
  @field('upload_status') uploadStatus!: SyncRecordStatus;
  @field('error_message') errorMessage!: string | null;
  @field('synced_at') syncedAt!: number | null;
  @readonly @date('created_at') createdAt!: Date;
}
