/**
 * Dhis2Client tests.
 *
 * Covers the contract the upstream jobs depend on:
 *   - PAT auth header takes precedence over basic
 *   - 4xx is NOT retried (payload bug — retry won't fix it)
 *   - 5xx IS retried with backoff up to maxAttempts
 *   - getOrganisationUnits walks pagination
 *   - Constructor refuses to build without auth credentials
 */

import { describe, expect, it, vi } from 'vitest';

import { Dhis2Client, Dhis2HttpError } from './dhis2-client';

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}

describe('Dhis2Client — auth', () => {
  it('prefers ApiToken when apiToken is provided', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    const client = new Dhis2Client({
      baseUrl: 'http://dhis.test',
      apiToken: 'pat-xyz',
      fetchImpl: fetchImpl as never,
    });
    await client.ping();
    const headers = (fetchImpl.mock.calls[0]?.[1] as { headers: Record<string, string> }).headers;
    expect(headers.Authorization).toBe('ApiToken pat-xyz');
  });

  it('falls back to Basic when only username/password supplied', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    const client = new Dhis2Client({
      baseUrl: 'http://dhis.test',
      username: 'admin',
      password: 'district',
      fetchImpl: fetchImpl as never,
    });
    await client.ping();
    const headers = (fetchImpl.mock.calls[0]?.[1] as { headers: Record<string, string> }).headers;
    expect(headers.Authorization).toMatch(/^Basic /);
  });

  it('refuses to build without auth credentials', () => {
    expect(
      () =>
        new Dhis2Client({
          baseUrl: 'http://dhis.test',
        }),
    ).toThrow(/apiToken/);
  });

  it('refuses to build without a baseUrl', () => {
    expect(
      () =>
        new Dhis2Client({
          baseUrl: '',
          apiToken: 'x',
        }),
    ).toThrow(/baseUrl/);
  });
});

describe('Dhis2Client — retry and error handling', () => {
  it('does NOT retry a 400 (payload bug)', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('bad request', { status: 400 }));
    const client = new Dhis2Client({
      baseUrl: 'http://dhis.test',
      apiToken: 'x',
      fetchImpl: fetchImpl as never,
      maxAttempts: 3,
    });
    await expect(client.postDataValueSet({ dataValues: [] })).rejects.toBeInstanceOf(
      Dhis2HttpError,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry a 401 or 403', async () => {
    for (const status of [401, 403]) {
      const fetchImpl = vi.fn().mockResolvedValue(new Response('forbidden', { status }));
      const client = new Dhis2Client({
        baseUrl: 'http://dhis.test',
        apiToken: 'x',
        fetchImpl: fetchImpl as never,
        maxAttempts: 3,
      });
      const ok = await client.ping();
      expect(ok).toBe(false); // ping swallows the error and returns false
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    }
  });

  it('DOES retry a 500 up to maxAttempts and then surfaces the error', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('boom', { status: 500 }));
    const client = new Dhis2Client({
      baseUrl: 'http://dhis.test',
      apiToken: 'x',
      fetchImpl: fetchImpl as never,
      maxAttempts: 3,
    });
    await expect(
      client.postDataValueSet({ dataValues: [] }),
    ).rejects.toBeInstanceOf(Dhis2HttpError);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  }, 20_000); // backoff sleeps are short but accumulate

  it('returns the parsed body on success', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({
          status: 'SUCCESS',
          importCount: { imported: 5, updated: 0, ignored: 0, deleted: 0 },
        }),
      );
    const client = new Dhis2Client({
      baseUrl: 'http://dhis.test',
      apiToken: 'x',
      fetchImpl: fetchImpl as never,
    });
    const res = await client.postDataValueSet({ dataValues: [] });
    expect(res.status).toBe('SUCCESS');
    expect(res.importCount.imported).toBe(5);
  });
});

describe('Dhis2Client — getOrganisationUnits pagination', () => {
  it('walks pageCount pages and concatenates results', async () => {
    const fetchImpl = vi
      .fn()
      // page 1 — 2 of 3
      .mockResolvedValueOnce(
        jsonResponse({
          organisationUnits: [
            { id: 'a', name: 'A', level: 2 },
            { id: 'b', name: 'B', level: 2 },
          ],
          pager: { pageCount: 2 },
        }),
      )
      // page 2 — 1 of 3
      .mockResolvedValueOnce(
        jsonResponse({
          organisationUnits: [{ id: 'c', name: 'C', level: 2 }],
          pager: { pageCount: 2 },
        }),
      );
    const client = new Dhis2Client({
      baseUrl: 'http://dhis.test',
      apiToken: 'x',
      fetchImpl: fetchImpl as never,
    });
    const all = await client.getOrganisationUnits({ level: 2 });
    expect(all).toHaveLength(3);
    expect(all.map((o) => o.id)).toEqual(['a', 'b', 'c']);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('stops when pager is missing (single-page response)', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        organisationUnits: [{ id: 'a', name: 'A', level: 2 }],
      }),
    );
    const client = new Dhis2Client({
      baseUrl: 'http://dhis.test',
      apiToken: 'x',
      fetchImpl: fetchImpl as never,
    });
    const all = await client.getOrganisationUnits({ level: 2 });
    expect(all).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
