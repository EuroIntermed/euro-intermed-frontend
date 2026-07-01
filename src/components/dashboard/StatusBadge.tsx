import { StatePill, type Tone } from '@/components/dashboard/StatePill'
import { useEnums } from '@/lib/i18n'

/**
 * Maps each lead status to a semantic tone (soft colour-coded pill). Covers the
 * ACTIVE pipeline (offer_requested → lost), the `needs_human` escalation flag,
 * the internal draft/cancelled states, AND the DEPRECATED legacy codes
 * (new/qualifying/qualified/follow_up) so old rows still render a labeled,
 * toned pill. Any unknown code falls back to `neutral` (never crashes).
 */
const STATUS_TONE: Record<string, Tone> = {
  // Active pipeline
  offer_requested: 'brand', // entry state
  offer_sent: 'warning',
  negotiation: 'info',
  won: 'success',
  lost: 'danger',
  // Escalation flag
  needs_human: 'danger',
  // Internal
  draft: 'neutral',
  cancelled: 'neutral',
  // Deprecated legacy (render-only)
  new: 'brand',
  qualifying: 'info',
  qualified: 'info',
  follow_up: 'warning',
}

export function StatusBadge({ status }: { status: string }) {
  const { statusLabel } = useEnums()
  return (
    <StatePill tone={STATUS_TONE[status] ?? 'neutral'}>
      {statusLabel(status)}
    </StatePill>
  )
}
