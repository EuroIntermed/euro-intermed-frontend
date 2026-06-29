import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Workflow } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { LeadTable } from '@/components/dashboard/LeadTable'
import {
  LeadFilterBar,
  UNASSIGNED,
  type FilterState,
} from '@/components/dashboard/LeadFilterBar'
import { QueryState } from '@/components/dashboard/QueryState'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { ListFooter } from '@/components/dashboard/ListFooter'
import { useLeadsList, useUsers } from '@/hooks/useDashboard'
import { useT } from '@/lib/i18n'
import type { LeadFilters, LeadSortKey, SortDir } from '@/lib/api'

const PAGE_SIZE = 25

const DEFAULT_SORT: LeadSortKey = 'created_at'
const DEFAULT_DIR: SortDir = 'desc'
const SORT_KEYS: LeadSortKey[] = [
  'created_at',
  'company',
  'status',
  'offer_value',
]

// Sensible initial direction when a user first sorts by a column: text ascends,
// recency and money descend (most-recent / highest-value first).
const DEFAULT_DIR_FOR: Record<LeadSortKey, SortDir> = {
  created_at: 'desc',
  company: 'asc',
  status: 'asc',
  offer_value: 'desc',
}

export function PipelinePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { t } = useT()
  const { data: users = [] } = useUsers()

  // The assignee filter is only meaningful when we can resolve names. Admins get
  // the full list; staff (403) get an empty list, so we hide the picker.
  const showAssignee = users.length > 0

  const filters: FilterState = useMemo(
    () => ({
      status: searchParams.get('status') ?? '',
      vertical: searchParams.get('vertical') ?? '',
      assigned_to: searchParams.get('assigned_to') ?? '',
      q: searchParams.get('q') ?? '',
    }),
    [searchParams],
  )

  // Sort + 1-based page live in the URL so the view is shareable and survives
  // back/forward. Unknown values fall back to the canonical created_at DESC.
  const sortParam = searchParams.get('sort') as LeadSortKey | null
  const sort: LeadSortKey =
    sortParam && SORT_KEYS.includes(sortParam) ? sortParam : DEFAULT_SORT
  const dir: SortDir = searchParams.get('dir') === 'asc' ? 'asc' : DEFAULT_DIR

  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const offset = (page - 1) * PAGE_SIZE

  const queryFilters: LeadFilters = {
    status: filters.status || undefined,
    vertical: filters.vertical || undefined,
    assigned_to:
      filters.assigned_to === UNASSIGNED
        ? 'none'
        : filters.assigned_to || undefined,
    q: filters.q || undefined,
    offset: offset || undefined,
    limit: PAGE_SIZE,
    sort,
    dir,
  }

  const { data, isLoading, isFetching, error, refetch } =
    useLeadsList(queryFilters)

  // Changing a filter resets pagination back to page 1.
  const onFilterChange = useCallback(
    (patch: Partial<FilterState>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, val] of Object.entries(patch)) {
          if (val) next.set(key, val)
          else next.delete(key)
        }
        next.delete('page')
        return next
      })
    },
    [setSearchParams],
  )

  // Clicking a column header: toggle direction if it's the active column,
  // otherwise switch to it with that column's default direction. Resets to page 1.
  const onSort = useCallback(
    (key: LeadSortKey) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        const nextDir: SortDir =
          key === sort ? (dir === 'asc' ? 'desc' : 'asc') : DEFAULT_DIR_FOR[key]
        if (key === DEFAULT_SORT && nextDir === DEFAULT_DIR) next.delete('sort')
        else next.set('sort', key)
        if (nextDir === DEFAULT_DIR) next.delete('dir')
        else next.set('dir', nextDir)
        next.delete('page')
        return next
      })
    },
    [sort, dir, setSearchParams],
  )

  const total = data?.page.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const goToPage = useCallback(
    (p: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (p <= 1) next.delete('page')
        else next.set('page', String(p))
        return next
      })
    },
    [setSearchParams],
  )

  const hasPrev = page > 1
  const hasNext = page < pageCount

  return (
    <PageShell
      breadcrumbs={[{ label: t('nav.pipeline') }]}
      title={t('nav.pipeline')}
      description={t('pipeline.subtitle')}
    >
      <div className="flex flex-col gap-6">
        <LeadFilterBar
          value={filters}
          users={users}
          showAssignee={showAssignee}
          onChange={onFilterChange}
        />

        <QueryState
          isLoading={isLoading}
          error={error}
          isEmpty={data?.data.length === 0}
          errorMessage={t('pipeline.loadError')}
          onRetry={refetch}
          empty={
            <EmptyState
              icon={Workflow}
              title={t('pipeline.emptyTitle')}
              description={t('pipeline.empty')}
            />
          }
        >
          <LeadTable
            leads={data?.data ?? []}
            users={users}
            sort={sort}
            dir={dir}
            onSort={onSort}
          />
          <ListFooter
            countLabel={t(
              total === 1 ? 'pipeline.countOne' : 'pipeline.countOther',
              { n: total },
            )}
            page={page}
            pageCount={pageCount}
            hasPrev={hasPrev}
            hasNext={hasNext}
            busy={isFetching}
            onPrev={() => goToPage(page - 1)}
            onNext={() => goToPage(page + 1)}
          />
        </QueryState>
      </div>
    </PageShell>
  )
}
