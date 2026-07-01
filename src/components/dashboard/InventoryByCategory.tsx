import { useMemo } from 'react'
import { Boxes } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { InventoryTable } from '@/components/dashboard/InventoryTable'
import { useT } from '@/lib/i18n'
import type { ListingView } from '@/lib/api'

interface Props {
  listings: ListingView[]
}

interface Group {
  key: string
  label: string
  /** True for the trailing "Uncategorized" bucket (unresolved category). */
  uncategorized: boolean
  items: ListingView[]
}

/**
 * "By category" view of the stock inventory. Groups the CURRENTLY-LOADED page of
 * listings by their resolved `category` name (grouping is per-page — the API is
 * cursor-paginated and we deliberately do NOT eager-fetch every page) and renders
 * each group as a collapsible section (shadcn Accordion) whose header shows the
 * category name + item count. Each section reuses {@link InventoryTable} so the
 * columns stay identical to the flat list. Listings with an empty category fall
 * into a clearly-labeled "Uncategorized" group pinned to the end.
 */
export function InventoryByCategory({ listings }: Props) {
  const { t } = useT()

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>()
    for (const l of listings) {
      const name = l.category?.trim() ?? ''
      const key = name || '__uncategorized__'
      let group = map.get(key)
      if (!group) {
        group = {
          key,
          label: name || t('inventory.uncategorized'),
          uncategorized: !name,
          items: [],
        }
        map.set(key, group)
      }
      group.items.push(l)
    }
    // Named groups first (alphabetical), the Uncategorized bucket always last.
    return [...map.values()].sort((a, b) => {
      if (a.uncategorized !== b.uncategorized) return a.uncategorized ? 1 : -1
      return a.label.localeCompare(b.label)
    })
  }, [listings, t])

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">{t('inventory.groupNote')}</p>
      <Accordion
        type="multiple"
        defaultValue={groups.map((g) => g.key)}
        className="flex flex-col gap-2"
      >
        {groups.map((group) => (
          <AccordionItem
            key={group.key}
            value={group.key}
            className="rounded-lg border px-4"
          >
            <AccordionTrigger className="hover:no-underline">
              <span className="flex items-center gap-2">
                <Boxes className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{group.label}</span>
                <Badge variant="secondary" className="tabular-nums">
                  {group.items.length}
                </Badge>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <InventoryTable listings={group.items} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
