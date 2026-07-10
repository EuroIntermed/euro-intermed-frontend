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

/** Compact EUR currency formatter, locale-aware. `none` is the empty marker. */
export function formatEUR(
  lang: Lang,
  v: number | null | undefined,
  none = '—',
): string {
  if (v == null) return none
  return new Intl.NumberFormat(LOCALE_TAG[lang], {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v)
}

/**
 * Renders a 0..1 ratio as a whole-number percentage (e.g. `0.42` → `"42%"`).
 * Null/absent/non-finite values render the empty marker `none`, so a KPI that
 * has not been computed yet shows "—" rather than a misleading `0%`.
 */
export function formatPercent(
  v: number | null | undefined,
  none = '—',
): string {
  if (v == null || !Number.isFinite(v)) return none
  return `${Math.round(v * 100)}%`
}

/**
 * Renders a whole number, or the empty marker `none` when the value is
 * null/absent — so a KPI card shows "—" instead of a misleading `0`.
 */
export function formatCount(
  v: number | null | undefined,
  none = '—',
): string {
  if (v == null || !Number.isFinite(v)) return none
  return String(v)
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
