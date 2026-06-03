/**
 * Supervisor review workflow tests.
 *
 * Locks in the TOR-explicit "supervisor review workflow for counties"
 * (closes hardening-checklist B6). The two-eyes principle — a supervisor
 * may not approve a case they themselves entered — is the most
 * important invariant; if that ever regresses the workflow is
 * meaningless. The other rules are guardrails around it.
 */

import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { gbvCaseFindUnique, gbvCaseUpdate, gbvCaseCreate, serviceProvidedCreate } =
  vi.hoisted(() => ({
    gbvCaseFindUnique: vi.fn(),
    gbvCaseUpdate: vi.fn(),
    gbvCaseCreate: vi.fn(),
    serviceProvidedCreate: vi.fn(),
  }));

vi.mock('@gb-mis/db', () => ({
  prisma: {
    gbvCase: {
      findUnique: gbvCaseFindUnique,
      update: gbvCaseUpdate,
      create: gbvCaseCreate,
    },
    serviceProvided: { create: serviceProvidedCreate },
  },
}));

// Imported after the mock so the service binds to the mocked prisma.
// eslint-disable-next-line import/order
import { CasesService } from './cases.service';

const SUPERVISOR_BOMI = {
  id: 'supervisor-uuid',
  keycloakSubject: 'sub-supervisor',
  displayName: 'Supervisor Bomi',
  roles: ['SUPERVISOR'] as never,
  permissions: new Set<never>(),
  orgUnitIds: ['orgunit-bomi'],
  countyIds: ['orgunit-bomi'],
};

const CASE_WORKER_BOMI = {
  id: 'caseworker-uuid',
  keycloakSubject: 'sub-caseworker',
  displayName: 'Case Worker Bomi',
  roles: ['CASE_WORKER'] as never,
  permissions: new Set<never>(),
  orgUnitIds: ['orgunit-bomi'],
  countyIds: ['orgunit-bomi'],
};

const PENDING_CASE = {
  id: 'case-uuid',
  caseNumber: 'CASE-2026-X',
  orgUnitId: 'orgunit-bomi',
  status: 'PENDING_REVIEW',
  intakeByUserId: CASE_WORKER_BOMI.id,
  reviewCount: 0,
};

