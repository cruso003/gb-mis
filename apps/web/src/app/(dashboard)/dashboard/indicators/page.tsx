import type { Paginated } from '@gb-mis/types';

import { auth } from '../../../../auth';
import { IndicatorsGrid } from '../../../../components/indicators/IndicatorsGrid';
import { apiClient } from '../../../../lib/api-client';

interface IndicatorValueRow {
  id: string;
  indicatorCode: string;
  period: string;
  countyCode: string;
  value: number;
  qualityFlag: string;
}

export const metadata = { title: 'Indicators — GB MIS' };

export default async function IndicatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ countyCode?: string; framework?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;

  const query = new URLSearchParams();
  if (sp.countyCode) query.set('countyCode', sp.countyCode);
  if (sp.framework) query.set('framework', sp.framework);
  query.set('limit', '48');

  const data = await apiClient
    .get<Paginated<IndicatorValueRow>>(
      `/indicators/values?${query.toString()}`,
      session?.accessToken,
    )
    .catch(() => ({ items: [], total: 0, page: 1, limit: 48, totalPages: 0 }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gender Equality Indicators</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tracking {data.total} data points across BPfA, SDG, CEDAW, AU WPS, and LWEP output frameworks
        </p>
      </div>
      <IndicatorsGrid values={data.items} />
    </div>
  );
}
