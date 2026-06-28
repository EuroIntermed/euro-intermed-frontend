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

const LIGHT: WidgetTheme = {
  scheme: 'light',
  panelBg: '#ffffff',
  text: '#111827',
  muted: '#6b7280',
  border: '#e5e7eb',
  headerBg: '#111827',
  headerText: '#ffffff',
  headerSub: '#9ca3af',
  assistantBubbleBg: '#f3f4f6',
  assistantText: '#111827',
  userBubbleBg: '#111827',
  userText: '#ffffff',
  inputBg: '#ffffff',
  inputText: '#111827',
  inputBorder: '#d1d5db',
  placeholder: '#9ca3af',
  accent: '#111827',
  accentText: '#ffffff',
  tileBg: '#f3f4f6',
  overlay: 'rgba(0,0,0,0.32)',
  shadow: '0 12px 40px rgba(0,0,0,0.18)',
  error: '#dc2626',
}

const DARK: WidgetTheme = {
  scheme: 'dark',
  panelBg: '#0f172a',
  text: '#e2e8f0',
  muted: '#94a3b8',
  border: '#334155',
  headerBg: '#1e293b',
  headerText: '#f8fafc',
  headerSub: '#94a3b8',
  assistantBubbleBg: '#1e293b',
  assistantText: '#e2e8f0',
  userBubbleBg: '#2563eb',
  userText: '#ffffff',
  inputBg: '#1e293b',
  inputText: '#f1f5f9',
  inputBorder: '#475569',
  placeholder: '#94a3b8',
  accent: '#2563eb',
  accentText: '#ffffff',
  tileBg: '#0b1220',
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
