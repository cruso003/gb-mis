import { prisma } from '@gb-mis/db';
import type { Paginated } from '@gb-mis/types';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';

import type { AddMemberDto, CreateVslaGroupDto } from './dto/create-vsla-group.dto';

@Injectable()
export class VslaService {
  async findAll(
    actor: AuthenticatedUser,
    params: { page: number; limit: number; orgUnitId?: string },
  ): Promise<Paginated<Record<string, unknown>>> {
    const { page, limit, orgUnitId } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { deletedAt: null };
    if (orgUnitId) {
      where['orgUnitId'] = orgUnitId;
    } else if (!actor.roles.includes('SUPER_ADMIN') && !actor.roles.includes('ADMIN')) {
      if (actor.orgUnitIds.length > 0) {
        where['orgUnitId'] = { in: actor.orgUnitIds };
      }
    }

    const [items, total] = await Promise.all([
      prisma.vslaGroup.findMany({
        where,
        skip,
        take: limit,
        include: {
          orgUnit: { select: { id: true, name: true, code: true } },
          _count: { select: { members: true } },
        },
        orderBy: { formedAt: 'desc' },
      }),
      prisma.vslaGroup.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const group = await prisma.vslaGroup.findUnique({
      where: { id },
      include: {
        orgUnit: { select: { id: true, name: true, code: true } },
        members: {
          include: {
            beneficiary: { select: { id: true, beneficiaryCode: true, sex: true } },
          },
        },
      },
    });
    if (!group) throw new NotFoundException(`VSLA group ${id} not found`);
    this.assertOrgUnitAccess(actor, group.orgUnitId);
    return group;
  }

  async create(dto: CreateVslaGroupDto, actor: AuthenticatedUser) {
    this.assertOrgUnitAccess(actor, dto.orgUnitId);

    return prisma.vslaGroup.create({
      data: {
        name: dto.name,
        orgUnitId: dto.orgUnitId,
        formedAt: new Date(dto.formedAt),
      },
      include: { orgUnit: { select: { name: true, code: true } } },
    });
  }

  async addMember(groupId: string, dto: AddMemberDto, actor: AuthenticatedUser) {
    const group = await this.findOne(groupId, actor);

    return prisma.vslaMembership.create({
      data: {
        vslaGroupId: group.id,
        beneficiaryId: dto.beneficiaryId,
        role: dto.role,
        joinedAt: new Date(dto.joinedAt),
      },
      include: {
        beneficiary: { select: { id: true, beneficiaryCode: true } },
      },
    });
  }

  async removeMember(
    groupId: string,
    beneficiaryId: string,
    leftAt: string,
    actor: AuthenticatedUser,
  ) {
    const group = await this.findOne(groupId, actor);

    return prisma.vslaMembership.update({
      where: { vslaGroupId_beneficiaryId: { vslaGroupId: group.id, beneficiaryId } },
      data: { leftAt: new Date(leftAt) },
    });
  }

  private assertOrgUnitAccess(actor: AuthenticatedUser, orgUnitId: string) {
    if (actor.roles.includes('SUPER_ADMIN') || actor.roles.includes('ADMIN')) return;
    if (actor.orgUnitIds.length > 0 && !actor.orgUnitIds.includes(orgUnitId)) {
      throw new ForbiddenException('Access restricted to your assigned org units');
    }
  }
}
