import type { ReactNode } from 'react'
import { Boxes, PackageX, Users, Wallet } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageShell } from '@/components/layout/PageShell'
import { QueryState } from '@/components/dashboard/QueryState'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { KpiStatCard } from '@/components/dashboard/KpiStatCard'
import { BreakdownCard } from '@/components/dashboard/BreakdownCard'
import { usePortfolioClearance } from '@/hooks/useDashboard'
import { useT, formatEUR, formatPercent, formatCount } from '@/lib/i18n'

/** One label/value row of the clearance funnel card. */
function FunnelRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <li className="flex items-baseline justify-between gap-2 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </li>
  )
}

/**
 * "Portfolio – Clearance" board (KPI_PLAN §E.2): active-stock headline tiles, a
 * stock-aging breakdown, and the lower clearance funnel (sellers → active buyers
 * → match rate). Nulls render as "—"; ratios as %, money as EUR. 403 → hidden.
 */
export function PortfolioClearancePage() {
  const { t, lang } = useT()
  const { data, isLoading, error } = usePortfolioClearance()

  return (
    <PageShell
      breadcrumbs={[{ label: t('nav.kpiClearance') }]}
      title={t('kpiBoards.clearance.title')}
      description={t('kpiBoards.clearance.subtitle')}
    >
      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={!data}
        skeletonRows={6}
        errorMessage={t('kpiBoards.clearance.loadError')}
        empty={
          <EmptyState
            icon={Boxes}
            title={t('kpiBoards.clearance.loadError')}
          />
        }
      >
        {data && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <KpiStatCard
                icon={Boxes}
                label={t('kpiBoards.clearance.activeListings')}
                value={formatCount(data.active_listings)}
              />
              <KpiStatCard
                icon={Wallet}
                label={t('kpiBoards.clearance.activeListingsValue')}
                value={formatEUR(lang, data.active_listings_value, t('common.none'))}
              />
              <KpiStatCard
                icon={Users}
                label={t('kpiBoards.clearance.activeBuyers')}
                value={formatCount(data.active_buyers)}
                sub={
                  data.active_buyers_target != null
                    ? t('kpiBoards.targetOf', { n: data.active_buyers_target })
                    : undefined
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <BreakdownCard
                title={t('kpiBoards.clearance.aging')}
                items={data.aging_buckets}
              />

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    <PackageX className="size-4" />
                    {t('kpiBoards.clearance.funnelTitle')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="flex flex-col divide-y">
                    <FunnelRow
                      label={t('kpiBoards.clearance.sellersRegistered')}
                      value={formatCount(data.funnel.sellers_registered)}
                    />
                    <FunnelRow
                      label={t('kpiBoards.clearance.stockCompleteness')}
                      value={formatPercent(
                        data.funnel.stock_completeness,
                        t('common.none'),
                      )}
                    />
                    <FunnelRow
                      label={t('kpiBoards.clearance.activeBuyers')}
                      value={formatCount(data.funnel.active_buyers)}
                    />
                    <FunnelRow
                      label={t('kpiBoards.clearance.matchRate')}
                      value={formatPercent(
                        data.funnel.match_rate,
                        t('common.none'),
                      )}
                    />
                    <FunnelRow
                      label={t('kpiBoards.clearance.avgDaysToPlace')}
                      value={
                        data.funnel.avg_days_to_place != null
                          ? t('kpiBoards.clearance.days', {
                              n: Math.round(data.funnel.avg_days_to_place),
                            })
                          : t('common.none')
                      }
                    />
                    <FunnelRow
                      label={t('kpiBoards.clearance.recurringBuyers')}
                      value={formatPercent(
                        data.funnel.recurring_buyers_pct,
                        t('common.none'),
                      )}
                    />
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </QueryState>
    </PageShell>
  )
}
