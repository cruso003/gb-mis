/**
 * Typed HTTP client for the DHIS2 Web API.
 * DHIS2 is an interoperability peer — not the primary system.
 * Indicator data flows GB MIS → DHIS2 on a scheduled push (not real-time).
 */

const DHIS2_BASE = process.env['DHIS2_BASE_URL'] ?? '';
const DHIS2_USER = process.env['DHIS2_USERNAME'] ?? '';
const DHIS2_PASS = process.env['DHIS2_PASSWORD'] ?? '';

const auth = Buffer.from(`${DHIS2_USER}:${DHIS2_PASS}`).toString('base64');

async function dhis2Fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${DHIS2_BASE}/api/${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`DHIS2 ${options.method ?? 'GET'} ${path} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface Dhis2DataValue {
  dataElement: string;
  period: string;
  orgUnit: string;
  value: string;
  comment?: string;
}

export interface Dhis2DataValueSet {
  dataValues: Dhis2DataValue[];
}

export const dhis2Client = {
  postDataValueSet: (body: Dhis2DataValueSet) =>
    dhis2Fetch<{ status: string; importCount: Record<string, number> }>('dataValueSets', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getOrgUnits: (params?: { level?: number; fields?: string }) => {
    const q = new URLSearchParams();
    if (params?.level) q.set('level', String(params.level));
    q.set('fields', params?.fields ?? 'id,name,code,level,parent');
    return dhis2Fetch<{ organisationUnits: Record<string, unknown>[] }>(`organisationUnits?${q.toString()}`);
  },
};
