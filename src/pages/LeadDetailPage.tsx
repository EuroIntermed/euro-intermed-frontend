import { useParams, useNavigate } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryState } from '@/components/dashboard/QueryState'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { LeadDetail } from '@/components/dashboard/LeadDetail'
import { useLeadDetail, useUsers } from '@/hooks/useDashboard'
import { useT } from '@/lib/i18n'

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useT()
  const { data: lead, isLoading, error, refetch } = useLeadDetail(id ?? '')
  const { data: users = [] } = useUsers()

  return (
    <QueryState
      isLoading={isLoading}
      error={error || (!lead && !isLoading ? new Error('not found') : undefined)}
      errorMessage={t('detail.notFound')}
      onRetry={refetch}
      skeleton={
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
          <Skeleton className="h-32 w-full rounded-xl" />
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-56 w-full rounded-xl" />
            ))}
          </div>
        </div>
      }
    >
      {lead ? (
        <LeadDetail lead={lead} users={users} />
      ) : (
        <EmptyState
          icon={FileQuestion}
          title={t('detail.notFound')}
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard/pipeline')}
            >
              {t('common.back')}
            </Button>
          }
        />
      )}
    </QueryState>
  )
}
