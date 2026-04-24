import { prisma } from '@gb-mis/db';
import type { Role, Paginated } from '@gb-mis/types';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  async findAll(params: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<Paginated<Record<string, unknown>>> {
    const { page, limit, search } = params;
    const skip = (page - 1) * limit;

    const where = search
      ? { displayName: { contains: search, mode: 'insensitive' as const } }
      : {};

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: { roles: true, orgUnitScopes: { include: { orgUnit: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { roles: true, orgUnitScopes: { include: { orgUnit: true } } },
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

    const user = await prisma.user.create({
      data: {
        keycloakSubject: dto.keycloakSubject,
        displayName: dto.displayName,
        roles: {
          create: dto.roles.map((role) => ({
            role,
            assignedById: dto.assignedBy,
          })),
        },
      },
    });

    await prisma.userOrgUnitScope.create({
      data: { userId: user.id, orgUnitId: dto.orgUnitId, assignedById: dto.assignedBy },
    });

    return this.findOne(user.id);
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    return prisma.user.update({
      where: { id },
      data: {
        ...(dto.displayName !== undefined && { displayName: dto.displayName }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: { roles: true, orgUnitScopes: true },
    });
  }

  async assignRole(userId: string, role: Role, assignedBy: string) {
    await this.findOne(userId);

    return prisma.userRole.upsert({
      where: { userId_role: { userId, role } },
      create: { userId, role, assignedById: assignedBy },
      update: { assignedById: assignedBy },
    });
  }

  async revokeRole(userId: string, role: Role) {
    await this.findOne(userId);
    return prisma.userRole.deleteMany({ where: { userId, role } });
  }

  async deactivate(id: string) {
    await this.findOne(id);
    return prisma.user.update({ where: { id }, data: { status: 'DISABLED' } });
  }
}
