import { Link } from 'react-router-dom'
import { ArrowRight, UsersRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { GroupInviteRow } from '@/components/dashboard/worklist/GroupInviteRow'
import { cn } from '@/lib/utils'
import { useGroupInviteRequests } from '@/hooks/useDashboard'
import { useT } from '@/lib/i18n'

// How many pending rows the compact overview preview shows before collapsing the
// rest behind a "+N more" hint; the full list lives on the dedicated page.
const PREVIEW_LIMIT = 3

/**
 * Overview preview of buyers who opted (via the agent) into the WhatsApp
 * "offers" group and still need to be added manually. Pending-only and compact:
 * the first few rows plus a "+N more" hint and a "See all" link into the
 * dedicated group-invites page (where the status filter + full list live).
 * Loading shows skeletons; a real error (or 403 → empty list) hides gracefully.
 * The block carries a subtle brand highlight and a pending count so it stands
 * out on the overview.
 */
export function GroupInviteSection() {
  const { t } = useT()
  const query = useGroupInviteRequests('pending')

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
  const preview = requests.slice(0, PREVIEW_LIMIT)
  const overflow = requests.length - preview.length

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
          {t('overview.groupInviteCount', { n: requests.length })}
        </Badge>
        <Link
          to="/dashboard/group-invites"
          className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
        >
          {t('overview.seeAll')}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            {t('overview.groupInviteEmpty')}
          </CardContent>
        </Card>
      ) : (
        <>
          {preview.map((req) => (
            <GroupInviteRow key={req.contact_id} req={req} />
          ))}
          {overflow > 0 && (
            <Link
              to="/dashboard/group-invites"
              className="px-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              {t('overview.andMore', { n: overflow })}
            </Link>
          )}
        </>
      )}
    </div>
  )
}
