import { useSyncExternalStore } from 'react'

/**
 * Self-contained theming for the embeddable widget. The widget ships as an
 * isolated, inline-styled bundle (no Tailwind / host CSS), so it carries its own
 * light + dark palettes here instead of relying on CSS variables.
 *
 * Dark mode is resolved from BOTH signals a host might use:
 *   - a `.dark` class on <html> (Tailwind / next-themes / our own dashboard), and
 *   - the OS `prefers-color-scheme: dark` media query (most third-party sites).
 * The embed can also force a mode via `init({ theme: 'light' | 'dark' })`.
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

const DARK: WidgetTheme = {
  scheme: 'dark',
  panelBg: '#0c1411', // near-black with a faint emerald cast
  text: '#e7efe9',
  muted: '#9aa9a1',
  border: '#23302a',
  headerBg: '#0a3a2b', // deep emerald
  headerText: '#ecfdf5',
  headerSub: '#6ee7b7', // emerald-300
  assistantBubbleBg: '#18221d',
  assistantText: '#e7efe9',
  userBubbleBg: '#059669', // emerald-600
  userText: '#ffffff',
  inputBg: '#141d18',
  inputText: '#f1f5f9',
  inputBorder: '#2b3832',
  placeholder: '#9aa9a1',
  accent: '#34d399', // emerald-400 — dark text on top
  accentText: '#04231a',
  tileBg: '#11231b',
  overlay: 'rgba(0,0,0,0.5)',
  shadow: '0 12px 40px rgba(0,0,0,0.55)',
  error: '#f87171',
}

function prefersDark(): boolean {
  if (
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark')
  ) {
    return true
  }
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return false
}

const noopSubscribe = () => () => {}

/**
 * Subscribe to host theme changes: the `prefers-color-scheme` media query AND
 * the <html> class list (so a class-based dark-mode toggle updates the widget
 * live). Module-scoped so its identity is stable across renders.
 */
function subscribeScheme(onChange: () => void): () => void {
  const mq =
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)')
      : null
  mq?.addEventListener('change', onChange)

  let observer: MutationObserver | null = null
  if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
    observer = new MutationObserver(onChange)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })
  }

  return () => {
    mq?.removeEventListener('change', onChange)
    observer?.disconnect()
  }
}

/**
 * Resolve the active palette, re-rendering when the host flips theme. A fixed
 * `pref` ('light' | 'dark') short-circuits the subscription.
 */
export function useWidgetTheme(pref: ThemePref = 'auto'): WidgetTheme {
  const fixed = pref === 'light' || pref === 'dark'
  const scheme = useSyncExternalStore<Scheme>(
    fixed ? noopSubscribe : subscribeScheme,
    () => (fixed ? (pref as Scheme) : prefersDark() ? 'dark' : 'light'),
    () => (pref === 'dark' ? 'dark' : 'light'),
  )
  return scheme === 'dark' ? DARK : LIGHT
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
