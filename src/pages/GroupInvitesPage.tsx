import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { UsersRound } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { QueryState } from '@/components/dashboard/QueryState'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { WorklistFilter } from '@/components/dashboard/worklist/WorklistFilter'
import { GroupInviteRow } from '@/components/dashboard/worklist/GroupInviteRow'
import { useGroupInviteRequests } from '@/hooks/useDashboard'
import { useT } from '@/lib/i18n'
import type { WorklistStatus } from '@/lib/api'

const STATUSES: WorklistStatus[] = ['pending', 'handled', 'all']

/**
 * Dedicated worklist of buyers who opted (via the agent) into the WhatsApp
 * "offers" group. The full list — filterable by pending / handled / all — with
 * the mark-added action on pending rows. The status filter lives in the URL so
 * the view is shareable and survives back/forward; an absent param defaults to
 * the pending queue.
 */
export function GroupInvitesPage() {
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

  const { data, isLoading, error, refetch } = useGroupInviteRequests(status)
  const rows = data ?? []

  return (
    <PageShell
      breadcrumbs={[{ label: t('nav.groupInvites') }]}
      title={t('overview.groupInviteTitle')}
      description={t('overview.groupInviteDesc')}
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
            icon={UsersRound}
            title={t('overview.groupInviteEmptyTitle')}
            description={
              status === 'pending'
                ? t('overview.groupInviteEmpty')
                : t('overview.worklistEmpty')
            }
          />
        }
      >
        <div className="flex flex-col gap-3">
          {rows.map((req) => (
            <GroupInviteRow key={req.contact_id} req={req} />
          ))}
        </div>
      </QueryState>
    </PageShell>
  )
}
