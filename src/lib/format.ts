/**
 * Display-only string formatters. These never mutate stored data — they only
 * normalize how a value is shown to staff.
 */

/**
 * Sentence-cases a display string: upper-cases the FIRST letter and leaves the
 * rest untouched. Unlike a Title-Case helper it does NOT touch later words, so
 * multi-word free text like "aparatura electrică" stays "Aparatura electrică"
 * rather than being mangled to "Aparatura Electrică".
 *
 * Preserves Romanian diacritics (toUpperCase handles ă/â/î/ș/ț), returns "" for
 * empty input, and skips any leading whitespace so " retururi" still
 * capitalizes the first real letter.
 */
export function sentenceCase(s: string): string {
  if (!s) return ''
  const i = s.search(/\S/)
  if (i === -1) return s
  return s.slice(0, i) + s.charAt(i).toUpperCase() + s.slice(i + 1)
}
