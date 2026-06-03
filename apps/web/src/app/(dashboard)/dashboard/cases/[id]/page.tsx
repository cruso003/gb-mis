import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { auth } from '../../../../../auth';
import { ResubmitPanel } from '../../../../../components/cases/ResubmitPanel';
import { SupervisorReviewPanel } from '../../../../../components/cases/SupervisorReviewPanel';
import { apiClient } from '../../../../../lib/api-client';

interface Incident {
  id: string;
  types: string[];
  perpetratorRelationship: string | null;
  occurredAt: string | null;
  weaponUsed: boolean;
}

interface ServiceProvided {
  id: string;
  type: string;
  providedAt: string;
  outcome: string;
}

interface Referral {
  id: string;
  toService: string;
  referredAt: string;
  outcome: string | null;
}

interface CaseDetail {
  id: string;
  caseNumber: string;
  status: string;
  priority: string;
  intakeChannel: string;
  intakeDate: string;
  supervisorReviewedAt: string | null;
  submittedForReviewAt: string | null;
  reviewNotes: string | null;
  reviewCount: number;
  intakeByUserId: string;
  closedAt: string | null;
  createdAt: string;
  survivor: { id: string; beneficiaryCode: string } | null;
  orgUnit: { name: string; code: string };
  reviewer: { id: string; displayName: string } | null;
  intakedBy: { id: string; displayName: string } | null;
  incidents: Incident[];
  servicesProvided: ServiceProvided[];
  referrals: Referral[];
}

const PRIORITY_BADGE: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  URGENT: 'bg-orange-100 text-orange-700',
  ROUTINE: 'bg-muted text-muted-foreground',
};

const STATUS_BADGE: Record<string, string> = {
  PENDING_REVIEW: 'bg-amber-100 text-amber-800',
  RETURNED_FOR_REVISION: 'bg-rose-100 text-rose-800',
  OPEN: 'bg-blue-100 text-blue-700',
  IN_SERVICE: 'bg-green-100 text-green-700',
  REFERRED: 'bg-yellow-100 text-yellow-700',
  CLOSED_SUCCESSFUL: 'bg-muted text-muted-foreground',
  CLOSED_LOST_CONTACT: 'bg-muted text-muted-foreground',
  CLOSED_WITHDRAWN: 'bg-muted text-muted-foreground',
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-foreground">{value ?? '—'}</p>
    </div>
  );
}

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([auth(), params]);

  const gbvCase = await apiClient
    .get<CaseDetail>(`/cases/${id}`, session?.accessToken)
    .catch(() => null);

  if (!gbvCase) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/cases"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to cases
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-mono">{gbvCase.caseNumber}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{gbvCase.orgUnit.name}</p>
        </div>
        <div className="flex gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE[gbvCase.status] ?? 'bg-muted text-muted-foreground'}`}
          >
            {gbvCase.status.replace(/_/g, ' ')}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${PRIORITY_BADGE[gbvCase.priority] ?? 'bg-muted text-muted-foreground'}`}
          >
            {gbvCase.priority}
          </span>
        </div>
      </div>

      {gbvCase.status === 'PENDING_REVIEW' && (
        <SupervisorReviewPanel
          caseId={gbvCase.id}
          intakeByName={gbvCase.intakedBy?.displayName ?? null}
        />
      )}

      {gbvCase.status === 'RETURNED_FOR_REVISION' && (
        <ResubmitPanel
          caseId={gbvCase.id}
          reviewNotes={gbvCase.reviewNotes}
          reviewerName={gbvCase.reviewer?.displayName ?? null}
          reviewedAt={gbvCase.supervisorReviewedAt}
        />
      )}

      {/* Case metadata */}
      <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Case Details</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Intake Channel" value={gbvCase.intakeChannel} />
          <Field label="Intake Date" value={new Date(gbvCase.intakeDate).toLocaleDateString()} />
          <Field
            label="Survivor"
            value={
              gbvCase.survivor ? (
                <span className="font-mono text-xs">{gbvCase.survivor.beneficiaryCode}</span>
              ) : (
                'Anonymous'
              )
            }
          />
          <Field
            label="Supervisor Reviewed"
            value={
              gbvCase.supervisorReviewedAt
                ? new Date(gbvCase.supervisorReviewedAt).toLocaleString()
                : 'Pending'
            }
          />
          <Field
            label="Closed At"
            value={gbvCase.closedAt ? new Date(gbvCase.closedAt).toLocaleString() : '—'}
          />
          <Field label="Opened" value={new Date(gbvCase.createdAt).toLocaleString()} />
        </div>
      </section>

      {/* Incidents */}
      {gbvCase.incidents.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Incidents ({gbvCase.incidents.length})
          </h2>
          <div className="space-y-3">
            {gbvCase.incidents.map((inc) => (
              <div key={inc.id} className="rounded-lg bg-muted/40 p-3 text-sm">
                <div className="flex flex-wrap gap-1">
                  {inc.types.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <span>
                    Relationship: {inc.perpetratorRelationship?.replace(/_/g, ' ') ?? '—'}
                  </span>
                  <span>Weapon: {inc.weaponUsed ? 'Yes' : 'No'}</span>
                  <span>
                    Occurred:{' '}
                    {inc.occurredAt ? new Date(inc.occurredAt).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Services */}
      {gbvCase.servicesProvided.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Services Provided ({gbvCase.servicesProvided.length})
          </h2>
          <div className="divide-y divide-border">
            {gbvCase.servicesProvided.map((svc) => (
              <div key={svc.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-foreground">{svc.type}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{new Date(svc.providedAt).toLocaleDateString()}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5">{svc.outcome}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Referrals */}
      {gbvCase.referrals.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Referrals ({gbvCase.referrals.length})
          </h2>
          <div className="divide-y divide-border">
            {gbvCase.referrals.map((ref) => (
              <div key={ref.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-foreground">{ref.toService}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{new Date(ref.referredAt).toLocaleDateString()}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5">
                    {ref.outcome ?? 'IN_PROGRESS'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {gbvCase.incidents.length === 0 &&
        gbvCase.servicesProvided.length === 0 &&
        gbvCase.referrals.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
            No incidents, services, or referrals recorded yet.
          </div>
        )}
    </div>
  );
}
