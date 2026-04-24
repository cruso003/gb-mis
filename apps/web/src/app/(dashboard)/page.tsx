import { BarChart3, FolderOpen, Users, Activity } from 'lucide-react';
import Link from 'next/link';

import { auth } from '../../auth';
import { apiClient } from '../../lib/api-client';

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

interface IndicatorCatalogEntry {
  code: string;
  framework: string;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-border bg-card p-5 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
      <p className="mt-4 text-3xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{label}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </Link>
  );
}

export const metadata = { title: 'Dashboard — GB MIS' };

export default async function DashboardHome() {
  const session = await auth();

  const [casesSummary, beneficiarySummary, catalog] = await Promise.all([
    apiClient
      .get<CasesSummary>('/reports/cases/summary', session?.accessToken)
      .catch(() => null),
    apiClient
      .get<BeneficiarySummary>('/reports/beneficiaries/summary', session?.accessToken)
      .catch(() => null),
    apiClient
      .get<IndicatorCatalogEntry[]>('/indicators/catalog', session?.accessToken)
      .catch(() => [] as IndicatorCatalogEntry[]),
  ]);

  const openCases =
    casesSummary?.byStatus.find((s) => s.status === 'OPEN')?._count ?? null;
  const totalBeneficiaries = beneficiarySummary?.total ?? null;
  const indicatorCount = Array.isArray(catalog) ? catalog.length : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">GB MIS Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          MOGCSP · Liberia Women Empowerment Project · World Bank IDA
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FolderOpen}
          label="Open Cases"
          value={openCases === null ? 'N/A' : openCases.toLocaleString()}
          sub="GBV cases awaiting action"
          href="/dashboard/cases"
        />
        <StatCard
          icon={Users}
          label="Beneficiaries Enrolled"
          value={totalBeneficiaries === null ? 'N/A' : totalBeneficiaries.toLocaleString()}
          sub="Across 6 LWEP counties"
          href="/dashboard/beneficiaries"
        />
        <StatCard
          icon={BarChart3}
          label="Indicators Tracked"
          value={indicatorCount.toString()}
          sub="BPfA, SDG, CEDAW, AU WPS, LWEP"
          href="/dashboard/indicators"
        />
        <StatCard
          icon={Activity}
          label="Total Cases"
          value={casesSummary?.total === null ? 'N/A' : (casesSummary?.total ?? 'N/A').toLocaleString()}
          sub="All statuses in scope"
          href="/dashboard/cases"
        />
      </div>

      {casesSummary && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Cases by Status</h2>
            <div className="space-y-2">
              {casesSummary.byStatus.map((row) => (
                <div key={row.status} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{row.status.replace(/_/g, ' ')}</span>
                  <span className="font-medium text-foreground">
                    {row._count === null ? '< 5' : row._count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Cases by Priority</h2>
            <div className="space-y-2">
              {casesSummary.byPriority.map((row) => (
                <div key={row.priority} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{row.priority}</span>
                  <span className="font-medium text-foreground">
                    {row._count === null ? '< 5' : row._count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <p className="text-xs text-muted-foreground">
          All statistics are k-anonymised (threshold k=5). Cells with fewer than 5 records are
          suppressed. Survivor data is encrypted at rest and access-logged.
        </p>
      </div>
    </div>
  );
}
