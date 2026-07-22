import { Link } from 'react-router-dom'
import { ArrowRight, Mail } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { NewsletterRow } from '@/components/dashboard/worklist/NewsletterRow'
import { cn } from '@/lib/utils'
import { useNewsletterOptIns } from '@/hooks/useDashboard'
import { useT } from '@/lib/i18n'

// How many pending rows the compact overview preview shows before collapsing the
// rest behind a "+N more" hint; the full list lives on the dedicated page.
const PREVIEW_LIMIT = 3

/**
 * Overview preview of buyers who opted (via the agent) into the email newsletter
 * and still need to be exported into the mailing tool. Pending-only and compact:
 * the first few rows plus a "+N more" hint and a "See all" link into the
 * dedicated newsletter page (where the status filter + full list live). Loading
 * shows skeletons; a real error (or 403 → empty list) hides gracefully. The
 * block carries a subtle brand highlight and a pending count so it stands out on
 * the overview.
 */
export function NewsletterSection() {
  const { t } = useT()
  const query = useNewsletterOptIns('pending')

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
          <Mail className="size-4" />
        </span>
        <Badge variant="secondary" className="tabular-nums">
          {t('overview.newsletterCount', { n: requests.length })}
        </Badge>
        <Link
          to="/dashboard/newsletter"
          className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
        >
          {t('overview.seeAll')}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            {t('overview.newsletterEmpty')}
          </CardContent>
        </Card>
      ) : (
        <>
          {preview.map((req) => (
            <NewsletterRow key={req.contact_id} req={req} />
          ))}
          {overflow > 0 && (
            <Link
              to="/dashboard/newsletter"
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
