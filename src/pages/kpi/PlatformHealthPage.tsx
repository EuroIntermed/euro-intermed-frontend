import {
  Activity,
  AlertOctagon,
  CheckCircle2,
  DatabaseBackup,
  ExternalLink,
  Gauge,
  History,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageShell } from '@/components/layout/PageShell'
import { QueryState } from '@/components/dashboard/QueryState'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { KpiStatCard } from '@/components/dashboard/KpiStatCard'
import { usePlatformHealth } from '@/hooks/useDashboard'
import { getMonitoringUrl } from '@/lib/api'
import { useT, formatDate } from '@/lib/i18n'

/**
 * "Platform health" board (KPI_PLAN §E.2): open/closed incidents + last
 * backup/restore-test as tiles. Uptime and API-error rate are measured
 * externally (always null on the wire) so they render "—" with the
 * `monitoring_note` and a link out to Cloud Monitoring (URL from
 * `VITE_MONITORING_URL`, never hardcoded). 403 → hidden.
 */
export function PlatformHealthPage() {
  const { t, lang } = useT()
  const { data, isLoading, error } = usePlatformHealth()
  const monitoringUrl = getMonitoringUrl()

  return (
    <PageShell
      breadcrumbs={[{ label: t('nav.kpiHealth') }]}
      title={t('kpiBoards.health.title')}
      description={t('kpiBoards.health.subtitle')}
    >
      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={!data}
        skeletonRows={6}
        errorMessage={t('kpiBoards.health.loadError')}
        empty={
          <EmptyState
            icon={Activity}
            title={t('kpiBoards.health.loadError')}
          />
        }
      >
        {data && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiStatCard
                icon={AlertOctagon}
                label={t('kpiBoards.health.openIncidents')}
                value={String(data.open_incidents)}
              />
              <KpiStatCard
                icon={CheckCircle2}
                label={t('kpiBoards.health.closedIncidents')}
                value={String(data.closed_incidents)}
              />
              <KpiStatCard
                icon={DatabaseBackup}
                label={t('kpiBoards.health.lastBackup')}
                value={
                  data.last_backup_at
                    ? formatDate(lang, data.last_backup_at)
                    : t('common.none')
                }
              />
              <KpiStatCard
                icon={History}
                label={t('kpiBoards.health.lastRestoreTest')}
                value={
                  data.last_restore_test_at
                    ? formatDate(lang, data.last_restore_test_at)
                    : t('common.none')
                }
              />
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  <Gauge className="size-4" />
                  {t('kpiBoards.health.monitoringTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-card px-3 py-2">
                    <div className="text-xs text-muted-foreground">
                      {t('kpiBoards.health.uptime')}
                    </div>
                    <div className="mt-1 text-lg font-semibold tabular-nums">
                      {t('common.none')}
                    </div>
                  </div>
                  <div className="rounded-lg border bg-card px-3 py-2">
                    <div className="text-xs text-muted-foreground">
                      {t('kpiBoards.health.apiError')}
                    </div>
                    <div className="mt-1 text-lg font-semibold tabular-nums">
                      {t('common.none')}
                    </div>
                  </div>
                </div>
                {data.monitoring_note && (
                  <p className="text-sm text-muted-foreground">
                    {data.monitoring_note}
                  </p>
                )}
                {monitoringUrl && (
                  <Button asChild variant="outline" size="sm" className="self-start">
                    <a href={monitoringUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      {t('kpiBoards.health.openMonitoring')}
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </QueryState>
    </PageShell>
  )
}
