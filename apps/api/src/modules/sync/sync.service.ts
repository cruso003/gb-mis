import { prisma } from '@gb-mis/db';
import { Injectable, BadRequestException } from '@nestjs/common';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';

export interface SyncPushRecord {
  clientEventId: string;
  resource: string;
  operation: 'CREATE' | 'UPDATE';
  payload: Record<string, unknown>;
  clientCreatedAt: string;
  clientUpdatedAt: string;
}

export interface SyncPushResult {
  accepted: string[];
  rejected: Array<{ clientEventId: string; reason: string }>;
}

@Injectable()
export class SyncService {
  async pull(
    actor: AuthenticatedUser,
    params: { cursor: string | null; resources: string[] },
  ) {
    const since = params.cursor ? new Date(params.cursor) : new Date(0);

    const result: Record<string, unknown[]> = {};

    if (params.resources.includes('cases') || params.resources.length === 0) {
      const where: Record<string, unknown> = { updatedAt: { gte: since } };
      if (!actor.roles.includes('SUPER_ADMIN') && !actor.roles.includes('ADMIN')) {
        if (actor.orgUnitIds.length > 0) {
          where['orgUnitId'] = { in: actor.orgUnitIds };
        }
      }
      result['cases'] = await prisma.gbvCase.findMany({
        where,
        select: {
          id: true,
          status: true,
          priority: true,
          survivorId: true,
          orgUnitId: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'asc' },
        take: 500,
      });
    }

    if (params.resources.includes('beneficiaries') || params.resources.length === 0) {
      const where: Record<string, unknown> = { updatedAt: { gte: since } };
      if (!actor.roles.includes('SUPER_ADMIN') && !actor.roles.includes('ADMIN')) {
        if (actor.orgUnitIds.length > 0) {
          where['orgUnitId'] = { in: actor.orgUnitIds };
        }
      }
      result['beneficiaries'] = await prisma.beneficiary.findMany({
        where,
        select: {
          id: true,
          beneficiaryCode: true,
          status: true,
          sex: true,
          disabilityStatuses: true,
          orgUnitId: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'asc' },
        take: 500,
      });
    }

    return { data: result, cursor: new Date().toISOString() };
  }

  async push(actor: AuthenticatedUser, records: SyncPushRecord[]): Promise<SyncPushResult> {
    if (records.length > 100) {
      throw new BadRequestException('Batch size exceeds maximum of 100 records per push');
    }

    const accepted: string[] = [];
    const rejected: Array<{ clientEventId: string; reason: string }> = [];

    for (const record of records) {
      try {
        await this.applySyncRecord(actor, record);
        accepted.push(record.clientEventId);
      } catch (err) {
        rejected.push({
          clientEventId: record.clientEventId,
          reason: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    await prisma.syncRecord.createMany({
      data: [
        ...accepted.map((clientEventId) => ({
          clientEventId,
          deviceId: 'unknown',
          userId: actor.id,
          entityType: 'sync',
          payload: {},
          status: 'SYNCED' as const,
        })),
        ...rejected.map(({ clientEventId, reason }) => ({
          clientEventId,
          deviceId: 'unknown',
          userId: actor.id,
          entityType: 'sync',
          payload: {},
          status: 'ERROR' as const,
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
        throw new Error('Beneficiary sync requires dedicated encrypted-payload endpoint (Stage 3)');
      default:
        throw new Error(`Unknown sync resource: ${record.resource}`);
    }
  }

  private async applyCase(actor: AuthenticatedUser, record: SyncPushRecord) {
    const payload = record.payload as Record<string, string>;

    if (record.operation === 'CREATE') {
      const caseNumber = `SYNC-${record.clientEventId.slice(-8).toUpperCase()}`;
      await prisma.gbvCase.upsert({
        where: { clientEventId: record.clientEventId },
        // Mobile-created cases enter the supervisor review queue just like
        // web-created ones. status falls through the Prisma @default
        // (PENDING_REVIEW) but submittedForReviewAt has to be set
        // explicitly so the queue ordering is correct.
        create: {
          caseNumber,
          clientEventId: record.clientEventId,
          ...(payload['survivorId'] !== undefined && { survivorId: payload['survivorId'] }),
          orgUnitId: payload['orgUnitId'] ?? actor.orgUnitIds[0] ?? '',
          intakeChannel: (payload['intakeChannel'] as never) ?? 'COMMUNITY',
          intakeDate: new Date(),
          intakeByUserId: actor.id,
          submittedForReviewAt: new Date(),
        },
        update: {},
      });
    } else {
      await prisma.gbvCase.update({
        where: { clientEventId: record.clientEventId },
        data: { status: (payload['status'] as never) ?? undefined },
      });
    }
  }
}
