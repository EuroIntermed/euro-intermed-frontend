import { Badge } from '@/components/ui/badge'
import { useEnums } from '@/lib/i18n'

/** Maps each listing status to a shadcn Badge variant (parallels StatusBadge). */
const LISTING_STATUS_VARIANT: Record<
  string,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  active: 'default',
  reserved: 'secondary',
  sold: 'secondary',
  expired: 'destructive',
  withdrawn: 'outline',
}

/** Localized colored badge for a PalletClearance listing status. */
export function ListingStatusBadge({ status }: { status: string }) {
  const { listingStatusLabel } = useEnums()
  return (
    <Badge variant={LISTING_STATUS_VARIANT[status] ?? 'secondary'}>
      {listingStatusLabel(status)}
    </Badge>
  )
}
