export type Brand<T, B extends string> = T & { readonly __brand: B };

export type UserId = Brand<string, 'UserId'>;
export type OrgUnitId = Brand<string, 'OrgUnitId'>;
export type CaseId = Brand<string, 'CaseId'>;
export type BeneficiaryId = Brand<string, 'BeneficiaryId'>;
export type IndicatorId = Brand<string, 'IndicatorId'>;
export type AuditEventId = Brand<string, 'AuditEventId'>;

export interface Paginated<T> {
  data: T[];
  meta: {
    total: number;
    nextCursor: string | null;
    prevCursor: string | null;
  };
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  requestId: string;
}

export interface ApiResponse<T> {
  data: T;
  requestId: string;
}
