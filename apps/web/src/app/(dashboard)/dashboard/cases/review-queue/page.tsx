import type { Paginated } from '@gb-mis/types';
import Link from 'next/link';

import { auth } from '../../../../../auth';
import { apiClient } from '../../../../../lib/api-client';

interface QueueRow {
  id: string;
  caseNumber: string;
  priority: string;
  status: string;
  submittedForReviewAt: string | null;
  reviewCount: number;
  orgUnit: { id: string; name: string; code: string } | null;
  intakedBy: { id: string; displayName: string } | null;
}

export const metadata = { title: 'Review queue — GB MIS' };

/**
 * Supervisor review queue.
 *
 * Cases sit here until a supervisor approves or returns them. Ordered
 * oldest-first so survivors who've been waiting longest are visible
 * before fresh intakes. The two-eyes rule is enforced server-side —
 * the supervisor cannot review cases they themselves entered.
 */
export default async function ReviewQueuePage({
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
    .get<Paginated<QueueRow>>(
      `/cases/review-queue?${query.toString()}`,
      session?.accessToken,
    )
    .catch(() => ({ items: [], total: 0, page: 1, limit: 20, totalPages: 0 }));

  const waitingFor = (submitted: string | null): string => {
    if (!submitted) return '—';
    const ms = Date.now() - new Date(submitted).getTime();
    const hours = Math.round(ms / 36e5);
    if (hours < 1) return '< 1 hour';
    if (hours < 48) return `${hours} hours`;
    const days = Math.round(hours / 24);
    return `${days} days`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Review queue</h1>
          <p className="text-sm text-muted-foreground">
            {data.total === 0
              ? 'No cases waiting on review.'
              : `${data.total} case${data.total === 1 ? '' : 's'} waiting on supervisor review.`}
          </p>
        </div>
        <Link
          href="/dashboard/cases"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          All cases →
        </Link>
      </div>

      {data.items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          The queue is empty. New intakes will appear here automatically.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Case</th>
                <th className="px-4 py-3">County</th>
                <th className="px-4 py-3">Intake by</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Waiting</th>
                <th className="px-4 py-3">Iteration</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-mono text-xs text-foreground">{c.caseNumber}</td>
                  <td className="px-4 py-3 text-foreground">{c.orgUnit?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.intakedBy?.displayName ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        c.priority === 'CRITICAL'
                          ? 'rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800'
                          : c.priority === 'URGENT'
                          ? 'rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800'
                          : 'rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700'
                      }
                    >
                      {c.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {waitingFor(c.submittedForReviewAt)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.reviewCount === 0 ? 'First' : `Resubmit #${c.reviewCount}`}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/cases/${c.id}`}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Review →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Cases you entered yourself do not appear here — another supervisor will review them.
      </p>
    </div>
  );
}
