import { getRequestConfig } from 'next-intl/server';

import { DEFAULT_LOCALE } from './config';

/**
 * Server-side locale + messages resolver.
 *
 * Phase 1 always returns the default locale because there is only one
 * (English). When a second locale is added, this is the place that
 * inspects the cookie / accept-language header and returns the right
 * messages. The catalog file naming convention is
 * `apps/web/messages/<locale>.json`.
 */
export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
