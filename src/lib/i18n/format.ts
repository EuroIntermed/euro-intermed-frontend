import type { Lang } from './dictionaries'

/** BCP-47 locale tags per UI language, for Intl date/number formatting. */
const LOCALE_TAG: Record<Lang, string> = {
  ro: 'ro-RO',
  en: 'en-GB',
}

export function localeTag(lang: Lang): string {
  return LOCALE_TAG[lang]
}

/** Compact RON currency formatter, locale-aware. `none` is the empty marker. */
export function formatRON(
  lang: Lang,
  v: number | null | undefined,
  none = '—',
): string {
  if (v == null) return none
  return new Intl.NumberFormat(LOCALE_TAG[lang], {
    style: 'currency',
    currency: 'RON',
    maximumFractionDigits: 0,
  }).format(v)
}

/**
 * Humanizes a whole-second duration: `< 60s` renders as `"45s"`, otherwise as
 * `"2m 30s"`. The unit words come from the dictionary via the two `tpl` strings
 * (`{n}s` and `{m}m {s}s`) so RO/EN stay localized. `none` covers null/absent.
 */
export function formatDuration(
  seconds: number | null | undefined,
  tpl: { seconds: (n: number) => string; minutesSeconds: (m: number, s: number) => string },
  none = '—',
): string {
  if (seconds == null || !Number.isFinite(seconds)) return none
  const total = Math.max(0, Math.round(seconds))
  if (total < 60) return tpl.seconds(total)
  const m = Math.floor(total / 60)
  const s = total % 60
  return tpl.minutesSeconds(m, s)
}

export function formatDate(lang: Lang, iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE_TAG[lang])
}

export function formatDateTime(lang: Lang, iso: string): string {
  return new Date(iso).toLocaleString(LOCALE_TAG[lang])
}
