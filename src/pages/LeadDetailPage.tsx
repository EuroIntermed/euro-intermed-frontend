import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LeadDetail } from '@/components/dashboard/LeadDetail'
import { useLeadDetail, useUsers } from '@/hooks/useDashboard'
import { useT } from '@/lib/i18n'

export function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useT()
  const { data: lead, isLoading, error, refetch } = useLeadDetail(id ?? '')
  const { data: users = [] } = useUsers()

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !lead) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <p className="text-sm text-destructive">{t('detail.notFound')}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t('common.retry')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard/pipeline')}
          >
            {t('common.back')}
          </Button>
        </div>
      </div>
    )
  }

  return <LeadDetail lead={lead} users={users} />
}
