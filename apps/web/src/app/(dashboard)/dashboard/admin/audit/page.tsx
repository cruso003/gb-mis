import type { Paginated } from '@gb-mis/types';

import { auth } from '../../../../../auth';
import { apiClient } from '../../../../../lib/api-client';

interface AuditRow {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  success: boolean;
  occurredAt: string;
  actor: { displayName: string } | null;
}

export const metadata = { title: 'Audit Log — GB MIS' };

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; entityType?: string; action?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;

  const query = new URLSearchParams();
  if (sp.page) query.set('page', sp.page);
  if (sp.entityType) query.set('entityType', sp.entityType);
  if (sp.action) query.set('action', sp.action);
  query.set('limit', '50');

  const data = await apiClient
    .get<Paginated<AuditRow>>(`/audit?${query.toString()}`, session?.accessToken)
    .catch(() => ({ items: [] as AuditRow[], total: 0, page: 1, limit: 50, totalPages: 0 }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Append-only — {data.total} events. No events can be modified or deleted.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">When</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actor</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Entity</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">OK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.map((row) => (
                <tr key={row.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(row.occurredAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.actor?.displayName ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{row.action}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.entityType ?? '—'}
                    {row.entityId ? (
                      <span className="ml-1 font-mono text-xs">#{row.entityId.slice(0, 8)}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                        row.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {row.success ? '✓' : '✗'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.items.length === 0 && (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            No audit events found.
          </div>
        )}
      </div>
    </div>
  );
}
