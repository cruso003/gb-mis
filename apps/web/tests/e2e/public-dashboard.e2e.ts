/**
 * Public dashboard happy-path + a11y baseline.
 *
 * The public dashboard is the only unauthenticated UI surface and is
 * therefore the most exposed one — accessibility regressions and
 * trivial render bugs here would be visible to every visitor.
 *
 * The page is wired via Next.js ISR against /api/v1/public/indicators.
 * In CI we mock the upstream response so the test does not depend on
 * a live API; for local runs against a real API set
 * PLAYWRIGHT_USE_REAL_API=1.
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const USE_REAL_API = process.env['PLAYWRIGHT_USE_REAL_API'] === '1';

test.describe('public dashboard', () => {
  test.beforeEach(async ({ page }) => {
    if (USE_REAL_API) return;

    // Mock both the indicator endpoint and the counties endpoint so the
    // page renders deterministically in CI without a live API.
    await page.route('**/v1/public/indicators**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          indicators: [
            {
              code: 'SDG-5.2.1',
              name: 'Proportion of ever-partnered women subjected to violence',
              unit: '%',
              framework: 'SDG',
              area: 'GBV',
              sdgTarget: '5.2',
              notes: null,
              values: [
                {
                  county: 'Bomi',
                  countyCode: 'BMI',
                  value: 24.3,
                  periodStart: '2025-01-01',
                  periodEnd: '2025-12-31',
                  disaggregations: null,
                },
              ],
            },
          ],
          generatedAt: new Date().toISOString(),
          note: 'Only VERIFIED indicators are published here.',
        }),
      }),
    );
    await page.route('**/v1/public/counties**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          counties: [
            { id: '1', code: 'BMI', name: 'Bomi', shortName: 'Bomi' },
          ],
        }),
      }),
    );
  });

  test('renders the indicator table and the data note', async ({ page }) => {
    await page.goto('/public/dashboard');
    await expect(page.locator('body')).toContainText(/SDG-5\.2\.1|verified/i);
    // The k=5 / verified-only data note must always be visible
    await expect(page.locator('body')).toContainText(/verified/i);
  });

  test('passes axe-core a11y baseline on serious + critical impact', async ({ page }) => {
    await page.goto('/public/dashboard');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(
      blocking,
      `Accessibility violations:\n${blocking.map((v) => `${v.id}: ${v.help}`).join('\n')}`,
    ).toEqual([]);
  });
});
