import { prisma } from '@gb-mis/db';
import type { Paginated } from '@gb-mis/types';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';

import type { AddServiceDto } from './dto/add-service.dto';
import type { CreateCaseDto } from './dto/create-case.dto';
import type { CreateReferralDto } from './dto/create-referral.dto';

@Injectable()
export class CasesService {
  async findAll(
    actor: AuthenticatedUser,
    params: { page: number; limit: number; status?: string; priority?: string },
  ): Promise<Paginated<Record<string, unknown>>> {
    const { page, limit, status, priority } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (actor.orgUnitIds.length > 0 && !actor.roles.includes('SUPER_ADMIN') && !actor.roles.includes('ADMIN')) {
      where['orgUnitId'] = { in: actor.orgUnitIds };
    }

    if (status) where['status'] = status;
    if (priority) where['priority'] = priority;

    const [items, total] = await Promise.all([
      prisma.gbvCase.findMany({
        where,
        skip,
        take: limit,
        include: {
          survivor: { select: { id: true, beneficiaryCode: true, orgUnitId: true } },
          orgUnit: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.gbvCase.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const gbvCase = await prisma.gbvCase.findUnique({
      where: { id },
      include: {
        survivor: true,
        orgUnit: true,
        incidents: true,
        servicesProvided: true,
        referrals: true,
      },
    });

    if (!gbvCase) throw new NotFoundException(`Case ${id} not found`);

    this.assertOrgUnitAccess(actor, gbvCase.orgUnitId);

    return gbvCase;
  }

  async create(dto: CreateCaseDto, actor: AuthenticatedUser) {
    const caseNumber = `CASE-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;
    const incidentData = dto.incidentDate
      ? {
          create: {
            types: dto.primaryViolenceType ? [dto.primaryViolenceType] : [],
            occurredAt: new Date(dto.incidentDate),
            perpetratorDemographics: {
              ageBracket: dto.perpetratorAgeBracket ?? null,
              sex: dto.perpetratorSex ?? null,
              relationship: dto.perpetratorRelationship ?? null,
            },
          },
        }
      : undefined;

    return prisma.gbvCase.create({
      data: {
        caseNumber,
        ...(dto.beneficiaryId !== undefined && { survivorId: dto.beneficiaryId }),
        orgUnitId: dto.orgUnitId,
        intakeChannel: dto.intakeChannel,
        priority: dto.priority,
        intakeDate: new Date(),
        intakeByUserId: actor.id,
        ...(incidentData !== undefined && { incidents: incidentData }),
      },
      include: { survivor: true, orgUnit: true },
    });
  }

  async addService(caseId: string, dto: AddServiceDto, actor: AuthenticatedUser) {
    const gbvCase = await this.findOne(caseId, actor);

    return prisma.serviceProvided.create({
      data: {
        caseId: gbvCase.id,
        type: dto.serviceType,
        providedAt: new Date(dto.providedAt),
        providerOrgUnitId: dto.providerOrgUnitId ?? gbvCase.orgUnitId,
        outcome: dto.outcome ?? 'IN_PROGRESS',
      },
    });
  }

  async createReferral(caseId: string, dto: CreateReferralDto, actor: AuthenticatedUser) {
    const gbvCase = await this.findOne(caseId, actor);

    return prisma.referral.create({
      data: {
        caseId: gbvCase.id,
        toOrgUnitId: dto.toOrgUnitId,
        toService: dto.serviceType,
        referredAt: new Date(),
        ...(dto.outcome !== undefined && { outcome: dto.outcome }),
        ...(dto.completedAt !== undefined && { completedAt: new Date(dto.completedAt) }),
      },
    });
  }

  async supervisorReview(
    caseId: string,
    decision: 'APPROVED' | 'RETURNED',
    actor: AuthenticatedUser,
  ) {
    const gbvCase = await this.findOne(caseId, actor);
    if (!actor.roles.includes('SUPERVISOR') && !actor.roles.includes('ADMIN') && !actor.roles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException('Only supervisors may review cases');
    }

    return prisma.gbvCase.update({
      where: { id: gbvCase.id },
      data: {
        status: decision === 'APPROVED' ? 'IN_SERVICE' : 'OPEN',
        supervisorReviewedAt: new Date(),
      },
    });
  }

  async close(caseId: string, reason: string, actor: AuthenticatedUser) {
    const gbvCase = await this.findOne(caseId, actor);
    const status = reason === 'WITHDRAWN' ? 'CLOSED_WITHDRAWN' : 'CLOSED_SUCCESSFUL';
    return prisma.gbvCase.update({
      where: { id: gbvCase.id },
      data: { status, closedAt: new Date() },
    });
  }

  private assertOrgUnitAccess(actor: AuthenticatedUser, orgUnitId: string) {
    if (actor.roles.includes('SUPER_ADMIN') || actor.roles.includes('ADMIN')) return;
    if (actor.orgUnitIds.length > 0 && !actor.orgUnitIds.includes(orgUnitId)) {
      throw new ForbiddenException('Access to this case is restricted to your assigned org units');
    }
  }
}
