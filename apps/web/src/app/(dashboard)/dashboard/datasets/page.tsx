import type { Paginated } from '@gb-mis/types';
import { Database } from 'lucide-react';

import { auth } from '../../../../auth';
import { apiClient } from '../../../../lib/api-client';

interface DatasetRow {
  id: string;
  name: string;
  sourceAgency: string;
  collectionStart: string;
  collectionEnd: string;
  ingestedAt: string;
  methodology: string;
  _count: { dataPoints: number };
}

export const metadata = { title: 'Secondary Data — GB MIS' };

export default async function DatasetsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;

  const query = new URLSearchParams();
  if (sp.page) query.set('page', sp.page);
  query.set('limit', '20');

  const data = await apiClient
    .get<Paginated<DatasetRow>>(`/datasets?${query.toString()}`, session?.accessToken)
    .catch(() => ({
      items: [] as DatasetRow[],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Secondary Data</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          LISGIS, DHS, and MoH aggregate datasets ingested into the system.
          {data.total > 0 && ` ${data.total} dataset${data.total !== 1 ? 's' : ''} loaded.`}
        </p>
      </div>

      {data.items.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border text-muted-foreground">
          <Database className="h-8 w-8 opacity-40" />
          <p className="text-sm">No secondary datasets ingested yet.</p>
          <p className="text-xs">
            Use the API endpoint <code className="rounded bg-muted px-1">POST /datasets/ingest/lisgis</code> to trigger ingestion.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Dataset</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Source Agency</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Collection Period</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Ingested</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Data Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((ds) => (
                  <tr key={ds.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{ds.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                        {ds.methodology}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{ds.sourceAgency}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(ds.collectionStart).getFullYear()}
                      {' – '}
                      {new Date(ds.collectionEnd).getFullYear()}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(ds.ingestedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-foreground">
                      {ds._count.dataPoints.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Page {data.page} of {data.totalPages} ({data.total} total)
              </p>
            </div>
          )}
        </div>
      )}

      <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Data ingestion</p>
        <p className="mt-1">
          To ingest a new dataset, upload the CSV to the <code>gb-mis-secondary-data</code> MinIO bucket,
          then trigger ingestion via the API. Ingested data points are initially marked{' '}
          <span className="font-mono text-xs">UNVERIFIED</span>. An M&amp;E officer must review and
          promote them to <span className="font-mono text-xs">VERIFIED</span> before they appear in
          indicator computations.
        </p>
      </div>
    </div>
  );
}
