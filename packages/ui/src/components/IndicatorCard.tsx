import React from 'react';

import { cn } from '../lib/utils';
import { StatusPill } from './StatusPill';

interface IndicatorCardProps {
  code: string;
  name: string;
  value: number | null;
  unit: string;
  qualityFlag: string;
  periodLabel: string;
  trend?: number; // positive = improving, negative = worsening
  className?: string;
}

export function IndicatorCard({
  code,
  name,
  value,
  unit,
  qualityFlag,
  periodLabel,
  trend,
  className,
}: IndicatorCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 bg-white p-4 shadow-sm',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-mono text-gray-400">{code}</span>
        <StatusPill status={qualityFlag} />
      </div>
      <h3 className="mt-2 text-sm font-medium text-gray-900 line-clamp-2">{name}</h3>
      <div className="mt-3 flex items-baseline gap-1">
        {value !== null ? (
          <>
            <span className="text-2xl font-bold text-gray-900">
              {value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
            <span className="text-sm text-gray-500">{unit}</span>
          </>
        ) : (
          <span className="text-sm text-gray-400 italic">No data</span>
        )}
      </div>
      {trend !== undefined && (
        <div
          className={cn(
            'mt-1 text-xs font-medium',
            trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-400',
          )}
        >
          {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'}{' '}
          {Math.abs(trend).toFixed(1)}% vs previous period
        </div>
      )}
      <p className="mt-2 text-xs text-gray-400">{periodLabel}</p>
    </div>
  );
}
