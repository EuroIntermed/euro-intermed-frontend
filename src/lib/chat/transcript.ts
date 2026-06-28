import type { TranscriptMessage } from '@/lib/api'

/**
 * Extract plain text from a transcript message. Assistant turns may store their
 * text inside a base64-encoded JSON array of parts (tool-call turns), so when the
 * `content` field is empty we decode `tool_calls` and join the string parts.
 * Returns '' when there is nothing renderable (callers drop those rows so no
 * blank bubble is shown).
 */
export function resolveContent(m: TranscriptMessage): string {
  if (m.content) return m.content
  if ((m.role === 'model' || m.role === 'assistant') && m.tool_calls) {
    try {
      const bytes = Uint8Array.from(atob(m.tool_calls), (c) => c.charCodeAt(0))
      const json = new TextDecoder('utf-8').decode(bytes)
      const parts: unknown[] = JSON.parse(json)
      return parts.filter((p): p is string => typeof p === 'string').join('')
    } catch {
      return ''
    }
  }
  return ''
}
