import type { LeadStatus } from '@/lib/api'

/**
 * The simplified, manager-facing pipeline: the ONLY statuses a user may select
 * in a status dropdown/filter, in workflow order. `offer_requested` is the entry
 * state a new lead lands in; `won`/`lost` are terminal.
 *
 * Escalation (`needs_human`) is a flag/badge, not a selectable stage. Internal
 * states (`draft`, `cancelled`) and the DEPRECATED legacy codes
 * (`new`, `qualifying`, `qualified`, `follow_up`) are intentionally absent — they
 * still render a label/tone for legacy rows (see StatusBadge + the i18n
 * dictionary) but are never offered as choices.
 */
export const ACTIVE_LEAD_STATUSES = [
  'offer_requested',
  'offer_sent',
  'negotiation',
  'won',
  'lost',
] as const satisfies readonly LeadStatus[]

export type ActiveLeadStatus = (typeof ACTIVE_LEAD_STATUSES)[number]
