import React from 'react';

import { cn } from '../lib/utils';

const COUNTY_COLORS: Record<string, string> = {
  BOMI: 'bg-blue-100 text-blue-800 border-blue-200',
  MONTSERRADO: 'bg-purple-100 text-purple-800 border-purple-200',
  GBARPOLU: 'bg-green-100 text-green-800 border-green-200',
  RIVER_CESS: 'bg-teal-100 text-teal-800 border-teal-200',
  GRAND_CAPE_MOUNT: 'bg-orange-100 text-orange-800 border-orange-200',
  GRAND_GEDEH: 'bg-red-100 text-red-800 border-red-200',
};

const COUNTY_LABELS: Record<string, string> = {
  BOMI: 'Bomi',
  MONTSERRADO: 'Montserrado',
  GBARPOLU: 'Gbarpolu',
  RIVER_CESS: 'River Cess',
  GRAND_CAPE_MOUNT: 'Grand Cape Mount',
  GRAND_GEDEH: 'Grand Gedeh',
};

interface CountyBadgeProps {
  county: string;
  className?: string;
}

export function CountyBadge({ county, className }: CountyBadgeProps) {
  const colors = COUNTY_COLORS[county] ?? 'bg-gray-100 text-gray-800 border-gray-200';
  const label = COUNTY_LABELS[county] ?? county;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        colors,
        className,
      )}
    >
      {label}
    </span>
  );
}
