import { CalendarRange, Coins, Percent, Receipt, Wallet } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { QueryState } from '@/components/dashboard/QueryState'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { KpiStatCard } from '@/components/dashboard/KpiStatCard'
import { TransactionDialog } from '@/components/dashboard/TransactionDialog'
import { FinancialInputsDialog } from '@/components/dashboard/FinancialInputsDialog'
import { CsvExportDialog } from '@/components/dashboard/CsvExportDialog'
import { useMonthKpis } from '@/hooks/useDashboard'
import { useT, formatRON, formatPercent, formatCount } from '@/lib/i18n'

/**
 * "This month" board (KPI_PLAN §E.2): current-month qualified count, turnover,
 * VAT cap, margin revenue and top-5 client concentration. Also hosts the manual
 * transaction + monthly financial-input forms and the CSV export. Money is RON;
 * ratios are %, nulls render as "—". 403 → hidden.
 */
export function ThisMonthPage() {
  const { t, lang } = useT()
  const { data, isLoading, error } = useMonthKpis()

  return (
    <PageShell
      breadcrumbs={[{ label: t('nav.kpiMonth') }]}
      title={t('kpiBoards.month.title')}
      description={t('kpiBoards.month.subtitle')}
      actions={
        <>
          <FinancialInputsDialog />
          <TransactionDialog />
          <CsvExportDialog />
        </>
      }
    >
      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={!data}
        skeletonRows={6}
        errorMessage={t('kpiBoards.month.loadError')}
        empty={
          <EmptyState
            icon={CalendarRange}
            title={t('kpiBoards.month.loadError')}
          />
        }
      >
        {data && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <KpiStatCard
              icon={CalendarRange}
              label={t('kpiBoards.month.qualifiedThisMonth')}
              value={formatCount(data.qualified_this_month)}
              sub={
                data.qualified_monthly_target != null
                  ? t('kpiBoards.targetOf', { n: data.qualified_monthly_target })
                  : undefined
              }
            />
            <KpiStatCard
              icon={Coins}
              label={t('kpiBoards.month.grossTurnover')}
              value={formatRON(lang, data.gross_turnover, t('common.none'))}
            />
            <KpiStatCard
              icon={Receipt}
              label={t('kpiBoards.month.vatCap')}
              value={formatRON(lang, data.vat_cap_ron, t('common.none'))}
            />
            <KpiStatCard
              icon={Wallet}
              label={t('kpiBoards.month.marginRevenue')}
              value={formatRON(lang, data.margin_revenue, t('common.none'))}
              sub={
                data.margin_revenue_plan_ron != null
                  ? t('kpiBoards.planOf', {
                      v: formatRON(lang, data.margin_revenue_plan_ron),
                    })
                  : undefined
              }
            />
            <KpiStatCard
              icon={Percent}
              label={t('kpiBoards.month.top5Concentration')}
              value={formatPercent(
                data.top5_client_concentration,
                t('common.none'),
              )}
            />
          </div>
        )}
      </QueryState>
    </PageShell>
  )
}
