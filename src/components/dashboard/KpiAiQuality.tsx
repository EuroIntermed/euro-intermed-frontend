import { BadgeCheck, ScanText, UserRoundCog } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { KpiStatCard } from '@/components/dashboard/KpiStatCard'
import { useKpis } from '@/hooks/useDashboard'
import { useT, formatPercent } from '@/lib/i18n'

/**
 * The "AI quality" strip on the Overview: the three agent-quality ratios enriched
 * onto `GET /api/kpis` (extraction completeness, ANAF verification success,
 * escalation rate), each rendered as a percentage. Nulls render as "—" (not 0%),
 * so a not-yet-computed metric reads as unknown rather than zero. Admin-gated
 * like the rest of the KPIs; 403/no-data → null (hidden for staff).
 */
export function KpiAiQuality() {
  const { t } = useT()
  const { data, isLoading, error } = useKpis()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[76px] w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (error || !data) return null

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {t('kpiBoards.aiQualityTitle')}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiStatCard
          icon={ScanText}
          label={t('kpiBoards.extractionCompleteness')}
          value={formatPercent(data.extraction_completeness, t('common.none'))}
        />
        <KpiStatCard
          icon={BadgeCheck}
          label={t('kpiBoards.anafSuccess')}
          value={formatPercent(data.anaf_success_rate, t('common.none'))}
        />
        <KpiStatCard
          icon={UserRoundCog}
          label={t('kpiBoards.escalationRate')}
          value={formatPercent(data.escalation_rate, t('common.none'))}
        />
      </div>
    </div>
  )
}
