import { useState } from 'react'
import { Check, Code2, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface Props {
  code: string
  title: string
  description?: string
  /** Accessible label for the trigger icon button. */
  triggerLabel: string
  className?: string
}

/**
 * The `</>` icon button (Resend's code affordance): opens a dialog showing a
 * copyable code snippet. Reused for the widget embed code and any API/snippet
 * surface so "show me the code" looks and behaves identically everywhere.
 */
export function CodeButton({
  code,
  title,
  description,
  triggerLabel,
  className,
}: Props) {
  const { t } = useT()
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      toast.success(t('common.copied'))
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error(t('common.error'))
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={triggerLabel}
          className={className}
        >
          <Code2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="relative">
          <ScrollArea className="max-h-80 rounded-lg border bg-muted">
            <pre className="p-4 text-xs leading-relaxed">
              <code>{code}</code>
            </pre>
          </ScrollArea>
          <Button
            variant="secondary"
            size="sm"
            onClick={copy}
            className="absolute right-2 top-2 gap-1.5"
          >
            {copied ? (
              <Check className={cn('size-3.5 text-success')} />
            ) : (
              <Copy className="size-3.5" />
            )}
            {copied ? t('common.copied') : t('common.copy')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
