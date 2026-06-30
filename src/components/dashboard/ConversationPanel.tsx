import { MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  TranscriptThread,
  type RequestRef,
} from '@/components/dashboard/TranscriptThread'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { TranscriptMessage } from '@/lib/api'

interface Props {
  messages: TranscriptMessage[]
  requests: RequestRef[]
  /** True when the conversation was handed off to a human (bot muted). */
  needsHuman?: boolean
  /** Extra classes on the panel root (e.g. sticky positioning, height). */
  className?: string
  /** Render without the bordered card chrome (e.g. inside a Sheet). */
  bare?: boolean
}

/**
 * The lead's conversation as a self-contained side companion: a header strip
 * (channel-agnostic state + message count) over an independently scrollable
 * chat thread. Reused by the desktop sticky right rail and the mobile Sheet so
 * the transcript markup lives in exactly one place.
 */
export function ConversationPanel({
  messages,
  requests,
  needsHuman,
  className,
  bare,
}: Props) {
  const { t } = useT()

  const count = (messages ?? []).filter(
    (m) => m.role === 'user' || m.role === 'model' || m.role === 'assistant',
  ).length

  return (
    <section
      aria-label={t('detail.sectionTranscript')}
      className={cn(
        'flex min-h-0 flex-col overflow-hidden',
        !bare && 'rounded-xl border bg-card',
        className,
      )}
    >
      <header
        className={cn(
          'flex shrink-0 items-center gap-2 border-b px-4 py-3',
          bare && 'border-b-0 px-0 pt-0',
        )}
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <MessageSquare className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-none">
            {t('detail.sectionTranscript')}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {t('detail.transcriptCount', { n: count })}
          </p>
        </div>
        {needsHuman ? (
          <Badge variant="destructive">{t('detail.transcriptHuman')}</Badge>
        ) : (
          <Badge variant="secondary">{t('detail.transcriptBot')}</Badge>
        )}
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className={cn('px-4 py-4', bare && 'px-0')}>
          <TranscriptThread messages={messages ?? []} requests={requests} />
        </div>
      </ScrollArea>
    </section>
  )
}
