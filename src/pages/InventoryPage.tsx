import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Boxes, LayoutList, LayoutGrid } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { InventoryTable } from '@/components/dashboard/InventoryTable'
import { InventoryByCategory } from '@/components/dashboard/InventoryByCategory'
import { ManageCategoriesDialog } from '@/components/dashboard/ManageCategoriesDialog'
import {
  InventoryFilterBar,
  type InventoryFilterState,
} from '@/components/dashboard/InventoryFilterBar'
import { QueryState } from '@/components/dashboard/QueryState'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { ListFooter } from '@/components/dashboard/ListFooter'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useListings } from '@/hooks/useDashboard'
import { useAuth } from '@/auth/useAuth'
import { useT } from '@/lib/i18n'
import type { ListingFilters } from '@/lib/api'

const PAGE_SIZE = 25

/** Inventory display modes: the flat table vs the per-category grouped view. */
type ViewMode = 'list' | 'category'

export function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { t } = useT()
  const { isAdmin } = useAuth()

  const filters: InventoryFilterState = useMemo(
    () => ({
      status: searchParams.get('status') ?? '',
      stock_type: searchParams.get('stock_type') ?? '',
      food_non_food: searchParams.get('food_non_food') ?? '',
      country: searchParams.get('country') ?? '',
      category_id: searchParams.get('category_id') ?? '',
      q: searchParams.get('q') ?? '',
    }),
    [searchParams],
  )

  // View mode lives in the URL (?view=category) so it is shareable.
  const view: ViewMode =
    searchParams.get('view') === 'category' ? 'category' : 'list'
  const setView = useCallback(
    (next: string) => {
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev)
        if (next === 'category') p.set('view', 'category')
        else p.delete('view')
        return p
      })
    },
    [setSearchParams],
  )

  // Cursor lives in the URL so a page is shareable. A small stack of seen cursors
  // (reset whenever the filters change) lets us offer a working "Previous" with a
  // keyset/cursor API that only returns a forward `next_cursor`.
  const cursor = searchParams.get('cursor') ?? ''
  const filterSig = `${filters.status}|${filters.stock_type}|${filters.food_non_food}|${filters.country}|${filters.category_id}|${filters.q}`
  const [history, setHistory] = useState<{ sig: string; cursors: string[] }>({
    sig: filterSig,
    cursors: [''],
  })
  // Reset the back-stack whenever the filter signature changes. Render-time
  // setState guarded by a condition (the project's pattern, see LeadFilterBar) —
  // React re-renders immediately with the fresh stack, no effect/flicker.
  if (history.sig !== filterSig) {
    setHistory({ sig: filterSig, cursors: [''] })
  }

  const queryFilters: ListingFilters = {
    status: filters.status || undefined,
    stock_type: filters.stock_type || undefined,
    food_non_food: filters.food_non_food || undefined,
    country: filters.country || undefined,
    category_id: filters.category_id || undefined,
    q: filters.q || undefined,
    limit: PAGE_SIZE,
    cursor: cursor || undefined,
  }

  const { data, isLoading, isFetching, error, refetch } =
    useListings(queryFilters)

  // Changing a filter clears the cursor (back to the first page).
  const onFilterChange = useCallback(
    (patch: Partial<InventoryFilterState>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, val] of Object.entries(patch)) {
          if (val) next.set(key, val)
          else next.delete(key)
        }
        next.delete('cursor')
        return next
      })
    },
    [setSearchParams],
  )

  const setCursor = useCallback(
    (c: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (c) next.set('cursor', c)
        else next.delete('cursor')
        return next
      })
    },
    [setSearchParams],
  )

  const nextCursor = data?.page.next_cursor ?? null
  const stack = history.cursors
  const atFirst = cursor === '' || cursor === stack[0]
  const hasPrev = !atFirst
  const hasNext = !!nextCursor

  const goNext = useCallback(() => {
    if (!nextCursor) return
    setHistory((h) =>
      h.cursors.includes(nextCursor)
        ? h
        : { ...h, cursors: [...h.cursors, nextCursor] },
    )
    setCursor(nextCursor)
  }, [nextCursor, setCursor])

  const goPrev = useCallback(() => {
    const idx = stack.indexOf(cursor)
    const prev = idx > 0 ? stack[idx - 1] : ''
    setCursor(prev)
  }, [stack, cursor, setCursor])

  const count = data?.data.length ?? 0

  return (
    <PageShell
      breadcrumbs={[{ label: t('nav.inventory') }]}
      title={t('inventory.title')}
      description={t('inventory.subtitle')}
    >
      <div className="flex flex-col gap-6">
        <InventoryFilterBar value={filters} onChange={onFilterChange} />

        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={view} onValueChange={setView}>
            <TabsList>
              <TabsTrigger value="list">
                <LayoutList className="h-4 w-4" />
                {t('inventory.viewList')}
              </TabsTrigger>
              <TabsTrigger value="category">
                <LayoutGrid className="h-4 w-4" />
                {t('inventory.viewByCategory')}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Admin-only merge/cleanup surface; backend RBAC stays the real gate. */}
          {isAdmin && (
            <div className="ml-auto">
              <ManageCategoriesDialog />
            </div>
          )}
        </div>

        <QueryState
          isLoading={isLoading}
          error={error}
          isEmpty={data?.data.length === 0}
          errorMessage={t('inventory.loadError')}
          onRetry={refetch}
          empty={
            <EmptyState
              icon={Boxes}
              title={t('inventory.emptyTitle')}
              description={t('inventory.empty')}
            />
          }
        >
          {view === 'category' ? (
            <InventoryByCategory listings={data?.data ?? []} />
          ) : (
            <InventoryTable listings={data?.data ?? []} />
          )}
          <ListFooter
            countLabel={t(
              count === 1 ? 'inventory.countOne' : 'inventory.countOther',
              { n: count },
            )}
            hasPrev={hasPrev}
            hasNext={hasNext}
            busy={isFetching}
            onPrev={goPrev}
            onNext={goNext}
          />
        </QueryState>
      </div>
    </PageShell>
  )
}
