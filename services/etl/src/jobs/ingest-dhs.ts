/**
 * DHS (Demographic and Health Survey) data ingestion.
 *
 * The Liberia DHS is conducted every ~5 years by LISGIS with DHS Program support.
 * This job consumes a tabulated CSV export — not raw microdata — derived from
 * the published DHS final report tables. Microdata access requires a DHS Program
 * data use agreement and is handled separately.
 *
 * CSV contract (agreed with M&E team, mapping version tracked in job data):
 *   county_code,dhs_variable,value,period_start,period_end,sex,age_group,wealth_quintile
 *   LBR,modern_cp_rate,31.4,2019-09-01,2020-02-28,F,15-49,
 *   LBR-BOM,married_before_18,42.1,2019-09-01,2020-02-28,F,20-24,
 *   LBR,ipv_12months,44.0,2019-09-01,2020-02-28,F,15-49,Q5
 *
 * county_code: OrgUnit.code (LBR for national estimates; LBR-BOM etc. for county breakdowns).
 * dhs_variable: key from the mapping below — not the raw SPSS variable name.
 * wealth_quintile: Q1 (lowest) – Q5 (highest), or blank for all-wealth combined.
 *
 * QUARANTINE: rows that fail validation are collected in the job result's `errors`
 * array. A future admin UI endpoint (/api/datasets/:id/quarantine) can surface these
 * to the data team for manual review. No rejected row is silently dropped.
 */

import { parse } from 'csv-parse';
import type { Job } from 'bullmq';
import { prisma } from '@gb-mis/db';

import { createS3Client, getObjectStream } from '../lib/s3';

export interface IngestDhsJobData {
  /** MinIO object key for the tabulated CSV export. */
  fileKey: string;
  /** DHS survey round year (e.g. 2019 for the 2019–20 Liberia DHS). */
  surveyYear: number;
  /**
   * Variable mapping version. Must match a key in DHS_VARIABLE_MAP below.
   * Increment when the tabulated export format changes between DHS rounds.
   */
  indicatorMappingVersion: '2019' | '2013';
  /** Optional methodology description stored with the dataset record. */
  methodology?: string;
  /** Optional: replace an existing SecondaryDataset (delete + recreate data points). */
  replaceDatasetId?: string;
}

export interface IngestDhsResult {
  datasetId: string;
  ingested: number;
  skipped: number;
  /** Quarantined rows with their reason. Surfaced to the data team for review. */
  errors: string[];
}

/**
 * Mapping from tabulated DHS variable name → GB MIS indicator code.
 * Each mapping version corresponds to a DHS round's tabulation export format.
 * Values in each map: { indicatorCode, unit }.
 */
const DHS_VARIABLE_MAP: Record<
  IngestDhsJobData['indicatorMappingVersion'],
  Record<string, { indicatorCode: string; unit: string }>
> = {
  '2019': {
    modern_cp_rate: { indicatorCode: 'BPfA-HLT-002', unit: '%' },
    any_cp_rate: { indicatorCode: 'BPfA-HLT-002', unit: '%' },
    married_before_18: { indicatorCode: 'BPfA-HLT-003', unit: '%' },
    ipv_12months: { indicatorCode: 'BPfA-GBV-001', unit: '%' },
    sexual_violence_12months: { indicatorCode: 'BPfA-GBV-001', unit: '%' },
    maternal_mortality_ratio: { indicatorCode: 'BPfA-HLT-001', unit: 'per 100,000 live births' },
    female_literacy_15_49: { indicatorCode: 'BPfA-EDU-003', unit: '%' },
    adolescent_birth_rate: { indicatorCode: 'BPfA-HLT-001', unit: 'per 1,000 women aged 15-19' },
  },
  '2013': {
    modern_cp_rate: { indicatorCode: 'BPfA-HLT-002', unit: '%' },
    married_before_18: { indicatorCode: 'BPfA-HLT-003', unit: '%' },
    ipv_12months: { indicatorCode: 'BPfA-GBV-001', unit: '%' },
    maternal_mortality_ratio: { indicatorCode: 'BPfA-HLT-001', unit: 'per 100,000 live births' },
    female_literacy_15_49: { indicatorCode: 'BPfA-EDU-003', unit: '%' },
  },
};

type CsvRow = {
  county_code: string;
  dhs_variable: string;
  value: string;
  period_start: string;
  period_end: string;
  sex: string;
  age_group: string;
  wealth_quintile: string;
};

