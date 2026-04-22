/**
 * Stub: Ingest DHS (Demographic and Health Survey) data for Liberia.
 *
 * DHS provides nationally representative survey data used as official
 * denominators and baseline values for health and gender indicators.
 *
 * The DHS program publishes microdata via dhsprogram.com. Ingestion requires
 * a data use agreement with DHS program and mapping of their variable names
 * to GB MIS indicator codes (coordinate with M&E team in Inception sprint).
 */
import type { Job } from 'bullmq';
import { prisma } from '@gb-mis/db';

export interface IngestDhsJobData {
  fileKey: string;
  surveyYear: number;
  indicatorMappingVersion: string;
}

export async function ingestDhs(job: Job<IngestDhsJobData>): Promise<{ ingested: number }> {
  const { fileKey, surveyYear, indicatorMappingVersion } = job.data;

  void prisma;
  void fileKey;
  void surveyYear;
  void indicatorMappingVersion;

  return { ingested: 0 };
}
