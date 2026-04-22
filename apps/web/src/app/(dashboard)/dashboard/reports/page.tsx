import { auth } from '../../../../auth';
import { apiClient } from '../../../../lib/api-client';

export const metadata = { title: 'Reports — GB MIS' };

interface CasesSummary {
  total: number | null;
  byStatus: Array<{ status: string; _count: number | null }>;
  byViolenceType: Array<{ primaryViolenceType: string; _count: number | null }>;
}

export default async function ReportsPage() {
  const session = await auth();

  const summary = await apiClient
    .get<CasesSummary>('/reports/cases/summary', session?.accessToken)
    .catch(() => null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aggregate statistics — cells below k=5 are suppressed per privacy policy
        </p>
      </div>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Cases by Status</h2>
            <dl className="space-y-2">
              {summary.byStatus.map((row) => (
                <div key={row.status} className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">{row.status}</dt>
                  <dd className="font-medium text-foreground">
                    {row._count === null ? '< 5 (suppressed)' : row._count}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 border-t border-border pt-4">
              <div className="flex justify-between text-sm font-semibold">
                <span>Total</span>
                <span>{summary.total === null ? '< 5 (suppressed)' : summary.total}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Cases by Violence Type</h2>
            <dl className="space-y-2">
              {summary.byViolenceType.map((row) => (
                <div key={row.primaryViolenceType} className="flex justify-between text-sm">
                  <dt className="text-muted-foreground">{row.primaryViolenceType}</dt>
                  <dd className="font-medium text-foreground">
                    {row._count === null ? '< 5 (suppressed)' : row._count}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}