export async function ingestDhs(job: Job<IngestDhsJobData>): Promise<IngestDhsResult> {
  const { fileKey, surveyYear, indicatorMappingVersion, methodology, replaceDatasetId } = job.data;

  const variableMap = DHS_VARIABLE_MAP[indicatorMappingVersion];
  const bucket = process.env['S3_BUCKET_SECONDARY_DATA'] ?? 'gb-mis-secondary-data';
  const s3 = createS3Client();

  const stream = await getObjectStream(s3, bucket, fileKey);
  const rawRows = await parseDhsCsv(stream);

  // Pre-load orgUnit and indicator caches.
  const orgUnitCache = new Map<string, string>();
  const indicatorIdCache = await loadDhsIndicatorIds(variableMap);

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
    const rowLabel = `row ${i + 2}`;

    // Required fields.
    if (!row.county_code || !row.dhs_variable || !row.value || !row.period_start || !row.period_end) {
      errors.push(`${rowLabel}: missing required field(s)`);
      continue;
    }

    // Value must be numeric.
    const numericValue = parseFloat(row.value);
    if (isNaN(numericValue)) {
      errors.push(`${rowLabel}: value "${row.value}" is not numeric`);
      continue;
    }

    // Date validation.
    const periodStart = new Date(row.period_start);
    const periodEnd = new Date(row.period_end);
    if (isNaN(periodStart.getTime()) || isNaN(periodEnd.getTime())) {
      errors.push(
        `${rowLabel}: invalid date(s) — period_start="${row.period_start}" period_end="${row.period_end}"`,
      );
      continue;
    }
    if (periodStart > periodEnd) {
      errors.push(`${rowLabel}: period_start is after period_end`);
      continue;
    }

    // OrgUnit lookup.
    let orgUnitId = orgUnitCache.get(row.county_code);
    if (!orgUnitId) {
      const orgUnit = await prisma.orgUnit.findUnique({
        where: { code: row.county_code },
        select: { id: true },
      });
      if (!orgUnit) {
        errors.push(`${rowLabel}: unknown county_code "${row.county_code}" — quarantined`);
        continue;
      }
      orgUnitCache.set(row.county_code, orgUnit.id);
      orgUnitId = orgUnit.id;
    }

    // Warn but do not quarantine unknown variables — store them without an indicatorId.
    if (!variableMap[row.dhs_variable]) {
      errors.push(
        `${rowLabel}: dhs_variable "${row.dhs_variable}" not in mapping version ${indicatorMappingVersion} — stored without indicator link`,
      );
    }

    const disaggregations: Record<string, string> = {};
    if (row.sex) disaggregations['sex'] = row.sex;
    if (row.age_group) disaggregations['ageGroup'] = row.age_group;
    if (row.wealth_quintile) disaggregations['wealthQuintile'] = row.wealth_quintile;

    validRows.push({
      orgUnitId,
      indicatorId: indicatorIdCache.get(row.dhs_variable) ?? null,
      variable: row.dhs_variable,
      value: numericValue,
      periodStart,
      periodEnd,
      disaggregations,
    });
  }

  const datasetId = await prisma.$transaction(async (tx) => {
    if (replaceDatasetId) {
      await tx.secondaryDataPoint.deleteMany({ where: { datasetId: replaceDatasetId } });
    }

    const datasetName = `Liberia DHS ${surveyYear} — Tabulation (mapping v${indicatorMappingVersion})`;
    const surveyStart = new Date(`${surveyYear}-01-01`);
    const surveyEnd = new Date(`${surveyYear + 1}-03-31`);
    const now = new Date();

    let dsId: string;
    if (replaceDatasetId) {
      await tx.secondaryDataset.update({
        where: { id: replaceDatasetId },
        data: {
          name: datasetName,
          ingestedAt: now,
          methodology: methodology ?? 'DHS Program nationally representative cluster survey',
        },
      });
      dsId = replaceDatasetId;
    } else {
      const dataset = await tx.secondaryDataset.create({
        data: {
          name: datasetName,
          sourceAgency: 'LISGIS / ICF DHS Program',
          collectionStart: surveyStart,
          collectionEnd: surveyEnd,
          ingestedAt: now,
          methodology: methodology ?? 'DHS Program nationally representative cluster survey',
        },
      });
      dsId = dataset.id;
    }

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

  return { datasetId, ingested: validRows.length, skipped: rawRows.length - validRows.length, errors };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDhsCsv(stream: NodeJS.ReadableStream): Promise<CsvRow[]> {
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

async function loadDhsIndicatorIds(
  variableMap: Record<string, { indicatorCode: string; unit: string }>,
): Promise<Map<string, string>> {
  const indicatorCodes = [...new Set(Object.values(variableMap).map((v) => v.indicatorCode))];
  const indicators = await prisma.indicator.findMany({
    where: { code: { in: indicatorCodes } },
    select: { id: true, code: true },
  });
  const codeToId = new Map(indicators.map((i) => [i.code, i.id]));

  return new Map(
    Object.entries(variableMap)
      .map(([variable, mapping]): [string, string] | null => {
        const id = codeToId.get(mapping.indicatorCode);
        return id ? [variable, id] : null;
      })
      .filter((entry): entry is [string, string] => entry !== null),
  );
}
