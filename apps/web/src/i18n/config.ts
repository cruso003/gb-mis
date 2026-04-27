/**
 * Locale configuration.
 *
 * Phase 1 ships English only per ROADMAP.md. The list below is the
 * single source of truth — adding a second locale (Liberian Pidgin
 * English, French for cross-border partners, etc.) means: drop a new
 * JSON file in `apps/web/messages/`, add the code to `LOCALES`,
 * confirm the workflow in `docs/i18n.md`, and ship a translation
 * review by the M&E officer + DPO.
 *
 * The choice of next-intl over next-i18next is deliberate — next-intl
 * is App Router-native, supports server components, and produces
 * smaller client bundles. See the consultant's recommendation in the
 * Inception Report.
 */

export const LOCALES = ['en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
