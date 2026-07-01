import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { buildCategoryTree } from '@/lib/categoryTree'
import type { Category } from '@/lib/api'

interface Props {
  categories: Category[]
  /** Selected category id, or '' for "all categories". */
  value: string
  onChange: (categoryId: string) => void
  /** Loading state of the categories query — disables the trigger. */
  loading?: boolean
}

/**
 * Searchable hierarchical category picker (shadcn Command inside a Popover).
 * Renders each root as a group label with its children indented underneath, and
 * shows the live reference `count` next to every category (e.g. "Dairy (12)").
 * Selecting a category emits its id; the "All categories" row clears the filter.
 * The Command's built-in fuzzy filter makes long taxonomies searchable and
 * keyboard-navigable (a11y comes from the shadcn primitives).
 */
export function CategoryPicker({ categories, value, onChange, loading }: Props) {
  const { t } = useT()
  const [open, setOpen] = useState(false)

  const tree = useMemo(() => buildCategoryTree(categories), [categories])
  const selected = useMemo(
    () => categories.find((c) => c.id === value),
    [categories, value],
  )

  const select = (id: string) => {
    onChange(id)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={t('inventory.filterCategory')}
          disabled={loading}
          className="w-[220px] justify-between font-normal"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Tag className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {selected
                ? t('inventory.categoryCount', {
                    name: selected.name,
                    n: selected.count,
                  })
                : t('inventory.filterCategory')}
            </span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t('inventory.searchCategory')} />
          <CommandList>
            <CommandEmpty>{t('inventory.noCategory')}</CommandEmpty>
            <CommandGroup>
              <CommandItem value="__all__" onSelect={() => select('')}>
                <Check
                  className={cn(
                    'h-4 w-4',
                    value === '' ? 'opacity-100' : 'opacity-0',
                  )}
                />
                {t('inventory.allCategories')}
              </CommandItem>
            </CommandGroup>
            {tree.map(({ node, children }) => (
              <CommandGroup key={node.id} heading={node.name}>
                <CommandItem
                  value={`${node.name} ${node.code}`}
                  onSelect={() => select(node.id)}
                >
                  <Check
                    className={cn(
                      'h-4 w-4',
                      value === node.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {t('inventory.categoryCount', {
                    name: node.name,
                    n: node.count,
                  })}
                </CommandItem>
                {children.map((child) => (
                  <CommandItem
                    key={child.id}
                    value={`${node.name} ${child.name} ${child.code}`}
                    onSelect={() => select(child.id)}
                    className="pl-6"
                  >
                    <Check
                      className={cn(
                        'h-4 w-4',
                        value === child.id ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {t('inventory.categoryCount', {
                      name: child.name,
                      n: child.count,
                    })}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
