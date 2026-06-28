import { Fragment } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { useT } from '@/lib/i18n'
import type { TKey } from '@/lib/i18n/types'

// Lead lifecycle, ordered along the working path (escalation breaks out via
// needs_human; draft/cancelled are the off-pipeline states, shown last).
const STATUSES = [
  'new',
  'qualifying',
  'needs_human',
  'qualified',
  'offer_requested',
  'offer_sent',
  'negotiation',
  'won',
  'lost',
  'draft',
  'cancelled',
] as const

/**
 * Plain-language legend for a brand-new admin: what each lead status means, what
 * an intervention (handoff) is, and which actions are available on a lead. Static
 * copy (all i18n) — no data fetching.
 */
export function OverviewLegend() {
  const { t } = useT()
  return (
    <Card>
      <CardContent className="grid gap-6 p-5 md:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold">
            {t('overview.legendStatusesTitle')}
          </h3>
          {/* Two aligned columns: the status badge (column sized to the widest
              badge) and its meaning, so every description starts at the same x. */}
          <div className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2.5">
            {STATUSES.map((s) => (
              <Fragment key={s}>
                <div>
                  <StatusBadge status={s} />
                </div>
                <span className="text-xs text-muted-foreground">
                  {t(`overview.statusHelp.${s}` as TKey)}
                </span>
              </Fragment>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="mb-1.5 text-sm font-semibold">
              {t('overview.legendInterventionTitle')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t('overview.legendInterventionDesc')}
            </p>
          </div>
          <div>
            <h3 className="mb-1.5 text-sm font-semibold">
              {t('overview.legendActionsTitle')}
            </h3>
            <p className="text-xs text-muted-foreground">
              {t('overview.legendActionsDesc')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
