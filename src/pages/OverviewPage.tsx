import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Boxes,
  Building2,
  Code2,
  Inbox,
  ListTodo,
  Workflow,
} from 'lucide-react'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PageShell } from '@/components/layout/PageShell'
import { KpiCards } from '@/components/dashboard/KpiCards'
import { KpiAiQuality } from '@/components/dashboard/KpiAiQuality'
import { KpiFunnel } from '@/components/dashboard/KpiFunnel'
import { KpiBreakdowns } from '@/components/dashboard/KpiBreakdowns'
import { TriageSection } from '@/components/dashboard/TriageSection'
import { GroupInviteSection } from '@/components/dashboard/GroupInviteSection'
import { NewsletterSection } from '@/components/dashboard/NewsletterSection'
import { SupplyDemandSection } from '@/components/dashboard/SupplyDemandSection'
import { OverviewLegend } from '@/components/dashboard/OverviewLegend'
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
    to: '/dashboard/inventory',
    labelKey: 'nav.inventory',
    descKey: 'inventory.subtitle',
    icon: Boxes,
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
    to: '/dashboard/tasks',
    labelKey: 'nav.tasks',
    descKey: 'tasks.subtitle',
    icon: ListTodo,
  },
  {
    to: '/dashboard/widget',
    labelKey: 'nav.widget',
    descKey: 'widget.subtitle',
    icon: Code2,
  },
]

function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  )
}

/**
 * Dashboard home, organized so a brand-new (global) admin can read it top-down:
 * what needs action now → business health → supply vs demand → a plain-language
 * legend → quick links into each section.
 */
export function OverviewPage() {
  const { t } = useT()

  return (
    <PageShell
      breadcrumbs={[{ label: t('nav.overview') }]}
      title={t('nav.overview')}
    >
      <div className="flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <SectionHeader
            title={t('overview.triageTitle')}
            desc={t('overview.triageDesc')}
          />
          <TriageSection />
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeader
            title={t('overview.groupInviteTitle')}
            desc={t('overview.groupInviteDesc')}
          />
          <GroupInviteSection />
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeader
            title={t('overview.newsletterTitle')}
            desc={t('overview.newsletterDesc')}
          />
          <NewsletterSection />
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeader
            title={t('overview.healthTitle')}
            desc={t('overview.healthDesc')}
          />
          <KpiCards />
          <KpiAiQuality />
          <KpiFunnel />
          <KpiBreakdowns />
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeader
            title={t('overview.supplyDemandTitle')}
            desc={t('overview.supplyDemandDesc')}
          />
          <SupplyDemandSection />
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeader
            title={t('overview.legendTitle')}
            desc={t('overview.legendDesc')}
          />
          <OverviewLegend />
        </section>

        <section className="flex flex-col gap-3">
          <SectionHeader
            title={t('overview.sectionsTitle')}
            desc={t('overview.sectionsDesc')}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {LINKS.map((l) => {
              const Icon = l.icon
              return (
                <Link key={l.to} to={l.to} className="group">
                  <Card className="h-full transition-colors hover:border-brand/40 hover:bg-brand-soft/40">
                    <CardHeader>
                      <div className="mb-1 flex items-center gap-3">
                        <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                          <Icon className="h-4 w-4" />
                        </span>
                        <CardTitle className="flex-1">{t(l.labelKey)}</CardTitle>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                      </div>
                      <CardDescription>{t(l.descKey)}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>
      </div>
    </PageShell>
  )
}
