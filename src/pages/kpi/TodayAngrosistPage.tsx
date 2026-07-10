import { AlertTriangle, CheckCircle2, PackageCheck, Send } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { QueryState } from '@/components/dashboard/QueryState'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { KpiStatCard } from '@/components/dashboard/KpiStatCard'
import { LeadRefList } from '@/components/dashboard/LeadRefList'
import { useTodayAngrosist } from '@/hooks/useDashboard'
import { useT } from '@/lib/i18n'

/**
 * "Today – Angrosist" action board (KPI_PLAN §E.2): today's qualified count +
 * confirmed orders as headline tiles, then actionable lead lists (qualified
 * today, offers to send, alerts). Guarded on the backend; 403 → null → hidden.
 */
export function TodayAngrosistPage() {
  const { t } = useT()
  const { data, isLoading, error } = useTodayAngrosist()

  return (
    <PageShell
      breadcrumbs={[{ label: t('nav.kpiToday') }]}
      title={t('kpiBoards.today.title')}
      description={t('kpiBoards.today.subtitle')}
    >
      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={!data}
        skeletonRows={6}
        errorMessage={t('kpiBoards.today.loadError')}
        empty={
          <EmptyState
            icon={CheckCircle2}
            title={t('kpiBoards.today.loadError')}
          />
        }
      >
        {data && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiStatCard
                icon={CheckCircle2}
                label={t('kpiBoards.today.qualifiedToday')}
                value={String(data.qualified_today)}
              />
              <KpiStatCard
                icon={PackageCheck}
                label={t('kpiBoards.today.ordersConfirmed')}
                value={String(data.orders_confirmed_today)}
              />
              <KpiStatCard
                icon={Send}
                label={t('kpiBoards.today.offersToSend')}
                value={String(data.offers_to_send.length)}
              />
              <KpiStatCard
                icon={AlertTriangle}
                label={t('kpiBoards.today.alerts')}
                value={String(data.alerts.length)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <LeadRefList
                title={t('kpiBoards.today.qualifiedLeads')}
                items={data.qualified_leads}
                emptyLabel={t('kpiBoards.today.emptyLeads')}
              />
              <LeadRefList
                title={t('kpiBoards.today.offersToSend')}
                items={data.offers_to_send}
                emptyLabel={t('kpiBoards.today.emptyOffers')}
              />
              <LeadRefList
                title={t('kpiBoards.today.alertsTitle')}
                items={data.alerts}
                emptyLabel={t('kpiBoards.today.emptyAlerts')}
              />
            </div>
          </div>
        )}
      </QueryState>
    </PageShell>
  )
}
