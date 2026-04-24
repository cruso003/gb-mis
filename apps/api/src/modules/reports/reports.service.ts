import { prisma } from '@gb-mis/db';
import { INDICATOR_CATALOG } from '@gb-mis/indicators';
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';

import type { AuthenticatedUser } from '../../common/types/authenticated-user';

const K = Number(process.env['K_ANONYMITY_THRESHOLD'] ?? 5);

function suppress<T extends { _count: number }>(rows: T[]) {
  return rows.map((r) => ({ ...r, _count: r._count < K ? null : r._count }));
}

@Injectable()
export class ReportsService {
  async casesSummary(
    actor: AuthenticatedUser,
    params: { orgUnitId?: string; periodFrom?: string; periodTo?: string },
  ) {
    const { orgUnitId, periodFrom, periodTo } = params;
    const where = this.buildCaseWhere(actor, { orgUnitId, periodFrom, periodTo });

    const [total, byStatus, byPriority] = await Promise.all([
      prisma.gbvCase.count({ where }),
      prisma.gbvCase.groupBy({ by: ['status'], where, _count: true }),
      prisma.gbvCase.groupBy({ by: ['priority'], where, _count: true }),
    ]);

    return {
      total: total < K ? null : total,
      byStatus: suppress(byStatus),
      byPriority: suppress(byPriority),
    };
  }

  async beneficiarySummary(
    actor: AuthenticatedUser,
    params: { orgUnitId?: string },
  ) {
    const { orgUnitId } = params;
    const where = this.buildBeneficiaryWhere(actor, orgUnitId);

    const [total, bySex, byStatus] = await Promise.all([
      prisma.beneficiary.count({ where }),
      prisma.beneficiary.groupBy({ by: ['sex'], where, _count: true }),
      prisma.beneficiary.groupBy({ by: ['status'], where, _count: true }),
    ]);

    return {
      total: total < K ? null : total,
      bySex: suppress(bySex),
      byStatus: suppress(byStatus),
    };
  }

  // ─── Report templates ───────────────────────────────────────────────────────

  async monthlyCountyReport(
    actor: AuthenticatedUser,
    params: { orgUnitId: string; year: number; month: number },
  ) {
    const { orgUnitId, year, month } = params;

    const orgUnit = await prisma.orgUnit.findUnique({
      where: { id: orgUnitId },
      select: { id: true, name: true, code: true },
    });
    if (!orgUnit) throw new NotFoundException(`OrgUnit ${orgUnitId} not found`);

    if (
      !actor.roles.includes('SUPER_ADMIN') &&
      !actor.roles.includes('ADMIN') &&
      actor.orgUnitIds.length > 0 &&
      !actor.orgUnitIds.includes(orgUnitId)
    ) {
      throw new BadRequestException('Access to this org unit is restricted');
    }

    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59);

    // Closed statuses per the CaseStatus enum.
    const closedStatuses = ['CLOSED_SUCCESSFUL', 'CLOSED_LOST_CONTACT', 'CLOSED_WITHDRAWN'] as const;
    // Active (non-closed) statuses.
    const activeStatuses = ['OPEN', 'IN_SERVICE', 'REFERRED'] as const;

    const [
      casesNew,
      casesClosed,
      casesOpen,
      beneficiariesEnrolled,
      beneficiariesActive,
      sessions,
      vslaGroups,
      indicatorValues,
    ] = await Promise.all([
      prisma.gbvCase.count({
        where: { orgUnitId, createdAt: { gte: periodStart, lte: periodEnd } },
      }),
      prisma.gbvCase.count({
        where: {
          orgUnitId,
          status: { in: [...closedStatuses] },
          updatedAt: { gte: periodStart, lte: periodEnd },
        },
      }),
      prisma.gbvCase.count({
        where: { orgUnitId, status: { in: [...activeStatuses] } },
      }),
      prisma.beneficiary.count({
        where: { orgUnitId, createdAt: { gte: periodStart, lte: periodEnd } },
      }),
      prisma.beneficiary.count({ where: { orgUnitId, status: 'ACTIVE' } }),
      prisma.communitySession.findMany({
        where: { orgUnitId, heldAt: { gte: periodStart, lte: periodEnd } },
        select: {
          id: true,
          type: true,
          _count: { select: { attendees: true } },
        },
      }),
      prisma.vslaGroup.findMany({
        where: { orgUnitId, deletedAt: null },
        select: { id: true, _count: { select: { members: true } } },
      }),
      prisma.indicatorValue.findMany({
        where: {
          orgUnitId,
          periodStart: { lte: periodEnd },
          periodEnd: { gte: periodStart },
          qualityFlag: { in: ['VERIFIED', 'PROVISIONAL'] },
        },
        include: { indicator: { select: { code: true, name: true, unit: true } } },
      }),
    ]);

    const sessionsByType = sessions.reduce<Record<string, number>>((acc, s) => {
      acc[s.type] = (acc[s.type] ?? 0) + 1;
      return acc;
    }, {});

