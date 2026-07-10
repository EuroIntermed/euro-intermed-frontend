import type { ComponentType, ReactNode } from 'react'
import type { LucideProps } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface Props {
  label: string
  /** Pre-formatted value string. Nulls should already be rendered as "—". */
  value: string
  icon: ComponentType<LucideProps>
  /** Optional footnote under the value (e.g. a target or plan). */
  sub?: ReactNode
}

/**
 * A single headline KPI tile for the action boards: a soft icon tile, a caption,
 * a large tabular value, and an optional footnote (target/plan). Mirrors the
 * private card in {@link KpiCards} so every board reads consistently. Values are
 * pre-formatted by the caller (money/percent/count via the i18n formatters), so
 * this component never decides how a number is rendered.
 */
export function KpiStatCard({ label, value, icon: Icon, sub }: Props) {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
          {sub != null && (
            <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
