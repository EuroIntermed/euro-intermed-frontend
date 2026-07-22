import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { QueryState } from '@/components/dashboard/QueryState'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { WorklistFilter } from '@/components/dashboard/worklist/WorklistFilter'
import { NewsletterRow } from '@/components/dashboard/worklist/NewsletterRow'
import { useNewsletterOptIns } from '@/hooks/useDashboard'
import { useT } from '@/lib/i18n'
import type { WorklistStatus } from '@/lib/api'

const STATUSES: WorklistStatus[] = ['pending', 'handled', 'all']

/**
 * Dedicated worklist of buyers who opted (via the agent) into the email
 * newsletter. The full list — filterable by pending / handled / all — with the
 * mark-exported action on pending rows and the email surfaced for easy
 * copy/select. The status filter lives in the URL so the view is shareable and
 * survives back/forward; an absent param defaults to the pending queue.
 */
export function NewsletterPage() {
  const { t } = useT()
  const [searchParams, setSearchParams] = useSearchParams()

  const raw = searchParams.get('status')
  const status: WorklistStatus = STATUSES.includes(raw as WorklistStatus)
    ? (raw as WorklistStatus)
    : 'pending'

  const setStatus = useCallback(
    (value: WorklistStatus) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        // Absent param = the default pending queue; store anything else verbatim.
        if (value === 'pending') next.delete('status')
        else next.set('status', value)
        return next
      })
    },
    [setSearchParams],
  )

  const { data, isLoading, error, refetch } = useNewsletterOptIns(status)
  const rows = data ?? []

  return (
    <PageShell
      breadcrumbs={[{ label: t('nav.newsletter') }]}
      title={t('overview.newsletterTitle')}
      description={t('overview.newsletterDesc')}
      actions={<WorklistFilter value={status} onChange={setStatus} />}
    >
      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={rows.length === 0}
        skeletonRows={4}
        errorMessage={t('overview.worklistLoadError')}
        onRetry={refetch}
        empty={
          <EmptyState
            icon={Mail}
            title={t('overview.newsletterEmptyTitle')}
            description={
              status === 'pending'
                ? t('overview.newsletterEmpty')
                : t('overview.worklistEmpty')
            }
          />
        }
      >
        <div className="flex flex-col gap-3">
          {rows.map((req) => (
            <NewsletterRow key={req.contact_id} req={req} />
          ))}
        </div>
      </QueryState>
    </PageShell>
  )
}
