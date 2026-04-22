import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma, encrypt, searchHash } from '@gb-mis/db';
import type { Paginated } from '@gb-mis/types';
import type { Prisma } from '@gb-mis/db';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import type { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';

@Injectable()
export class BeneficiariesService {
  async findAll(
    actor: AuthenticatedUser,
    params: { page: number; limit: number; search?: string },
  ): Promise<Paginated<{ id: string; displayCode: string; status: string; orgUnitId: string }>> {
    const { page, limit, search } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.BeneficiaryWhereInput = {};

    if (!actor.roles.includes('SUPER_ADMIN') && !actor.roles.includes('ADMIN')) {
      where['orgUnit'] = { countyCode: { in: actor.countyIds } };
    }

    // PII search uses HMAC search hash — never plaintext scan
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
          displayCode: true,
          status: true,
          orgUnitId: true,
          sex: true,
          disabilityStatus: true,
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
        orgUnit: { select: { id: true, name: true, countyCode: true } },
        cases: { select: { id: true, status: true, priority: true, createdAt: true } },
        householdMembers: true,
        vslaGroups: { include: { vslaGroup: true } },
        grants: true,
        consentRecords: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!beneficiary) throw new NotFoundException(`Beneficiary ${id} not found`);
    this.assertCountyAccess(actor, beneficiary.orgUnit?.countyCode);

    return beneficiary;
  }

  async create(dto: CreateBeneficiaryDto, actor: AuthenticatedUser): Promise<{ id: string; displayCode: string }> {
    const [fullNameEncrypted, nationalIdEncrypted, nationalIdSearchHash, emailEncrypted] =
      await Promise.all([
        encrypt(dto.fullName),
        dto.nationalId ? encrypt(dto.nationalId) : Promise.resolve(undefined),
        dto.nationalId ? searchHash(dto.nationalId) : Promise.resolve(undefined),
        dto.email ? encrypt(dto.email) : Promise.resolve(undefined),
      ]);

    const displayCode = await this.generateDisplayCode(dto.orgUnitId);

    const beneficiary = await prisma.beneficiary.create({
      data: {
        displayCode,
        fullNameEncrypted,
        nationalIdEncrypted,
        nationalIdSearchHash,
        emailEncrypted,
        sex: dto.sex,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        disabilityStatus: dto.disabilityStatus,
        orgUnitId: dto.orgUnitId,
        enrollmentSource: dto.enrollmentSource,
        registeredById: actor.id,
        consentRecords: {
          create: {
            scope: dto.consentScope,
            givenAt: new Date(dto.consentGivenAt),
            witnessId: dto.consentWitnessId,
            recordedById: actor.id,
          },
        },
      },
      select: { id: true, displayCode: true },
    });

    return beneficiary;
  }

  async withdraw(id: string, reason: string, actor: AuthenticatedUser) {
    const beneficiary = await this.findOne(id, actor);

    return prisma.$transaction([
      prisma.beneficiary.update({
        where: { id: beneficiary.id },
        data: { status: 'WITHDRAWN' },
      }),
      prisma.consentRecord.create({
        data: {
          beneficiaryId: beneficiary.id,
          scope: 'NONE',
          givenAt: new Date(),
          isWithdrawal: true,
          withdrawalReason: reason,
          recordedById: actor.id,
        },
      }),
    ]);
  }

  private assertCountyAccess(actor: AuthenticatedUser, countyCode?: string | null) {
    if (actor.roles.includes('SUPER_ADMIN') || actor.roles.includes('ADMIN')) return;
    if (!countyCode) return;
    if (actor.countyIds.length > 0 && !actor.countyIds.includes(countyCode)) {
      throw new ForbiddenException('Access to this beneficiary is restricted to your county');
    }
  }

  private async generateDisplayCode(orgUnitId: string): Promise<string> {
    const orgUnit = await prisma.orgUnit.findUnique({
      where: { id: orgUnitId },
      select: { code: true },
    });
    const prefix = orgUnit?.code ?? 'XX';
    const count = await prisma.beneficiary.count({ where: { orgUnitId } });
    return `${prefix}-${String(count + 1).padStart(5, '0')}`;
  }
}
