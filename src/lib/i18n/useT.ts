import { useContext, useMemo } from 'react'
import { I18nContext } from './context'
import type { Lang } from './dictionaries'
import { translate } from './resolve'
import type { TKey } from './types'

/**
 * Access the active language + translate function. Throws if used outside
 * <LanguageProvider> so a missing provider fails loudly in development.
 */
export function useT() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useT must be used within <LanguageProvider>')
  return ctx
}

/**
 * The canonical lead statuses in pipeline order. `draft` and `cancelled` are
 * hidden from the pipeline list by default server-side; they appear here so the
 * status filter Select can opt them back in (the documented "show drafts"
 * mechanism is an explicit `status=draft` filter — see PipelinePage).
 */
const STATUS_VALUES = [
  'draft',
  'new',
  'qualifying',
  'needs_human',
  'qualified',
  'offer_requested',
  'offer_sent',
  'negotiation',
  'won',
  'lost',
  'cancelled',
] as const

const VERTICAL_VALUES = ['angrosist', 'palletclearance', 'skalyou'] as const

/** Canonical listing statuses (listings.status), inventory-dashboard order. */
const LISTING_STATUS_VALUES = [
  'active',
  'reserved',
  'sold',
  'expired',
  'withdrawn',
] as const

/** food / non_food classification (listings.food_non_food). */
const FOOD_NON_FOOD_VALUES = ['food', 'non_food'] as const

/** Canonical VAT statuses → their localized dictionary keys. */
const VAT_LABEL_KEY: Record<string, TKey> = {
  active: 'companies.vatActive',
  inactive: 'companies.vatInactive',
  not_registered: 'companies.vatNotRegistered',
  unknown: 'companies.vatUnknown',
}

/** Conversation intents (the buy/sell "tip client" proxy). */
const INTENT_VALUES = ['buy', 'sell'] as const

/** UI/contact languages we localize; other codes fall back to their raw label. */
const LANGUAGE_LABEL_KEY: Record<string, TKey> = {
  ro: 'lang.ro',
  en: 'lang.en',
}

/** Company roles in directory order, used for the role filter Select. */
const ROLE_VALUES = [
  'distributor',
  'importer',
  'wholesaler',
  'retailer',
  'horeca',
  'processor',
  'producer',
  'buyer',
  'seller',
] as const

export interface Option {
  value: string
  label: string
}

function options(lang: Lang, prefix: string, values: readonly string[]): Option[] {
  return values.map((value) => ({
    value,
    label: translate(lang, `${prefix}.${value}` as TKey),
  }))
}

/**
 * Localized enum option lists + label helpers, derived from the active language.
 * Enum VALUES stay the canonical backend codes; only the labels are localized.
 */
export function useEnums() {
  const { lang } = useT()
  return useMemo(
    () => ({
      leadStatuses: options(lang, 'status', STATUS_VALUES),
      verticals: options(lang, 'vertical', VERTICAL_VALUES),
      companyRoles: options(lang, 'role', ROLE_VALUES),
      listingStatuses: options(lang, 'listingStatus', LISTING_STATUS_VALUES),
      foodNonFoodOptions: options(lang, 'foodNonFood', FOOD_NON_FOOD_VALUES),
      statusLabel: (status: string) =>
        translate(lang, `status.${status}` as TKey),
      /** Localized listing status; unknown codes fall back to the raw value. */
      listingStatusLabel: (s: string) =>
        (LISTING_STATUS_VALUES as readonly string[]).includes(s)
          ? translate(lang, `listingStatus.${s}` as TKey)
          : s,
      /** Localized food/non_food label; unknown/empty falls back to the raw value. */
      foodNonFoodLabel: (v: string) =>
        (FOOD_NON_FOOD_VALUES as readonly string[]).includes(v)
          ? translate(lang, `foodNonFood.${v}` as TKey)
          : v,
      verticalLabel: (v: string) => translate(lang, `vertical.${v}` as TKey),
      roleLabel: (r: string) => translate(lang, `role.${r}` as TKey),
      /**
       * Localized intent label (buy→buyer / sell→seller); an unknown code falls
       * back to its raw value rather than leaking the dictionary key.
       */
      intentLabel: (v: string) =>
        (INTENT_VALUES as readonly string[]).includes(v)
          ? translate(lang, `intent.${v}` as TKey)
          : v,
      /**
       * Localized language label (ro/en); unknown codes fall back to the raw
       * value (data labels may carry locales we don't translate yet).
       */
      languageLabel: (v: string) =>
        LANGUAGE_LABEL_KEY[v] ? translate(lang, LANGUAGE_LABEL_KEY[v]) : v,
      /**
       * Localized VAT-status label. Maps active/inactive/not_registered/unknown
       * to RO/EN words; any unrecognized/empty value falls back to "unknown".
       */
      vatLabel: (s: string | null | undefined) =>
        translate(lang, VAT_LABEL_KEY[s ?? ''] ?? 'companies.vatUnknown'),
    }),
    [lang],
  )
}
