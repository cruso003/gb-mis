import { Injectable } from '@nestjs/common';
import { prisma } from '@gb-mis/db';
import type { AuditAction } from '@gb-mis/types';

@Injectable()
export class AuditService {
  async findAll(params: {
    actorId?: string;
    resource?: string;
    action?: AuditAction;
    from?: string;
    to?: string;
    page: number;
    limit: number;
  }) {
    const { actorId, resource, action, from, to, page, limit } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (actorId) where['actorId'] = actorId;
    if (resource) where['resource'] = resource;
    if (action) where['action'] = action;
    if (from || to) {
      where['createdAt'] = {};
      if (from) (where['createdAt'] as Record<string, unknown>)['gte'] = new Date(from);
      if (to) (where['createdAt'] as Record<string, unknown>)['lte'] = new Date(to);
    }

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { displayName: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
