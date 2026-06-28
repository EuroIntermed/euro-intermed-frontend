import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useKpis } from '@/hooks/useDashboard'
import { useT } from '@/lib/i18n'
import type { TKey } from '@/lib/i18n/types'

/**
 * Conversion funnel from the headline KPIs: total leads → qualified → offers sent
 * → won, as descending proportional bars (width relative to total leads) with the
 * count and its share of total. Pure CSS — no chart library. Admin-gated like the
 * rest of the KPIs; 403/no-data → null.
 */
export function KpiFunnel() {
  const { t } = useT()
  const { data, isLoading, error } = useKpis()

  if (isLoading) {
    return <Skeleton className="h-56 w-full rounded-xl" />
  }
  if (error || !data) return null

  const total = data.total_leads || 0
  const stages: { labelKey: TKey; value: number }[] = [
    { labelKey: 'kpi.totalLeads', value: data.total_leads },
    { labelKey: 'kpi.qualified', value: data.qualified },
    { labelKey: 'kpi.offersSent', value: data.offers_sent },
    { labelKey: 'kpi.won', value: data.won },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {t('kpi.funnel')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-3">
          {stages.map((s) => {
            const pct = total > 0 ? Math.round((s.value / total) * 100) : 0
            return (
              <li key={s.labelKey} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span>{t(s.labelKey)}</span>
                  <span className="tabular-nums text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {s.value}
                    </span>{' '}
                    · {t('kpi.ofTotal', { n: pct })}
                  </span>
                </div>
                <div
                  className="h-3 w-full overflow-hidden rounded-md bg-muted"
                  role="presentation"
                >
                  <div
                    className="h-full rounded-md bg-primary/80 transition-[width] duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
