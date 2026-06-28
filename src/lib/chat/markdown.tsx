/**
 * Tiny, dependency-free, XSS-safe markdown renderer for chat messages.
 *
 * Agent replies are untrusted LLM output, so this NEVER injects raw HTML. It
 * returns React elements only — React escapes all text content by default, so
 * a message like `<script>alert(1)</script>` renders as visible text, never
 * executed. We deliberately avoid `dangerouslySetInnerHTML`.
 *
 * Supported subset (intentionally minimal — keeps the widget bundle tiny):
 *   - Line breaks: every `\n` is preserved (blank lines separate blocks).
 *   - Unordered lists: lines starting with `- `, `* ` or `• ` → <ul><li>.
 *   - Ordered lists: lines starting with `1. ` (any number) → <ol><li>.
 *   - Inline bold: `**text**` or `__text__` → <strong>.
 *
 * Everything else stays as plain (escaped) text. Stray, unpaired `**` / `__`
 * markers are stripped so the user never sees raw markdown characters.
 *
 * Italics are intentionally NOT supported: a single `*` collides with the
 * `* ` bullet syntax and risks mangling normal prose, so we skip it.
 */
import {
  Fragment,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react'

/** Optional inline styles so the widget (no Tailwind) can keep tight spacing. */
export interface MarkdownStyles {
  ul?: CSSProperties
  ol?: CSSProperties
  li?: CSSProperties
}

const UL_RE = /^[-*•]\s+(.*)$/
const OL_RE = /^\d+[.)]\s+(.*)$/

/**
 * Render inline bold spans. `**x**` / `__x__` become <strong>. Unpaired
 * markers are removed. Returns an array of strings / <strong> elements.
 */
function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = []
  // Match paired ** ... ** or __ ... __ (non-greedy, no nested marker).
  const re = /\*\*([^*]+?)\*\*|__([^_]+?)__/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(stripStrayMarkers(text.slice(last, m.index)))
    }
    const inner = m[1] ?? m[2] ?? ''
    nodes.push(<strong key={`${keyBase}-b${i}`}>{stripStrayMarkers(inner)}</strong>)
    last = re.lastIndex
    i++
  }
  if (last < text.length) {
    nodes.push(stripStrayMarkers(text.slice(last)))
  }
  return nodes
}

/** Remove leftover unpaired bold markers so raw `**`/`__` never show. */
function stripStrayMarkers(text: string): string {
  return text.replace(/\*\*/g, '').replace(/__/g, '')
}

type Block =
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'p'; lines: string[] }

/** Group consecutive lines into list / paragraph blocks. */
function toBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let cur: Block | null = null

  for (const line of lines) {
    const ul = line.match(UL_RE)
    const ol = line.match(OL_RE)

    if (ul) {
      if (cur?.type !== 'ul') {
        cur = { type: 'ul', items: [] }
        blocks.push(cur)
      }
      cur.items.push(ul[1])
    } else if (ol) {
      if (cur?.type !== 'ol') {
        cur = { type: 'ol', items: [] }
        blocks.push(cur)
      }
      cur.items.push(ol[1])
    } else {
      if (cur?.type !== 'p') {
        cur = { type: 'p', lines: [] }
        blocks.push(cur)
      }
      cur.lines.push(line)
    }
  }
  return blocks
}

/**
 * Render a chat message string into safe React nodes.
 *
 * @param content Raw (untrusted) message text.
 * @param styles  Optional inline styles for lists (used by the widget).
 */
export function renderMessage(
  content: string,
  styles?: MarkdownStyles,
): ReactElement {
  const blocks = toBlocks(content)

  return (
    <>
      {blocks.map((block, bi) => {
        if (block.type === 'ul') {
          return (
            <ul key={`b${bi}`} style={styles?.ul}>
              {block.items.map((item, ii) => (
                <li key={ii} style={styles?.li}>
                  {renderInline(item, `b${bi}-${ii}`)}
                </li>
              ))}
            </ul>
          )
        }
        if (block.type === 'ol') {
          return (
            <ol key={`b${bi}`} style={styles?.ol}>
              {block.items.map((item, ii) => (
                <li key={ii} style={styles?.li}>
                  {renderInline(item, `b${bi}-${ii}`)}
                </li>
              ))}
            </ol>
          )
        }
        // Paragraph block: join lines with <br/>, dropping leading/trailing
        // blank lines so blank separators between blocks don't add stray gaps.
        let start = 0
        let end = block.lines.length
        while (start < end && block.lines[start].trim() === '') start++
        while (end > start && block.lines[end - 1].trim() === '') end--
        const lines = block.lines.slice(start, end)
        if (lines.length === 0) return null
        return (
          <Fragment key={`b${bi}`}>
            {lines.map((line, li) => (
              <Fragment key={li}>
                {renderInline(line, `b${bi}-${li}`)}
                {li < lines.length - 1 && <br />}
              </Fragment>
            ))}
          </Fragment>
        )
      })}
    </>
  )
}
