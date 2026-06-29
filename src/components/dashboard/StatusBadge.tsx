import { StatePill, type Tone } from '@/components/dashboard/StatePill'
import { useEnums } from '@/lib/i18n'

/** Maps each lead status to a semantic tone (soft colour-coded pill). */
const STATUS_TONE: Record<string, Tone> = {
  draft: 'neutral',
  new: 'brand',
  qualifying: 'info',
  needs_human: 'danger',
  qualified: 'info',
  offer_requested: 'warning',
  offer_sent: 'warning',
  negotiation: 'warning',
  won: 'success',
  lost: 'danger',
  cancelled: 'neutral',
}

export function StatusBadge({ status }: { status: string }) {
  const { statusLabel } = useEnums()
  return (
    <StatePill tone={STATUS_TONE[status] ?? 'neutral'}>
      {statusLabel(status)}
    </StatePill>
  )
}
