import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@gb-mis/db';
import type { Prisma } from '@gb-mis/db';
import type { Paginated } from '@gb-mis/types';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import type { CreateCaseDto } from './dto/create-case.dto';
import type { AddServiceDto } from './dto/add-service.dto';
import type { CreateReferralDto } from './dto/create-referral.dto';

@Injectable()
export class CasesService {
  async findAll(
    actor: AuthenticatedUser,
    params: { page: number; limit: number; status?: string; priority?: string },
  ): Promise<Paginated<Prisma.GbvCaseGetPayload<{ include: { beneficiary: true; orgUnit: true } }>>> {
    const { page, limit, status, priority } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.GbvCaseWhereInput = {};

    // ANALYST and above can see all counties; others are scoped by RLS at DB level
    // Application layer adds explicit county filter as defence-in-depth
    if (actor.countyIds.length > 0 && !actor.roles.includes('SUPER_ADMIN') && !actor.roles.includes('ADMIN')) {
      where['orgUnit'] = { countyCode: { in: actor.countyIds } };
    }

    if (status) where['status'] = status as Prisma.EnumCaseStatusFilter['equals'];
    if (priority) where['priority'] = priority as Prisma.EnumCasePriorityFilter['equals'];

    const [items, total] = await Promise.all([
      prisma.gbvCase.findMany({
        where,
        skip,
        take: limit,
        include: {
          beneficiary: { select: { id: true, displayCode: true, orgUnitId: true } },
          orgUnit: { select: { id: true, name: true, countyCode: true } },
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
        beneficiary: true,
        orgUnit: true,
        incidents: true,
        services: true,
        referrals: { include: { toOrgUnit: true } },
        supervisorReview: true,
      },
    });

    if (!gbvCase) throw new NotFoundException(`Case ${id} not found`);

    this.assertCountyAccess(actor, gbvCase.orgUnit?.countyCode);

    return gbvCase;
  }

  async create(dto: CreateCaseDto, actor: AuthenticatedUser) {
    return prisma.gbvCase.create({
      data: {
        beneficiaryId: dto.beneficiaryId,
        orgUnitId: dto.orgUnitId,
        intakeChannel: dto.intakeChannel,
        priority: dto.priority,
        primaryViolenceType: dto.primaryViolenceType,
        perpetratorDemographics: dto.perpetratorRelationship
          ? {
              relationship: dto.perpetratorRelationship,
              ageBracket: dto.perpetratorAgeBracket ?? null,
              sex: dto.perpetratorSex ?? null,
            }
          : undefined,
        referredFrom: dto.referredFrom,
        assignedToId: actor.id,
        incidents: dto.incidentDate
          ? {
              create: {
                incidentDate: new Date(dto.incidentDate),
                violenceType: dto.primaryViolenceType,
              },
            }
          : undefined,
      },
      include: { beneficiary: true, orgUnit: true },
    });
  }

  async addService(caseId: string, dto: AddServiceDto, actor: AuthenticatedUser) {
    const gbvCase = await this.findOne(caseId, actor);

    return prisma.caseService.create({
      data: {
        caseId: gbvCase.id,
        serviceType: dto.serviceType,
        providedAt: new Date(dto.providedAt),
        providerOrgUnitId: dto.providerOrgUnitId,
        outcome: dto.outcome,
        sessionCount: dto.sessionCount,
        recordedById: actor.id,
      },
    });
  }

  async createReferral(caseId: string, dto: CreateReferralDto, actor: AuthenticatedUser) {
    const gbvCase = await this.findOne(caseId, actor);

    return prisma.caseReferral.create({
      data: {
        caseId: gbvCase.id,
        toOrgUnitId: dto.toOrgUnitId,
        serviceType: dto.serviceType,
        urgency: dto.urgency,
        referredById: actor.id,
        outcome: dto.outcome,
        completedAt: dto.completedAt ? new Date(dto.completedAt) : undefined,
      },
    });
  }

  async supervisorReview(
    caseId: string,
    decision: 'APPROVED' | 'RETURNED',
    notes: string,
    actor: AuthenticatedUser,
  ) {
    const gbvCase = await this.findOne(caseId, actor);
    if (!actor.roles.includes('SUPERVISOR') && !actor.roles.includes('ADMIN') && !actor.roles.includes('SUPER_ADMIN')) {
      throw new ForbiddenException('Only supervisors may review cases');
    }

    return prisma.gbvCase.update({
      where: { id: gbvCase.id },
      data: {
        status: decision === 'APPROVED' ? 'ACTIVE' : 'PENDING_REVIEW',
        supervisorReview: {
          upsert: {
            create: { supervisorId: actor.id, decision, notes },
            update: { supervisorId: actor.id, decision, notes },
          },
        },
      },
    });
  }

  async close(caseId: string, reason: string, actor: AuthenticatedUser) {
    const gbvCase = await this.findOne(caseId, actor);
    return prisma.gbvCase.update({
      where: { id: gbvCase.id },
      data: { status: 'CLOSED', closedAt: new Date(), closureReason: reason },
    });
  }

  private assertCountyAccess(actor: AuthenticatedUser, countyCode?: string | null) {
    if (actor.roles.includes('SUPER_ADMIN') || actor.roles.includes('ADMIN')) return;
    if (!countyCode) return;
    if (actor.countyIds.length > 0 && !actor.countyIds.includes(countyCode)) {
      throw new ForbiddenException('Access to this case is restricted to your county');
    }
  }
}
