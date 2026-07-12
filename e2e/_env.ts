/**
 * Centralized, env-driven target resolution for the smoke suite. No host is
 * hardcoded beyond the three public marketing-site defaults (which are public
 * production domains, safe to bake in as fallbacks). Every value can be
 * overridden per run so the same specs cover staging and prod.
 */

/** Dashboard SPA. Doubles as the Playwright baseURL. */
export const DASHBOARD_URL =
  process.env.E2E_DASHBOARD_URL || 'http://localhost:5173'

/**
 * A public page that embeds the chat widget (widget.js loader). The dashboard's
 * own /dashboard/widget route is auth-gated, so the default points at a
 * marketing site that ships the buyer embed — override to any page hosting the
 * widget.
 *
 * The widget is currently LIVE on the STAGING sites (staging.*), and will be
 * enabled on the production domains below soon. Until then, run this suite
 * against staging with the E2E_SITE_*_URL overrides documented in e2e/README.md
 * (e.g. E2E_SITE_ANGROSIST_URL=https://staging.angrosist.ro). The widget loads
 * from the dashboard host (staging: staging-dash.euro-intermed.com/widget.js).
 */
export const WIDGET_URL =
  process.env.E2E_WIDGET_URL ||
  process.env.E2E_SITE_ANGROSIST_URL ||
  'https://staging.angrosist.ro'

/**
 * The three marketing sites that should embed the widget. Defaults are the
 * canonical PRODUCTION domains (angrosist.ro, euro-intermed.com,
 * palletclearance.com); point them at the staging.* hosts via env to test where
 * the widget is live today.
 */
export const SITES: { name: string; url: string }[] = [
  {
    name: 'angrosist',
    url: process.env.E2E_SITE_ANGROSIST_URL || 'https://angrosist.ro',
  },
  {
    name: 'euro-intermed',
    url: process.env.E2E_SITE_EUROINTERMED_URL || 'https://euro-intermed.com',
  },
  {
    name: 'pallet-clearance',
    url: process.env.E2E_SITE_PALLET_URL || 'https://palletclearance.com',
  },
]

/** True when a URL is a real remote https origin (not localhost / loopback). */
export function isHttpsBackend(url: string): boolean {
  try {
    const u = new URL(url)
    return (
      u.protocol === 'https:' &&
      u.hostname !== 'localhost' &&
      u.hostname !== '127.0.0.1' &&
      u.hostname !== '0.0.0.0'
    )
  } catch {
    return false
  }
}
