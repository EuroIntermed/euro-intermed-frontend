import { useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PackageOpen } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { PageShell } from '@/components/layout/PageShell'
import { QueryState } from '@/components/dashboard/QueryState'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { StatePill } from '@/components/dashboard/StatePill'
import { useOfferBatches } from '@/hooks/useDashboard'
import { BATCH_STATUS } from '@/lib/offerStatus'
import { useT, useEnums, formatDateTime } from '@/lib/i18n'
import type { OfferBatchFilters, OfferBatchStatus } from '@/lib/api'
import type { TKey } from '@/lib/i18n/types'

// URL sentinel for "no vertical filter". Status uses an explicit `all` value in
// the URL (below) so it is distinguishable from the absent-param default.
const ALL = '__all__'
// The default lens when no `status` param is present: parsed = "needs review".
const DEFAULT_STATUS = 'parsed'
// Explicit "all statuses" URL value (distinct from an absent param).
const STATUS_ALL = 'all'

// Status filter choices. `parsed` (= "needs review") is the default landing lens
// the worklist opens on, so it leads the list.
const STATUS_OPTIONS: { value: string; labelKey: TKey }[] = [
  { value: DEFAULT_STATUS, labelKey: 'offers.needsReview' },
  { value: STATUS_ALL, labelKey: 'offers.statusAny' },
  { value: 'received', labelKey: 'offers.statusReceived' },
  { value: 'parsing', labelKey: 'offers.statusParsing' },
  { value: 'error', labelKey: 'offers.statusError' },
  { value: 'reviewed', labelKey: 'offers.statusReviewed' },
  { value: 'sent', labelKey: 'offers.statusSent' },
]

const VERTICAL_OPTIONS: { value: string; labelKey: TKey }[] = [
  { value: ALL, labelKey: 'offers.verticalAny' },
  { value: 'angrosist', labelKey: 'suppliers.verticalAngrosist' },
  { value: 'palletclearance', labelKey: 'suppliers.verticalPallet' },
]

export function OffersPage() {
  const { t, lang } = useT()
  const { verticalLabel } = useEnums()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // Filters live in the URL so the view is shareable + survives back/forward.
  // An absent `status` param means the default "needs review" (parsed) lens; the
  // explicit `all` value clears the status filter entirely.
  const status = searchParams.get('status') ?? DEFAULT_STATUS
  const vertical = searchParams.get('vertical') ?? ''

  const filters: OfferBatchFilters = useMemo(
    () => ({
      status: status === STATUS_ALL ? undefined : status || undefined,
      vertical: vertical || undefined,
    }),
    [status, vertical],
  )

  const { data, isLoading, error, refetch } = useOfferBatches(filters)

  const setStatus = useCallback(
    (value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        // Absent param = the default parsed lens; store anything else verbatim
        // (incl. the explicit `all`).
        if (value === DEFAULT_STATUS) next.delete('status')
        else next.set('status', value)
        return next
      })
    },
    [setSearchParams],
  )

  const setVertical = useCallback(
    (value: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (value && value !== ALL) next.set('vertical', value)
        else next.delete('vertical')
        return next
      })
    },
    [setSearchParams],
  )

  const rows = data ?? []

  return (
    <PageShell
      breadcrumbs={[{ label: t('nav.offers') }]}
      title={t('offers.title')}
      description={t('offers.subtitle')}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-44" aria-label={t('offers.filterStatus')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {t(o.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={vertical || ALL} onValueChange={setVertical}>
            <SelectTrigger
              className="w-44"
              aria-label={t('offers.filterVertical')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VERTICAL_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {t(o.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={rows.length === 0}
        skeletonRows={6}
        errorMessage={t('offers.loadError')}
        onRetry={refetch}
        empty={
          <EmptyState
            icon={PackageOpen}
            title={t('offers.emptyTitle')}
            description={t('offers.empty')}
          />
        }
      >
        <div className="overflow-hidden rounded-lg border">
          <div className="overflow-x-auto">
            <Table className="min-w-[820px]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t('offers.colSupplier')}</TableHead>
                  <TableHead>{t('offers.colSubject')}</TableHead>
                  <TableHead>{t('offers.colVertical')}</TableHead>
                  <TableHead>{t('offers.colStatus')}</TableHead>
                  <TableHead className="text-right">
                    {t('offers.colItems')}
                  </TableHead>
                  <TableHead>{t('offers.colReceived')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((b) => {
                  const s = BATCH_STATUS[b.status as OfferBatchStatus] ?? {
                    tone: 'neutral' as const,
                    labelKey: 'offers.statusReceived' as TKey,
                  }
                  return (
                    <TableRow
                      key={b.id}
                      className="cursor-pointer"
                      tabIndex={0}
                      role="button"
                      aria-label={b.supplier_name || b.supplier_email}
                      onClick={() =>
                        navigate(`/dashboard/offers/${b.id}`)
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          navigate(`/dashboard/offers/${b.id}`)
                        }
                      }}
                    >
                      <TableCell className="max-w-[220px]">
                        <div className="truncate font-medium">
                          {b.supplier_name || b.supplier_email}
                        </div>
                        {b.supplier_name && (
                          <div className="truncate text-xs text-muted-foreground">
                            {b.supplier_email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[280px]">
                        <span className="line-clamp-1">
                          {b.subject || t('offers.noSubject')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatePill
                          tone={
                            b.vertical === 'palletclearance' ? 'info' : 'brand'
                          }
                          dot={false}
                        >
                          {verticalLabel(b.vertical)}
                        </StatePill>
                      </TableCell>
                      <TableCell>
                        <StatePill tone={s.tone}>{t(s.labelKey)}</StatePill>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {b.item_count}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDateTime(lang, b.received_at)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </QueryState>
    </PageShell>
  )
}
