import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { MessageList, type Message } from '@/components/chat/MessageList'
import { useT } from '@/lib/i18n'

interface Props {
  messages: Message[]
  /**
   * Optional drawer heading. Defaults to the generic "Conversation transcript".
   * The lead detail passes the per-request label ("Transcript (this request)")
   * because the transcript is scoped to one request's messages (migration 038).
   */
  title?: string
}

/**
 * Read-only conversation transcript shown on demand as a right-side drawer.
 * Hidden by default; the trigger (with the message count) lives in the detail
 * hero. The transcript is never editable — MessageList renders in `readonly`.
 */
export function TranscriptSheet({ messages, title }: Props) {
  const { t } = useT()

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <MessageSquare className="h-4 w-4" />
          {t('detail.viewTranscript')}
          {messages.length > 0 && (
            <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">
              {messages.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-md md:max-w-lg"
      >
        <SheetHeader className="border-b">
          <SheetTitle>{title ?? t('detail.transcript')}</SheetTitle>
          <SheetDescription>
            {t('detail.transcriptCount', { n: messages.length })}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          {messages.length > 0 ? (
            <MessageList messages={messages} readonly />
          ) : (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              {t('detail.noMessages')}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
