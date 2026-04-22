import { auth } from '../../../../auth';
import { apiClient } from '../../../../lib/api-client';
import { CasesTable } from '../../../../components/cases/CasesTable';
import type { Paginated } from '@gb-mis/types';

interface CaseRow {
  id: string;
  status: string;
  priority: string;
  primaryViolenceType: string;
  createdAt: string;
  beneficiary: { id: string; displayCode: string } | null;
  orgUnit: { name: string; countyCode: string } | null;
}

export const metadata = { title: 'Cases — GB MIS' };

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; priority?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;

  const query = new URLSearchParams();
  if (sp.page) query.set('page', sp.page);
  if (sp.status) query.set('status', sp.status);
  if (sp.priority) query.set('priority', sp.priority);
  query.set('limit', '20');

  const data = await apiClient
    .get<Paginated<CaseRow>>(`/cases?${query.toString()}`, session?.accessToken)
    .catch(() => ({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">GBV Cases</h1>
        <p className="mt-1 text-sm text-muted-foreground">{data.total} cases in your scope</p>
      </div>
      <CasesTable cases={data.items} total={data.total} page={data.page} totalPages={data.totalPages} />
    </div>
  );
}
