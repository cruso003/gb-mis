import { prisma, encrypt, searchHash } from '@gb-mis/db';
import type { Paginated } from '@gb-mis/types';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';

import type { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import type { RecordGrantDto } from './dto/record-grant.dto';

@Injectable()
export class BeneficiariesService {
  async findAll(
    actor: AuthenticatedUser,
    params: { page: number; limit: number; search?: string },
  ): Promise<Paginated<{ id: string; beneficiaryCode: string; status: string; orgUnitId: string }>> {
    const { page, limit, search } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (!actor.roles.includes('SUPER_ADMIN') && !actor.roles.includes('ADMIN')) {
      if (actor.orgUnitIds.length > 0) {
        where['orgUnitId'] = { in: actor.orgUnitIds };
      }
    }

    if (search) {
      const hash = await searchHash(search);
      where['nationalIdSearchHash'] = hash;
    }

    const [items, total] = await Promise.all([
      prisma.beneficiary.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          beneficiaryCode: true,
          status: true,
          orgUnitId: true,
          sex: true,
          disabilityStatuses: true,
          enrollmentSource: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.beneficiary.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const beneficiary = await prisma.beneficiary.findUnique({
      where: { id },
      include: {
        orgUnit: { select: { id: true, name: true, code: true } },
        cases: { select: { id: true, status: true, priority: true, createdAt: true } },
        householdMemberships: true,
        vslaMembers: { include: { vslaGroup: true } },
        livelihoodGrants: true,
        consentRecord: true,
      },
    });

    if (!beneficiary) throw new NotFoundException(`Beneficiary ${id} not found`);
    this.assertOrgUnitAccess(actor, beneficiary.orgUnitId);

    return beneficiary;
  }

  async create(dto: CreateBeneficiaryDto, actor: AuthenticatedUser): Promise<{ id: string; beneficiaryCode: string }> {
    const [fullNameEncrypted, nationalIdEncrypted, nationalIdSearchHash] =
      await Promise.all([
        encrypt(dto.fullName),
        dto.nationalId ? encrypt(dto.nationalId) : Promise.resolve(undefined),
        dto.nationalId ? searchHash(dto.nationalId) : Promise.resolve(undefined),
      ]);

    const beneficiaryCode = await this.generateBeneficiaryCode(dto.orgUnitId);
    const consentId = crypto.randomUUID();

    const beneficiary = await prisma.beneficiary.create({
      data: {
        beneficiaryCode,
        fullNameEncrypted,
        ...(nationalIdEncrypted !== undefined && { nationalIdEncrypted }),
        ...(nationalIdSearchHash !== undefined && { nationalIdSearchHash }),
        sex: dto.sex,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : new Date('1900-01-01'),
        disabilityStatuses: [dto.disabilityStatus],
        orgUnitId: dto.orgUnitId,
        enrollmentSource: dto.enrollmentSource,
        createdById: actor.id,
        updatedById: actor.id,
        consentRecordId: consentId,
      },
      select: { id: true, beneficiaryCode: true },
    });

    await prisma.consentRecord.create({
      data: {
        id: consentId,
        beneficiaryId: beneficiary.id,
        scopes: [dto.consentScope],
        grantedAt: new Date(dto.consentGivenAt),
      },
    });

    return beneficiary;
  }

  async listGrants(beneficiaryId: string, actor: AuthenticatedUser) {
    const beneficiary = await this.findOne(beneficiaryId, actor);
    return prisma.livelihoodGrant.findMany({
      where: { beneficiaryId: beneficiary.id },
      orderBy: { disbursedAt: 'desc' },
    });
  }

  async recordGrant(beneficiaryId: string, dto: RecordGrantDto, actor: AuthenticatedUser) {
    const beneficiary = await this.findOne(beneficiaryId, actor);

    return prisma.livelihoodGrant.create({
      data: {
        beneficiaryId: beneficiary.id,
        grantCycle: dto.grantCycle,
        amountLrd: dto.amountLrd,
        amountUsd: dto.amountUsd,
        disbursedAt: new Date(dto.disbursedAt),
        status: 'DISBURSED',
        createdById: actor.id,
        ...(dto.partnerFintechTxnRef !== undefined && {
          partnerFintechTxnRef: dto.partnerFintechTxnRef,
        }),
      },
    });
  }

  async withdraw(id: string, _reason: string, actor: AuthenticatedUser) {
    const beneficiary = await this.findOne(id, actor);

    return prisma.beneficiary.update({
      where: { id: beneficiary.id },
      data: { status: 'WITHDRAWN' },
    });
  }

  private assertOrgUnitAccess(actor: AuthenticatedUser, orgUnitId: string) {
    if (actor.roles.includes('SUPER_ADMIN') || actor.roles.includes('ADMIN')) return;
    if (actor.orgUnitIds.length > 0 && !actor.orgUnitIds.includes(orgUnitId)) {
      throw new ForbiddenException('Access to this beneficiary is restricted to your assigned org units');
    }
  }

  private async generateBeneficiaryCode(orgUnitId: string): Promise<string> {
    const orgUnit = await prisma.orgUnit.findUnique({
      where: { id: orgUnitId },
      select: { code: true },
    });
    const prefix = orgUnit?.code ?? 'XX';
    const count = await prisma.beneficiary.count({ where: { orgUnitId } });
    return `${prefix}-${String(count + 1).padStart(5, '0')}`;
  }
}
