import { test, expect } from '@playwright/test'
import { WIDGET_URL } from './_env'

/**
 * Widget smoke. We verify the embeddable chat surface loads and its critical
 * controls render — WITHOUT asserting any agent reply (that path is
 * non-deterministic). The widget mounts, unstyled-DOM (no shadow root), into a
 * `#__angrosist_widget__` wrapper via widget.js, exposing `window.AngrosistChat`.
 *
 * Gating note: the product-list / photo attach affordances are vertical+intent
 * driven (buyer product-list = angrosist/buy; seller photos = *.sell). On a
 * router/triage embed they stay hidden until the agent re-routes the flow, and
 * they may require the conversation to have started. So we HARD-assert the
 * launcher + composer, and SOFT-assert the attach affordance.
 */

const WIDGET_WRAPPER = '#__angrosist_widget__'

test.describe('widget', () => {
  test('launcher opens a composer', async ({ page }) => {
    await page.goto(WIDGET_URL, { waitUntil: 'domcontentloaded' })

    // The loader may inject widget.js asynchronously (defer / DOMContentLoaded /
    // tag manager). Wait for either the mount wrapper or the global to appear.
    await page.waitForFunction(
      (sel) =>
        !!document.querySelector(sel) ||
        !!(window as unknown as Record<string, unknown>).AngrosistChat,
      WIDGET_WRAPPER,
      { timeout: 20_000 },
    )

    // The floating launcher is a button inside the widget wrapper. The panel
    // markup (incl. a hidden "new chat" button) can precede it in the DOM while
    // the widget is closed, so target the first VISIBLE button — the launcher.
    const wrapper = page.locator(WIDGET_WRAPPER)
    const launcher = wrapper.locator('button').filter({ visible: true }).first()
    await expect(launcher).toBeVisible({ timeout: 20_000 })

    await launcher.click()

    // Opening mounts WidgetApp: assert the composer text input renders. Scope to
    // the wrapper so a host-page input can't satisfy the check.
    const composer = wrapper.getByRole('textbox')
    await expect(composer.first()).toBeVisible({ timeout: 15_000 })
    await expect(composer.first()).toBeEditable()

    // A send control must also exist (button, not the launcher).
    const buttons = wrapper.locator('button')
    expect(await buttons.count()).toBeGreaterThan(1)

    // SOFT: the attach affordance (product-list 📎 for buyer, photo 📷 for
    // seller) is gate-dependent — present only in the concrete buyer/seller
    // flow, and possibly only once a conversation has started. A hidden file
    // input is the most stable signal. Don't fail the smoke if the embed is a
    // router/triage flow where it's intentionally hidden.
    const fileInputs = wrapper.locator('input[type="file"]')
    const attachButtons = wrapper.locator(
      'button[aria-label*="foto" i], button[aria-label*="photo" i], ' +
        'button[aria-label*="produs" i], button[aria-label*="product" i]',
    )
    const attachCount =
      (await fileInputs.count()) + (await attachButtons.count())
    await expect
      .soft(
        attachCount,
        'attach affordance not present — expected in the angrosist/buy (product-list) ' +
          'or *.sell (photo) embed; hidden on router/triage or until a conversation starts',
      )
      .toBeGreaterThan(0)
  })
})
