import type { Paginated } from '@gb-mis/types';
import { CalendarDays } from 'lucide-react';

import { auth } from '../../../../auth';
import { apiClient } from '../../../../lib/api-client';

interface SessionRow {
  id: string;
  type: string;
  topic: string;
  heldAt: string;
  attendeeCount: number;
  orgUnit: { name: string; code: string } | null;
}

const SESSION_TYPE_LABELS: Record<string, string> = {
  SASA_AWARENESS: 'SASA! Awareness',
  SASA_SUPPORT: 'SASA! Support',
  SASA_ACTION: 'SASA! Action',
  ASRH: 'ASRH',
  OTHER: 'Other',
};

export const metadata = { title: 'Community Sessions — GB MIS' };

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;

  const query = new URLSearchParams();
  if (sp.page) query.set('page', sp.page);
  if (sp.type) query.set('type', sp.type);
  query.set('limit', '20');

  const data = await apiClient
    .get<Paginated<SessionRow>>(`/sessions?${query.toString()}`, session?.accessToken)
    .catch(() => ({
      items: [] as SessionRow[],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Community Sessions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.total} session{data.total !== 1 ? 's' : ''} — SASA!, ASRH, and community engagement
        </p>
      </div>

      {data.items.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border text-muted-foreground">
          <CalendarDays className="h-8 w-8 opacity-40" />
          <p className="text-sm">No sessions recorded in your scope yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Topic</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Location</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Attendees</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {SESSION_TYPE_LABELS[s.type] ?? s.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground">{s.topic}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.orgUnit?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(s.heldAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      {s.attendeeCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Page {data.page} of {data.totalPages} ({data.total} total)
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
