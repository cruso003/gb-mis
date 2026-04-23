import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { auth } from '../../../../../auth';
import { apiClient } from '../../../../../lib/api-client';

export const metadata = { title: 'Case Detail — GB MIS' };

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [session, { id }] = await Promise.all([auth(), params]);

  const gbvCase = await apiClient
    .get<Record<string, unknown>>(`/cases/${id}`, session?.accessToken)
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

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(gbvCase)
            .filter(([k]) => !['incidents', 'services', 'referrals', 'supervisorReview'].includes(k))
            .map(([key, val]) => (
              <div key={key}>
                <p className="text-xs font-medium text-muted-foreground">{key}</p>
                <p className="mt-0.5 text-sm text-foreground">
                  {val === null || val === undefined
                    ? '—'
                    : typeof val === 'object'
                    ? JSON.stringify(val)
                    : String(val)}
                </p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
