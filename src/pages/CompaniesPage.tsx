import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Building2 } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { CompanyTable } from '@/components/dashboard/CompanyTable'
import {
  CompanyFilterBar,
  type CompanyFilterState,
} from '@/components/dashboard/CompanyFilterBar'
import { QueryState } from '@/components/dashboard/QueryState'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { ListFooter } from '@/components/dashboard/ListFooter'
import { useCompaniesList } from '@/hooks/useDashboard'
import { useT } from '@/lib/i18n'
import type { CompanyFilters, CompanySortKey, SortDir } from '@/lib/api'

const PAGE_SIZE = 25

const DEFAULT_SORT: CompanySortKey = 'created_at'
const DEFAULT_DIR: SortDir = 'desc'
const SORT_KEYS: CompanySortKey[] = ['created_at', 'name']

// Sensible initial direction when a user first sorts by a column.
const DEFAULT_DIR_FOR: Record<CompanySortKey, SortDir> = {
  created_at: 'desc',
  name: 'asc',
}

export function CompaniesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { t } = useT()

  const filters: CompanyFilterState = useMemo(
    () => ({
      role: searchParams.get('role') ?? '',
      country: searchParams.get('country') ?? '',
      q: searchParams.get('q') ?? '',
    }),
    [searchParams],
  )

  // Sort + 1-based page live in the URL so the view is shareable and survives
  // back/forward. Unknown values fall back to the canonical created_at DESC.
  const sortParam = searchParams.get('sort') as CompanySortKey | null
  const sort: CompanySortKey =
    sortParam && SORT_KEYS.includes(sortParam) ? sortParam : DEFAULT_SORT
  const dir: SortDir = searchParams.get('dir') === 'asc' ? 'asc' : DEFAULT_DIR

  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const offset = (page - 1) * PAGE_SIZE

  const queryFilters: CompanyFilters = {
    role: filters.role || undefined,
    country: filters.country || undefined,
    q: filters.q || undefined,
    offset: offset || undefined,
    limit: PAGE_SIZE,
    sort,
    dir,
  }

  const { data, isLoading, isFetching, error, refetch } =
    useCompaniesList(queryFilters)

  // Changing a filter resets pagination back to page 1.
  const onFilterChange = useCallback(
    (patch: Partial<CompanyFilterState>) => {
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
    (key: CompanySortKey) => {
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
      breadcrumbs={[{ label: t('nav.companies') }]}
      title={t('nav.companies')}
    >
      <div className="flex flex-col gap-6">
        <CompanyFilterBar value={filters} onChange={onFilterChange} />

        <QueryState
          isLoading={isLoading}
          error={error}
          isEmpty={data?.data.length === 0}
          errorMessage={t('companies.loadError')}
          onRetry={refetch}
          empty={
            <EmptyState
              icon={Building2}
              title={t('companies.emptyTitle')}
              description={t('companies.empty')}
            />
          }
        >
          <CompanyTable
            companies={data?.data ?? []}
            sort={sort}
            dir={dir}
            onSort={onSort}
          />
          <ListFooter
            countLabel={t(
              total === 1 ? 'companies.countOne' : 'companies.countOther',
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
