'use client';

import { clsx } from 'clsx';
import Link from 'next/link';

interface CaseRow {
  id: string;
  status: string;
  priority: string;
  primaryViolenceType: string;
  createdAt: string;
  beneficiary: { id: string; displayCode: string } | null;
  orgUnit: { name: string; countyCode: string } | null;
}

interface CasesTableProps {
  cases: CaseRow[];
  total: number;
  page: number;
  totalPages: number;
}

const STATUS_CLASSES: Record<string, string> = {
  INTAKE: 'bg-blue-100 text-blue-700',
  ACTIVE: 'bg-accent/10 text-accent',
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-700',
  CLOSED: 'bg-muted text-muted-foreground',
  WITHDRAWN: 'bg-gray-100 text-gray-500',
};

const PRIORITY_CLASSES: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  URGENT: 'bg-orange-100 text-orange-700',
  STANDARD: 'bg-muted text-muted-foreground',
};

export function CasesTable({ cases, total, page, totalPages }: CasesTableProps) {
  if (cases.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground">
        No cases found for your current filters.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Beneficiary</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Org Unit</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Priority</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Opened</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {cases.map((c) => (
              <tr key={c.id} className="transition hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/cases/${c.id}`}
                    className="font-mono text-xs font-medium text-primary hover:underline"
                  >
                    {c.beneficiary?.displayCode ?? c.id.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {c.orgUnit?.name ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={clsx(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      STATUS_CLASSES[c.status] ?? 'bg-muted text-muted-foreground',
                    )}
                  >
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={clsx(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      PRIORITY_CLASSES[c.priority] ?? 'bg-muted text-muted-foreground',
                    )}
                  >
                    {c.priority}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{c.primaryViolenceType}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {new Date(c.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-border px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Showing page {page} of {totalPages} ({total} total)
        </p>
      </div>
    </div>
  );
}
