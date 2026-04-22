import React from 'react';

import { cn } from '../lib/utils';

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  IN_SERVICE: 'bg-purple-100 text-purple-800',
  REFERRED: 'bg-amber-100 text-amber-800',
  CLOSED_SUCCESSFUL: 'bg-green-100 text-green-800',
  CLOSED_LOST_CONTACT: 'bg-gray-100 text-gray-700',
  CLOSED_WITHDRAWN: 'bg-gray-100 text-gray-700',
  URGENT: 'bg-amber-100 text-amber-800',
  CRITICAL: 'bg-red-100 text-red-800',
  ROUTINE: 'bg-gray-100 text-gray-700',
  ACTIVE: 'bg-green-100 text-green-800',
  SUSPENDED: 'bg-amber-100 text-amber-800',
  DISABLED: 'bg-red-100 text-red-800',
  VERIFIED: 'bg-green-100 text-green-800',
  UNVERIFIED: 'bg-gray-100 text-gray-700',
  PROVISIONAL: 'bg-blue-100 text-blue-800',
  ESTIMATE: 'bg-amber-100 text-amber-800',
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  IN_SERVICE: 'In Service',
  REFERRED: 'Referred',
  CLOSED_SUCCESSFUL: 'Closed — Successful',
  CLOSED_LOST_CONTACT: 'Lost Contact',
  CLOSED_WITHDRAWN: 'Withdrawn',
  URGENT: 'Urgent',
  CRITICAL: 'Critical',
  ROUTINE: 'Routine',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  DISABLED: 'Disabled',
  VERIFIED: 'Verified',
  UNVERIFIED: 'Unverified',
  PROVISIONAL: 'Provisional',
  ESTIMATE: 'Estimate',
};

interface StatusPillProps {
  status: string;
  className?: string;
}

export function StatusPill({ status, className }: StatusPillProps) {
  const styles = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700';
  const label = STATUS_LABELS[status] ?? status;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        styles,
        className,
      )}
    >
      {label}
    </span>
  );
}
