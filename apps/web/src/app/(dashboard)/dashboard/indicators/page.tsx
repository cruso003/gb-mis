import type { Paginated } from '@gb-mis/types';

import { auth } from '../../../../auth';
import { IndicatorsGrid } from '../../../../components/indicators/IndicatorsGrid';
import { apiClient } from '../../../../lib/api-client';

interface ApiIndicatorValue {
  id: string;
  value: number;
  qualityFlag: string;
  periodStart: string;
  periodEnd: string;
  indicator: { code: string; name: string; unit: string };
  orgUnit: { code: string; name: string } | null;
}

export const metadata = { title: 'Indicators — GB MIS' };

export default async function IndicatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ orgUnitId?: string; framework?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;

  const query = new URLSearchParams();
  if (sp.orgUnitId) query.set('orgUnitId', sp.orgUnitId);
  if (sp.framework) query.set('framework', sp.framework);
  query.set('limit', '48');

  const data = await apiClient
    .get<Paginated<ApiIndicatorValue>>(
      `/indicators/values?${query.toString()}`,
      session?.accessToken,
    )
    .catch(() => ({ items: [] as ApiIndicatorValue[], total: 0, page: 1, limit: 48, totalPages: 0 }));

  const gridItems = data.items.map((v) => ({
    id: v.id,
    indicatorCode: v.indicator.code,
    period: v.periodStart.slice(0, 7),
    countyCode: v.orgUnit?.code ?? 'NATIONAL',
    value: Number(v.value),
    qualityFlag: v.qualityFlag,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gender Equality Indicators</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.total} data point{data.total !== 1 ? 's' : ''} — BPfA, SDG, CEDAW, AU WPS, LWEP
        </p>
      </div>
      <IndicatorsGrid values={gridItems} />
    </div>
  );
}
