/**
 * Typed HTTP client for the DHIS2 Web API.
 *
 * DHIS2 is an interoperability peer, not the primary system. Indicator
 * data flows GB MIS → DHIS2 on a scheduled push; org-unit metadata
 * flows DHIS2 → GB MIS on a slower cadence. See ARCHITECTURE.md and
 * services/dhis2-sync/README for the full data-flow rationale.
 *
 * Auth preference order:
 *   1. DHIS2_PAT — Personal Access Token (preferred, per DHIS2 2.40+).
 *      Carried as Authorization: ApiToken <token>.
 *   2. DHIS2_USERNAME + DHIS2_PASSWORD — basic auth fallback for older
 *      instances. Discouraged for production.
 *
 * Retry: every request gets up to N attempts with exponential backoff.
 * 5xx and network errors retry; 4xx do not (those are payload bugs
 * that retrying won't fix). The runbook deploy-verification step
 * relies on this: an outage of the DHIS2 instance must not produce
 * silent data loss — the BullMQ job stays in the queue with the
 * failure attached and the operator gets the metric.
 */

export interface Dhis2ClientConfig {
  baseUrl: string;
  apiToken?: string;
  username?: string;
  password?: string;
  timeoutMs?: number;
  maxAttempts?: number;
  fetchImpl?: typeof fetch; // injectable for tests
}

export interface Dhis2DataValue {
  dataElement: string;
  period: string;
  orgUnit: string;
  /**
   * DHIS2 requires a `categoryOptionCombo` for every data value. For
   * indicators with no disaggregation, this is the "default" combo
   * UID — set per-indicator in the mapping table.
   */
  categoryOptionCombo: string;
  /**
   * String even for numeric values — DHIS2 accepts a string and casts
   * server-side based on the data element type. Using a string also
   * preserves decimal precision across the wire.
   */
  value: string;
  comment?: string;
  storedBy?: string;
}

export interface Dhis2DataValueSetResponse {
  /**
   * DHIS2 returns 200 OK with an `importCount` object describing how
   * many values were imported, updated, ignored, or had conflicts.
   * A 200 response with non-zero `conflicts` is NOT a success.
   */
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  importCount: {
    imported: number;
    updated: number;
    ignored: number;
    deleted: number;
  };
  conflicts?: Array<{ object: string; value: string }>;
  description?: string;
}

export interface Dhis2OrgUnit {
  id: string;
  name: string;
  code?: string;
  level: number;
  parent?: { id: string; code?: string };
  shortName?: string;
}

export interface Dhis2OrgUnitsResponse {
  organisationUnits: Dhis2OrgUnit[];
}

export class Dhis2Client {
  private readonly fetchImpl: typeof fetch;
  private readonly authHeader: string;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;

  constructor(private readonly config: Dhis2ClientConfig) {
    if (!config.baseUrl) throw new Error('Dhis2Client: baseUrl is required');
    this.fetchImpl = config.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.maxAttempts = config.maxAttempts ?? 3;

    if (config.apiToken) {
      this.authHeader = `ApiToken ${config.apiToken}`;
    } else if (config.username && config.password) {
      const encoded = Buffer.from(`${config.username}:${config.password}`).toString('base64');
      this.authHeader = `Basic ${encoded}`;
    } else {
      throw new Error('Dhis2Client: provide apiToken OR (username + password)');
    }
  }

  async postDataValueSet(
    body: { dataValues: Dhis2DataValue[] },
    options: { importStrategy?: 'CREATE_AND_UPDATE' | 'CREATE' | 'UPDATE' | 'DELETE' } = {},
  ): Promise<Dhis2DataValueSetResponse> {
    const params = new URLSearchParams();
    // CREATE_AND_UPDATE is idempotent for our use case: pushing the
    // same indicator value twice updates, not duplicates.
    params.set('importStrategy', options.importStrategy ?? 'CREATE_AND_UPDATE');
    params.set('dryRun', 'false');
    params.set('skipAudit', 'false');
    return this.fetchJson<Dhis2DataValueSetResponse>('POST', `dataValueSets?${params}`, body);
  }

