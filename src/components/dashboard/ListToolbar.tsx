import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Props {
  /** Bound search value; omit to hide the search input. */
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  /** Filter controls (Selects, switches) shown after the search input. */
  filters?: ReactNode
  /** Right-aligned actions (primary button, code button …). */
  actions?: ReactNode
  className?: string
}

/**
 * The standard list-screen toolbar: a search field, a row of filter controls,
 * and right-aligned actions — one consistent chrome that the per-screen filter
 * bars compose into, so Pipeline / Companies / Inventory / Tasks all align.
 */
export function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  filters,
  actions,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center',
        className,
      )}
    >
      {onSearchChange !== undefined && (
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
      )}
      {filters && (
        <div className="flex flex-wrap items-center gap-2">{filters}</div>
      )}
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {actions}
        </div>
      )}
    </div>
  )
}
