import { useNavigate } from 'react-router-dom'
import { ArrowRight, Inbox } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { ResumeBotButton } from '@/components/dashboard/ResumeBotButton'
import { QueryState } from '@/components/dashboard/QueryState'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { PageShell } from '@/components/layout/PageShell'
import { useHandoffs } from '@/hooks/useDashboard'
import { useT, formatDateTime } from '@/lib/i18n'

export function HandoffsPage() {
  const navigate = useNavigate()
  const { t, lang } = useT()
  const { data, isLoading, error, refetch } = useHandoffs()

  return (
    <PageShell
      breadcrumbs={[{ label: t('nav.handoffs') }]}
      title={t('nav.handoffs')}
      description={t('handoffs.subtitle')}
    >
      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={data?.data.length === 0}
        skeletonRows={6}
        errorMessage={t('handoffs.loadError')}
        onRetry={refetch}
        empty={
          <EmptyState
            icon={Inbox}
            title={t('handoffs.emptyTitle')}
            description={t('handoffs.empty')}
          />
        }
      >
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[820px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('handoffs.colCompany')}</TableHead>
                  <TableHead>{t('handoffs.colProduct')}</TableHead>
                  <TableHead>{t('pipeline.colStatus')}</TableHead>
                  <TableHead>{t('handoffs.colSnippet')}</TableHead>
                  <TableHead>{t('handoffs.colCreated')}</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.data ?? []).map((h) => (
                  <TableRow
                    key={h.id}
                    className="cursor-pointer bg-destructive-soft/40 hover:bg-destructive-soft/70"
                    onClick={() => navigate(`/dashboard/${h.id}`)}
                  >
                    <TableCell className="font-medium">
                      {h.company_name || t('common.none')}
                    </TableCell>
                    <TableCell>
                      {h.product_name || t('common.none')}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={h.status} />
                    </TableCell>
                    <TableCell className="max-w-[320px]">
                      <span className="block truncate text-muted-foreground">
                        {h.last_message || t('common.none')}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {formatDateTime(lang, h.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-3">
                        <ResumeBotButton
                          leadId={h.id}
                          size="xs"
                          variant="outline"
                          stopPropagation
                        />
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                          {t('handoffs.open')}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </QueryState>
    </PageShell>
  )
}
