import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Phone, UsersRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { sentenceCase } from '@/lib/format'
import { useGroupInviteRequests, useMarkGroupAdded } from '@/hooks/useDashboard'
import { useEnums, useT, formatDateTime } from '@/lib/i18n'
import type { GroupInviteRequest, WorklistStatus } from '@/lib/api'

/**
 * One opted-in buyer awaiting manual addition to the WhatsApp offers group.
 * Shows who they are, their vertical + interests (so an admin knows which group
 * to add them to), an optional note/phone/lead deep-link, and a primary
 * "Added to group" action that marks them done (the row then drops off the
 * pending worklist via query invalidation).
 */
function GroupInviteRow({ req }: { req: GroupInviteRequest }) {
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

/**
 * Overview worklist of buyers who opted (via the agent) into the WhatsApp
 * "offers" group and still need to be added manually. Renders one card per
 * person so an admin can read each one's interests/vertical at a glance and mark
 * them added. Loading shows skeletons; a real error (or 403 → empty list) hides
 * gracefully. The block carries a subtle brand highlight and a pending count so
 * it stands out on the overview.
 */
export function GroupInviteSection() {
  const { t } = useT()
  const [status, setStatus] = useState<WorklistStatus>('pending')
  const query = useGroupInviteRequests(status)

  // First load (no cached slice yet): skeletons. On a filter switch the previous
  // slice stays visible via `placeholderData`, so the control never flashes out.
  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-[96px] w-full rounded-xl" />
        ))}
      </div>
    )
  }

  // A genuine failure shouldn't take down the overview.
  if (query.isError) return null

  const requests = query.data ?? []

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border p-3',
        'border-brand/40 bg-brand-soft/30',
      )}
    >
      <div className="flex flex-wrap items-center gap-2 px-1">
        <span className="flex size-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <UsersRound className="size-4" />
        </span>
        <Badge variant="secondary" className="tabular-nums">
          {status === 'pending'
            ? t('overview.groupInviteCount', { n: requests.length })
            : t('overview.worklistCount', { n: requests.length })}
        </Badge>
        <Tabs
          value={status}
          onValueChange={(v) => setStatus(v as WorklistStatus)}
          className="ml-auto"
        >
          <TabsList aria-label={t('overview.filterAria')}>
            <TabsTrigger value="pending">
              {t('overview.filterPending')}
            </TabsTrigger>
            <TabsTrigger value="handled">
              {t('overview.filterHandled')}
            </TabsTrigger>
            <TabsTrigger value="all">{t('overview.filterAll')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            {status === 'pending'
              ? t('overview.groupInviteEmpty')
              : t('overview.worklistEmpty')}
          </CardContent>
        </Card>
      ) : (
        requests.map((req) => (
          <GroupInviteRow key={req.contact_id} req={req} />
        ))
      )}
    </div>
  )
}
