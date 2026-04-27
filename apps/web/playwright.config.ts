import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env['PLAYWRIGHT_PORT'] ?? 3010);
const baseURL = process.env['PLAYWRIGHT_BASE_URL'] ?? `http://127.0.0.1:${port}`;

/**
 * Playwright configuration for the GB MIS web app.
 *
 * In CI, the test runner builds the Next.js app once and starts it
 * via `next start --port 3010` so we are testing the production build.
 * Locally, set PLAYWRIGHT_BASE_URL to a running dev server to skip
 * the build.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  ...(process.env['PLAYWRIGHT_BASE_URL']
    ? {}
    : {
        webServer: {
          command: `pnpm next start --port ${port}`,
          port,
          reuseExistingServer: !process.env['CI'],
          timeout: 120_000,
        },
      }),
});
