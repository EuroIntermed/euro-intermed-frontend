import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright UI smoke suite (contract Faza 1C E2E, A1.4.a — frontend half).
 *
 * Goal: a lightweight, DETERMINISTIC smoke that the deployed UIs load and the
 * critical surfaces render. It does NOT drive a full LLM conversation (that is
 * non-deterministic). Every target URL is env-driven with a sensible default so
 * the same suite runs unchanged against staging or prod.
 *
 * Target env vars (all optional; documented defaults in e2e/README.md):
 *   - E2E_DASHBOARD_URL        dashboard SPA (also the Playwright baseURL)
 *   - E2E_WIDGET_URL           a public page that embeds the chat widget
 *   - E2E_SITE_ANGROSIST_URL   marketing site (default https://angrosist.ro)
 *   - E2E_SITE_EUROINTERMED_URL marketing site (default https://euro-intermed.ro)
 *   - E2E_SITE_PALLET_URL      marketing site (default https://pallet-clearance.eu)
 *
 * Chromium only — this is a smoke, not a cross-browser matrix.
 */
export default defineConfig({
  testDir: './e2e',
  // Public sites can be slow on cold CDN; keep per-test budget generous but
  // finite so a hung target fails fast rather than hanging CI.
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    // Dashboard base URL. Specs that hit a different target read their own env
    // var and pass an absolute URL to page.goto().
    baseURL: process.env.E2E_DASHBOARD_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: false,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
})
