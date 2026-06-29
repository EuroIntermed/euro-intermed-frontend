import type { ComponentType } from 'react'
import {
  Clock,
  Percent,
  Send,
  Trophy,
  Users,
  Wallet,
  type LucideProps,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useKpis } from '@/hooks/useDashboard'
import { useT, formatRON, formatDuration } from '@/lib/i18n'

function KpiCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: ComponentType<LucideProps>
}) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
        </div>
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
      <KpiCard
        icon={Users}
        label={t('kpi.totalLeads')}
        value={String(data.total_leads)}
      />
      <KpiCard
        icon={Users}
        label={t('kpi.qualified')}
        value={String(data.qualified)}
      />
      <KpiCard
        icon={Send}
        label={t('kpi.offersSent')}
        value={String(data.offers_sent)}
      />
      <KpiCard icon={Trophy} label={t('kpi.won')} value={String(data.won)} />
      <KpiCard
        icon={Percent}
        label={t('kpi.conversionRate')}
        value={conversion}
      />
      <KpiCard
        icon={Wallet}
        label={t('kpi.pipelineValue')}
        value={formatRON(lang, data.pipeline_value, t('common.none'))}
      />
      <KpiCard
        icon={Clock}
        label={t('kpi.avgFirstResponse')}
        value={avgResponse}
      />
    </div>
  )
}
