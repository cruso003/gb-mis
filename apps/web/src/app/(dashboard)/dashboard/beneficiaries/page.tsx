import { auth } from '../../../../auth';
import { apiClient } from '../../../../lib/api-client';
import type { Paginated } from '@gb-mis/types';

interface BeneficiaryRow {
  id: string;
  displayCode: string;
  status: string;
  sex: string;
  disabilityStatus: string;
  orgUnitId: string;
  createdAt: string;
}

export const metadata = { title: 'Beneficiaries — GB MIS' };

export default async function BeneficiariesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;

  const query = new URLSearchParams();
  if (sp.page) query.set('page', sp.page);
  query.set('limit', '20');

  const data = await apiClient
    .get<Paginated<BeneficiaryRow>>(`/beneficiaries?${query.toString()}`, session?.accessToken)
    .catch(() => ({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Beneficiaries</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.total} registered in your scope — PII encrypted at rest
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sex</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Disability</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Enrolled</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.items.map((b) => (
              <tr key={b.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs font-medium text-primary">{b.displayCode}</td>
                <td className="px-4 py-3 text-muted-foreground">{b.status}</td>
                <td className="px-4 py-3 text-muted-foreground">{b.sex}</td>
                <td className="px-4 py-3 text-muted-foreground">{b.disabilityStatus}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {new Date(b.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.items.length === 0 && (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            No beneficiaries in scope.
          </div>
        )}
      </div>
    </div>
  );
}
