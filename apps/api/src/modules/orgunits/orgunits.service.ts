import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@gb-mis/db';
import type { Prisma } from '@gb-mis/db';
import type { OrgUnitLevel } from '@gb-mis/types';

@Injectable()
export class OrgUnitsService {
  async findAll(params: { level?: OrgUnitLevel; parentId?: string }) {
    const where: Prisma.OrgUnitWhereInput = {};
    if (params.level) where['level'] = params.level;
    if (params.parentId) where['parentId'] = params.parentId;

    return prisma.orgUnit.findMany({
      where,
      include: { children: { select: { id: true, name: true, level: true, code: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const orgUnit = await prisma.orgUnit.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, level: true } },
        children: { select: { id: true, name: true, level: true, code: true } },
      },
    });
    if (!orgUnit) throw new NotFoundException(`OrgUnit ${id} not found`);
    return orgUnit;
  }

  async tree() {
    const roots = await prisma.orgUnit.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: {
              include: {
                children: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    return roots;
  }
}
