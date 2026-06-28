import { useNavigate } from 'react-router-dom'
import { ImageIcon } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ListingStatusBadge } from '@/components/dashboard/ListingStatusBadge'
import { ConfidentialBadge } from '@/components/dashboard/ConfidentialBadge'
import { cn } from '@/lib/utils'
import { useT, useEnums, formatRON, formatDate } from '@/lib/i18n'
import type { ListingView } from '@/lib/api'

interface Props {
  listings: ListingView[]
}

/**
 * Stock-inventory table (mirrors LeadTable). Each row links to its source lead
 * when `lead_id` is present (the listing is a sibling of the thin lead), so the
 * cursor is only interactive in that case.
 */
export function InventoryTable({ listings }: Props) {
  const navigate = useNavigate()
  const { t, lang } = useT()
  const { foodNonFoodLabel } = useEnums()

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <Table className="min-w-[1000px]">
          <TableHeader>
            <TableRow>
              <TableHead>{t('inventory.colCompany')}</TableHead>
              <TableHead>{t('inventory.colCategory')}</TableHead>
              <TableHead>{t('inventory.colStockType')}</TableHead>
              <TableHead>{t('inventory.colFoodNonFood')}</TableHead>
              <TableHead>{t('inventory.colQuantity')}</TableHead>
              <TableHead>{t('inventory.colLocation')}</TableHead>
              <TableHead>{t('inventory.colCountry')}</TableHead>
              <TableHead className="whitespace-nowrap">
                {t('inventory.colExpiry')}
              </TableHead>
              <TableHead className="text-right">
                {t('inventory.colTargetPrice')}
              </TableHead>
              <TableHead>{t('inventory.colStatus')}</TableHead>
              <TableHead className="text-right">
                {t('inventory.colPhotos')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {listings.map((l) => {
              const linked = !!l.lead_id
              return (
                <TableRow
                  key={l.id}
                  className={cn(linked && 'cursor-pointer')}
                  onClick={
                    linked
                      ? () => navigate(`/dashboard/${l.lead_id}`)
                      : undefined
                  }
                >
                  <TableCell className="font-medium">
                    <span className="flex flex-wrap items-center gap-1.5">
                      {l.company_name || t('common.none')}
                      {l.confidential && <ConfidentialBadge />}
                    </span>
                  </TableCell>
                  <TableCell>{l.category || t('common.none')}</TableCell>
                  <TableCell>{l.stock_type || t('common.none')}</TableCell>
                  <TableCell>
                    {l.food_non_food
                      ? foodNonFoodLabel(l.food_non_food)
                      : t('common.none')}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {l.quantity != null
                      ? `${l.quantity}${l.unit ? ` ${l.unit}` : ''}`
                      : t('common.none')}
                  </TableCell>
                  <TableCell>{l.location || t('common.none')}</TableCell>
                  <TableCell>{l.country || t('common.none')}</TableCell>
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                    {l.expiry ? formatDate(lang, l.expiry) : t('common.none')}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap tabular-nums">
                    {formatRON(lang, l.target_price, t('common.none'))}
                  </TableCell>
                  <TableCell>
                    <ListingStatusBadge status={l.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className="gap-1 tabular-nums"
                      aria-label={t('inventory.photosCount', {
                        n: l.photo_count,
                      })}
                    >
                      <ImageIcon className="h-3 w-3" />
                      {l.photo_count}
                    </Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
