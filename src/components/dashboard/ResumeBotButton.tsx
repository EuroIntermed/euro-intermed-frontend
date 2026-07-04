import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Bot } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { resumeBot, type AuthedLeadDetail } from '@/lib/api'
import { useT } from '@/lib/i18n'

interface Props {
  leadId: string
  /** shadcn Button size (defaults to `sm`, matching the other lead actions). */
  size?: 'xs' | 'sm' | 'default'
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  className?: string
  /** Stop the click bubbling to a clickable table row (handoff queue). */
  stopPropagation?: boolean
}

/**
 * "Reia botul" / "Resume bot" action. Re-activates the automated agent on a
 * handed-off (bot-muted) conversation via `POST /api/leads/{id}/resume-bot`
 * (204, idempotent). Mirrors the other lead mutations (assign/offer): optimistic
 * clear of `needs_human` on the cached lead detail, success/error toast, and a
 * refetch of the lead detail + leads pipeline + handoff queue so the row updates.
 */
export function ResumeBotButton({
  leadId,
  size = 'sm',
  variant = 'default',
  className,
  stopPropagation,
}: Props) {
  const queryClient = useQueryClient()
  const { t } = useT()

  const mutation = useMutation({
    mutationFn: () => resumeBot(leadId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['lead', leadId] })
      const prev = queryClient.getQueryData<AuthedLeadDetail>(['lead', leadId])
      queryClient.setQueryData<AuthedLeadDetail>(['lead', leadId], (old) =>
        old ? { ...old, needs_human: false } : old,
      )
      return { prev }
    },
    onError: (_err, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['lead', leadId], ctx.prev)
      toast.error(t('detail.resumeBotError'))
    },
    onSuccess: () => toast.success(t('detail.resumeBotSaved')),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['handoffs'] })
    },
  })

  return (
    <Button
      size={size}
      variant={variant}
      className={className}
      disabled={mutation.isPending}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation()
        mutation.mutate()
      }}
    >
      <Bot className="size-4" />
      {mutation.isPending ? t('common.saving') : t('detail.resumeBot')}
    </Button>
  )
}
