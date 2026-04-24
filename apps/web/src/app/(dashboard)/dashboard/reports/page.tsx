import { auth } from '../../../../auth';
import { apiClient } from '../../../../lib/api-client';

interface CasesSummary {
  total: number | null;
  byStatus: Array<{ status: string; _count: number | null }>;
  byPriority: Array<{ priority: string; _count: number | null }>;
}

interface BeneficiarySummary {
  total: number | null;
  bySex: Array<{ sex: string; _count: number | null }>;
  byStatus: Array<{ status: string; _count: number | null }>;
}

function SuppressedCell({ value }: { value: number | null }) {
  if (value === null) {
    return <dd className="text-muted-foreground italic">{'< 5 (suppressed)'}</dd>;
  }
  return <dd className="font-medium text-foreground">{value.toLocaleString()}</dd>;
}

export const metadata = { title: 'Reports — GB MIS' };

export default async function ReportsPage() {
  const session = await auth();

  const [casesSummary, beneficiarySummary] = await Promise.all([
    apiClient
      .get<CasesSummary>('/reports/cases/summary', session?.accessToken)
      .catch(() => null),
    apiClient
      .get<BeneficiarySummary>('/reports/beneficiaries/summary', session?.accessToken)
      .catch(() => null),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aggregate statistics — cells below k=5 are suppressed per WHO/GDPR privacy policy
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {casesSummary && (
          <>
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-foreground">Cases by Status</h2>
              <dl className="space-y-2">
                {casesSummary.byStatus.map((row) => (
                  <div key={row.status} className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">{row.status.replace(/_/g, ' ')}</dt>
                    <SuppressedCell value={row._count} />
                  </div>
                ))}
              </dl>
              <div className="mt-4 border-t border-border pt-4">
                <div className="flex justify-between text-sm font-semibold">
                  <span>Total</span>
                  <SuppressedCell value={casesSummary.total} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-foreground">Cases by Priority</h2>
              <dl className="space-y-2">
                {casesSummary.byPriority.map((row) => (
                  <div key={row.priority} className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">{row.priority}</dt>
                    <SuppressedCell value={row._count} />
                  </div>
                ))}
              </dl>
            </div>
          </>
        )}

        {beneficiarySummary && (
          <>
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-foreground">Beneficiaries by Sex</h2>
              <dl className="space-y-2">
                {beneficiarySummary.bySex.map((row) => (
                  <div key={row.sex} className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">{row.sex}</dt>
                    <SuppressedCell value={row._count} />
                  </div>
                ))}
              </dl>
              <div className="mt-4 border-t border-border pt-4">
                <div className="flex justify-between text-sm font-semibold">
                  <span>Total enrolled</span>
                  <SuppressedCell value={beneficiarySummary.total} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-base font-semibold text-foreground">
                Beneficiaries by Programme Status
              </h2>
              <dl className="space-y-2">
                {beneficiarySummary.byStatus.map((row) => (
                  <div key={row.status} className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">{row.status}</dt>
                    <SuppressedCell value={row._count} />
                  </div>
                ))}
              </dl>
            </div>
          </>
        )}

        {!casesSummary && !beneficiarySummary && (
          <div className="col-span-full flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground">
            No report data available for your role.
          </div>
        )}
      </div>
    </div>
  );
}
