import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useT } from '@/lib/i18n'
import type { LabelCount } from '@/lib/api'

interface Props {
  /** Localized card title (a metric name, e.g. "By source"). */
  title: string
  /** Breakdown buckets. Labels are data; the optional formatter localizes
   *  known enum codes (vertical/intent/...) while leaving free-text labels raw. */
  items: LabelCount[]
  /** Optional label formatter (e.g. useEnums().verticalLabel). */
  formatLabel?: (label: string) => string
}

/**
 * Compact horizontal bar list for one KPI breakdown. Each row is a localized
 * label, its count, and a proportional CSS bar (width relative to the largest
 * bucket). No chart library is pulled — pure CSS bars keep the bundle small.
 * Renders a friendly empty state when there are no buckets.
 */
export function BreakdownCard({ title, items, formatLabel }: Props) {
  const { t } = useT()
  const max = items.reduce((m, it) => Math.max(m, it.count), 0)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('kpi.breakdownEmpty')}
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {items.map((it, i) => {
              const pct = max > 0 ? Math.round((it.count / max) * 100) : 0
              const label = formatLabel ? formatLabel(it.label) : it.label
              return (
                <li key={`${it.label}-${i}`} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate" title={label}>
                      {label || t('common.none')}
                    </span>
                    <span className="tabular-nums font-medium text-muted-foreground">
                      {it.count}
                    </span>
                  </div>
                  <div
                    className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                    role="presentation"
                  >
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
