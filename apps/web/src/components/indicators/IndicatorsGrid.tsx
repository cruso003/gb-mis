'use client';

import { INDICATOR_CATALOG } from '@gb-mis/indicators';

interface IndicatorValueRow {
  id: string;
  indicatorCode: string;
  period: string;
  countyCode: string;
  value: number;
  qualityFlag: string;
}

interface IndicatorsGridProps {
  values: IndicatorValueRow[];
}

const FLAG_CLASSES: Record<string, string> = {
  OFFICIAL: 'bg-accent/10 text-accent',
  PRELIMINARY: 'bg-yellow-100 text-yellow-700',
  ESTIMATED: 'bg-blue-100 text-blue-700',
  REVISED: 'bg-purple-100 text-purple-700',
  MISSING: 'bg-muted text-muted-foreground',
};

export function IndicatorsGrid({ values }: IndicatorsGridProps) {
  if (values.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground">
        No indicator data available for the selected filters.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {values.map((v) => {
        const meta = INDICATOR_CATALOG.get(v.indicatorCode);
        const flagClass = FLAG_CLASSES[v.qualityFlag] ?? FLAG_CLASSES['MISSING']!;

        return (
          <div
            key={v.id}
            className="rounded-xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-mono text-xs font-medium text-primary">{v.indicatorCode}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${flagClass}`}>
                {v.qualityFlag}
              </span>
            </div>
            <p className="mt-2 text-sm font-medium leading-snug text-foreground line-clamp-2">
              {meta?.name ?? v.indicatorCode}
            </p>
            <p className="mt-3 text-2xl font-bold text-foreground">
              {v.value.toLocaleString()}
              {meta?.unit ? (
                <span className="ml-1 text-sm font-normal text-muted-foreground">{meta.unit}</span>
              ) : null}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{v.period}</span>
              <span>·</span>
              <span>{v.countyCode === 'NATIONAL' ? 'National' : v.countyCode}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
