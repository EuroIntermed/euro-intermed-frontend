import { Fragment } from 'react'
import { renderMessage } from '@/lib/chat/markdown'
import { resolveContent } from '@/lib/chat/transcript'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import type { TranscriptMessage } from '@/lib/api'

/** A request whose messages can be labelled in a per-request divider. */
export interface RequestRef {
  id: string
  seq?: number | null
  product?: string
}

interface Props {
  /** Full conversation thread (every message). Tool rows / empty turns are dropped. */
  messages: TranscriptMessage[]
  /** This lead plus its siblings — used to caption per-request dividers. */
  requests: RequestRef[]
  emptyText?: string
}

/**
 * Renders the full conversation as chat bubbles (oldest first), inserting a
 * subtle divider whenever the active request (messages.lead_id) changes — but
 * only when the conversation actually holds more than one request, so a normal
 * single-request thread reads as one clean block. Pre-submission turns
 * (lead_id = null) sit under a "Conversation start" divider.
 */
export function TranscriptThread({ messages, requests, emptyText }: Props) {
  const { t } = useT()

  const rows = (messages ?? [])
    .filter(
      (m) => m.role === 'user' || m.role === 'model' || m.role === 'assistant',
    )
    .map((m) => ({
      id: m.id,
      role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: resolveContent(m),
      leadId: m.lead_id ?? null,
    }))
    .filter((m) => m.content)

  if (rows.length === 0) {
    return (
      <p className="px-1 py-2 text-sm text-muted-foreground">
        {emptyText ?? t('detail.noMessages')}
      </p>
    )
  }

  const multiRequest = requests.length > 1

  const labelFor = (leadId: string | null): string => {
    if (!leadId) return t('detail.conversationStart')
    const r = requests.find((x) => x.id === leadId)
    if (!r) return t('detail.conversationStart')
    const seq = r.seq != null ? t('detail.seqHandle', { n: r.seq }) : ''
    return [seq, r.product].filter(Boolean).join(' · ') || t('detail.conversationStart')
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((m, i) => {
        const showDivider =
          multiRequest && (i === 0 || rows[i - 1].leadId !== m.leadId)
        return (
          <Fragment key={m.id}>
            {showDivider && (
              <div className="flex items-center gap-3 py-1" role="separator">
                <span className="h-px flex-1 bg-border" />
                <span className="whitespace-nowrap text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {labelFor(m.leadId)}
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
            )}
            <div
              className={cn(
                'flex',
                m.role === 'user' ? 'justify-end' : 'justify-start',
              )}
            >
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                  '[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5',
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-muted text-foreground rounded-tl-sm',
                )}
              >
                {m.role === 'assistant' ? renderMessage(m.content) : m.content}
              </div>
            </div>
          </Fragment>
        )
      })}
    </div>
  )
}
