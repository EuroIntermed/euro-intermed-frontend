import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { useT } from '@/lib/i18n'
import type { LeadRef } from '@/lib/api'

interface Props {
  title: string
  items: LeadRef[]
  /** Localized message shown when there are no rows. */
  emptyLabel: string
}

/**
 * A compact card listing {@link LeadRef} rows for an action board (qualified
 * leads, offers to send, alerts). Each row deep-links to the lead detail
 * (`/dashboard/:id`), shows the company + product, a status pill, and the age in
 * hours. Renders a friendly empty state when there are no rows.
 */
export function LeadRefList({ title, items, emptyLabel }: Props) {
  const { t } = useT()

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {title}
          <span className="ml-2 tabular-nums">{items.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {items.map((lead) => (
              <li key={lead.id}>
                <Link
                  to={`/dashboard/${lead.id}`}
                  className="group flex items-center gap-3 py-2.5"
                  aria-label={t('kpiBoards.openLead')}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {lead.company_name || t('common.none')}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {lead.product_name || t('common.none')}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {t('kpiBoards.hoursAgo', {
                      n: Math.round(lead.hours_since_created),
                    })}
                  </span>
                  <StatusBadge status={lead.status} />
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
