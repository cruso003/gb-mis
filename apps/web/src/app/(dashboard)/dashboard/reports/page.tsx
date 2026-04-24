import { FileText } from 'lucide-react';

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
    return <dd className="text-muted-foreground italic text-xs">{'< 5 (suppressed)'}</dd>;
  }
  return <dd className="font-medium text-foreground">{value.toLocaleString()}</dd>;
}

function StatCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;
const currentQuarter = Math.ceil(currentMonth / 3) as 1 | 2 | 3 | 4;

const REPORT_TEMPLATES = [
  {
    id: 'monthly_county',
    title: 'Monthly County Report',
    description: 'Cases, beneficiaries, sessions, and indicators for one county in a calendar month.',
    frequency: 'Monthly',
    audience: 'County coordinator',
    note: 'Requires INDICATOR_EXPORT permission and an orgUnitId parameter.',
  },
  {
    id: 'quarterly_lwep',
    title: 'Quarterly LWEP Narrative',
    description: 'Programme-wide output indicator progress for World Bank supervision.',
    frequency: 'Quarterly',
    audience: 'World Bank / MOGCSP M&E',
    note: `Current: Q${currentQuarter} ${currentYear}. GET /reports/quarterly-lwep?year=${currentYear}&quarter=${currentQuarter}`,
  },
  {
    id: 'annual_cedaw',
    title: 'Annual CEDAW Follow-Up',
    description: 'All BPfA and CEDAW indicators with verified values and secondary data sources.',
    frequency: 'Annual',
    audience: 'CEDAW Committee / MOGCSP',
    note: `GET /reports/annual-cedaw?year=${currentYear}`,
  },
];

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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aggregate statistics — cells below k=5 suppressed per WHO/GDPR privacy policy
        </p>
      </div>

      {/* Live aggregate summaries */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {casesSummary && (
          <>
            <StatCard title="Cases by Status">
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
            </StatCard>

            <StatCard title="Cases by Priority">
              <dl className="space-y-2">
                {casesSummary.byPriority.map((row) => (
                  <div key={row.priority} className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">{row.priority}</dt>
                    <SuppressedCell value={row._count} />
                  </div>
                ))}
              </dl>
            </StatCard>
          </>
        )}

        {beneficiarySummary && (
          <>
            <StatCard title="Beneficiaries by Sex">
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
            </StatCard>

            <StatCard title="Beneficiaries by Status">
              <dl className="space-y-2">
                {beneficiarySummary.byStatus.map((row) => (
                  <div key={row.status} className="flex justify-between text-sm">
                    <dt className="text-muted-foreground">{row.status}</dt>
                    <SuppressedCell value={row._count} />
                  </div>
                ))}
              </dl>
            </StatCard>
          </>
        )}

        {!casesSummary && !beneficiarySummary && (
          <div className="col-span-full flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground">
            No aggregate data available for your role.
          </div>
        )}
      </div>

      {/* Structured report templates */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Report Templates</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REPORT_TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{tpl.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{tpl.frequency} · {tpl.audience}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{tpl.description}</p>
              <p className="mt-auto rounded bg-muted px-2 py-1 font-mono text-[10px] text-muted-foreground">
                {tpl.note}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
