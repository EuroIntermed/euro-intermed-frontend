import { Link } from 'react-router-dom'
import { ArrowRight, Check, Phone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { sentenceCase } from '@/lib/format'
import { useMarkGroupAdded } from '@/hooks/useDashboard'
import { useEnums, useT, formatDateTime } from '@/lib/i18n'
import type { GroupInviteRequest } from '@/lib/api'

/**
 * One opted-in buyer awaiting manual addition to the WhatsApp offers group.
 * Shows who they are, their vertical + interests (so an admin knows which group
 * to add them to), an optional note/phone/lead deep-link, and a primary
 * "Added to group" action that marks them done (the row then drops off the
 * pending worklist via query invalidation). Handled rows show a status badge and
 * the date they were added. Shared between the Overview preview section and the
 * dedicated group-invites page so both render identically.
 */
export function GroupInviteRow({ req }: { req: GroupInviteRequest }) {
  const { t, lang } = useT()
  const { verticalLabel } = useEnums()
  const mark = useMarkGroupAdded()

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{req.contact_name}</span>
            <span className="text-sm text-muted-foreground">
              {req.company_name}
            </span>
            {req.vertical && (
              <Badge variant="secondary">{verticalLabel(req.vertical)}</Badge>
            )}
          </div>

          {req.interests.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {req.interests.map((interest, i) => (
                <Badge key={`${interest}-${i}`} variant="outline">
                  {sentenceCase(interest)}
                </Badge>
              ))}
            </div>
          )}

          {req.note && (
            <p className="mt-2 text-sm text-muted-foreground break-words">
              {req.note}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{formatDateTime(lang, req.asked_at)}</span>
            {req.phone && (
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Phone className="size-3" />
                {req.phone}
              </span>
            )}
            {req.lead_id && (
              <Link
                to={`/dashboard/${req.lead_id}`}
                className="inline-flex items-center gap-1 text-brand hover:underline"
              >
                {t('overview.groupInviteViewLead')}
                <ArrowRight className="size-3" />
              </Link>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          {req.status === 'pending' ? (
            <Button
              size="sm"
              onClick={() => mark.mutate(req.contact_id)}
              disabled={mark.isPending}
            >
              <Check className="size-4" />
              {t('overview.groupInviteAdd')}
            </Button>
          ) : (
            <>
              <Badge variant="outline" className="gap-1">
                <Check className="size-3" />
                {t('overview.statusAdded')}
              </Badge>
              {req.added_at && (
                <span className="text-xs text-muted-foreground">
                  {t('overview.handledOn', {
                    date: formatDateTime(lang, req.added_at),
                  })}
                </span>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
