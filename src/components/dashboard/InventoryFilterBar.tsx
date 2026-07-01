import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CategoryPicker } from '@/components/dashboard/CategoryPicker'
import { useCategories } from '@/hooks/useDashboard'
import { useT, useEnums } from '@/lib/i18n'

const ALL = '__all__'

export interface InventoryFilterState {
  status: string
  stock_type: string
  food_non_food: string
  country: string
  category_id: string
  q: string
}

interface Props {
  value: InventoryFilterState
  onChange: (patch: Partial<InventoryFilterState>) => void
}

/**
 * Filter bar for the stock inventory (mirrors LeadFilterBar). Status and
 * food/non-food are controlled enums (Selects); stock type and country are
 * free-text on the listings table, so they are debounced text inputs. The
 * search box is debounced up to the URL like the pipeline.
 */
export function InventoryFilterBar({ value, onChange }: Props) {
  const { t } = useT()
  const { listingStatuses, foodNonFoodOptions } = useEnums()
  // Fetched once and cached (shared with the "by category" view + merge dialog).
  const { data: categories, isLoading: categoriesLoading } = useCategories()

  // Local mirrors so typing in the text fields stays responsive; debounce to URL.
  const [search, setSearch] = useState(value.q)
  const [stockType, setStockType] = useState(value.stock_type)
  const [country, setCountry] = useState(value.country)

  // Re-sync mirrors when the URL changes externally (back/forward, reset).
  const [syncedQ, setSyncedQ] = useState(value.q)
  if (syncedQ !== value.q) {
    setSyncedQ(value.q)
    setSearch(value.q)
  }
  const [syncedStock, setSyncedStock] = useState(value.stock_type)
  if (syncedStock !== value.stock_type) {
    setSyncedStock(value.stock_type)
    setStockType(value.stock_type)
  }
  const [syncedCountry, setSyncedCountry] = useState(value.country)
  if (syncedCountry !== value.country) {
    setSyncedCountry(value.country)
    setCountry(value.country)
  }

  useEffect(() => {
    const handle = setTimeout(() => {
      if (search !== value.q) onChange({ q: search })
    }, 350)
    return () => clearTimeout(handle)
  }, [search, value.q, onChange])

  useEffect(() => {
    const handle = setTimeout(() => {
      if (stockType !== value.stock_type) onChange({ stock_type: stockType })
    }, 350)
    return () => clearTimeout(handle)
  }, [stockType, value.stock_type, onChange])

  useEffect(() => {
    const handle = setTimeout(() => {
      if (country !== value.country) onChange({ country })
    }, 350)
    return () => clearTimeout(handle)
  }, [country, value.country, onChange])

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('inventory.search')}
          className="pl-8"
          aria-label={t('inventory.search')}
        />
      </div>

      <Select
        value={value.status || ALL}
        onValueChange={(v) => onChange({ status: v === ALL ? '' : v })}
      >
        <SelectTrigger
          className="w-[160px]"
          aria-label={t('inventory.filterStatus')}
        >
          <SelectValue placeholder={t('inventory.filterStatus')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t('inventory.allStatuses')}</SelectItem>
          {listingStatuses.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.food_non_food || ALL}
        onValueChange={(v) => onChange({ food_non_food: v === ALL ? '' : v })}
      >
        <SelectTrigger
          className="w-[150px]"
          aria-label={t('inventory.filterFoodNonFood')}
        >
          <SelectValue placeholder={t('inventory.filterFoodNonFood')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t('inventory.allFoodNonFood')}</SelectItem>
          {foodNonFoodOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <CategoryPicker
        categories={categories ?? []}
        value={value.category_id}
        onChange={(id) => onChange({ category_id: id })}
        loading={categoriesLoading}
      />

      <Input
        value={stockType}
        onChange={(e) => setStockType(e.target.value)}
        placeholder={t('inventory.stockTypePlaceholder')}
        className="w-[150px]"
        aria-label={t('inventory.filterStockType')}
      />

      <Input
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        placeholder={t('inventory.countryPlaceholder')}
        className="w-[120px]"
        aria-label={t('inventory.filterCountry')}
      />
    </div>
  )
}
