import { useEffect, useRef, useState } from 'react'
import { Headset, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Banner } from '@/components/dashboard/Banner'
import { QueryState } from '@/components/dashboard/QueryState'
import { ResumeBotButton } from '@/components/dashboard/ResumeBotButton'
import {
  useConversationMessages,
  useSendHumanMessage,
} from '@/hooks/useDashboard'
import { useT, formatDateTime } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { ConversationMessage } from '@/lib/api'

/** Backend caps a human reply at 4000 chars — mirror it client-side. */
const MAX_LEN = 4000

interface Props {
  conversationId: string
  leadId: string
  /** True when the conversation is handed off (bot muted). */
  needsHuman: boolean
  className?: string
}

/**
 * Human two-way takeover console. Shows the LIVE conversation transcript (polled
 * every 4s while mounted so new customer messages appear) and lets a staff
 * member reply as a human — the reply is delivered to the customer over their
 * channel and mutes the bot on first send. When the conversation is handed off a
 * status banner offers the {@link ResumeBotButton} to hand control back to the
 * bot. Message content is user-supplied and rendered strictly as plain text.
 */
export function ConversationTakeover({
  conversationId,
  leadId,
  needsHuman,
  className,
}: Props) {
  const { t, lang } = useT()
  const [text, setText] = useState('')

  const {
    data: messages = [],
    isLoading,
    error,
    refetch,
  } = useConversationMessages(conversationId, { enabled: !!conversationId })

  const mutation = useSendHumanMessage(conversationId, leadId)

  // Auto-scroll to the newest message whenever the transcript grows.
  const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  const trimmed = text.trim()
  const tooLong = trimmed.length > MAX_LEN
  const canSend = !!trimmed && !tooLong && !mutation.isPending

  function submit() {
    if (!canSend) return
    mutation.mutate(trimmed, {
      onSuccess: () => setText(''),
      onError: () => toast.error(t('takeover.sendError')),
    })
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          <Headset className="size-4" />
          {t('takeover.title')}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t('takeover.description')}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {needsHuman && (
          <Banner
            tone="danger"
            title={t('takeover.mutedBanner')}
            description={t('takeover.mutedBannerDesc')}
            action={<ResumeBotButton leadId={leadId} />}
          />
        )}

        <QueryState
          isLoading={isLoading}
          error={error}
          errorMessage={t('takeover.loadError')}
          onRetry={refetch}
          skeletonRows={4}
        >
          <div
            role="log"
            aria-label={t('takeover.region')}
            aria-live="polite"
          >
            <ScrollArea className="h-96 rounded-lg border bg-muted/20">
              <div className="flex flex-col gap-3 px-4 py-4">
                {messages.length === 0 ? (
                  <p className="px-1 py-2 text-sm text-muted-foreground">
                    {t('takeover.empty')}
                  </p>
                ) : (
                  messages.map((m) => (
                    <MessageBubble key={m.id} message={m} lang={lang} />
                  ))
                )}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
          </div>
        </QueryState>

        <div className="flex flex-col gap-2">
          <Label htmlFor="takeover-reply" className="sr-only">
            {t('takeover.replyLabel')}
          </Label>
          <Textarea
            id="takeover-reply"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder={t('takeover.replyPlaceholder')}
            rows={3}
            aria-invalid={tooLong}
            className="resize-none"
          />
          <div className="flex items-center justify-between gap-3">
            <p
              className={cn(
                'text-xs',
                tooLong ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              {tooLong ? t('takeover.tooLong') : t('takeover.sendHint')}
            </p>
            <Button
              type="button"
              size="sm"
              className="gap-2"
              disabled={!canSend}
              aria-label={t('takeover.send')}
              onClick={submit}
            >
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {mutation.isPending ? t('takeover.sending') : t('takeover.send')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * One transcript bubble. `human` (the staff member, "Tu") sits on the right with
 * the primary/brand fill; `assistant` (the bot, "Bogdan") and `user` (the
 * customer) sit on the left, the bot distinct from the customer's muted fill.
 * Content is rendered as plain text (whitespace preserved) — never as markup.
 */
function MessageBubble({
  message,
  lang,
}: {
  message: ConversationMessage
  lang: 'ro' | 'en'
}) {
  const { t } = useT()
  const isHuman = message.role === 'human'

  const roleLabel =
    message.role === 'human'
      ? t('takeover.roleYou')
      : message.role === 'assistant'
        ? t('takeover.roleBot')
        : t('takeover.roleCustomer')

  const bubbleClass =
    message.role === 'human'
      ? 'bg-primary text-primary-foreground rounded-tr-sm'
      : message.role === 'assistant'
        ? 'bg-card text-foreground border rounded-tl-sm'
        : 'bg-secondary text-secondary-foreground rounded-tl-sm'

  return (
    <div className={cn('flex flex-col gap-1', isHuman ? 'items-end' : 'items-start')}>
      <div className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{roleLabel}</span>
        <span aria-hidden>·</span>
        <time dateTime={message.created_at}>
          {formatDateTime(lang, message.created_at)}
        </time>
      </div>
      <div
        className={cn(
          'max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          bubbleClass,
        )}
      >
        {message.content}
      </div>
    </div>
  )
}
