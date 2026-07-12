import { test, expect, type Page } from '@playwright/test'
import { SITES, isHttpsBackend } from './_env'

/**
 * Marketing-site smoke. For each of the three public sites we assert the
 * concrete "widget shows on the marketing sites" gap check:
 *   1. the page loads (2xx/3xx) and has a title or an h1,
 *   2. the embedded chat widget loader is present (widget.js script tag, OR the
 *      injected mount wrapper, OR the `window.AngrosistChat` global),
 *   3. the widget bundle points at an https backend API — NOT localhost,
 *   4. robots.txt and a privacy link resolve.
 *
 * Assertions are structural (script/loader presence, https-ness) so ordinary
 * copy/layout changes on the sites don't break the smoke.
 */

const WIDGET_WRAPPER = '#__angrosist_widget__'

/** Is the widget loader wired on this page (any injection strategy)? */
async function widgetLoaderPresent(page: Page): Promise<{
  present: boolean
  widgetJsSrc: string | null
}> {
  // Give a deferred / tag-manager injection a moment to run.
  await page
    .waitForFunction(
      (sel) =>
        !!document.querySelector('script[src*="widget.js"]') ||
        !!document.querySelector(sel) ||
        !!(window as unknown as Record<string, unknown>).AngrosistChat,
      WIDGET_WRAPPER,
      { timeout: 15_000 },
    )
    .catch(() => {
      /* fall through — assertions below report the miss */
    })

  const widgetJsSrc = await page
    .locator('script[src*="widget.js"]')
    .first()
    .getAttribute('src')
    .catch(() => null)

  const wrapperPresent = (await page.locator(WIDGET_WRAPPER).count()) > 0
  const globalPresent = await page.evaluate(
    () => !!(window as unknown as Record<string, unknown>).AngrosistChat,
  )

  return {
    present: !!widgetJsSrc || wrapperPresent || globalPresent,
    widgetJsSrc,
  }
}

for (const site of SITES) {
  test.describe(`site: ${site.name}`, () => {
    test('loads, embeds the widget, and points at an https backend', async ({
      page,
      request,
    }) => {
      const resp = await page.goto(site.url, { waitUntil: 'domcontentloaded' })
      expect(resp, 'no navigation response').not.toBeNull()
      expect(resp!.status(), `unexpected status for ${site.url}`).toBeLessThan(
        400,
      )

      // Has a title or a top-level heading (structure, not copy).
      const title = (await page.title()).trim()
      const h1Count = await page.locator('h1').count()
      expect(
        title.length > 0 || h1Count > 0,
        'page has neither a <title> nor an <h1>',
      ).toBeTruthy()

      // Widget loader present (concrete gap check).
      const { present, widgetJsSrc } = await widgetLoaderPresent(page)
      expect(
        present,
        `chat widget loader not found on ${site.url} — no widget.js script, ` +
          `no ${WIDGET_WRAPPER} mount, and no window.AngrosistChat`,
      ).toBeTruthy()

      // The widget bundle carries the backend API base (baked in at build time).
      // Fetch widget.js and assert it references an https API and never
      // localhost/loopback — the "points at the backend" guarantee.
      if (widgetJsSrc) {
        const absSrc = new URL(widgetJsSrc, site.url).toString()
        expect(
          isHttpsBackend(absSrc),
          `widget.js is not served from https: ${absSrc}`,
        ).toBeTruthy()

        const jsResp = await request.get(absSrc)
        expect(
          jsResp.status(),
          `widget.js did not load: ${absSrc}`,
        ).toBeLessThan(400)
        const body = await jsResp.text()
        expect(
          /http:\/\/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(body),
          'widget bundle references localhost/loopback — misconfigured API base',
        ).toBeFalsy()
        // SOFT: the bundle should reference the chat API path + an https origin.
        await expect
          .soft(
            /\/api\/chat/.test(body),
            'widget bundle does not reference /api/chat',
          )
          .toBeTruthy()
        await expect
          .soft(/https:\/\//.test(body), 'widget bundle has no https origin')
          .toBeTruthy()
      }

      // robots.txt resolves (served, not a 5xx).
      const robots = await request.get(new URL('/robots.txt', site.url).toString())
      expect(
        robots.status(),
        'robots.txt returned a server error',
      ).toBeLessThan(500)

      // SOFT: a privacy link resolves. Match RO/EN variants by href; content
      // changes shouldn't hard-fail the smoke.
      const privacyLink = page
        .locator(
          'a[href*="privacy" i], a[href*="confiden" i], a[href*="gdpr" i], ' +
            'a[href*="protectia-datelor" i]',
        )
        .first()
      if ((await privacyLink.count()) > 0) {
        const href = await privacyLink.getAttribute('href')
        if (href) {
          const privResp = await request.get(new URL(href, site.url).toString())
          await expect
            .soft(
              privResp.status(),
              `privacy link did not resolve: ${href}`,
            )
            .toBeLessThan(400)
        }
      }
    })
  })
}
