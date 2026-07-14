import { createRoot } from 'react-dom/client'
import { WidgetApp } from './WidgetApp'
import { Launcher } from './Launcher'
import { type ThemePref } from './theme'
import { pushSeed } from './openBridge'
import type { ChatIntent, ChatVertical } from '@/lib/api'
import { detectLang, makeT, type Lang } from '@/lib/i18n'

interface WidgetConfig {
  apiUrl?: string
  containerId?: string
  /** Flow vertical — defaults to 'angrosist' (existing embeds unaffected). */
  vertical?: ChatVertical
  /** Flow intent — defaults to 'buy'. Use 'sell' for the PalletClearance seller flow. */
  intent?: ChatIntent
  /**
   * UI language for the widget ('ro' | 'en'). The widget has no LanguageProvider;
   * this picks the dictionary. Defaults to RO, falling back to the browser
   * preference when omitted.
   */
  lang?: Lang
  /**
   * Accepted for API compatibility but ignored — the widget is light-only and
   * never follows the host's dark mode.
   */
  theme?: ThemePref
  /**
   * Public privacy-policy URL linked from the GDPR consent notice. Host sites set
   * it here per environment; no domain is hardcoded. Falls back to VITE_PRIVACY_URL.
   */
  privacyUrl?: string
}

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
   * When true, send `message` as the first user turn immediately. When false /
   * omitted (the DEFAULT), the message is only prefilled so the user can review
   * and edit before sending.
   */
  autosend?: boolean
}

let mounted = false
// Hoisted out of init() so open() can re-open the panel and mutate the live
// conversation context (vertical/intent) after mount. `currentConfig` is the
// single source the render closure reads its mutable fields from.
let currentConfig: WidgetConfig = {}
let renderWidget: ((open: boolean) => void) | null = null

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

  const lang = detectLang(config.lang)
  const t = makeT(lang)

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

  function render(open: boolean) {
    root.render(
      open ? (
        <WidgetApp
          apiUrl={currentConfig.apiUrl}
          vertical={currentConfig.vertical}
          intent={currentConfig.intent}
          lang={lang}
          theme={currentConfig.theme}
          onClose={() => render(false)}
        />
      ) : (
        <Launcher
          onClick={() => render(true)}
          label={t('chat.widgetLauncher')}
          themePref={currentConfig.theme}
        />
      ),
    )
  }

  renderWidget = render
  render(false)
}

/**
 * Public, host-callable entry point to open the widget programmatically and
 * (optionally) seed the composer. Safe to call repeatedly and before/after
 * {@link init}: it mounts the widget on first use, then reuses that instance.
 *
 * Example (feature-detected):
 *   if (window.AngrosistChat?.open)
 *     window.AngrosistChat.open({ message: 'Vreau 10 paleți zahăr', vertical: 'angrosist', intent: 'buy' })
 */
function open(opts: OpenOptions = {}) {
  // Mount if needed, reusing init's path. When the host already called init(),
  // this no-ops and we keep their config (apiUrl / privacyUrl / lang / theme).
  if (!mounted) {
    init({ vertical: opts.vertical, intent: opts.intent })
  }

  // Apply the conversation context when explicitly provided, so a plain
  // open({ message }) keeps the host's init vertical/intent (which itself
  // defaults to angrosist/buy in useChat when unset).
  if (opts.vertical) currentConfig.vertical = opts.vertical
  if (opts.intent) currentConfig.intent = opts.intent

  // Open the panel.
  renderWidget?.(true)

  // Seed the composer (default) or autosend the message. Handed to WidgetApp via
  // the openBridge so the vanilla entry never touches React state directly.
  if (opts.message != null && opts.message !== '') {
    pushSeed({ message: opts.message, autosend: opts.autosend === true })
  }
}

;(window as unknown as Record<string, unknown>).AngrosistChat = { init, open }
