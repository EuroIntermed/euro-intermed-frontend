import { Link } from 'react-router-dom'
import { ArrowRight, Building2, Code2, Inbox, Workflow } from 'lucide-react'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PageShell } from '@/components/layout/PageShell'
import { KpiCards } from '@/components/dashboard/KpiCards'
import { KpiBreakdowns } from '@/components/dashboard/KpiBreakdowns'
import { useT } from '@/lib/i18n'
import type { TKey } from '@/lib/i18n/types'

// Entry-point links to the main dashboard sections. Descriptions reuse each
// section's existing subtitle copy.
const LINKS: {
  to: string
  labelKey: TKey
  descKey: TKey
  icon: typeof Workflow
}[] = [
  {
    to: '/dashboard/pipeline',
    labelKey: 'nav.pipeline',
    descKey: 'pipeline.subtitle',
    icon: Workflow,
  },
  {
    to: '/dashboard/companies',
    labelKey: 'nav.companies',
    descKey: 'companies.subtitle',
    icon: Building2,
  },
  {
    to: '/dashboard/handoffs',
    labelKey: 'nav.handoffs',
    descKey: 'handoffs.subtitle',
    icon: Inbox,
  },
  {
    to: '/dashboard/widget',
    labelKey: 'nav.widget',
    descKey: 'widget.subtitle',
    icon: Code2,
  },
]

/**
 * Dashboard entry point: the KPI strip plus quick links into each main section.
 * Intentionally lean — more overview content can be added here over time.
 */
export function OverviewPage() {
  const { t } = useT()

  return (
    <PageShell
      breadcrumbs={[{ label: t('nav.overview') }]}
      title={t('nav.overview')}
    >
      <div className="flex flex-col gap-6">
        <KpiCards />

        <KpiBreakdowns />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {LINKS.map((l) => {
            const Icon = l.icon
            return (
              <Link key={l.to} to={l.to} className="group">
                <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/40">
                  <CardHeader>
                    <div className="mb-1 flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors group-hover:text-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                      <CardTitle className="flex-1">{t(l.labelKey)}</CardTitle>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                    <CardDescription>{t(l.descKey)}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </PageShell>
  )
}
