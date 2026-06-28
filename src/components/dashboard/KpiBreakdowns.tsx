import { Skeleton } from '@/components/ui/skeleton'
import { BreakdownCard } from '@/components/dashboard/BreakdownCard'
import { useKpis } from '@/hooks/useDashboard'
import { useT, useEnums } from '@/lib/i18n'
import type { TKey } from '@/lib/i18n/types'
import type { Kpis, LabelCount } from '@/lib/api'

/** The keys on Kpis whose value is a breakdown array (the `LabelCount[]` ones). */
type BreakdownKey = {
  [K in keyof Kpis]: Kpis[K] extends LabelCount[] ? K : never
}[keyof Kpis]

/**
 * The KPI breakdown grid: every `LabelCount[]` array on the Kpis payload as a
 * compact horizontal bar list. Known enum codes (vertical/intent/language) are
 * localized via useEnums; free-text labels (source/country/category/location)
 * render as-is. Admin-gated on the backend; 403 → null (hidden for staff).
 */
export function KpiBreakdowns() {
  const { t } = useT()
  const { verticalLabel, intentLabel, languageLabel } = useEnums()
  const { data, isLoading, error } = useKpis()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (error || !data) return null

  // Title key + the array on Kpis + an optional label localizer per breakdown.
  const cards: {
    key: BreakdownKey
    titleKey: TKey
    formatLabel?: (label: string) => string
  }[] = [
    { key: 'by_source', titleKey: 'kpi.bySource' },
    { key: 'by_vertical', titleKey: 'kpi.byVertical', formatLabel: verticalLabel },
    { key: 'by_intent', titleKey: 'kpi.byIntent', formatLabel: intentLabel },
    { key: 'by_language', titleKey: 'kpi.byLanguage', formatLabel: languageLabel },
    { key: 'by_country', titleKey: 'kpi.byCountry' },
    { key: 'top_categories', titleKey: 'kpi.topCategories' },
    { key: 'delivery_locations', titleKey: 'kpi.deliveryLocations' },
    { key: 'origin_countries', titleKey: 'kpi.originCountries' },
  ]

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        {t('kpi.breakdowns')}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <BreakdownCard
            key={c.key}
            title={t(c.titleKey)}
            items={data[c.key] ?? []}
            formatLabel={c.formatLabel}
          />
        ))}
      </div>
    </div>
  )
}
