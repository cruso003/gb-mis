import { BarChart3 } from 'lucide-react';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000';

interface PublicIndicatorValue {
  county: string;
  countyCode: string;
  value: number;
  periodStart: string;
  periodEnd: string;
  disaggregations: Record<string, string>;
}

interface PublicIndicator {
  code: string;
  name: string;
  unit: string;
  framework: string;
  area: string;
  sdgTarget: string | null;
  notes: string | null;
  values: PublicIndicatorValue[];
}

interface PublicIndicatorsResponse {
  indicators: PublicIndicator[];
  generatedAt: string;
}

async function fetchPublicIndicators(): Promise<PublicIndicatorsResponse> {
  const res = await fetch(`${API_URL}/public/indicators`, {
    next: { revalidate: 86400 }, // ISR: revalidate once per day
  });
  if (!res.ok) {
    return { indicators: [], generatedAt: new Date().toISOString() };
  }
  return res.json() as Promise<PublicIndicatorsResponse>;
}

export const metadata = {
  title: 'Liberia Gender Equality Dashboard — MOGCSP',
  description:
    'Verified gender equality indicators for Liberia, published by the Ministry of Gender, Children and Social Protection.',
};

const FRAMEWORK_LABELS: Record<string, string> = {
  BPFA: 'Beijing Platform for Action',
  CEDAW: 'CEDAW',
  MAPUTO: 'Maputo Protocol',
  WPS: 'AU Women, Peace & Security',
  LWEP: 'LWEP Programme Indicators',
  SDG: 'Sustainable Development Goals',
};

export default async function PublicDashboardPage() {
  const data = await fetchPublicIndicators();

  const frameworks = [...new Set(data.indicators.map((i) => i.framework))].sort();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Gender Equality Indicators
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Verified data published by MOGCSP. Last updated:{' '}
          {new Date(data.generatedAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {data.indicators.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border text-muted-foreground">
          <BarChart3 className="h-8 w-8 opacity-40" />
          <p className="text-sm">No verified indicators available yet.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {frameworks.map((framework) => {
            const frameworkIndicators = data.indicators.filter(
              (i) => i.framework === framework,
            );
            return (
              <section key={framework}>
                <h2 className="mb-4 text-lg font-semibold text-foreground">
                  {FRAMEWORK_LABELS[framework] ?? framework}
                </h2>
                <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                            Indicator
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                            SDG
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                            County
                          </th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                            Period
                          </th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                            Value
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {frameworkIndicators.flatMap((indicator) =>
                          indicator.values.length === 0 ? (
                            <tr key={indicator.code}>
                              <td className="px-4 py-3">
                                <div className="font-medium text-foreground">
                                  {indicator.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {indicator.code}
                                </div>
                              </td>
                              <td
                                colSpan={4}
                                className="px-4 py-3 text-xs text-muted-foreground italic"
                              >
                                No verified value yet
                              </td>
                            </tr>
                          ) : (
                            indicator.values.map((v, vi) => (
                              <tr
                                key={`${indicator.code}-${v.countyCode}-${vi}`}
                                className="hover:bg-muted/30"
                              >
                                {vi === 0 && (
                                  <td
                                    className="px-4 py-3 align-top"
                                    rowSpan={indicator.values.length}
                                  >
                                    <div className="font-medium text-foreground">
                                      {indicator.name}
                                    </div>
                                    <div className="mt-0.5 text-xs text-muted-foreground">
                                      {indicator.code}
                                    </div>
                                  </td>
                                )}
                                {vi === 0 && (
                                  <td
                                    className="px-4 py-3 text-xs text-muted-foreground align-top"
                                    rowSpan={indicator.values.length}
                                  >
                                    {indicator.sdgTarget ?? '—'}
                                  </td>
                                )}
                                <td className="px-4 py-3 text-muted-foreground">
                                  {v.county}
                                </td>
                                <td className="px-4 py-3 text-xs text-muted-foreground">
                                  {new Date(v.periodStart).getFullYear()}
                                  {new Date(v.periodStart).getFullYear() !==
                                    new Date(v.periodEnd).getFullYear() &&
                                    `–${new Date(v.periodEnd).getFullYear()}`}
                                </td>
                                <td className="px-4 py-3 text-right font-semibold text-foreground">
                                  {v.value.toLocaleString()}{' '}
                                  <span className="text-xs font-normal text-muted-foreground">
                                    {indicator.unit}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        <p>
          <strong>Data note:</strong> All values on this page have been reviewed and verified by
          MOGCSP M&amp;E officers. Values are updated as new verified data becomes available.
          Disaggregated breakdowns follow WHO/UNSD privacy guidelines; cells with fewer than 5
          observations are not published.
        </p>
      </div>
    </div>
  );
}
