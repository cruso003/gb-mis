'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  caseId: string;
  reviewNotes: string | null;
  reviewerName: string | null;
  reviewedAt: string | null;
}

/**
 * Shown when a case is in RETURNED_FOR_REVISION. Surfaces the
 * supervisor's notes prominently — the case worker has been asked to
 * change something, so the rest of the page is secondary until they
 * resubmit.
 */
export function ResubmitPanel({ caseId, reviewNotes, reviewerName, reviewedAt }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resubmit() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/resubmit`, { method: 'POST' });
      if (!res.ok) {
        let message = `Request failed: ${res.status}`;
        try {
          const body = (await res.json()) as { message?: string };
          if (body.message) message = body.message;
        } catch {
          // ignore
        }
        setError(message);
        setPending(false);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPending(false);
    }
  }

  return (
    <section className="rounded-xl border border-rose-200 bg-rose-50/70 p-6 shadow-sm">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-rose-900">
          Returned for revision
          {reviewerName && (
            <span className="ml-1 text-xs font-normal text-rose-800">
              by {reviewerName}
            </span>
          )}
        </h2>
        {reviewedAt && (
          <p className="text-xs text-rose-800">{new Date(reviewedAt).toLocaleString()}</p>
        )}
      </header>
      {reviewNotes ? (
        <blockquote className="rounded-md border-l-4 border-rose-400 bg-white px-4 py-3 text-sm text-foreground">
          {reviewNotes}
        </blockquote>
      ) : (
        <p className="text-xs italic text-rose-800">
          The supervisor did not leave specific notes — contact them before resubmitting.
        </p>
      )}
      {error && (
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}
      <div className="mt-4">
        <button
          type="button"
          className="rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
          disabled={pending}
          onClick={() => void resubmit()}
        >
          {pending ? 'Resubmitting…' : 'Resubmit for review'}
        </button>
      </div>
    </section>
  );
}
