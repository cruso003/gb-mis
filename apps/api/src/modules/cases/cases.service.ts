import { prisma } from '@gb-mis/db';
import type { Paginated } from '@gb-mis/types';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';

import type { AddServiceDto } from './dto/add-service.dto';
import type { CreateCaseDto } from './dto/create-case.dto';
import type { CreateReferralDto } from './dto/create-referral.dto';
import type { ApproveCaseDto, ReturnCaseDto } from './dto/review-case.dto';

/**
 * Statuses that mean "this case is waiting on a supervisor decision". The
 * review queue surfaces only PENDING_REVIEW; RETURNED_FOR_REVISION is
 * displayed on the case worker's queue, not the supervisor's.
 */
const REVIEWABLE_STATUSES = ['PENDING_REVIEW'] as const;

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
          reviewer: { select: { id: true, displayName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.gbvCase.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Supervisor review queue: PENDING_REVIEW cases inside the supervisor's
   * org-unit scope. Sorted oldest-first so the longest-waiting survivors
   * are surfaced before the newest intakes.
   */
  async reviewQueue(
    actor: AuthenticatedUser,
    params: { page: number; limit: number },
  ): Promise<Paginated<Record<string, unknown>>> {
    const { page, limit } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { status: { in: [...REVIEWABLE_STATUSES] } };

    // Supervisors see only their county scope. ADMIN / SUPER_ADMIN see all.
    if (
      actor.orgUnitIds.length > 0 &&
      !actor.roles.includes('SUPER_ADMIN') &&
      !actor.roles.includes('ADMIN')
    ) {
      where['orgUnitId'] = { in: actor.orgUnitIds };
    }

    const [items, total] = await Promise.all([
      prisma.gbvCase.findMany({
        where,
        skip,
        take: limit,
        include: {
          orgUnit: { select: { id: true, name: true, code: true } },
          intakedBy: { select: { id: true, displayName: true } },
        },
        orderBy: { submittedForReviewAt: 'asc' },
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
        reviewer: { select: { id: true, displayName: true } },
        intakedBy: { select: { id: true, displayName: true } },
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

    // New cases always enter the supervisor-review queue. The case worker
    // does NOT decide whether to skip review; the workflow is mandatory.
    return prisma.gbvCase.create({
      data: {
        caseNumber,
        ...(dto.beneficiaryId !== undefined && { survivorId: dto.beneficiaryId }),
        orgUnitId: dto.orgUnitId,
        intakeChannel: dto.intakeChannel,
        priority: dto.priority,
        intakeDate: new Date(),
        intakeByUserId: actor.id,
        status: 'PENDING_REVIEW',
        submittedForReviewAt: new Date(),
        ...(incidentData !== undefined && { incidents: incidentData }),
      },
      include: { survivor: true, orgUnit: true },
    });
  }

  /**
   * Resubmit a case that the supervisor returned for revision. Only the
   * original case worker (or their supervisor / admin) may resubmit; this
   * prevents an idle data-entry clerk from clearing a returned case
   * without addressing the notes.
   */
  async resubmitForReview(caseId: string, actor: AuthenticatedUser) {
    const gbvCase = await this.findOne(caseId, actor);

    if (gbvCase.status !== 'RETURNED_FOR_REVISION') {
      throw new BadRequestException(
        `Only cases in RETURNED_FOR_REVISION may be resubmitted (current: ${gbvCase.status})`,
      );
    }

    return prisma.gbvCase.update({
      where: { id: gbvCase.id },
      data: {
        status: 'PENDING_REVIEW',
        submittedForReviewAt: new Date(),
      },
      include: { survivor: true, orgUnit: true, reviewer: true },
    });
  }

  async addService(caseId: string, dto: AddServiceDto, actor: AuthenticatedUser) {
    const gbvCase = await this.findOne(caseId, actor);

    // Block service entry on cases still waiting for supervisor approval.
    // The whole point of the review gate is that the case worker doesn't
    // operate on unapproved intake records.
    if (
      gbvCase.status === 'PENDING_REVIEW' ||
      gbvCase.status === 'RETURNED_FOR_REVISION'
    ) {
      throw new BadRequestException(
        'Cannot record services on a case awaiting supervisor review',
      );
    }

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

    if (
      gbvCase.status === 'PENDING_REVIEW' ||
      gbvCase.status === 'RETURNED_FOR_REVISION'
    ) {
      throw new BadRequestException(
        'Cannot create referrals on a case awaiting supervisor review',
      );
    }

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

  /**
   * Supervisor approves a PENDING_REVIEW case. Moves it to OPEN, where
   * the case worker can begin recording services and referrals. Notes
   * are optional; an approval with no concerns is the common case.
   */
  async approve(caseId: string, dto: ApproveCaseDto, actor: AuthenticatedUser) {
    const gbvCase = await this.assertReviewable(caseId, actor);
    return prisma.gbvCase.update({
      where: { id: gbvCase.id },
      data: {
        status: 'OPEN',
        reviewerId: actor.id,
        reviewNotes: dto.notes ?? null,
        supervisorReviewedAt: new Date(),
        reviewCount: { increment: 1 },
      },
      include: { survivor: true, orgUnit: true, reviewer: true },
    });
  }

  /**
   * Supervisor returns a PENDING_REVIEW case for revision. Notes are
   * required (enforced upstream by ReturnCaseSchema) so the case worker
   * has something to act on.
   */
  async returnForRevision(caseId: string, dto: ReturnCaseDto, actor: AuthenticatedUser) {
    const gbvCase = await this.assertReviewable(caseId, actor);
    return prisma.gbvCase.update({
      where: { id: gbvCase.id },
      data: {
        status: 'RETURNED_FOR_REVISION',
        reviewerId: actor.id,
        reviewNotes: dto.notes,
        supervisorReviewedAt: new Date(),
        reviewCount: { increment: 1 },
      },
      include: { survivor: true, orgUnit: true, reviewer: true },
    });
  }

  /**
   * Shared gate for approve / return: the actor is a supervisor or
   * higher, the case is currently PENDING_REVIEW, and (two-eyes) the
   * reviewer is not the same person who entered the case. The last
   * rule is the entire point of having a review workflow.
   */
  private async assertReviewable(caseId: string, actor: AuthenticatedUser) {
    if (
      !actor.roles.includes('SUPERVISOR') &&
      !actor.roles.includes('ADMIN') &&
      !actor.roles.includes('SUPER_ADMIN')
    ) {
      throw new ForbiddenException('Only supervisors may review cases');
    }
    const gbvCase = await this.findOne(caseId, actor);
    if (gbvCase.status !== 'PENDING_REVIEW') {
      throw new BadRequestException(
        `Only PENDING_REVIEW cases may be reviewed (current: ${gbvCase.status})`,
      );
    }
    if (gbvCase.intakeByUserId === actor.id) {
      throw new ForbiddenException(
        'You entered this case; another supervisor must review it',
      );
    }
    return gbvCase;
  }

  async close(caseId: string, reason: string, actor: AuthenticatedUser) {
    const gbvCase = await this.findOne(caseId, actor);

    if (
      gbvCase.status === 'PENDING_REVIEW' ||
      gbvCase.status === 'RETURNED_FOR_REVISION'
    ) {
      throw new BadRequestException(
        'A case awaiting review cannot be closed — withdraw the intake instead via the supervisor return path',
      );
    }

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
