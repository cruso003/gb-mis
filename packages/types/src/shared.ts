export type Brand<T, B extends string> = T & { readonly __brand: B };

export type UserId = Brand<string, 'UserId'>;
export type OrgUnitId = Brand<string, 'OrgUnitId'>;
export type CaseId = Brand<string, 'CaseId'>;
export type BeneficiaryId = Brand<string, 'BeneficiaryId'>;
export type IndicatorId = Brand<string, 'IndicatorId'>;
export type AuditEventId = Brand<string, 'AuditEventId'>;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  path?: string;
  timestamp?: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  data: T;
  requestId: string;
}
