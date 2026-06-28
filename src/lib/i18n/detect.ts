import { translate } from './resolve'
import type { Lang } from './dictionaries'
import type { TKey, TVars } from './types'
import { DEFAULT_LANG, LANG_STORAGE_KEY } from './context'

function isLang(value: string | null | undefined): value is Lang {
  return value === 'ro' || value === 'en'
}

/**
 * Resolve a UI language without the React context. Used by surfaces that render
 * outside <LanguageProvider> — the embeddable widget (mounted on third-party
 * sites) and the app-level ErrorBoundary (the outermost wrapper).
 *
 * Resolution order: an explicit override (e.g. the widget config `lang`) →
 * the persisted dashboard choice → the browser preference → RO default.
 */
export function detectLang(override?: string | null): Lang {
  if (isLang(override)) return override
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem(LANG_STORAGE_KEY)
    if (isLang(stored)) return stored
    const nav = window.navigator.language?.toLowerCase() ?? ''
    if (nav.startsWith('en')) return 'en'
    if (nav.startsWith('ro')) return 'ro'
  }
  return DEFAULT_LANG
}

/**
 * A context-free `t()` bound to a resolved language. Mirrors the provider's
 * `t` signature so call sites read the same; pair it with {@link detectLang}.
 */
export function makeT(lang: Lang) {
  return (key: TKey, vars?: TVars) => translate(lang, key, vars)
}
