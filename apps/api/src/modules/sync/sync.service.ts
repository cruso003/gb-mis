import { prisma } from '@gb-mis/db';
import { Injectable, BadRequestException } from '@nestjs/common';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';

export interface SyncPushRecord {
  clientId: string;
  resource: string;
  operation: 'CREATE' | 'UPDATE';
  payload: Record<string, unknown>;
  clientCreatedAt: string;
  clientUpdatedAt: string;
}

export interface SyncPushResult {
  accepted: string[];
  rejected: Array<{ clientId: string; reason: string }>;
}

@Injectable()
export class SyncService {
  /**
   * Pull — returns records updated on server after cursor.
   * Server is authoritative: client must apply these over its local state.
   */
  async pull(
    actor: AuthenticatedUser,
    params: { cursor: string | null; resources: string[] },
  ) {
    const since = params.cursor ? new Date(params.cursor) : new Date(0);

    const result: Record<string, unknown[]> = {};

    if (params.resources.includes('cases') || params.resources.length === 0) {
      const where: Record<string, unknown> = { updatedAt: { gte: since } };
      if (!actor.roles.includes('SUPER_ADMIN') && !actor.roles.includes('ADMIN')) {
        where['orgUnit'] = { countyCode: { in: actor.countyIds } };
      }
      result['cases'] = await prisma.gbvCase.findMany({
        where,
        select: {
          id: true,
          status: true,
          priority: true,
          beneficiaryId: true,
          orgUnitId: true,
          primaryViolenceType: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'asc' },
        take: 500,
      });
    }

    if (params.resources.includes('beneficiaries') || params.resources.length === 0) {
      const where: Record<string, unknown> = { updatedAt: { gte: since } };
      if (!actor.roles.includes('SUPER_ADMIN') && !actor.roles.includes('ADMIN')) {
        where['orgUnit'] = { countyCode: { in: actor.countyIds } };
      }
      result['beneficiaries'] = await prisma.beneficiary.findMany({
        where,
        select: {
          id: true,
          displayCode: true,
          status: true,
          sex: true,
          disabilityStatus: true,
          orgUnitId: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'asc' },
        take: 500,
      });
    }

    return {
      data: result,
      cursor: new Date().toISOString(),
    };
  }

  /**
   * Push — client sends a batch of offline-created/updated records.
   * Server validates, applies, and reports accepted/rejected per clientId.
   * Records are NEVER silently dropped — rejections are returned to client.
   */
  async push(actor: AuthenticatedUser, records: SyncPushRecord[]): Promise<SyncPushResult> {
    if (records.length > 100) {
      throw new BadRequestException('Batch size exceeds maximum of 100 records per push');
    }

    const accepted: string[] = [];
    const rejected: Array<{ clientId: string; reason: string }> = [];

    for (const record of records) {
      try {
        await this.applySyncRecord(actor, record);
        accepted.push(record.clientId);
      } catch (err) {
        rejected.push({
          clientId: record.clientId,
          reason: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // Persist sync record for reconciliation UI
    await prisma.syncRecord.createMany({
      data: [
        ...accepted.map((clientId) => ({
          clientId,
          deviceId: actor.id,
          status: 'SYNCED' as const,
        })),
        ...rejected.map(({ clientId, reason }) => ({
          clientId,
          deviceId: actor.id,
          status: 'FAILED' as const,
          errorMessage: reason,
        })),
      ],
      skipDuplicates: true,
    });

    return { accepted, rejected };
  }

  private async applySyncRecord(actor: AuthenticatedUser, record: SyncPushRecord) {
    switch (record.resource) {
      case 'cases':
        return this.applyCase(actor, record);
      case 'beneficiaries':
        return this.applyBeneficiary(actor, record);
      default:
        throw new Error(`Unknown sync resource: ${record.resource}`);
    }
  }

  private async applyCase(actor: AuthenticatedUser, record: SyncPushRecord) {
    const payload = record.payload as Record<string, string>;

    if (record.operation === 'CREATE') {
      await prisma.gbvCase.upsert({
        where: { id: record.clientId },
        create: {
          id: record.clientId,
          beneficiaryId: payload['beneficiaryId'] ?? '',
          orgUnitId: payload['orgUnitId'] ?? '',
          intakeChannel: (payload['intakeChannel'] as never) ?? 'FIELD_WORKER',
          primaryViolenceType: (payload['primaryViolenceType'] as never) ?? 'PHYSICAL',
          assignedToId: actor.id,
        },
        update: {},
      });
    } else {
      await prisma.gbvCase.update({
        where: { id: record.clientId },
        data: { status: (payload['status'] as never) ?? undefined },
      });
    }
  }

  private async applyBeneficiary(_actor: AuthenticatedUser, _record: SyncPushRecord) {
    // Beneficiary sync via mobile creates records with already-encrypted PII blobs
    // sent from the device SQLCipher store — validated and stored as-is
    throw new Error('Beneficiary sync requires dedicated encrypted-payload endpoint (Stage 3)');
  }
}
