import { useSyncExternalStore } from 'react'

/**
 * Self-contained theming for the embeddable widget. The widget ships as an
 * isolated, inline-styled bundle (no Tailwind / host CSS), so it carries its own
 * palette here instead of relying on CSS variables.
 *
 * The widget is LIGHT-ONLY: it always renders the light palette and never
 * follows the host's `.dark` class or `prefers-color-scheme`. The `theme` embed
 * option is still accepted for API compatibility but has no effect.
 */

export type ThemePref = 'light' | 'dark' | 'auto'
export type Scheme = 'light' | 'dark'

export interface WidgetTheme {
  scheme: Scheme
  panelBg: string
  text: string
  muted: string
  border: string
  headerBg: string
  headerText: string
  headerSub: string
  assistantBubbleBg: string
  assistantText: string
  userBubbleBg: string
  userText: string
  inputBg: string
  inputText: string
  inputBorder: string
  placeholder: string
  accent: string
  accentText: string
  tileBg: string
  overlay: string
  shadow: string
  error: string
}

// Emerald brand palette, tuned to mirror the dashboard tokens. Hex values are
// the sanctioned exception here (the widget ships with no CSS variables); the
// dashboard itself must still use the semantic tokens in index.css.
const LIGHT: WidgetTheme = {
  scheme: 'light',
  panelBg: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e6e8ec',
  headerBg: '#047857', // emerald-700 — white text passes AA
  headerText: '#ffffff',
  headerSub: '#bbf7d0', // emerald-200
  assistantBubbleBg: '#f1f5f9',
  assistantText: '#0f172a',
  userBubbleBg: '#047857',
  userText: '#ffffff',
  inputBg: '#ffffff',
  inputText: '#0f172a',
  inputBorder: '#d4d8de',
  placeholder: '#94a3b8',
  accent: '#047857',
  accentText: '#ffffff',
  tileBg: '#ecfdf5', // emerald-50
  overlay: 'rgba(2,6,23,0.32)',
  shadow: '0 12px 40px rgba(2,6,23,0.16)',
  error: '#dc2626',
}

/**
 * Optional per-embed accent override. When `accent` is set (host site passes its
 * vertical brand hex), it replaces the default emerald on the header, the send
 * button, and the user bubble; `accentText` sets the foreground on those (white
 * on all shipped verticals). Omitting both keeps the default palette so existing
 * embeds are unaffected.
 */
export interface WidgetThemeOverrides {
  accent?: string
  accentText?: string
}

/**
 * The widget is light-only by design: it always renders the LIGHT palette
 * regardless of the host's `prefers-color-scheme` or any `theme` preference.
 * The `pref` argument is accepted for API compatibility but ignored.
 *
 * `overrides.accent` (with optional `overrides.accentText`) recolors the accent
 * surfaces to the host's brand; when absent the sanctioned emerald default holds.
 */
export function useWidgetTheme(
  _pref: ThemePref = 'auto',
  overrides?: WidgetThemeOverrides,
): WidgetTheme {
  if (overrides?.accent) {
    const accentText = overrides.accentText ?? LIGHT.accentText
    return {
      ...LIGHT,
      headerBg: overrides.accent,
      headerText: accentText,
      userBubbleBg: overrides.accent,
      userText: accentText,
      accent: overrides.accent,
      accentText,
    }
  }
  return LIGHT
}

const MOBILE_QUERY = '(max-width: 480px)'

function subscribeMobile(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {}
  }
  const mq = window.matchMedia(MOBILE_QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

/** True on narrow viewports — drives the widget's mobile full-screen layout. */
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribeMobile,
    () =>
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(MOBILE_QUERY).matches
        : false,
    () => false,
  )
}
