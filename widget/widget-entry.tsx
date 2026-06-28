import { createRoot } from 'react-dom/client'
import { WidgetApp } from './WidgetApp'
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
   * Public privacy-policy URL linked from the GDPR consent notice. Host sites set
   * it here per environment; no domain is hardcoded. Falls back to VITE_PRIVACY_URL.
   */
  privacyUrl?: string
}

let mounted = false

function init(config: WidgetConfig = {}) {
  if (mounted) return
  mounted = true

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
          apiUrl={config.apiUrl}
          vertical={config.vertical}
          intent={config.intent}
          lang={lang}
          onClose={() => render(false)}
        />
      ) : (
        <button
          onClick={() => render(true)}
          style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: '#111827', color: '#fff', border: 'none',
            cursor: 'pointer', fontSize: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          title={t('chat.widgetLauncher')}
          aria-label={t('chat.widgetLauncher')}
        >
          💬
        </button>
      ),
    )
  }

  render(false)
}

;(window as unknown as Record<string, unknown>).AngrosistChat = { init }
