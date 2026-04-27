/**
 * Mobile i18n — lightweight translation helper.
 *
 * Phase 1 ships English only per ROADMAP.md. The shape of this module
 * matches the web app's next-intl usage so a future second locale can
 * be wired without changing call sites: components only see `t(key)`
 * with optional ICU-style placeholders.
 *
 * Future locale work:
 *   1. Drop `apps/mobile/src/i18n/<locale>.json` next to en.json
 *   2. Add the locale to LOCALES below
 *   3. Decide locale source: device locale via `expo-localization` is
 *      the obvious default, but a per-user preference stored on the
 *      server is more accurate for users who travel between counties
 *   4. Confirm UI re-renders on locale change (this module is
 *      currently synchronous; switching at runtime needs a context
 *      provider)
 */

import en from './en.json';

const LOCALES = ['en'] as const;
type Locale = (typeof LOCALES)[number];

const CATALOGS: Record<Locale, Record<string, unknown>> = { en };

let currentLocale: Locale = 'en';

export function setLocale(locale: Locale): void {
  if (!LOCALES.includes(locale)) return;
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

/**
 * Translate a dotted key against the current locale.
 *
 * Supports ICU-style {placeholder} substitution. Plurals use the
 * `{count, plural, ...}` form for symmetry with next-intl. Falls
 * back to the key itself if a translation is missing — so missing
 * keys are obvious in the UI rather than rendering as blank.
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const raw = lookup(CATALOGS[currentLocale], key);
  if (raw === undefined) return key;
  return interpolate(raw, params);
}

function lookup(obj: Record<string, unknown>, key: string): string | undefined {
  const segments = key.split('.');
  let cursor: unknown = obj;
  for (const segment of segments) {
    if (cursor && typeof cursor === 'object' && segment in (cursor as Record<string, unknown>)) {
      cursor = (cursor as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return typeof cursor === 'string' ? cursor : undefined;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;

  // Plural form: {var, plural, =0 {none} =1 {one} other {# many}}
  const pluralMatch = /^\{(\w+),\s*plural,\s*(.+)\}$/s.exec(template);
  if (pluralMatch) {
    const [, varName, body] = pluralMatch;
    const count = Number(params[varName ?? '']);
    if (!Number.isNaN(count)) {
      return resolvePlural(body ?? '', count);
    }
  }

  return template.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const value = params[name];
    return value === undefined ? `{${name}}` : String(value);
  });
}

function resolvePlural(body: string, count: number): string {
  // Find branches: =N {text} and other {text}.
  const branches = new Map<string, string>();
  const re = /(=\d+|other)\s*\{([^{}]*)\}/g;
  let match;
  while ((match = re.exec(body)) !== null) {
    branches.set(match[1] ?? '', match[2] ?? '');
  }
  const exact = branches.get(`=${count}`);
  if (exact !== undefined) return exact.replace(/#/g, String(count));
  const other = branches.get('other') ?? '';
  return other.replace(/#/g, String(count));
}
