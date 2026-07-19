import type { Tone } from '@/components/dashboard/StatePill'
import type { TKey } from '@/lib/i18n/types'
import type { OfferBatchStatus, OfferItemStatus } from '@/lib/api'

/**
 * Maps a batch lifecycle status to its pill tone + localized label key. `parsed`
 * is the actionable "needs review" state, so it reads as a warning; `reviewed`/
 * `sent` are terminal-successful; `error` is danger.
 */
export const BATCH_STATUS: Record<
  OfferBatchStatus,
  { tone: Tone; labelKey: TKey }
> = {
  received: { tone: 'neutral', labelKey: 'offers.statusReceived' },
  parsing: { tone: 'info', labelKey: 'offers.statusParsing' },
  parsed: { tone: 'warning', labelKey: 'offers.statusParsed' },
  error: { tone: 'danger', labelKey: 'offers.statusError' },
  reviewed: { tone: 'success', labelKey: 'offers.statusReviewed' },
  sent: { tone: 'brand', labelKey: 'offers.statusSent' },
}

/** Maps a parsed-item review status to its pill tone + localized label key. */
export const ITEM_STATUS: Record<
  OfferItemStatus,
  { tone: Tone; labelKey: TKey }
> = {
  draft: { tone: 'neutral', labelKey: 'offers.itemDraft' },
  approved: { tone: 'success', labelKey: 'offers.itemApproved' },
  rejected: { tone: 'danger', labelKey: 'offers.itemRejected' },
}

/**
 * Confidence (0..1) → pill tone: the lower the parser's self-confidence the more
 * a reviewer should double-check it, so low reads danger, mid warning, high
 * success; an unknown (null) confidence is neutral.
 */
export function confidenceTone(confidence: number | null): Tone {
  if (confidence == null) return 'neutral'
  if (confidence < 0.5) return 'danger'
  if (confidence < 0.8) return 'warning'
  return 'success'
}
