import { test, expect } from '@playwright/test'
import { WIDGET_URL, reachable } from './_env'

/**
 * Widget happy-path smoke (roadmap: "widget opens, greets, and accepts input").
 * Complements widget.spec.ts (launcher → composer) with the deterministic
 * content surface. All of this is client-rendered — the greeting bubble is
 * seeded locally by useChat, so no backend/LLM round-trip is involved:
 *   1. opening the launcher shows the "Bogdan" greeting bubble,
 *   2. the composer is a real, uncollapsed field (has a min height),
 *   3. the composer accepts typed text (value round-trips).
 *
 * The widget host is probed first; if it's down / auth-walled the test is
 * `test.skip`-ped so CI without live sites degrades to "skipped", not "failed".
 */

const WIDGET_WRAPPER = '#__angrosist_widget__'
/** COMPOSER_MIN_HEIGHT in widget/WidgetApp.tsx is 38px; assert a safe floor. */
const MIN_COMPOSER_HEIGHT = 24

test.describe('widget greeting + composer', () => {
  test.beforeEach(async ({ request }) => {
    const ok = await reachable(request, WIDGET_URL)
    test.skip(!ok, `widget host not reachable (skipping): ${WIDGET_URL}`)
  })

  test('greets as Bogdan and accepts typed text in an uncollapsed composer', async ({
    page,
  }) => {
    await page.goto(WIDGET_URL, { waitUntil: 'domcontentloaded' })

    // Loader may inject widget.js asynchronously — wait for the mount or global.
    await page.waitForFunction(
      (sel) =>
        !!document.querySelector(sel) ||
        !!(window as unknown as Record<string, unknown>).AngrosistChat,
      WIDGET_WRAPPER,
      { timeout: 20_000 },
    )

    // The panel markup (incl. a hidden "new chat" button) can precede the
    // floating launcher in the DOM while the widget is closed, so target the
    // first VISIBLE button — the launcher bubble.
    const wrapper = page.locator(WIDGET_WRAPPER)
    const launcher = wrapper.locator('button').filter({ visible: true }).first()
    await expect(launcher).toBeVisible({ timeout: 20_000 })
    await launcher.click()

    // 1) The greeting bubble names the assistant "Bogdan" (deterministic, RO+EN
    //    greetings both contain it). Client-seeded, so no backend needed.
    await expect(wrapper.getByText(/Bogdan/i).first()).toBeVisible({
      timeout: 15_000,
    })

    // 2) The composer renders and is not collapsed — a real min height.
    const composer = wrapper.getByRole('textbox').first()
    await expect(composer).toBeVisible({ timeout: 15_000 })
    await expect(composer).toBeEditable()
    const box = await composer.boundingBox()
    expect(box, 'composer has no bounding box').not.toBeNull()
    expect(
      box!.height,
      `composer height ${box!.height}px looks collapsed (< ${MIN_COMPOSER_HEIGHT}px)`,
    ).toBeGreaterThanOrEqual(MIN_COMPOSER_HEIGHT)

    // 3) It accepts typed text and the value round-trips.
    const typed = 'Caut 500 kg zahar'
    await composer.fill(typed)
    await expect(composer).toHaveValue(typed)
  })
})
