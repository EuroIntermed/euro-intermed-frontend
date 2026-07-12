import { test, expect, type Page } from '@playwright/test'
import { DASHBOARD_URL } from './_env'

/**
 * Dashboard smoke. Deterministic surfaces only — we never attempt OTP login
 * (the email round-trip can't be automated here). We assert:
 *   1. the SPA loads and the login page renders (email/login form present),
 *   2. no uncaught JS exception fires during load,
 *   3. an unauthenticated visit to a protected route redirects to /login (the
 *      auth gate holds).
 */

/** Attach a pageerror collector; returns the accumulating list. */
function collectPageErrors(page: Page): Error[] {
  const errors: Error[] = []
  page.on('pageerror', (err) => errors.push(err))
  return errors
}

test.describe('dashboard', () => {
  test('login page renders with an email form and no uncaught errors', async ({
    page,
  }) => {
    const pageErrors = collectPageErrors(page)

    // Root redirects into /dashboard, which the auth gate bounces to /login.
    await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded' })

    // Land on the login screen (either directly or via the auth redirect).
    await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 })

    // The email step of the login card must be present. Assert structure, not
    // copy: an email input + a submit button, both keyboard-reachable.
    const emailField = page.locator('input[type="email"]')
    await expect(emailField).toBeVisible()
    await expect(emailField).toBeEditable()
    await expect(
      page.getByRole('button', { name: /.+/ }).first(),
    ).toBeVisible()

    // No uncaught exceptions during the initial render.
    expect(
      pageErrors,
      `uncaught page errors: ${pageErrors.map((e) => e.message).join(' | ')}`,
    ).toHaveLength(0)
  })

  test('protected route redirects to login when unauthenticated', async ({
    page,
  }) => {
    // A deep dashboard link with no token must land on /login (auth gate).
    await page.goto(`${DASHBOARD_URL.replace(/\/$/, '')}/dashboard/pipeline`, {
      waitUntil: 'domcontentloaded',
    })

    await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 })
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })
})
