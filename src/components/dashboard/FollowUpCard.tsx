import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateOffer, type AuthedLeadDetail, type OfferUpdate } from '@/lib/api'
import { useT, formatDateTime } from '@/lib/i18n'

interface Props {
  lead: AuthedLeadDetail
}

/**
 * Converts an ISO timestamp to the `YYYY-MM-DDTHH:mm` value a
 * <input type="datetime-local"> expects, in local time. Empty/invalid → ''.
 */
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`
}

/**
 * Lead-level follow-up reminder editor. PATCHes the offer endpoint with
 * `follow_up_at` (RFC3339 to schedule, null to clear). Shows the current value
 * and a clear button. Server state via TanStack Query; the cache is invalidated
 * on settle so the lead detail re-reads the persisted value.
 */
export function FollowUpCard({ lead }: Props) {
  const queryClient = useQueryClient()
  const { t, lang } = useT()

  const [input, setInput] = useState(isoToLocalInput(lead.follow_up_at))

  // Re-seed the input when the underlying lead changes (adjust-state-on-render
  // keyed on a fingerprint — no effect needed).
  const fingerprint = `${lead.id}:${lead.follow_up_at ?? ''}`
  const [seen, setSeen] = useState(fingerprint)
  if (seen !== fingerprint) {
    setSeen(fingerprint)
    setInput(isoToLocalInput(lead.follow_up_at))
  }

  const mutation = useMutation({
    mutationFn: (body: OfferUpdate) => updateOffer(lead.id, body),
    onSuccess: () => toast.success(t('detail.followUpSaved')),
    onError: () => toast.error(t('detail.followUpError')),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', lead.id] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })

  function onSave() {
    // datetime-local is local time; normalize to RFC3339 UTC for the backend.
    const iso = input ? new Date(input).toISOString() : null
    mutation.mutate({ follow_up_at: iso })
  }

  function onClear() {
    setInput('')
    mutation.mutate({ follow_up_at: null })
  }

  const busy = mutation.isPending
  const current = lead.follow_up_at

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {t('detail.followUp')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          {current
            ? `${t('detail.followUpDue')}: ${formatDateTime(lang, current)}`
            : t('detail.followUpNone')}
        </p>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="follow-up-at">{t('detail.followUpSet')}</Label>
          <Input
            id="follow-up-at"
            type="datetime-local"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          {current && (
            <Button variant="ghost" onClick={onClear} disabled={busy}>
              {t('detail.followUpClear')}
            </Button>
          )}
          <Button onClick={onSave} disabled={busy || !input}>
            {busy ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
