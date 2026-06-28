import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination'
import { PageShell } from '@/components/layout/PageShell'
import { LeadTable } from '@/components/dashboard/LeadTable'
import {
  LeadFilterBar,
  UNASSIGNED,
  type FilterState,
} from '@/components/dashboard/LeadFilterBar'
import { useLeadsList, useUsers } from '@/hooks/useDashboard'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
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

        {isLoading && (
          <div className="rounded-lg border p-4 flex flex-col gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center gap-3 py-16">
            <p className="text-sm text-destructive">
              {t('pipeline.loadError')}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {t('common.retry')}
            </Button>
          </div>
        )}

        {data && !isLoading && !error && (
          <div>
            {data.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-sm gap-2">
                <span>{t('pipeline.empty')}</span>
              </div>
            ) : (
              <LeadTable
                leads={data.data}
                users={users}
                sort={sort}
                dir={dir}
                onSort={onSort}
              />
            )}

            <div className="flex items-center justify-between mt-4 gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {t(total === 1 ? 'pipeline.countOne' : 'pipeline.countOther', {
                  n: total,
                })}
              </span>
              {total > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {t('pipeline.pageOf', { x: page, y: pageCount })}
                  </span>
                  <Pagination className="mx-0 w-auto">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationLink
                          href="#"
                          size="default"
                          aria-label={t('pipeline.prev')}
                          aria-disabled={!hasPrev || isFetching}
                          className={cn(
                            'gap-1 px-2.5',
                            (!hasPrev || isFetching) &&
                              'pointer-events-none opacity-50',
                          )}
                          onClick={(e) => {
                            e.preventDefault()
                            if (hasPrev && !isFetching) goToPage(page - 1)
                          }}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="hidden sm:block">
                            {t('pipeline.prev')}
                          </span>
                        </PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink
                          href="#"
                          size="default"
                          aria-label={t('pipeline.next')}
                          aria-disabled={!hasNext || isFetching}
                          className={cn(
                            'gap-1 px-2.5',
                            (!hasNext || isFetching) &&
                              'pointer-events-none opacity-50',
                          )}
                          onClick={(e) => {
                            e.preventDefault()
                            if (hasNext && !isFetching) goToPage(page + 1)
                          }}
                        >
                          <span className="hidden sm:block">
                            {t('pipeline.next')}
                          </span>
                          <ChevronRight className="h-4 w-4" />
                        </PaginationLink>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  )
}