    const totalVslaMembers = vslaGroups.reduce((sum, g) => sum + g._count.members, 0);
    const totalAttendees = sessions.reduce((sum, s) => sum + s._count.attendees, 0);

    return {
      reportType: 'MONTHLY_COUNTY',
      county: { id: orgUnit.id, name: orgUnit.name, code: orgUnit.code },
      period: { year, month },
      generatedAt: new Date().toISOString(),
      cases: {
        newThisMonth: casesNew < K ? null : casesNew,
        closedThisMonth: casesClosed < K ? null : casesClosed,
        openAtEndOfMonth: casesOpen < K ? null : casesOpen,
      },
      beneficiaries: {
        enrolledThisMonth: beneficiariesEnrolled < K ? null : beneficiariesEnrolled,
        activeTotal: beneficiariesActive < K ? null : beneficiariesActive,
      },
      sessions: {
        total: sessions.length,
        byType: sessionsByType,
        totalAttendees,
      },
      vsla: {
        activeGroups: vslaGroups.length,
        totalMembers: totalVslaMembers < K ? null : totalVslaMembers,
      },
      indicators: indicatorValues.map((iv) => ({
        code: iv.indicator.code,
        name: iv.indicator.name,
        unit: iv.indicator.unit,
        value: Number(iv.value),
        qualityFlag: iv.qualityFlag,
        periodStart: iv.periodStart,
        periodEnd: iv.periodEnd,
      })),
    };
  }

  async quarterlyLwepReport(
    actor: AuthenticatedUser,
    params: { year: number; quarter: 1 | 2 | 3 | 4 },
  ) {
    if (!actor.roles.includes('SUPER_ADMIN') && !actor.roles.includes('ADMIN') && !actor.roles.includes('ANALYST')) {
      throw new BadRequestException('Quarterly LWEP report requires ADMIN or ANALYST role');
    }

    const { year, quarter } = params;
    const qStart = new Date(year, (quarter - 1) * 3, 1);
    const qEnd = new Date(year, quarter * 3, 0, 23, 59, 59);

    const lwepIndicatorCodes = ['LWEP-OUT-C1-01', 'LWEP-OUT-C3-01', 'LWEP-OUT-C5-01'];

    const [
      casesTotal,
      casesByStatus,
      referrals,
      beneficiariesTotal,
      beneficiariesBySex,
      sessionsByType,
      lwepValues,
      lwepTargets,
    ] = await Promise.all([
      prisma.gbvCase.count({
        where: { createdAt: { gte: qStart, lte: qEnd } },
      }),
      prisma.gbvCase.groupBy({
        by: ['status'],
        where: { createdAt: { gte: qStart, lte: qEnd } },
        _count: true,
      }),
      prisma.referral.count({
        where: { referredAt: { gte: qStart, lte: qEnd } },
      }),
      prisma.beneficiary.count({ where: { status: 'ACTIVE' } }),
      prisma.beneficiary.groupBy({ by: ['sex'], where: { status: 'ACTIVE' }, _count: true }),
      prisma.communitySession.groupBy({
        by: ['type'],
        where: { heldAt: { gte: qStart, lte: qEnd } },
        _count: true,
      }),
      prisma.indicatorValue.findMany({
        where: {
          indicator: { code: { in: lwepIndicatorCodes } },
          periodStart: { lte: qEnd },
          periodEnd: { gte: qStart },
        },
        include: {
          indicator: { select: { code: true, name: true, unit: true } },
          orgUnit: { select: { code: true, name: true } },
        },
      }),
      prisma.indicatorTarget.findMany({
        where: {
          indicator: { code: { in: lwepIndicatorCodes } },
          targetYear: year,
        },
        include: { indicator: { select: { code: true } } },
      }),
    ]);

    const targetsByCode = new Map(
      lwepTargets.map((t) => [t.indicator.code, Number(t.targetValue)] as [string, number]),
    );

    return {
      reportType: 'QUARTERLY_LWEP',
      period: { year, quarter, start: qStart, end: qEnd },
      generatedAt: new Date().toISOString(),
      lwepOutputIndicators: lwepValues.map((iv) => ({
        code: iv.indicator.code,
        name: iv.indicator.name,
        unit: iv.indicator.unit,
        value: Number(iv.value),
        target: targetsByCode.get(iv.indicator.code) ?? null,
        county: iv.orgUnit.name,
        qualityFlag: iv.qualityFlag,
      })),
      caseManagement: {
        newCases: casesTotal < K ? null : casesTotal,
        byStatus: suppress(casesByStatus),
        referrals: referrals < K ? null : referrals,
      },
      beneficiaries: {
        activeTotal: beneficiariesTotal < K ? null : beneficiariesTotal,
        bySex: suppress(beneficiariesBySex),
      },
      communityEngagement: {
        sessionsByType: sessionsByType.map((s: { type: string; _count: number }) => ({
          type: s.type,
          count: s._count < K ? null : s._count,
        })),
      },
    };
  }

  async annualCedawReport(
    actor: AuthenticatedUser,
    params: { year: number },
  ) {
    if (!actor.roles.includes('SUPER_ADMIN') && !actor.roles.includes('ADMIN') && !actor.roles.includes('ANALYST')) {
      throw new BadRequestException('Annual CEDAW report requires ADMIN or ANALYST role');
    }

    const { year } = params;
    const periodStart = new Date(year, 0, 1);
    const periodEnd = new Date(year, 11, 31, 23, 59, 59);

    // CEDAW-relevant indicator codes from the catalog.
    const cedawCodes = [...INDICATOR_CATALOG.entries()]
      .filter(([, meta]) => meta.framework === 'CEDAW' || meta.framework === 'BPFA')
      .map(([code]) => code);

    const [indicatorValues, secondaryDataPoints] = await Promise.all([
      prisma.indicatorValue.findMany({
        where: {
          indicator: { code: { in: cedawCodes } },
          periodStart: { lte: periodEnd },
          periodEnd: { gte: periodStart },
          qualityFlag: { in: ['VERIFIED', 'PROVISIONAL'] },
        },
        include: {
          indicator: { select: { code: true, name: true, unit: true, framework: true } },
          orgUnit: { select: { code: true, name: true } },
        },
        orderBy: [{ indicator: { code: 'asc' } }, { orgUnit: { code: 'asc' } }],
      }),
      prisma.secondaryDataPoint.findMany({
        where: {
          indicator: { code: { in: cedawCodes } },
          periodStart: { lte: periodEnd },
          periodEnd: { gte: periodStart },
          qualityFlag: { in: ['VERIFIED'] },
        },
        include: {
          indicator: { select: { code: true, name: true, unit: true } },
          orgUnit: { select: { code: true, name: true } },
          dataset: { select: { name: true, sourceAgency: true } },
        },
        orderBy: [{ indicator: { code: 'asc' } }],
      }),
    ]);

    return {
      reportType: 'ANNUAL_CEDAW',
      year,
      generatedAt: new Date().toISOString(),
      systemIndicators: indicatorValues.map((iv: typeof indicatorValues[number]) => ({
        code: iv.indicator.code,
        name: iv.indicator.name,
        framework: iv.indicator.framework,
        unit: iv.indicator.unit,
        value: Number(iv.value),
        county: iv.orgUnit.name,
        qualityFlag: iv.qualityFlag,
        periodStart: iv.periodStart,
        periodEnd: iv.periodEnd,
        source: 'SYSTEM',
      })),
      secondaryDataIndicators: secondaryDataPoints.map((dp: typeof secondaryDataPoints[number]) => ({
        code: dp.indicator?.code ?? null,
        name: dp.indicator?.name ?? dp.variable,
        unit: null,
        value: dp.value,
        county: dp.orgUnit.name,
        source: dp.dataset.sourceAgency,
        dataset: dp.dataset.name,
        periodStart: dp.periodStart,
        periodEnd: dp.periodEnd,
        disaggregations: dp.disaggregations,
      })),
      note: 'Values marked UNVERIFIED are excluded from this report. Review and verify indicator values before submitting to the CEDAW committee.',
    };
  }

  async generateExport(
    type: 'indicators_csv' | 'cases_aggregate' | 'beneficiaries_aggregate' | 'monthly_county' | 'quarterly_lwep' | 'annual_cedaw',
    actor: AuthenticatedUser,
  ) {
    if (!actor.roles.includes('ADMIN') && !actor.roles.includes('SUPER_ADMIN') && !actor.roles.includes('ANALYST')) {
      throw new BadRequestException('Report export requires ADMIN or ANALYST role');
    }
    return {
      jobId: `export-${Date.now()}`,
      type,
      status: 'queued',
      message: 'Export enqueued — poll /reports/exports/{jobId} for status',
    };
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private buildCaseWhere(
    actor: AuthenticatedUser,
    params: { orgUnitId: string | undefined; periodFrom: string | undefined; periodTo: string | undefined },
  ) {
    const { orgUnitId, periodFrom, periodTo } = params;
    const where: Record<string, unknown> = {};

    if (!actor.roles.includes('SUPER_ADMIN') && !actor.roles.includes('ADMIN')) {
      if (actor.orgUnitIds.length > 0) where['orgUnitId'] = { in: actor.orgUnitIds };
    } else if (orgUnitId) {
      where['orgUnitId'] = orgUnitId;
    }

    if (periodFrom || periodTo) {
      const createdAt: Record<string, unknown> = {};
      if (periodFrom) createdAt['gte'] = new Date(periodFrom);
      if (periodTo) createdAt['lte'] = new Date(periodTo);
      where['createdAt'] = createdAt;
    }
    return where;
  }

  private buildBeneficiaryWhere(actor: AuthenticatedUser, orgUnitId: string | undefined) {
    const where: Record<string, unknown> = {};
    if (!actor.roles.includes('SUPER_ADMIN') && !actor.roles.includes('ADMIN')) {
      if (actor.orgUnitIds.length > 0) where['orgUnitId'] = { in: actor.orgUnitIds };
    } else if (orgUnitId) {
      where['orgUnitId'] = orgUnitId;
    }
    return where;
  }
}
