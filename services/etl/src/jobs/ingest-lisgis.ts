/**
 * Stub: Ingest LISGIS (Liberia Institute of Statistics and Geo-Information Services) data.
 *
 * LISGIS provides population statistics and administrative boundary data.
 * This job ingests their published CSV/shapefiles into the secondary_data_points table
 * as officially-sourced denominator data for indicator computation.
 *
 * Full implementation requires obtaining LISGIS data sharing agreement and
 * understanding their published dataset schema (coordinate with M&E team).
 */
import type { Job } from 'bullmq';
import { prisma } from '@gb-mis/db';

export interface IngestLisgisJobData {
  fileKey: string;
  year: number;
  dataType: 'POPULATION' | 'ADMINISTRATIVE_BOUNDARIES';
}

export async function ingestLisgis(job: Job<IngestLisgisJobData>): Promise<{ ingested: number }> {
  const { fileKey, year, dataType } = job.data;

  // Stub: download from MinIO, parse CSV, upsert into secondary_data_points
  void prisma;
  void fileKey;
  void year;
  void dataType;

  return { ingested: 0 };
}
