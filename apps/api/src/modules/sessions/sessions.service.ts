import { prisma } from '@gb-mis/db';
import type { Paginated } from '@gb-mis/types';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';

import type { CreateSessionDto } from './dto/create-session.dto';

@Injectable()
export class SessionsService {
  async findAll(
    actor: AuthenticatedUser,
    params: { page: number; limit: number; orgUnitId?: string; type?: string },
  ): Promise<Paginated<Record<string, unknown>>> {
    const { page, limit, orgUnitId, type } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (orgUnitId) {
      where['orgUnitId'] = orgUnitId;
    } else if (!actor.roles.includes('SUPER_ADMIN') && !actor.roles.includes('ADMIN')) {
      if (actor.orgUnitIds.length > 0) {
        where['orgUnitId'] = { in: actor.orgUnitIds };
      }
    }
    if (type) where['type'] = type;

    const [items, total] = await Promise.all([
      prisma.communitySession.findMany({
        where,
        skip,
        take: limit,
        include: {
          orgUnit: { select: { id: true, name: true, code: true } },
          attendees: { select: { id: true } },
        },
        orderBy: { heldAt: 'desc' },
      }),
      prisma.communitySession.count({ where }),
    ]);

    return {
      items: items.map((s) => ({ ...s, attendeeCount: s.attendees.length })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const session = await prisma.communitySession.findUnique({
      where: { id },
      include: {
        orgUnit: { select: { id: true, name: true, code: true } },
        attendees: {
          include: { beneficiary: { select: { id: true, beneficiaryCode: true, sex: true } } },
        },
      },
    });
    if (!session) throw new NotFoundException(`Community session ${id} not found`);
    this.assertOrgUnitAccess(actor, session.orgUnitId);
    return session;
  }

  async create(dto: CreateSessionDto, actor: AuthenticatedUser) {
    this.assertOrgUnitAccess(actor, dto.orgUnitId);

    return prisma.communitySession.create({
      data: {
        type: dto.type,
        orgUnitId: dto.orgUnitId,
        facilitatorId: actor.id,
        heldAt: new Date(dto.heldAt),
        topic: dto.topic,
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
      include: { orgUnit: { select: { name: true, code: true } } },
    });
  }

  async recordAttendance(
    sessionId: string,
    dto: { beneficiaryId?: string; sexAgeBracket?: string },
    actor: AuthenticatedUser,
  ) {
    const session = await this.findOne(sessionId, actor);

    return prisma.sessionAttendance.create({
      data: {
        sessionId: session.id,
        attendedAt: new Date(),
        ...(dto.beneficiaryId !== undefined && { beneficiaryId: dto.beneficiaryId }),
        ...(dto.sexAgeBracket !== undefined && { sexAgeBracket: dto.sexAgeBracket }),
      },
    });
  }

  private assertOrgUnitAccess(actor: AuthenticatedUser, orgUnitId: string) {
    if (actor.roles.includes('SUPER_ADMIN') || actor.roles.includes('ADMIN')) return;
    if (actor.orgUnitIds.length > 0 && !actor.orgUnitIds.includes(orgUnitId)) {
      throw new ForbiddenException('Access restricted to your assigned org units');
    }
  }
}
