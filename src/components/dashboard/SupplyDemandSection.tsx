import { Link } from 'react-router-dom'
import { ArrowRight, PackageOpen, ShoppingCart, type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useKpis } from '@/hooks/useDashboard'
import { useT } from '@/lib/i18n'
import type { LabelCount } from '@/lib/api'

function sumIntent(buckets: LabelCount[], label: string): number {
  return buckets
    .filter((b) => b.label === label)
    .reduce((acc, b) => acc + b.count, 0)
}

function Tile({
  to,
  icon: Icon,
  count,
  label,
  desc,
}: {
  to: string
  icon: LucideIcon
  count: number
  label: string
  desc: string
}) {
  return (
    <Link to={to} className="group">
      <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/40">
        <CardContent className="flex items-start gap-3 p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors group-hover:text-foreground">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold tabular-nums">{count}</span>
              <span className="text-sm font-medium">{label}</span>
              <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

/**
 * Supply-vs-demand snapshot: buyer demand (buy intent) versus seller supply (sell
 * intent), read from the already-fetched KPI breakdown so it costs no extra
 * request. Admin-gated like the rest of the KPIs — hides itself for staff (403).
 */
export function SupplyDemandSection() {
  const { t } = useT()
  const { data, isLoading, error } = useKpis()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-[84px] w-full rounded-xl" />
        ))}
      </div>
    )
  }

  if (error || !data) return null

  const demand = sumIntent(data.by_intent, 'buy')
  const supply = sumIntent(data.by_intent, 'sell')

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Tile
        to="/dashboard/pipeline"
        icon={ShoppingCart}
        count={demand}
        label={t('overview.demand')}
        desc={t('overview.demandDesc')}
      />
      <Tile
        to="/dashboard/inventory"
        icon={PackageOpen}
        count={supply}
        label={t('overview.supply')}
        desc={t('overview.supplyDesc')}
      />
    </div>
  )
}
