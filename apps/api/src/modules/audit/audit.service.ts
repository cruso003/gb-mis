import { prisma } from '@gb-mis/db';
import type { AuditAction } from '@gb-mis/types';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AuditService {
  async findAll(params: {
    actorUserId?: string;
    entityType?: string;
    action?: AuditAction;
    from?: string;
    to?: string;
    page: number;
    limit: number;
  }) {
    const { actorUserId, entityType, action, from, to, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (actorUserId) where['actorUserId'] = actorUserId;
    if (entityType) where['entityType'] = entityType;
    if (action) where['action'] = action;
    if (from || to) {
      where['occurredAt'] = {};
      if (from) (where['occurredAt'] as Record<string, unknown>)['gte'] = new Date(from);
      if (to) (where['occurredAt'] as Record<string, unknown>)['lte'] = new Date(to);
    }

    const [items, total] = await Promise.all([
      prisma.auditEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { occurredAt: 'desc' },
        include: { actor: { select: { displayName: true } } },
      }),
      prisma.auditEvent.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
