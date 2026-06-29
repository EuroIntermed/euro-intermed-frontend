import { StatePill, type Tone } from '@/components/dashboard/StatePill'
import { useEnums } from '@/lib/i18n'

/** Maps each listing status to a semantic tone (parallels StatusBadge). */
const LISTING_STATUS_TONE: Record<string, Tone> = {
  active: 'success',
  reserved: 'warning',
  sold: 'brand',
  expired: 'danger',
  withdrawn: 'neutral',
}

/** Localized colored badge for a PalletClearance listing status. */
export function ListingStatusBadge({ status }: { status: string }) {
  const { listingStatusLabel } = useEnums()
  return (
    <StatePill tone={LISTING_STATUS_TONE[status] ?? 'neutral'}>
      {listingStatusLabel(status)}
    </StatePill>
  )
}
