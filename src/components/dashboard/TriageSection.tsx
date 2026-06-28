import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Clock, Inbox, UserPlus, type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useHandoffs, useLeadsList, useTasks } from '@/hooks/useDashboard'
import { useT } from '@/lib/i18n'

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
  const urgent = count > 0
  return (
    <Link to={to} className="group">
      <Card
        className={cn(
          'h-full transition-colors',
          urgent
            ? 'border-destructive/40 bg-destructive/5 hover:bg-destructive/10'
            : 'hover:border-primary/40 hover:bg-accent/40',
        )}
      >
        <CardContent className="flex items-start gap-3 p-4">
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background',
              urgent ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
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
 * "What needs action now" — the triage row at the top of the overview. Three
 * drill-in tiles count the work waiting on a human: handoffs (needs_human leads),
 * new unassigned leads, and follow-up tasks past their due date. Each links to
 * the filtered view that resolves it.
 */
export function TriageSection() {
  const { t } = useT()
  // One snapshot of "now" per mount (lazy initializer keeps render pure) to flag
  // overdue follow-ups.
  const [now] = useState(() => Date.now())
  const handoffs = useHandoffs()
  const newLeads = useLeadsList({ status: 'new', assigned_to: 'none', limit: 1 })
  const tasks = useTasks({ status: 'open' })

  const loading = handoffs.isLoading || newLeads.isLoading || tasks.isLoading

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[84px] w-full rounded-xl" />
        ))}
      </div>
    )
  }

  const handoffCount = handoffs.data?.data.length ?? 0
  const newCount = newLeads.data?.page.total ?? 0
  const overdueCount = (tasks.data ?? []).filter(
    (task) => task.due_at && new Date(task.due_at).getTime() <= now,
  ).length

  if (handoffCount + newCount + overdueCount === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          {t('overview.allClear')}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Tile
        to="/dashboard/handoffs"
        icon={Inbox}
        count={handoffCount}
        label={t('overview.handoffsWaiting')}
        desc={t('overview.handoffsWaitingDesc')}
      />
      <Tile
        to="/dashboard/pipeline?status=new&assigned_to=none"
        icon={UserPlus}
        count={newCount}
        label={t('overview.newUnassigned')}
        desc={t('overview.newUnassignedDesc')}
      />
      <Tile
        to="/dashboard/tasks?status=open"
        icon={Clock}
        count={overdueCount}
        label={t('overview.followupsDue')}
        desc={t('overview.followupsDueDesc')}
      />
    </div>
  )
}
