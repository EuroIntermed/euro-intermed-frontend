import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useKpis } from '@/hooks/useDashboard'
import { useT, formatRON, formatDuration } from '@/lib/i18n'

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-2xl font-semibold mt-1 tabular-nums">{value}</div>
      </CardContent>
    </Card>
  )
}

/**
 * Headline KPI strip: the full scalar indicator set (total leads, qualified,
 * offers sent, won, conversion rate, pipeline value, avg first response). Server
 * state via TanStack Query. Admin-gated on the backend; on 403 the hook resolves
 * to null and the strip renders nothing (staff just see the rest of the page).
 * Errors stay silent here — KPIs are supplementary, not the primary view.
 */
export function KpiCards() {
  const { t, lang } = useT()
  const { data, isLoading, error } = useKpis()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
        ))}
      </div>
    )
  }

  // Null (403) or error → hide the strip; the rest of the page is the real view.
  if (error || !data) return null

  const conversion = `${Math.round((data.conversion_rate ?? 0) * 100)}%`
  const avgResponse = formatDuration(
    data.avg_first_response_seconds,
    {
      seconds: (n) => t('kpi.seconds', { n }),
      minutesSeconds: (m, s) => t('kpi.minutesSeconds', { m, s }),
    },
    t('common.none'),
  )

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <KpiCard label={t('kpi.totalLeads')} value={String(data.total_leads)} />
      <KpiCard label={t('kpi.qualified')} value={String(data.qualified)} />
      <KpiCard label={t('kpi.offersSent')} value={String(data.offers_sent)} />
      <KpiCard label={t('kpi.won')} value={String(data.won)} />
      <KpiCard label={t('kpi.conversionRate')} value={conversion} />
      <KpiCard
        label={t('kpi.pipelineValue')}
        value={formatRON(lang, data.pipeline_value, t('common.none'))}
      />
      <KpiCard label={t('kpi.avgFirstResponse')} value={avgResponse} />
    </div>
  )
}