  async getOrganisationUnits(params: {
    /**
     * DHIS2 organisation-unit level. Liberia's WHO DHIS2 typically uses:
     * 1=National, 2=County, 3=District, 4=Facility. Confirm at Inception.
     */
    level?: number;
    /** Restrict to a subtree rooted at this DHIS2 orgUnit UID. */
    parentId?: string;
    /** DHIS2 fields selector — defaults cover everything we map. */
    fields?: string;
    pageSize?: number;
  } = {}): Promise<Dhis2OrgUnit[]> {
    const fields = params.fields ?? 'id,name,shortName,code,level,parent[id,code]';
    const pageSize = params.pageSize ?? 500;

    const collected: Dhis2OrgUnit[] = [];
    let page = 1;
    while (true) {
      const q = new URLSearchParams();
      q.set('fields', fields);
      q.set('pageSize', String(pageSize));
      q.set('page', String(page));
      q.set('paging', 'true');
      if (params.level !== undefined) q.set('level', String(params.level));
      if (params.parentId) q.set('filter', `path:like:${params.parentId}`);

      const res = await this.fetchJson<Dhis2OrgUnitsResponse & { pager?: { pageCount: number } }>(
        'GET',
        `organisationUnits?${q}`,
      );
      collected.push(...res.organisationUnits);
      if (!res.pager || page >= res.pager.pageCount) break;
      page++;
    }
    return collected;
  }

  async ping(): Promise<boolean> {
    // /api/me is the canonical healthcheck — confirms the token is
    // valid against the realm without touching any data.
    try {
      await this.fetchJson<unknown>('GET', 'me');
      return true;
    } catch {
      return false;
    }
  }

  private async fetchJson<T>(method: string, path: string, body?: unknown): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const res = await this.fetchImpl(`${this.config.baseUrl}/api/${path}`, {
          method,
          headers: {
            Authorization: this.authHeader,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          ...(body !== undefined && { body: JSON.stringify(body) }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
          // 4xx is not retried — it's a payload or auth bug.
          const text = await res.text().catch(() => '');
          const err = new Dhis2HttpError(
            `DHIS2 ${method} /api/${path} → ${res.status}`,
            res.status,
            text,
          );
          if (res.status >= 400 && res.status < 500) throw err;
          lastErr = err;
        } else {
          return (await res.json()) as T;
        }
      } catch (err) {
        clearTimeout(timeout);
        if (err instanceof Dhis2HttpError && err.status >= 400 && err.status < 500) throw err;
        lastErr = err;
      }
      // Exponential backoff: 500ms, 1500ms, 4500ms…
      if (attempt < this.maxAttempts) {
        const delay = 500 * Math.pow(3, attempt - 1);
        await sleep(delay);
      }
    }
    throw lastErr instanceof Error
      ? lastErr
      : new Error(`DHIS2 ${method} /api/${path} failed after ${this.maxAttempts} attempts`);
  }
}

export class Dhis2HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly responseBody: string,
  ) {
    super(message);
    this.name = 'Dhis2HttpError';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Build a Dhis2Client from process.env. Throws if config is missing —
 * the job runner is expected to call this once at boot.
 */
export function buildDhis2ClientFromEnv(): Dhis2Client {
  const baseUrl = process.env['DHIS2_BASE_URL'];
  if (!baseUrl) throw new Error('DHIS2_BASE_URL is not set');
  const apiToken = process.env['DHIS2_PAT'];
  const username = process.env['DHIS2_USERNAME'];
  const password = process.env['DHIS2_PASSWORD'];
  return new Dhis2Client({
    baseUrl,
    ...(apiToken !== undefined && { apiToken }),
    ...(username !== undefined && { username }),
    ...(password !== undefined && { password }),
  });
}
