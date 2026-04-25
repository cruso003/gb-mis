import { Model } from '@nozbe/watermelondb';
import { field, readonly, date, text } from '@nozbe/watermelondb/decorators';

export type SyncStatus = 'PENDING' | 'SYNCED' | 'FAILED';

export class GbvCaseModel extends Model {
  static table = 'gbv_cases';

  @text('client_event_id') clientEventId!: string;
  @text('violence_type') violenceType!: string;
  @text('intake_channel') intakeChannel!: string;
  @text('org_unit_id') orgUnitId!: string;
  @field('notes') notes!: string | null;
  @field('perpetrator_relationship') perpetratorRelationship!: string | null;
  @field('upload_status') uploadStatus!: SyncStatus;
  @field('sync_error') syncError!: string | null;
  @field('server_id') serverId!: string | null;
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
}
