# E2E UI smoke suite (Playwright)

Frontend half of contract **Faza 1C E2E (A1.4.a)**. A lightweight, deterministic
smoke that the deployed UIs load and the critical surfaces render. It does **not**
drive a full LLM conversation (that is non-deterministic) and talks to nothing
that requires auth.

Chromium only. Every target URL is **env-driven** — the same suite runs against
staging or prod without edits.

## Install

```bash
npm install            # picks up @playwright/test (devDependency)
npm run e2e:install    # one-time: downloads the Chromium browser binary
```

## Run

```bash
E2E_DASHBOARD_URL=https://dash.example \
E2E_WIDGET_URL=https://angrosist.ro \
npm run e2e
```

Run a single spec / list without executing:

```bash
npx playwright test e2e/sites.spec.ts
npx playwright test --list          # enumerate cases, no browser launch
```

## Target env vars (defaults)

| Var | Default | Used by |
| --- | --- | --- |
| `E2E_DASHBOARD_URL` | `http://localhost:5173` | dashboard spec + Playwright `baseURL` |
| `E2E_WIDGET_URL` | `E2E_SITE_ANGROSIST_URL` → `https://angrosist.ro` | widget spec (any page embedding `widget.js`) |
| `E2E_SITE_ANGROSIST_URL` | `https://angrosist.ro` | sites spec |
| `E2E_SITE_EUROINTERMED_URL` | `https://euro-intermed.ro` | sites spec |
| `E2E_SITE_PALLET_URL` | `https://pallet-clearance.eu` | sites spec |

No secrets and no hosts beyond the three public marketing-site defaults are
hardcoded. The dashboard `/dashboard/widget` route is auth-gated, so the widget
spec defaults to a public marketing site that embeds the buyer flow — point
`E2E_WIDGET_URL` at whatever page hosts the widget you want to smoke.

## What each spec asserts

- **`dashboard.spec.ts`** — the SPA loads, the login page renders (email form),
  no uncaught page error, and an unauthenticated deep link to a protected route
  redirects to `/login`. No OTP login is attempted (email round-trip can't be
  automated); the auth gate is the assertion.
- **`widget.spec.ts`** — the widget mounts (`#__angrosist_widget__` /
  `window.AngrosistChat`), the launcher opens the panel, and the composer text
  input + a send control render. The attach affordance (buyer product-list 📎 /
  seller photo 📷) is **soft-asserted** because it is vertical/intent-gated and
  may be hidden on a router/triage embed or until a conversation starts.
- **`sites.spec.ts`** — for each of the three marketing sites: page loads
  (2xx/3xx) with a title/h1, the widget loader is present (script tag / mount /
  global), the widget bundle points at an **https** backend and never
  `localhost`, and `robots.txt` + a privacy link resolve. This is the concrete
  check for the "widget shows on the marketing sites" gap.

Specs assert **structure, not copy**, so ordinary content changes don't break
them. The suite lives under `e2e/` and is excluded from the app `tsc`/vite build.
