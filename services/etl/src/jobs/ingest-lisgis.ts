/**
 * LISGIS / HIES / Labour-Force-Survey data ingestion.
 *
 * LISGIS (Liberia Institute of Statistics and Geo-Information Services)
 * is the custodian agency for population, household and labour statistics.
 * This job consumes a LISGIS-format CSV exported from their published datasets
 * and upserts rows into `secondary_data_points`.
 *
 * CSV contract (agreed with M&E team, ref DATA_SHARING_AGREEMENT.md):
 *   county_code,variable,value,period_start,period_end,sex,age_group
 *   LBR,ADULT_FEMALE_LITERACY_RATE,0.547,2019-01-01,2019-12-31,,15+
 *   LBR-BOM,FEMALE_LABOUR_FORCE_PARTICIPATION,0.631,2022-01-01,2022-12-31,F,15+
 *
 * county_code must be an OrgUnit.code in the database (LBR, LBR-BOM, LBR-GBP, etc.).
 * sex: M | F | (blank = both sexes combined).
 * age_group: free-text bracket, e.g. "15-49", "15+" — not validated here, stored as-is.
 */

import { parse } from 'csv-parse';
import type { Job } from 'bullmq';
import { prisma } from '@gb-mis/db';
import { INDICATOR_CATALOG } from '@gb-mis/indicators';

import { createS3Client, getObjectStream } from '../lib/s3';

export interface IngestLisgisJobData {
  /** MinIO object key for the CSV file. */
  fileKey: string;
  /** Reference year for the dataset (used in dataset name). */
  year: number;
  /** Source type label — drives `methodology` and `name` of the SecondaryDataset. */
  dataType: 'POPULATION' | 'HIES' | 'LABOUR_FORCE' | 'DHS_TABULATION';
  /** Optional: human-readable methodology description to store with the dataset record. */
  methodology?: string;
  /** Optional: MinIO key of the accompanying documentation PDF. */
  documentationObjectKey?: string;
  /**
   * Optional: existing SecondaryDataset id to replace.
   * When provided the old data points are deleted and replaced within a transaction.
   */
  replaceDatasetId?: string;
}

export interface IngestLisgisResult {
  datasetId: string;
  ingested: number;
  skipped: number;
  errors: string[];
}

// GB MIS variable name → indicator code mapping.
// These are the variable names LISGIS uses in their CSV exports.
// Extend as the M&E team agrees on additional mappings.
const VARIABLE_TO_INDICATOR_CODE: Readonly<Record<string, string>> = {
  ADULT_FEMALE_LITERACY_RATE: 'BPfA-EDU-003',
  FEMALE_LABOUR_FORCE_PARTICIPATION: 'BPfA-WRK-001',
  GENDER_WAGE_GAP: 'BPfA-WRK-002',
  MATERNAL_MORTALITY_RATIO: 'BPfA-HLT-001',
  MODERN_CONTRACEPTIVE_PREVALENCE: 'BPfA-HLT-002',
  MARRIED_BEFORE_18: 'BPfA-HLT-003',
  PHYSICAL_SEXUAL_VIOLENCE_PREVALENCE: 'BPfA-GBV-001',
  SAFE_WATER_SANITATION_ACCESS: 'BPfA-WSH-001',
  WOMEN_LAND_OWNERSHIP: 'BPfA-AGR-001',
};

const DATA_TYPE_LABELS: Record<IngestLisgisJobData['dataType'], string> = {
  POPULATION: 'Population Census',
  HIES: 'Household Income and Expenditure Survey (HIES)',
  LABOUR_FORCE: 'Labour Force Survey (LFS)',
  DHS_TABULATION: 'Demographic and Health Survey (DHS) — Tabulated',
};

type CsvRow = {
  county_code: string;
  variable: string;
  value: string;
  period_start: string;
  period_end: string;
  sex: string;
  age_group: string;
};

