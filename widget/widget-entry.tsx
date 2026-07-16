import { createRoot } from 'react-dom/client'
import { WidgetRoot, type WidgetConfig } from './WidgetRoot'
import { pushSeed } from './openBridge'
import type { ChatIntent, ChatVertical } from '@/lib/api'
import { type Lang } from '@/lib/i18n'

/** Options for the public {@link open} method. */
interface OpenOptions {
  /**
   * Text to place into the composer (default) or send as the first user turn
   * (when {@link autosend} is true). Omit to just open the panel.
   */
  message?: string
  /** Conversation vertical to route into (defaults to the host's init config). */
  vertical?: ChatVertical
  /** Conversation intent to route into (defaults to the host's init config). */
  intent?: ChatIntent
  /**
   * Site/conversation language ('ro' | 'en'). A marketing-site redirect passes the
   * page language here so the greeting renders — and the agent starts — in that
   * language. Omit to keep the host's init config (or the auto-detected default).
   */
  lang?: Lang
  /**
   * When true, send `message` as the first user turn immediately. When false /
   * omitted (the DEFAULT), the message is only prefilled so the user can review
   * and edit before sending.
   */
  autosend?: boolean
}

let mounted = false
// Hoisted out of init() so open() can re-open the panel and mutate the live
// conversation context (vertical/intent/lang) after mount. `currentConfig` is the
// single source WidgetRoot reads its mutable fields from (via `getConfig`).
let currentConfig: WidgetConfig = {}
// Imperative opener registered by the mounted WidgetRoot. Null until React has
// run the registration effect; `pendingOpen` covers the open-before-mount race.
let openWidget: (() => void) | null = null
let pendingOpen = false

function init(config: WidgetConfig = {}) {
  if (mounted) return
  mounted = true
  currentConfig = config

  // Override global API URL for the widget
  if (config.apiUrl) {
    ;(window as unknown as Record<string, unknown>).__ANGROSIST_API_URL__ = config.apiUrl
  }
  // Stash the host-provided privacy URL so getPrivacyUrl() can resolve it.
  if (config.privacyUrl) {
    ;(window as unknown as Record<string, unknown>).__ANGROSIST_PRIVACY_URL__ =
      config.privacyUrl
  }

  // Find or create container
  let container: HTMLElement | null = null
  if (config.containerId) {
    container = document.getElementById(config.containerId)
  }

  if (!container) {
    // Floating button + panel mode
    const wrapper = document.createElement('div')
    wrapper.id = '__angrosist_widget__'
    wrapper.style.cssText =
      'position:fixed;bottom:24px;right:24px;z-index:999999;display:flex;flex-direction:column;align-items:flex-end;gap:12px;'
    document.body.appendChild(wrapper)
    container = wrapper
  }

  const root = createRoot(container)
  root.render(
    <WidgetRoot
      register={(fn) => {
        openWidget = fn
        // Flush an open() that landed before the panel mounted.
        if (pendingOpen) {
          pendingOpen = false
          fn()
        }
      }}
      getConfig={() => currentConfig}
    />,
  )
}

/**
 * Public, host-callable entry point to open the widget programmatically and
 * (optionally) seed the composer. Safe to call repeatedly and before/after
 * {@link init}: it mounts the widget on first use, then reuses that instance.
 *
 * Example (feature-detected):
 *   if (window.AngrosistChat?.open)
 *     window.AngrosistChat.open({ message: 'Vreau 10 paleți zahăr', vertical: 'angrosist', intent: 'buy', lang: 'ro' })
 */
function open(opts: OpenOptions = {}) {
  // Mount if needed, reusing init's path. When the host already called init(),
  // this no-ops and we keep their config (apiUrl / privacyUrl / lang / theme).
  if (!mounted) {
    init({ vertical: opts.vertical, intent: opts.intent, lang: opts.lang })
  }

  // Apply the conversation context when explicitly provided, so a plain
  // open({ message }) keeps the host's init vertical/intent/lang (which itself
  // defaults to angrosist/buy in useChat when unset).
  if (opts.vertical) currentConfig.vertical = opts.vertical
  if (opts.intent) currentConfig.intent = opts.intent
  if (opts.lang) currentConfig.lang = opts.lang

  // Reveal the panel. If the mount's registration effect hasn't run yet (first
  // call raced the mount), defer via `pendingOpen`; the registrar flushes it.
  if (openWidget) openWidget()
  else pendingOpen = true

  // Seed the composer (default) or autosend the message. Handed to WidgetApp via
  // the openBridge so the vanilla entry never touches React state directly.
  if (opts.message != null && opts.message !== '') {
    pushSeed({ message: opts.message, autosend: opts.autosend === true })
  }
}

;(window as unknown as Record<string, unknown>).AngrosistChat = { init, open }
