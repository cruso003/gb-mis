import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@gb-mis/db';
import type { Prisma } from '@gb-mis/db';
import type { Role } from '@gb-mis/types';
import type { Paginated } from '@gb-mis/types';

import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<Paginated<Prisma.UserGetPayload<{ include: { orgUnit: true; roles: true } }>>> {
    const { page, limit, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = search
      ? { displayName: { contains: search, mode: 'insensitive' } }
      : {};

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: { orgUnit: true, roles: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { orgUnit: true, roles: true },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto) {
    const existing = await prisma.user.findUnique({
      where: { keycloakSubject: dto.keycloakSubject },
    });
    if (existing) {
      throw new ConflictException(
        `User with keycloak subject ${dto.keycloakSubject} already exists`,
      );
    }

    return prisma.user.create({
      data: {
        keycloakSubject: dto.keycloakSubject,
        displayName: dto.displayName,
        orgUnitId: dto.orgUnitId,
        roles: {
          create: dto.roles.map((role) => ({
            role,
            assignedBy: dto.assignedBy,
          })),
        },
      },
      include: { orgUnit: true, roles: true },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    return prisma.user.update({
      where: { id },
      data: {
        displayName: dto.displayName,
        orgUnitId: dto.orgUnitId,
        status: dto.status,
      },
      include: { orgUnit: true, roles: true },
    });
  }

  async assignRole(userId: string, role: Role, assignedBy: string) {
    await this.findOne(userId);

    return prisma.userRole.upsert({
      where: { userId_role: { userId, role } },
      create: { userId, role, assignedBy },
      update: { assignedBy },
    });
  }

  async revokeRole(userId: string, role: Role) {
    await this.findOne(userId);

    return prisma.userRole.deleteMany({ where: { userId, role } });
  }

  async deactivate(id: string) {
    await this.findOne(id);
    return prisma.user.update({ where: { id }, data: { status: 'INACTIVE' } });
  }
}
