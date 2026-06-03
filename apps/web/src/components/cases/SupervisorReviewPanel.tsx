'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Props {
  caseId: string;
  intakeByName: string | null;
}

/**
 * Supervisor approve/return form, visible only when the case status is
 * PENDING_REVIEW. The two-eyes check (supervisor cannot review their own
 * intake) is enforced server-side in `assertReviewable()`; the UI shows
 * a friendly message if the API returns 403.
 *
 * Notes are required when returning a case. The submit buttons are
 * disabled while a request is in flight to prevent accidental double
 * submission.
 */
export function SupervisorReviewPanel({ caseId, intakeByName }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState<null | 'approve' | 'return'>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(kind: 'approve' | 'return') {
    if (kind === 'return' && notes.trim().length === 0) {
      setError('Notes are required when returning a case for revision.');
      return;
    }
    setError(null);
    setPending(kind);
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kind === 'return' ? { notes: notes.trim() } : { notes: notes.trim() || undefined }),
      });
      if (!res.ok) {
        let message = `Request failed: ${res.status}`;
        try {
          const body = (await res.json()) as { message?: string };
          if (body.message) message = body.message;
        } catch {
          // ignore
        }
        setError(message);
        setPending(null);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPending(null);
    }
  }

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-6 shadow-sm">
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-amber-900">Supervisor review required</h2>
        {intakeByName && (
          <p className="text-xs text-amber-800">
            Entered by <span className="font-medium">{intakeByName}</span>
          </p>
        )}
      </header>
      <p className="mb-3 text-xs text-amber-800">
        Approve to move the case into OPEN, or return with notes so the case worker can revise.
        You cannot approve a case you entered yourself.
      </p>
      <label className="block text-xs font-medium text-amber-900" htmlFor="review-notes">
        Notes (required when returning)
      </label>
      <textarea
        id="review-notes"
        className="mt-1 w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm text-foreground focus:border-amber-500 focus:outline-none"
        rows={3}
        placeholder="What the case worker should address before resubmitting…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        disabled={pending !== null}
      />
      {error && (
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          disabled={pending !== null}
          onClick={() => void submit('approve')}
        >
          {pending === 'approve' ? 'Approving…' : 'Approve'}
        </button>
        <button
          type="button"
          className="rounded-md border border-amber-400 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
          disabled={pending !== null}
          onClick={() => void submit('return')}
        >
          {pending === 'return' ? 'Returning…' : 'Return for revision'}
        </button>
      </div>
    </section>
  );
}
