import type {
  IndicatorFramework,
  Periodicity,
  Disaggregation,
  QualityFlag,
} from '@gb-mis/types';

export interface IndicatorMeta {
  code: string;
  name: string;
  description: string;
  framework: IndicatorFramework;
  area: string;
  unit: string;
  periodicity: Periodicity;
  disaggregations: Disaggregation[];
  custodianAgency: string;
  leadMinistry: string;
  formula: string | null;
  dhis2DataElementId: string | null;
  dhis2Sync: boolean;
  defaultQualityFlag: QualityFlag;
  sdgTarget: string | null;
  notes: string | null;
}

// The catalog is the human-readable source of truth.
// The database Indicator table is seeded from packages/db/seed/indicators.ts,
// which derives its content from this same source.
// Codes are permanent — never reuse a retired code.

export const INDICATOR_CATALOG: ReadonlyMap<string, IndicatorMeta> = new Map([
  // ── LWEP 22-indicator minimum set ─────────────────────────────────────────

  ['BPfA-REP-001', {
    code: 'BPfA-REP-001',
    name: 'Percentage of seats held by women in national parliament',
    description: 'Share of seats in the national parliament occupied by women.',
    framework: 'BPFA',
    area: 'Representation',
    unit: '%',
    periodicity: 'ANNUAL',
    disaggregations: [],
    custodianAgency: 'IPU / UN Women',
    leadMinistry: 'MOGCSP',
    formula: null,
    dhis2DataElementId: null,
    dhis2Sync: true,
    defaultQualityFlag: 'UNVERIFIED',
    sdgTarget: '5.5.1',
    notes: 'Source: IPU Parline database + Liberia NEC.',
  }],

  ['BPfA-HLT-001', {
    code: 'BPfA-HLT-001',
    name: 'Maternal mortality ratio',
    description: 'Number of maternal deaths per 100,000 live births.',
    framework: 'BPFA',
    area: 'Health',
    unit: 'per 100,000 live births',
    periodicity: 'ANNUAL',
    disaggregations: ['LOCATION'],
    custodianAgency: 'WHO / UNICEF / UNFPA',
    leadMinistry: 'MoH',
    formula: 'computeMmrPer100k',
    dhis2DataElementId: null,
    dhis2Sync: true,
    defaultQualityFlag: 'UNVERIFIED',
    sdgTarget: '3.1.1',
    notes: 'Numerator: maternal deaths. Denominator: live births. Source: LISGIS DHS or MoH DHIS2.',
  }],

  ['BPfA-GBV-001', {
    code: 'BPfA-GBV-001',
    name: 'Prevalence of physical or sexual violence against women',
    description: 'Proportion of women who experienced physical or sexual violence in the last 12 months.',
    framework: 'BPFA',
    area: 'Violence',
    unit: '%',
    periodicity: 'EVERY_5Y',
    disaggregations: ['AGE', 'LOCATION'],
    custodianAgency: 'WHO / UNSD / UN Women',
    leadMinistry: 'MOGCSP',
    formula: null,
    dhis2DataElementId: null,
    dhis2Sync: false,
    defaultQualityFlag: 'UNVERIFIED',
    sdgTarget: '5.2.1',
    notes: 'Primary source: LISGIS DHS every 5 years. LWEP case data is secondary and not population-representative.',
  }],

  ['LWEP-OUT-C1-01', {
    code: 'LWEP-OUT-C1-01',
    name: 'Number of communities reached with SASA! social norms engagement',
    description: 'Count of communities with at least one completed SASA! session.',
    framework: 'LWEP',
    area: 'Component 1',
    unit: 'count',
    periodicity: 'QUARTERLY',
    disaggregations: ['LOCATION'],
    custodianAgency: 'MOGCSP PMU',
    leadMinistry: 'MOGCSP',
    formula: 'computeCommunitiesWithSasaSessions',
    dhis2DataElementId: null,
    dhis2Sync: false,
    defaultQualityFlag: 'PROVISIONAL',
    sdgTarget: null,
    notes: 'Computed from CommunitySession records. Not synced to DHIS2 — internal LWEP reporting only.',
  }],

  ['LWEP-OUT-C3-01', {
    code: 'LWEP-OUT-C3-01',
    name: 'Number of women receiving livelihood grants',
    description: 'Count of unique female beneficiaries with at least one DISBURSED livelihood grant.',
    framework: 'LWEP',
    area: 'Component 3',
    unit: 'count',
    periodicity: 'QUARTERLY',
    disaggregations: ['LOCATION'],
    custodianAgency: 'MOGCSP PMU',
    leadMinistry: 'MOGCSP',
    formula: 'computeLivelihoodGrantRecipients',
    dhis2DataElementId: null,
    dhis2Sync: false,
    defaultQualityFlag: 'PROVISIONAL',
    sdgTarget: null,
    notes: 'Computed from LivelihoodGrant records. LWEP internal reporting only.',
  }],

  ['LWEP-OUT-C5-01', {
    code: 'LWEP-OUT-C5-01',
    name: 'Data-completeness rate of the GB MIS across the six counties',
    description: 'Percentage of expected monthly indicator values populated with verified or provisional data.',
    framework: 'LWEP',
    area: 'Component 5',
    unit: '%',
    periodicity: 'MONTHLY',
    disaggregations: ['LOCATION'],
    custodianAgency: 'MOGCSP PMU',
    leadMinistry: 'MOGCSP',
    formula: 'computeDataCompletenessRate',
    dhis2DataElementId: null,
    dhis2Sync: false,
    defaultQualityFlag: 'PROVISIONAL',
    sdgTarget: null,
    notes: 'System-computed. Covers the 22 minimum-set indicators only.',
  }],
]);

export function getIndicator(code: string): IndicatorMeta | undefined {
  return INDICATOR_CATALOG.get(code);
}

export function getIndicatorsByFramework(framework: IndicatorFramework): IndicatorMeta[] {
  return Array.from(INDICATOR_CATALOG.values()).filter(
    (ind) => ind.framework === framework,
  );
}

export function getDhis2SyncableIndicators(): IndicatorMeta[] {
  return Array.from(INDICATOR_CATALOG.values()).filter((ind) => ind.dhis2Sync);
}
