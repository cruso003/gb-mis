export const IndicatorFramework = {
  BPFA: 'BPFA',
  SDG: 'SDG',
  CEDAW: 'CEDAW',
  MAPUTO: 'MAPUTO',
  AU_WPS: 'AU_WPS',
  ARREST: 'ARREST',
  LWEP: 'LWEP',
  NATIONAL: 'NATIONAL',
} as const;

export type IndicatorFramework = (typeof IndicatorFramework)[keyof typeof IndicatorFramework];

export const IndicatorTier = {
  TIER_1: 1,
  TIER_2: 2,
  TIER_3: 3,
} as const;

export type IndicatorTier = (typeof IndicatorTier)[keyof typeof IndicatorTier];

export const Periodicity = {
  ANNUAL: 'ANNUAL',
  QUARTERLY: 'QUARTERLY',
  MONTHLY: 'MONTHLY',
  BIENNIAL: 'BIENNIAL',
  EVERY_5Y: 'EVERY_5Y',
  EVENT_DRIVEN: 'EVENT_DRIVEN',
} as const;

export type Periodicity = (typeof Periodicity)[keyof typeof Periodicity];

export const Disaggregation = {
  SEX: 'SEX',
  AGE: 'AGE',
  LOCATION: 'LOCATION',
  DISABILITY: 'DISABILITY',
  WEALTH_QUINTILE: 'WEALTH_QUINTILE',
} as const;

export type Disaggregation = (typeof Disaggregation)[keyof typeof Disaggregation];

export const IndicatorSource = {
  COMPUTED_FROM_CASES: 'COMPUTED_FROM_CASES',
  COMPUTED_FROM_BENEFICIARIES: 'COMPUTED_FROM_BENEFICIARIES',
  IMPORTED_LISGIS: 'IMPORTED_LISGIS',
  IMPORTED_MOH: 'IMPORTED_MOH',
  MANUAL_ENTRY: 'MANUAL_ENTRY',
  DHIS2_PULL: 'DHIS2_PULL',
} as const;

export type IndicatorSource = (typeof IndicatorSource)[keyof typeof IndicatorSource];

export const QualityFlag = {
  VERIFIED: 'VERIFIED',
  UNVERIFIED: 'UNVERIFIED',
  ESTIMATE: 'ESTIMATE',
  PROVISIONAL: 'PROVISIONAL',
} as const;

export type QualityFlag = (typeof QualityFlag)[keyof typeof QualityFlag];

export const SyncStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  SYNCED: 'SYNCED',
  CONFLICT: 'CONFLICT',
  ERROR: 'ERROR',
} as const;

export type SyncStatus = (typeof SyncStatus)[keyof typeof SyncStatus];

export const AuditAction = {
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  EXPORT: 'EXPORT',
  LOGIN: 'LOGIN',
  LOGIN_FAIL: 'LOGIN_FAIL',
  LOGOUT: 'LOGOUT',
  MFA_CHALLENGE: 'MFA_CHALLENGE',
  MFA_ENROLL: 'MFA_ENROLL',
  ROLE_GRANT: 'ROLE_GRANT',
  ROLE_REVOKE: 'ROLE_REVOKE',
  CONFIG_CHANGE: 'CONFIG_CHANGE',
  KEY_ROTATE: 'KEY_ROTATE',
  SYNC_PUSH: 'SYNC_PUSH',
  SYNC_PULL: 'SYNC_PULL',
  REPORT_GENERATE: 'REPORT_GENERATE',
  DATA_SUBJECT_REQUEST: 'DATA_SUBJECT_REQUEST',
  ERASURE_APPROVE: 'ERASURE_APPROVE',
  CASE_SUBMIT_FOR_REVIEW: 'CASE_SUBMIT_FOR_REVIEW',
  CASE_APPROVE: 'CASE_APPROVE',
  CASE_RETURN_FOR_REVISION: 'CASE_RETURN_FOR_REVISION',
  CASE_RESUBMIT_FOR_REVIEW: 'CASE_RESUBMIT_FOR_REVIEW',
} as const;

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];
