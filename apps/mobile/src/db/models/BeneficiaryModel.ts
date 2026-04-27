import { Model } from '@nozbe/watermelondb';
import { date, text, readonly } from '@nozbe/watermelondb/decorators';

// Beneficiaries are read-only on mobile — pulled from the server, not created offline.
// Create/update operations require network connectivity and go directly to the API.
export class BeneficiaryModel extends Model {
  static table = 'beneficiaries';

  @text('server_id') serverId!: string;
  @text('beneficiary_code') beneficiaryCode!: string;
  @text('status') status!: string;
  @text('sex') sex!: string;
  @text('org_unit_id') orgUnitId!: string;
  @readonly @date('synced_at') syncedAt!: Date;
}
