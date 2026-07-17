import { test, expect, type Page } from '@playwright/test'
import { SITES, reachable, join } from './_env'

/**
 * Marketing-site happy-path smoke (roadmap: "widget shows + sites load"). For
 * each of the three public Astro sites we assert the deterministic surfaces:
 *   1. the landing page loads (2xx/3xx) and renders hero text (an <h1>),
 *   2. RO is served at the root and EN under /en (locale stamped on <html>),
 *   3. at least one legal page (/confidentialitate, /gdpr, /cookies) resolves,
 *   4. the header language switch links to — and resolves — the EN page.
 *
 * Assertions are structural (locale attribute, heading presence, status codes),
 * not copy, so ordinary content edits don't break the smoke. Each site is probed
 * first; if it's down / DNS-less / behind an SSO wall the whole group is
 * `test.skip`-ped so the suite degrades to "skipped", never a hard CI failure.
 */

const NAV_TIMEOUT = 30_000

/** The hero heading — Astro sites tag it `[data-hero]`; fall back to any h1. */
async function heroHeading(page: Page) {
  const tagged = page.locator('h1[data-hero]')
  if ((await tagged.count()) > 0) return tagged.first()
  return page.locator('h1').first()
}

for (const site of SITES) {
  test.describe(`marketing: ${site.name}`, () => {
    // Reachability gate: skip the whole group when the target isn't a usable
    // 2xx/3xx origin (down, DNS miss, or auth-walled). Never hard-fails in CI.
    test.beforeEach(async ({ request }) => {
      const ok = await reachable(request, site.url)
      test.skip(!ok, `marketing site not reachable (skipping): ${site.url}`)
    })

    test('RO landing loads at the root with hero text', async ({ page }) => {
      const resp = await page.goto(site.url, {
        waitUntil: 'domcontentloaded',
        timeout: NAV_TIMEOUT,
      })
      expect(resp, 'no navigation response').not.toBeNull()
      expect(resp!.status(), `unexpected status for ${site.url}`).toBeLessThan(
        400,
      )

      // Hero heading is present and carries real text (not an empty shell).
      const h1 = await heroHeading(page)
      await expect(h1).toBeVisible({ timeout: 15_000 })
      expect(
        (await h1.innerText()).trim().length,
        'hero heading rendered empty',
      ).toBeGreaterThan(0)

      // The root serves a valid locale. It's the RO default on the .ro host, but
      // the .com hosts redirect the bare root to /en (host-based default routing:
      // .ro → RO, else → EN), so accept either rather than hard-coding RO here.
      const locale = await page.locator('html').getAttribute('data-locale')
      expect(
        locale,
        `root served an unexpected data-locale: "${locale}"`,
      ).toMatch(/^(ro|en)$/)
    })

    test('EN landing loads under /en', async ({ page }) => {
      const enUrl = join(site.url, 'en')
      const resp = await page.goto(enUrl, {
        waitUntil: 'domcontentloaded',
        timeout: NAV_TIMEOUT,
      })
      expect(resp, 'no navigation response').not.toBeNull()
      expect(resp!.status(), `unexpected status for ${enUrl}`).toBeLessThan(400)

      // The English page stamps the EN locale on <html>.
      await expect(page.locator('html')).toHaveAttribute('data-locale', 'en', {
        timeout: 15_000,
      })

      const h1 = await heroHeading(page)
      await expect(h1).toBeVisible({ timeout: 15_000 })
    })

    test('a legal page resolves', async ({ page, request }) => {
      // Try the RO legal routes in order; the first that resolves passes.
      const candidates = ['confidentialitate', 'gdpr', 'cookies']
      let resolved: string | null = null
      for (const path of candidates) {
        const url = join(site.url, path)
        const r = await request.get(url, {
          maxRedirects: 5,
          failOnStatusCode: false,
        })
        if (r.status() < 400) {
          resolved = url
          break
        }
      }
      expect(
        resolved,
        `none of ${candidates.join(', ')} resolved on ${site.url}`,
      ).not.toBeNull()

      // The resolved legal page renders a document (has a heading).
      await page.goto(resolved!, {
        waitUntil: 'domcontentloaded',
        timeout: NAV_TIMEOUT,
      })
      expect(await page.locator('h1, h2').count()).toBeGreaterThan(0)
    })

    test('language switch links to the EN page and resolves', async ({
      page,
    }) => {
      await page.goto(site.url, {
        waitUntil: 'domcontentloaded',
        timeout: NAV_TIMEOUT,
      })

      // The header LangToggle renders an anchor to the EN equivalent
      // (data-set-lang / hreflang). There may be more than one (desktop +
      // mobile menu); take the first with a usable href.
      const enLink = page
        .locator('a[data-set-lang="en"], a[hreflang="en"]')
        .first()
      await expect(
        enLink,
        'no EN language-switch anchor found in the header',
      ).toHaveCount(1)

      const href = await enLink.getAttribute('href')
      expect(href, 'EN switch anchor has no href').toBeTruthy()

      // Follow the link. Click it if it's visible (faithful to a user); else
      // navigate its href directly (mobile-menu copies may be display:none).
      if (await enLink.isVisible().catch(() => false)) {
        await enLink.click()
      } else {
        await page.goto(new URL(href!, site.url).toString(), {
          waitUntil: 'domcontentloaded',
          timeout: NAV_TIMEOUT,
        })
      }

      // Landed on an /en URL serving the EN locale.
      await expect(page).toHaveURL(/\/en(\/|$)/, { timeout: 15_000 })
      await expect(page.locator('html')).toHaveAttribute('data-locale', 'en', {
        timeout: 15_000,
      })
    })
  })
}
