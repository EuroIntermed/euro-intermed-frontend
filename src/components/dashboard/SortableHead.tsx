import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { SortDir } from '@/lib/api'

interface Props<K extends string> {
  sortKey: K
  label: string
  ariaLabel: string
  active: boolean
  dir: SortDir
  onSort: (key: K) => void
  align?: 'left' | 'right'
}

/**
 * SortableHead is a clickable table header that toggles a column's sort
 * direction. Shared by the leads pipeline and the B2B directory tables; non-
 * sortable columns keep using a plain TableHead. Generic over the page's sort-key
 * union so each table keeps its own type-safe keys.
 */
export function SortableHead<K extends string>({
  sortKey,
  label,
  ariaLabel,
  active,
  dir,
  onSort,
  align = 'left',
}: Props<K>) {
  const Icon = !active ? ChevronsUpDown : dir === 'asc' ? ChevronUp : ChevronDown
  return (
    <TableHead className={align === 'right' ? 'text-right' : undefined}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        aria-label={ariaLabel}
        className={cn(
          'inline-flex items-center gap-1 -mx-1 px-1 rounded hover:text-foreground transition-colors',
          align === 'right' && 'flex-row-reverse',
          active ? 'text-foreground font-medium' : 'text-muted-foreground',
        )}
      >
        {label}
        <Icon className={cn('h-3.5 w-3.5', !active && 'opacity-50')} />
      </button>
    </TableHead>
  )
}
