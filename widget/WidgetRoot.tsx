import { useCallback, useEffect, useState } from 'react'
import { WidgetApp } from './WidgetApp'
import { Launcher } from './Launcher'
import { type ThemePref } from './theme'
import type { ChatIntent, ChatVertical } from '@/lib/api'
import { detectLang, makeT, type Lang } from '@/lib/i18n'

/** Mutable embed config the host provides via `AngrosistChat.init` / `open`. */
export interface WidgetConfig {
  apiUrl?: string
  containerId?: string
  /** Flow vertical — defaults to 'angrosist' (existing embeds unaffected). */
  vertical?: ChatVertical
  /** Flow intent — defaults to 'buy'. Use 'sell' for the PalletClearance seller flow. */
  intent?: ChatIntent
  /**
   * UI language for the widget ('ro' | 'en'). The widget has no LanguageProvider;
   * this picks the dictionary AND is forwarded to the backend as the conversation
   * language so the agent replies in the same tongue as the greeting. Defaults to
   * RO, falling back to the browser preference when omitted.
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
  /**
   * Optional accent hex (host's vertical brand color). When set it overrides the
   * default emerald on the header, send button, and user bubble; omit to keep the
   * default so existing embeds are unaffected.
   */
  accent?: string
  /** Foreground color used on accent surfaces (defaults to white). */
  accentText?: string
}

/**
 * Root of the floating widget. Keeps BOTH the launcher bubble and the WidgetApp
 * panel mounted at once and toggles only the panel's VISIBILITY (CSS `display` +
 * `aria-hidden`/`inert`) when minimizing — so minimizing never unmounts WidgetApp.
 * Its transcript state and the live SSE stream survive a minimize, and reopening
 * reveals the very same instance. Programmatic `AngrosistChat.open()` reveals the
 * panel via the registered opener.
 */
export function WidgetRoot({
  register,
  getConfig,
}: {
  /** Registers the imperative opener so `open()` can reveal the panel post-mount. */
  register: (open: () => void) => void
  /** Reads the latest mutable embed config (vertical/intent/lang can change via open()). */
  getConfig: () => WidgetConfig
}) {
  const [open, setOpen] = useState(false)
  // Bumped on each imperative open() so a repeat open() with a changed
  // vertical/intent/lang re-renders (and re-reads the live config) even when the
  // panel is already open.
  const [, setBump] = useState(0)

  // Stable opener handed to `register`; always reveals the panel and forces a
  // re-read of the live config.
  const openPanel = useCallback(() => {
    setOpen(true)
    setBump((n) => n + 1)
  }, [])
  useEffect(() => {
    register(openPanel)
  }, [register, openPanel])

  // Escape minimizes the open panel (keeping its state); no-op while minimized.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const config = getConfig()
  const lang = detectLang(config.lang)
  const t = makeT(lang)

  return (
    <>
      {/* Panel wrapper — kept mounted; hidden (not unmounted) when minimized so
          WidgetApp's transcript + SSE stream survive. `aria-hidden`/`inert`
          remove it from the a11y tree + tab order while hidden. Keyed by
          vertical/intent so a genuine flow switch (via open()) remounts fresh,
          while a minimize/reopen preserves the same instance. */}
      <div
        aria-hidden={!open}
        inert={!open}
        style={{ display: open ? 'block' : 'none' }}
      >
        <WidgetApp
          key={`${config.vertical ?? 'angrosist'}-${config.intent ?? 'buy'}`}
          apiUrl={config.apiUrl}
          vertical={config.vertical}
          intent={config.intent}
          lang={lang}
          theme={config.theme}
          accent={config.accent}
          accentText={config.accentText}
          hidden={!open}
          onClose={() => setOpen(false)}
        />
      </div>
      {/* Launcher bubble — visible only while minimized. */}
      {!open && (
        <Launcher
          onClick={() => setOpen(true)}
          label={t('chat.widgetLauncher')}
          themePref={config.theme}
          accent={config.accent}
          accentText={config.accentText}
        />
      )}
    </>
  )
}