export async function ingestLisgis(
  job: Job<IngestLisgisJobData>,
): Promise<IngestLisgisResult> {
  const { fileKey, year, dataType, methodology, documentationObjectKey, replaceDatasetId } =
    job.data;

  const bucket = process.env['S3_BUCKET_SECONDARY_DATA'] ?? 'gb-mis-secondary-data';
  const s3 = createS3Client();

  // Download the file from MinIO.
  const stream = await getObjectStream(s3, bucket, fileKey);

  // Parse CSV rows into memory.
  const rawRows = await parsecsv(stream);

  // Cache orgUnit lookup to avoid N+1 queries.
  const orgUnitCache = new Map<string, string>(); // code → id

  // Pre-load indicator ids for variables we know about.
  const indicatorIdCache = await loadIndicatorIds();

  const errors: string[] = [];
  const validRows: {
    orgUnitId: string;
    indicatorId: string | null;
    variable: string;
    value: number;
    periodStart: Date;
    periodEnd: Date;
    disaggregations: Record<string, string>;
  }[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i]!;
    const rowLabel = `row ${i + 2}`; // +2: 1-indexed, header occupies row 1

    // Validate required fields.
    if (!row.county_code || !row.variable || !row.value || !row.period_start || !row.period_end) {
      errors.push(`${rowLabel}: missing required field(s)`);
      continue;
    }

    const numericValue = parseFloat(row.value);
    if (isNaN(numericValue)) {
      errors.push(`${rowLabel}: value "${row.value}" is not numeric`);
      continue;
    }

    const periodStart = new Date(row.period_start);
    const periodEnd = new Date(row.period_end);
    if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
      errors.push(`${rowLabel}: invalid date(s) — period_start="${row.period_start}" period_end="${row.period_end}"`);
      continue;
    }
    if (periodStart > periodEnd) {
      errors.push(`${rowLabel}: period_start is after period_end`);
      continue;
    }

    // Resolve orgUnit.
    let orgUnitId = orgUnitCache.get(row.county_code);
    if (!orgUnitId) {
      const orgUnit = await prisma.orgUnit.findUnique({
        where: { code: row.county_code },
        select: { id: true },
      });
      if (!orgUnit) {
        errors.push(`${rowLabel}: unknown county_code "${row.county_code}"`);
        continue;
      }
      orgUnitCache.set(row.county_code, orgUnit.id);
      orgUnitId = orgUnit.id;
    }

    const disaggregations: Record<string, string> = {};
    if (row.sex) disaggregations['sex'] = row.sex;
    if (row.age_group) disaggregations['ageGroup'] = row.age_group;

    validRows.push({
      orgUnitId,
      indicatorId: indicatorIdCache.get(row.variable) ?? null,
      variable: row.variable,
      value: numericValue,
      periodStart,
      periodEnd,
      disaggregations,
    });
  }

  // Persist in a transaction.
  const datasetId = await prisma.$transaction(async (tx) => {
    // If replacing an existing dataset, delete its data points first.
    if (replaceDatasetId) {
      await tx.secondaryDataPoint.deleteMany({ where: { datasetId: replaceDatasetId } });
    }

    const datasetName = `LISGIS ${DATA_TYPE_LABELS[dataType]} ${year}`;
    const now = new Date();

    let dsId: string;
    if (replaceDatasetId) {
      await tx.secondaryDataset.update({
        where: { id: replaceDatasetId },
        data: {
          name: datasetName,
          ingestedAt: now,
          methodology: methodology ?? DATA_TYPE_LABELS[dataType],
          ...(documentationObjectKey !== undefined && { documentationObjectKey }),
        },
      });
      dsId = replaceDatasetId;
    } else {
      const dataset = await tx.secondaryDataset.create({
        data: {
          name: datasetName,
          sourceAgency: 'LISGIS',
          collectionStart: new Date(`${year}-01-01`),
          collectionEnd: new Date(`${year}-12-31`),
          ingestedAt: now,
          methodology: methodology ?? DATA_TYPE_LABELS[dataType],
          ...(documentationObjectKey !== undefined && { documentationObjectKey }),
        },
      });
      dsId = dataset.id;
    }

    // Insert valid rows in batches of 500.
    const BATCH = 500;
    for (let offset = 0; offset < validRows.length; offset += BATCH) {
      const batch = validRows.slice(offset, offset + BATCH);
      await tx.secondaryDataPoint.createMany({
        data: batch.map((r) => ({
          datasetId: dsId,
          indicatorId: r.indicatorId,
          orgUnitId: r.orgUnitId,
          periodStart: r.periodStart,
          periodEnd: r.periodEnd,
          variable: r.variable,
          value: r.value,
          disaggregations: r.disaggregations,
          qualityFlag: 'UNVERIFIED',
        })),
      });
      await job.updateProgress({ processed: offset + batch.length, total: validRows.length });
    }

    return dsId;
  });

  return {
    datasetId,
    ingested: validRows.length,
    skipped: rawRows.length - validRows.length,
    errors,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parsecsv(stream: NodeJS.ReadableStream): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    const rows: CsvRow[] = [];
    stream
      .pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true,
        }),
      )
      .on('data', (row: CsvRow) => rows.push(row))
      .on('error', reject)
      .on('end', () => resolve(rows));
  });
}

async function loadIndicatorIds(): Promise<Map<string, string>> {
  const variableCodes = Object.keys(VARIABLE_TO_INDICATOR_CODE);
  const indicatorCodes = Object.values(VARIABLE_TO_INDICATOR_CODE);

  const indicators = await prisma.indicator.findMany({
    where: { code: { in: indicatorCodes } },
    select: { id: true, code: true },
  });

  const codeToId = new Map(indicators.map((i) => [i.code, i.id]));

  return new Map(
    variableCodes
      .map((variable): [string, string] | null => {
        const indicatorCode = VARIABLE_TO_INDICATOR_CODE[variable];
        const id = indicatorCode ? codeToId.get(indicatorCode) : undefined;
        return id ? [variable, id] : null;
      })
      .filter((entry): entry is [string, string] => entry !== null),
  );
}

