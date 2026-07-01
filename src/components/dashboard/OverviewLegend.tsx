import { Fragment } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { useT } from '@/lib/i18n'
import type { TKey } from '@/lib/i18n/types'
import { ACTIVE_LEAD_STATUSES } from '@/lib/leadStatus'

// Lead lifecycle, ordered along the working path: the ACTIVE pipeline first,
// then the needs_human escalation flag, then the off-pipeline draft/cancelled
// states. Deprecated legacy codes are omitted here (they still render a pill on
// any legacy row via StatusBadge, but aren't part of the current glossary).
const STATUSES = [
  ...ACTIVE_LEAD_STATUSES,
  'needs_human',
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