beforeEach(() => {
  gbvCaseFindUnique.mockReset();
  gbvCaseUpdate.mockReset();
  gbvCaseCreate.mockReset();
  serviceProvidedCreate.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('CasesService.create', () => {
  it('forces every new case into PENDING_REVIEW with a submittedForReviewAt timestamp', async () => {
    gbvCaseCreate.mockResolvedValue({ id: 'new-case', status: 'PENDING_REVIEW' });
    const svc = new CasesService();
    await svc.create(
      {
        orgUnitId: 'orgunit-bomi',
        intakeChannel: 'COMMUNITY' as never,
        priority: 'ROUTINE' as never,
      } as never,
      CASE_WORKER_BOMI,
    );
    expect(gbvCaseCreate).toHaveBeenCalledTimes(1);
    const args = gbvCaseCreate.mock.calls[0]?.[0];
    expect(args?.data?.status).toBe('PENDING_REVIEW');
    expect(args?.data?.submittedForReviewAt).toBeInstanceOf(Date);
    expect(args?.data?.intakeByUserId).toBe(CASE_WORKER_BOMI.id);
  });
});

describe('CasesService.approve', () => {
  it('moves PENDING_REVIEW → OPEN, increments reviewCount, records reviewer', async () => {
    gbvCaseFindUnique.mockResolvedValue(PENDING_CASE);
    gbvCaseUpdate.mockResolvedValue({ ...PENDING_CASE, status: 'OPEN' });
    const svc = new CasesService();
    await svc.approve('case-uuid', { notes: 'looks good' }, SUPERVISOR_BOMI);
    const args = gbvCaseUpdate.mock.calls[0]?.[0];
    expect(args?.data?.status).toBe('OPEN');
    expect(args?.data?.reviewerId).toBe(SUPERVISOR_BOMI.id);
    expect(args?.data?.reviewNotes).toBe('looks good');
    expect(args?.data?.reviewCount).toEqual({ increment: 1 });
  });

  it('REJECTS approval by the same person who entered the case (two-eyes)', async () => {
    gbvCaseFindUnique.mockResolvedValue({
      ...PENDING_CASE,
      // Imagine the case worker has somehow obtained SUPERVISOR role too.
      intakeByUserId: SUPERVISOR_BOMI.id,
    });
    const svc = new CasesService();
    await expect(svc.approve('case-uuid', {}, SUPERVISOR_BOMI)).rejects.toThrow(
      ForbiddenException,
    );
    expect(gbvCaseUpdate).not.toHaveBeenCalled();
  });

  it('REJECTS approval by a non-supervisor role', async () => {
    gbvCaseFindUnique.mockResolvedValue(PENDING_CASE);
    const svc = new CasesService();
    await expect(svc.approve('case-uuid', {}, CASE_WORKER_BOMI)).rejects.toThrow(
      ForbiddenException,
    );
    expect(gbvCaseUpdate).not.toHaveBeenCalled();
  });

  it('REJECTS approval of a case that is not in PENDING_REVIEW', async () => {
    gbvCaseFindUnique.mockResolvedValue({ ...PENDING_CASE, status: 'OPEN' });
    const svc = new CasesService();
    await expect(svc.approve('case-uuid', {}, SUPERVISOR_BOMI)).rejects.toThrow(
      BadRequestException,
    );
    expect(gbvCaseUpdate).not.toHaveBeenCalled();
  });
});

describe('CasesService.returnForRevision', () => {
  it('moves PENDING_REVIEW → RETURNED_FOR_REVISION, persists notes', async () => {
    gbvCaseFindUnique.mockResolvedValue(PENDING_CASE);
    gbvCaseUpdate.mockResolvedValue({});
    const svc = new CasesService();
    await svc.returnForRevision('case-uuid', { notes: 'incident date missing' }, SUPERVISOR_BOMI);
    const args = gbvCaseUpdate.mock.calls[0]?.[0];
    expect(args?.data?.status).toBe('RETURNED_FOR_REVISION');
    expect(args?.data?.reviewNotes).toBe('incident date missing');
  });

  it('REJECTS return by the same person who entered the case (two-eyes)', async () => {
    gbvCaseFindUnique.mockResolvedValue({ ...PENDING_CASE, intakeByUserId: SUPERVISOR_BOMI.id });
    const svc = new CasesService();
    await expect(
      svc.returnForRevision('case-uuid', { notes: 'x' }, SUPERVISOR_BOMI),
    ).rejects.toThrow(ForbiddenException);
  });
});

describe('CasesService.resubmitForReview', () => {
  it('moves RETURNED_FOR_REVISION → PENDING_REVIEW with fresh submittedForReviewAt', async () => {
    gbvCaseFindUnique.mockResolvedValue({
      ...PENDING_CASE,
      status: 'RETURNED_FOR_REVISION',
    });
    gbvCaseUpdate.mockResolvedValue({});
    const svc = new CasesService();
    await svc.resubmitForReview('case-uuid', CASE_WORKER_BOMI);
    const args = gbvCaseUpdate.mock.calls[0]?.[0];
    expect(args?.data?.status).toBe('PENDING_REVIEW');
    expect(args?.data?.submittedForReviewAt).toBeInstanceOf(Date);
  });

  it('REJECTS resubmit of a case that is not RETURNED_FOR_REVISION', async () => {
    gbvCaseFindUnique.mockResolvedValue(PENDING_CASE);
    const svc = new CasesService();
    await expect(svc.resubmitForReview('case-uuid', CASE_WORKER_BOMI)).rejects.toThrow(
      BadRequestException,
    );
  });
});

describe('CasesService.addService — review gate', () => {
  it('BLOCKS service entry while the case is in PENDING_REVIEW', async () => {
    gbvCaseFindUnique.mockResolvedValue(PENDING_CASE);
    const svc = new CasesService();
    await expect(
      svc.addService(
        'case-uuid',
        { serviceType: 'MEDICAL', providedAt: new Date().toISOString() } as never,
        CASE_WORKER_BOMI,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(serviceProvidedCreate).not.toHaveBeenCalled();
  });

  it('BLOCKS service entry while the case is in RETURNED_FOR_REVISION', async () => {
    gbvCaseFindUnique.mockResolvedValue({ ...PENDING_CASE, status: 'RETURNED_FOR_REVISION' });
    const svc = new CasesService();
    await expect(
      svc.addService(
        'case-uuid',
        { serviceType: 'MEDICAL', providedAt: new Date().toISOString() } as never,
        CASE_WORKER_BOMI,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('ALLOWS service entry once the case is OPEN', async () => {
    gbvCaseFindUnique.mockResolvedValue({ ...PENDING_CASE, status: 'OPEN' });
    serviceProvidedCreate.mockResolvedValue({});
    const svc = new CasesService();
    await svc.addService(
      'case-uuid',
      { serviceType: 'MEDICAL', providedAt: new Date().toISOString() } as never,
      CASE_WORKER_BOMI,
    );
    expect(serviceProvidedCreate).toHaveBeenCalledTimes(1);
  });
});

describe('CasesService.findOne — org-unit scoping', () => {
  it('throws NotFound when the case does not exist', async () => {
    gbvCaseFindUnique.mockResolvedValue(null);
    const svc = new CasesService();
    await expect(svc.findOne('missing-uuid', CASE_WORKER_BOMI)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('throws Forbidden when the case belongs to a different county', async () => {
    gbvCaseFindUnique.mockResolvedValue({ ...PENDING_CASE, orgUnitId: 'orgunit-grand-gedeh' });
    const svc = new CasesService();
    await expect(svc.findOne('case-uuid', CASE_WORKER_BOMI)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
