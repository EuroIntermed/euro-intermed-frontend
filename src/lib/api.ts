import {
  getStoredToken,
  clearStoredAuth,
  type AuthUser,
  type UserRole,
} from '@/lib/authStore'

/**
 * Resolves the backend base URL consistently across the app and the embeddable
 * widget. The widget injects `window.__ANGROSIST_API_URL__` at runtime so a
 * single `widget.js` can target different backends per host site; that override
 * wins. Otherwise we fall back to the build-time `VITE_API_URL` (empty string =
 * same-origin). No host is ever hardcoded.
 */
export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const override = (window as unknown as Record<string, unknown>)
      .__ANGROSIST_API_URL__
    if (typeof override === 'string' && override) return override
  }
  return import.meta.env.VITE_API_URL ?? ''
}

/**
 * Resolves the privacy-policy URL linked from the GDPR consent notice. An embed
 * may override it per host via `window.__ANGROSIST_PRIVACY_URL__` (set from the
 * widget config); otherwise we fall back to the build-time `VITE_PRIVACY_URL`.
 * Returns `'#'` when neither is configured so the notice still renders without a
 * hardcoded domain. No host is ever baked into source.
 */
export function getPrivacyUrl(): string {
  if (typeof window !== 'undefined') {
    const override = (window as unknown as Record<string, unknown>)
      .__ANGROSIST_PRIVACY_URL__
    if (typeof override === 'string' && override) return override
  }
  // TODO: point VITE_PRIVACY_URL at the published policy URL per environment.
  const fromEnv = import.meta.env.VITE_PRIVACY_URL
  return typeof fromEnv === 'string' && fromEnv ? fromEnv : '#'
}

/**
 * Resolves the external monitoring dashboard URL linked from the Platform-health
 * board (uptime / API error rate are measured in Cloud Monitoring, not in-app).
 * Comes from the build-time `VITE_MONITORING_URL`; returns an empty string when
 * unset so the board renders the note without a dangling link. No host is baked
 * into source.
 */
export function getMonitoringUrl(): string {
  const fromEnv = import.meta.env.VITE_MONITORING_URL
  return typeof fromEnv === 'string' && fromEnv ? fromEnv : ''
}

export interface ExtractedFields {
  product_name?: string
  quantity?: number
  unit?: string
  delivery_location?: string
  cui?: string
  company_name?: string
  phone?: string
  email?: string
}

/**
 * The `202 Accepted` ack returned by the ASYNC `POST /api/chat`. The turn is
 * enqueued server-side; there is **no reply here** — the assistant reply (plus
 * `state`/`extracted`) is delivered exclusively over the SSE reply stream
 * (`GET /api/stream`, see {@link subscribeToConversation}). The first-turn reply
 * is published to a short replay buffer, so opening the stream promptly after
 * this 202 won't miss it.
 */
export interface ChatAck {
  conversation_id: string
  /**
   * Per-conversation ownership token issued on EVERY turn (incl. the first).
   * Continuing turns, the SSE stream, and seller-photo uploads must echo it back
   * (header / query / form field) or the backend returns 403.
   */
  conversation_token: string
  /** Always `"queued"` on success — the turn was accepted for async processing. */
  status: string
}

/**
 * Verticals the chat agent can serve. Angrosist (wholesale buyer) is the
 * default; `euro-intermed` is the router vertical whose agent triages an
 * inbound conversation and re-routes it into the real flow (angrosist /
 * palletclearance).
 */
export type ChatVertical = 'angrosist' | 'palletclearance' | 'euro-intermed'
/**
 * Conversation intent. `buy` is the default; `sell` enables the seller (photo)
 * flow; `triage` is the router intent used with the `euro-intermed` vertical
 * before the agent re-routes into a concrete buy/sell flow.
 */
export type ChatIntent = 'buy' | 'sell' | 'triage'

/**
 * Optional flow selectors. They are only meaningful on the FIRST message of a
 * conversation (the backend pins the flow there); later messages ignore them.
 * Omitted → backend defaults to angrosist/buy.
 */
export interface ChatFlow {
  vertical?: ChatVertical
  intent?: ChatIntent
  /**
   * Conversation language (`ro` | `en`) the backend should start the conversation
   * in, so the agent's replies match the greeting/site language. Only meaningful
   * on the FIRST message (the backend pins the language on creation); sending it
   * on later turns is harmless. Unknown-field-safe if the backend hasn't shipped
   * it yet.
   */
  language?: 'ro' | 'en'
}

export interface TranscriptMessage {
  id: string
  role: string
  content: string
  tool_calls?: string // base64-encoded JSON array of Gemini parts
  created_at: string
  // The request this message was attributed to (messages.lead_id). Null/absent
  // for pre-submission turns (greeting/router). Lets the dashboard group a
  // multi-request conversation per request.
  lead_id?: string
}

/**
 * Posts one user turn to the ASYNC `POST /api/chat`. Returns the `202` ack
 * ({@link ChatAck}) only — the assistant reply arrives over SSE, NOT here. The
 * caller must persist the returned `conversation_id` + `conversation_token` and
 * open (or keep open) the reply stream right after this resolves.
 *
 * - First turn (no `conversationId`): sends `message` plus optional
 *   `vertical`/`intent`; the backend creates the conversation and issues the
 *   ownership token in the ack.
 * - Continuing turn: sends `message` plus the ownership token via the
 *   `X-Conversation-Token` header (the backend `403`s without it).
 */
export async function sendMessage(
  conversationId: string | null,
  message: string,
  flow?: ChatFlow,
  token?: string | null,
): Promise<ChatAck> {
  // vertical/intent are only sent on the first message (no conversation id yet);
  // sending them later is harmless but the backend pins the flow on creation.
  const isFirst = !conversationId

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  // Continuing turns MUST prove conversation ownership; the first turn has no
  // token yet (the backend issues one in the response).
  if (!isFirst && token) headers['X-Conversation-Token'] = token

  const res = await fetch(`${getApiBase()}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      conversation_id: conversationId ?? undefined,
      message,
      ...(isFirst && flow?.vertical ? { vertical: flow.vertical } : {}),
      ...(isFirst && flow?.intent ? { intent: flow.intent } : {}),
      // Conversation language — sent so the backend starts the agent in the
      // widget/site language. Sent on every turn (harmless after creation);
      // the field name MUST be exactly `language`.
      ...(flow?.language ? { language: flow.language } : {}),
    }),
  })
  if (!res.ok) throw new Error(`chat error ${res.status}`)
  return res.json() as Promise<ChatAck>
}

/** Result of a successful seller-photo upload (mirrors the backend envelope). */
export interface ConversationPhoto {
  id: string
  key: string
  url: string
}

/**
 * Uploads one seller photo to a PalletClearance/sell conversation via the PUBLIC
 * multipart endpoint. Carries the per-conversation ownership token (no staff
 * auth header) via `X-Conversation-Token` plus a `token` form field. Surfaces
 * backend `{error:{code,message}}` messages — incl. 403 (missing/invalid token),
 * 409 (per-conversation cap) and 400 (non-image / oversize) — as a thrown
 * {@link ApiError} so the UI can show the exact reason.
 */
export async function uploadConversationPhoto(
  conversationId: string,
  file: File,
  token?: string | null,
): Promise<ConversationPhoto> {
  const form = new FormData()
  form.append('file', file)
  // Prove conversation ownership (header preferred; form field as a belt-and-
  // braces fallback). Without it the backend 403s in addition to seller scoping.
  if (token) form.append('token', token)

  const headers: Record<string, string> = {}
  if (token) headers['X-Conversation-Token'] = token

  const res = await fetch(
    `${getApiBase()}/api/conversations/${encodeURIComponent(
      conversationId,
    )}/photos`,
    { method: 'POST', headers, body: form },
  )

  if (!res.ok) {
    let code = 'INTERNAL'
    let message = `Eroare ${res.status}`
    let details: { field: string; issue: string }[] | undefined
    try {
      const body = (await res.json()) as ErrorEnvelope
      if (body.error) {
        code = body.error.code ?? code
        message = body.error.message ?? message
        details = body.error.details
      }
    } catch {
      /* non-JSON error body — keep defaults */
    }
    throw new ApiError(res.status, code, message, details)
  }

  return (await res.json()) as ConversationPhoto
}

/** Result of a successful buyer product-list document upload (mirrors the backend envelope). */
export interface ConversationDocument {
  id: string
  key: string
  url: string
}

/**
 * Uploads one BUYER product-list document (Excel/Word/CSV/PDF) to an
 * Angrosist/buy conversation via the PUBLIC multipart endpoint
 * (`POST /api/conversations/{id}/documents`) — the sibling of
 * {@link uploadConversationPhoto} for the buyer qualification flow (contract
 * A1.2(e)). Carries the per-conversation ownership token (no staff auth header)
 * via the `X-Conversation-Token` header plus a `token` form field fallback, and
 * surfaces backend `{error:{code,message}}` messages — incl. 403 (missing/invalid
 * token), 409 `DOCUMENT_LIMIT_REACHED` (per-conversation cap of 5) and 413
 * (oversize) — as a thrown {@link ApiError} so the UI can show the exact reason.
 */
export async function uploadConversationDocument(
  conversationId: string,
  file: File,
  token?: string | null,
): Promise<ConversationDocument> {
  const form = new FormData()
  form.append('file', file)
  // Prove conversation ownership (header preferred; form field as a belt-and-
  // braces fallback). Without it the backend 403s.
  if (token) form.append('token', token)

  const headers: Record<string, string> = {}
  if (token) headers['X-Conversation-Token'] = token

  const res = await fetch(
    `${getApiBase()}/api/conversations/${encodeURIComponent(
      conversationId,
    )}/documents`,
    { method: 'POST', headers, body: form },
  )

  if (!res.ok) {
    let code = 'INTERNAL'
    let message = `Eroare ${res.status}`
    let details: { field: string; issue: string }[] | undefined
    try {
      const body = (await res.json()) as ErrorEnvelope
      if (body.error) {
        code = body.error.code ?? code
        message = body.error.message ?? message
        details = body.error.details
      }
    } catch {
      /* non-JSON error body — keep defaults */
    }
    throw new ApiError(res.status, code, message, details)
  }

  return (await res.json()) as ConversationDocument
}

// ===========================================================================
// Authenticated dashboard API (M3 Epic 3.3)
//
// These helpers attach the staff JWT and centralize error handling against the
// documented envelope `{error:{code,message,details}}`. On 401 anywhere we clear
// the token and let a registered handler bounce the operator to /login. The
// public chat/SSE helpers above are intentionally left untouched (unauthed).
// ===========================================================================

/** Structured error surfaced to callers; carries the stable backend code. */
export class ApiError extends Error {
  status: number
  code: string
  details?: { field: string; issue: string }[]
  constructor(
    status: number,
    code: string,
    message: string,
    details?: { field: string; issue: string }[],
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

/**
 * Registered by the auth provider so the fetch wrapper can trigger a redirect on
 * 401 without importing React. Keeping it as a module-level callback avoids
 * coupling the data layer to the router.
 */
let onUnauthorized: (() => void) | null = null
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn
}

interface ErrorEnvelope {
  error?: {
    code?: string
    message?: string
    details?: { field: string; issue: string }[]
  }
}

/**
 * fetch wrapper for authed dashboard calls. Injects the Bearer token, parses the
 * error envelope, and on 401 clears the token + fires the unauthorized handler
 * (redirect to /login). Throws ApiError on any non-2xx.
 */
async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken()
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${getApiBase()}/api${path}`, { ...init, headers })

  if (res.status === 401) {
    clearStoredAuth()
    onUnauthorized?.()
    throw new ApiError(
      401,
      'UNAUTHENTICATED',
      'Sesiune expirată. Autentifică-te din nou.',
    )
  }

  if (!res.ok) {
    let code = 'INTERNAL'
    let message = `Eroare ${res.status}`
    let details: { field: string; issue: string }[] | undefined
    try {
      const body = (await res.json()) as ErrorEnvelope
      if (body.error) {
        code = body.error.code ?? code
        message = body.error.message ?? message
        details = body.error.details
      }
    } catch {
      /* non-JSON error body — keep defaults */
    }
    throw new ApiError(res.status, code, message, details)
  }

  // 204 / empty body tolerant
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

// --- Auth -----------------------------------------------------------------

export interface LoginResponse {
  token: string
  expires_at?: string
  user: AuthUser
}

/**
 * Step 1 of passwordless email-OTP sign-in. Asks the backend to email a 6-digit
 * code to `email`. The backend ALWAYS answers `202` with an empty body (it never
 * reveals whether the account exists), so we treat any 2xx as success and only
 * surface transport/rate-limit failures (e.g. 429) as a thrown {@link ApiError}.
 */
export async function requestCode(email: string): Promise<void> {
  await authedFetch<void>('/auth/request-code', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

/**
 * Step 2 of passwordless email-OTP sign-in. Exchanges the emailed 6-digit `code`
 * for a session token + {@link AuthUser}. The backend returns `401` for any
 * failure (wrong/expired/consumed code or too many attempts) — surfaced as an
 * {@link ApiError} the login page maps to a friendly message.
 */
export async function verifyCode(
  email: string,
  code: string,
): Promise<LoginResponse> {
  // Verify is unauthed but shares the envelope/error handling.
  return authedFetch<LoginResponse>('/auth/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  })
}

// --- Leads (paginated, filtered) ------------------------------------------

/**
 * All lead status codes the wire may carry. The manager-facing pipeline uses
 * only the ACTIVE subset (see `src/lib/leadStatus.ts`); `needs_human` is an
 * escalation flag; `draft`/`cancelled` are internal; and `new`/`qualifying`/
 * `qualified`/`follow_up` are DEPRECATED — never offered as a choice, but still
 * typed + labeled so legacy leads that carry them render correctly.
 */
export type LeadStatus =
  | 'draft'
  | 'needs_human'
  | 'offer_requested'
  | 'offer_sent'
  | 'negotiation'
  | 'won'
  | 'lost'
  | 'cancelled'
  // Deprecated legacy codes — render-only, not selectable.
  | 'new'
  | 'qualifying'
  | 'qualified'
  | 'follow_up'

export type Vertical = 'angrosist' | 'palletclearance' | 'skalyou'

/** LeadSummary mirrors domain.LeadSummary / openapi LeadSummary. */
export interface LeadSummary {
  id: string
  status: string
  company_name: string
  cui: string
  product_name: string
  quantity: number | null
  unit: string
  delivery_location: string
  created_at: string
  vertical: string
  /**
   * Conversation intent for this lead (buy / sell / triage). Present on the wire
   * for agent-v2 leads; absent/empty for legacy rows — read defensively.
   */
  intent?: string
  /**
   * Best-effort contact display name for the lead's primary contact. Null/absent
   * when no contact name is known — the UI degrades to just the company name.
   */
  contact_name?: string | null
  assigned_to: string | null
  needs_human: boolean
  offer_value: number | null
  offer_note?: string
  /**
   * Per-conversation request number (leads.seq, migration 036) — the "#N" handle
   * shown next to a lead in a multi-request client thread. Nullable on the wire;
   * absent/null for legacy leads created before seq existed.
   */
  seq?: number | null
  /**
   * Lead-level follow-up reminder timestamp (leads.follow_up_at), set via the
   * offer PATCH. Optional on the wire — absent until the backend projects it
   * onto the summary/detail; the UI reads it defensively.
   */
  follow_up_at?: string | null
}

/** PageInfo is the cursor pagination envelope (B2B directory, handoff queue). */
export interface PageInfo {
  next_cursor: string | null
  limit: number
  count: number
}

/**
 * OffsetPageInfo is the offset pagination envelope for sortable lists (the leads
 * pipeline and the B2B directory). Unlike the cursor PageInfo it carries `total`
 * (rows matching the filter) and `offset`, so the UI can render "Page X of Y".
 */
export interface OffsetPageInfo {
  total: number
  limit: number
  offset: number
  count: number
}

/** @deprecated alias kept for the leads page; use OffsetPageInfo. */
export type LeadPageInfo = OffsetPageInfo

export interface LeadListPage {
  data: LeadSummary[]
  page: OffsetPageInfo
}

/** Whitelisted sort keys accepted by GET /api/leads (must match the backend). */
export type LeadSortKey = 'created_at' | 'company' | 'status' | 'offer_value'
export type SortDir = 'asc' | 'desc'

export interface LeadFilters {
  status?: string
  vertical?: string
  assigned_to?: string
  q?: string
  offset?: number
  limit?: number
  sort?: LeadSortKey
  dir?: SortDir
}

export async function listLeads(filters: LeadFilters): Promise<LeadListPage> {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.vertical) params.set('vertical', filters.vertical)
  // 'none' is the UI sentinel for "unassigned"; the API contract expresses that
  // as a present-but-empty assigned_to param (the backend then filters IS NULL).
  if (filters.assigned_to === 'none') params.set('assigned_to', '')
  else if (filters.assigned_to) params.set('assigned_to', filters.assigned_to)
  if (filters.q) params.set('q', filters.q)
  if (filters.offset) params.set('offset', String(filters.offset))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.sort) params.set('sort', filters.sort)
  if (filters.dir) params.set('dir', filters.dir)
  const qs = params.toString()
  return authedFetch<LeadListPage>(`/leads${qs ? `?${qs}` : ''}`)
}

// --- Lead detail ----------------------------------------------------------

/**
 * One product line of a multi-product sourcing request (openapi SourcingLineItem
 * / sourcing_request_items). `items[0]` mirrors the scalar product/quantity/unit
 * for backward compatibility; legacy single-product requests have an empty list.
 */
export interface SourcingLineItem {
  product: string
  quantity?: number | null
  unit?: string
  spec?: string
}

/**
 * Free-form typed attributes captured by the agent for a product (e.g.
 * `{ sizes: "S,M,L", gender: "unisex", expiry_date: "2026-01" }`). Keys are
 * snake_case strings; values are primitives. Null/absent when the agent did not
 * capture any — the UI renders nothing in that case.
 */
export type ProductAttributes = Record<string, string | number | boolean>

export interface SourcingRequestView {
  lead_id?: string
  product: string
  quantity?: number | null
  unit?: string
  delivery_location?: string
  recurring?: boolean
  budget?: number | null
  /** Free-form product attributes (agent-v2). May be null/absent. */
  attributes?: ProductAttributes | null
  /**
   * Full multi-product line-item list (openapi SourcingRequest.items). Empty or
   * absent for a legacy single-product request written before line items
   * existed — fall back to the scalar product/quantity/unit in that case.
   */
  items?: SourcingLineItem[]
}

/**
 * ListingDetailView mirrors openapi ListingDetailView: the FULL PalletClearance
 * SELLER lot embedded in a LeadDetail (populated for a SELL lead; absent
 * otherwise). `category` is the resolved category name when known, else empty;
 * `unit` has no listings column yet (collected conversationally, always empty);
 * `quantity`/`expiry`/`target_price` are nullable on the wire. `photo_count`
 * counts attached seller photos; `documents` lists document descriptors.
 */
export interface ListingDetailView {
  id: string
  stock_type: string
  food_non_food: string
  category?: string
  quantity?: number | null
  unit?: string
  location?: string
  country?: string
  expiry?: string | null
  target_price?: number | null
  status: string
  documents?: string[]
  photo_count: number
  created_at: string
  /** Free-form product attributes (agent-v2). May be null/absent. */
  attributes?: ProductAttributes | null
}

/**
 * BuyerProfileView mirrors openapi BuyerProfileView: the PalletClearance BUYER
 * standing-demand profile embedded in a LeadDetail (populated for a
 * palletclearance/buy lead whose company has a profile; absent otherwise).
 * Company-scoped. `categories` holds resolved category names (may be empty);
 * `volume` has no column yet (collected conversationally, always empty).
 */
export interface BuyerProfileView {
  id: string
  categories?: string[]
  volume?: string
  countries?: string[]
  near_expiry_ok: boolean
  subscribed: boolean
  created_at: string
}

export interface CompanyVerificationView {
  source?: string
  vat_status?: string | null
  administrators?: string[]
  checked_at?: string
}

export interface LeadCompanyView {
  id: string
  name: string
  cui: string
  country: string
  reg_no?: string
  caen?: string
  vat_status?: string
  roles?: string[]
  verification?: CompanyVerificationView | null
}

export interface LeadContactView {
  id?: string
  name: string
  phone: string
  email: string
}

/**
 * LeadSibling mirrors domain.LeadSibling / openapi LeadSibling: a compact handle
 * on ANOTHER request (lead) of the same client conversation (migration 036),
 * embedded in a LeadDetail so the dashboard can list a client's other requests
 * and deep-link to them. `product` is best-effort from the typed sourcing
 * request; `active` flags the conversation's currently-focused request
 * (conversations.active_lead_id).
 */
export interface LeadSibling {
  id: string
  seq?: number | null
  vertical: string
  intent: string
  status: string
  product?: string
  active: boolean
}

export interface AuthedLeadDetail extends LeadSummary {
  address?: string
  county?: string
  phone?: string
  email?: string
  intent?: string
  /**
   * Primary contact's display name / role, projected onto the lead detail
   * (agent-v2). Both are null/absent when unknown; the detail header hides the
   * line gracefully in that case. `contact_name` also mirrors LeadSummary.
   */
  contact_name?: string | null
  contact_role?: string | null
  summary?: string
  /**
   * Parent conversation of this lead (openapi LeadDetail.conversation_id). Each
   * transcript message carries lead_id so a multi-request conversation can be
   * grouped per request in the UI.
   */
  conversation_id: string
  /**
   * The OTHER requests (leads) of the same conversation (openapi
   * LeadDetail.sibling_requests). Excludes this lead; the conversation's active
   * request is flagged `active`. Empty when the thread holds only this request.
   */
  sibling_requests: LeadSibling[]
  /**
   * Derived lead quality score 0..100 (openapi LeadDetail.quality_score). Set at
   * submit from verified-company / valid-CUI / completeness / plausible-quantity
   * signals. Null/absent when the lead has not been scored yet.
   */
  quality_score?: number | null
  /**
   * The FULL conversation thread (every message, all roles, chronological) — not
   * just this request's slice. Each item carries lead_id so the UI can group a
   * multi-request conversation per request; pre-submission turns have no lead_id.
   */
  transcript: TranscriptMessage[]
  /**
   * The lead's typed request. Exactly ONE of sourcing_request / listing /
   * buyer_profile is populated per lead, selected by vertical/intent
   * (Angrosist buyer → sourcing_request; PalletClearance sell → listing;
   * PalletClearance buy → buyer_profile); the others are absent.
   */
  sourcing_request?: SourcingRequestView | null
  /** PalletClearance SELLER lot — populated for a SELL lead, absent otherwise. */
  listing?: ListingDetailView | null
  /** PalletClearance BUYER standing-demand profile — populated for a PC buy lead. */
  buyer_profile?: BuyerProfileView | null
  company?: LeadCompanyView | null
  contact?: LeadContactView | null
  /**
   * Whether the buyer opted in (via the agent) to join the WhatsApp "offers"
   * group. Detail-only projection; when true the header shows a "wants group"
   * badge and {@link group_interests} lists what they're after.
   */
  wants_group_invite?: boolean
  /** Free-text interests the buyer expressed for the offers group. */
  group_interests?: string[]
}

export async function getLeadDetail(id: string): Promise<AuthedLeadDetail> {
  return authedFetch<AuthedLeadDetail>(`/leads/${encodeURIComponent(id)}`)
}

/** One audit-log row for a lead (openapi ActivityLog). */
export interface ActivityEntry {
  actor_type: string
  actor_id?: string
  action: string
  entity_type?: string
  entity_id?: string
  meta?: Record<string, unknown>
  at: string
}

/** The lead's audit-log timeline, newest first. */
export async function getLeadActivity(id: string): Promise<ActivityEntry[]> {
  const res = await authedFetch<{ data: ActivityEntry[] }>(
    `/leads/${encodeURIComponent(id)}/activity`,
  )
  return res.data ?? []
}

// --- Offer tracking + assignment ------------------------------------------

export interface OfferUpdate {
  status?: string
  value?: number
  note?: string
  /**
   * Lead-level follow-up reminder timestamp (leads.follow_up_at). RFC3339 string
   * schedules the reminder; `null` clears it; omitting the key leaves it
   * unchanged (openapi PATCH /leads/{id}/offer). The reminder cron reads it.
   */
  follow_up_at?: string | null
}

export async function updateOffer(
  id: string,
  body: OfferUpdate,
): Promise<LeadSummary> {
  return authedFetch<LeadSummary>(`/leads/${encodeURIComponent(id)}/offer`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function assignLead(
  id: string,
  userId: string | null,
): Promise<LeadSummary> {
  return authedFetch<LeadSummary>(`/leads/${encodeURIComponent(id)}/assign`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  })
}

/**
 * Re-activates the automated agent on a handed-off (bot-muted) conversation
 * (`POST /api/leads/{id}/resume-bot`). Staff-authenticated, no request body;
 * the backend answers `204 No Content` on success and is idempotent (resuming
 * an already-active lead is a no-op). A missing lead surfaces as a `404`
 * {@link ApiError}. After it resolves the caller should invalidate the lead
 * detail / handoff-queue queries so `needs_human` clears in the UI.
 */
export async function resumeBot(leadId: string): Promise<void> {
  await authedFetch<void>(`/leads/${encodeURIComponent(leadId)}/resume-bot`, {
    method: 'POST',
  })
}

// --- Conversation takeover (human two-way) --------------------------------

/**
 * One message of a conversation transcript for the human-takeover panel
 * (`GET /api/conversations/{id}/messages`). `role` is `user` (the customer),
 * `assistant` (the bot, "Bogdan") or `human` (a staff reply). Rendered as plain
 * text — content is user-supplied and never trusted as markup.
 */
export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant' | 'human'
  content: string
  created_at: string
}

/**
 * Full transcript of a conversation, oldest→newest, for the staff takeover
 * panel. Unwraps the `{data:[...]}` envelope like the other list endpoints.
 */
export async function getConversationMessages(
  conversationId: string,
): Promise<ConversationMessage[]> {
  const res = await authedFetch<{ data: ConversationMessage[] }>(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
  )
  return res.data ?? []
}

/**
 * Records a HUMAN reply on a conversation (`POST /api/conversations/{id}/messages`).
 * On the first send the backend mutes the bot (takeover) and delivers the text to
 * the customer over their channel; the returned `delivered` flag reports whether
 * the channel delivery succeeded. Empty or over-long (>4000) text is rejected by
 * the backend with a `400` surfaced as an {@link ApiError}.
 */
export async function sendHumanMessage(
  conversationId: string,
  text: string,
): Promise<{ delivered: boolean }> {
  return authedFetch<{ delivered: boolean }>(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
    { method: 'POST', body: JSON.stringify({ text }) },
  )
}

// --- Users (admin; degrades gracefully on 403) ----------------------------

export interface PublicUser {
  id: string
  email: string
  name: string
  role: UserRole
  active: boolean
}

export async function listUsers(): Promise<PublicUser[]> {
  return authedFetch<PublicUser[]>('/users')
}

/**
 * Create-user payload (POST /api/users, admin only). No password — the backend
 * emails the new user an invite; they sign in via the passwordless email-OTP
 * flow ({@link requestCode} / {@link verifyCode}).
 */
export interface UserCreate {
  email: string
  name: string
  role: UserRole
}

/** Create a staff/admin user (sends an invite email). Admin only; 409 on duplicate email. */
export async function createUser(body: UserCreate): Promise<PublicUser> {
  return authedFetch<PublicUser>('/users', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/** Partial user update (PATCH /api/users/{id}, admin only). */
export interface UserUpdate {
  name?: string
  role?: UserRole
  active?: boolean
}

/** Update a user's name/role/active flag. Admin only. */
export async function updateUser(
  id: string,
  body: UserUpdate,
): Promise<PublicUser> {
  return authedFetch<PublicUser>(`/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

/** GDPR erasure report (counts of what was removed/redacted; openapi ErasureReport). */
export interface ErasureReport {
  contact_id: string
  leads_deleted: number
  conversations_deleted: number
  messages_deleted: number
  sourcing_requests_deleted: number
  listings_deleted: number
  consents_deleted: number
  documents_deleted: number
  blobs_deleted: number
  blobs_failed: number
  audit_rows_redacted: number
}

/**
 * Run a GDPR data-subject erasure by email or contact id (admin only). Cascades
 * across the personal graph and returns the counts removed/redacted.
 */
export async function requestErasure(body: {
  email?: string
  contact_id?: string
}): Promise<ErasureReport> {
  return authedFetch<ErasureReport>('/gdpr/erasure', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// --- B2B directory (companies) --------------------------------------------

export type CompanyRole =
  | 'distributor'
  | 'importer'
  | 'wholesaler'
  | 'retailer'
  | 'horeca'
  | 'processor'
  | 'producer'
  | 'buyer'
  | 'seller'

/** CompanySummary mirrors domain.CompanySummary / openapi Company. */
export interface CompanySummary {
  id: string
  name: string
  cui: string
  country: string
  reg_no: string
  caen: string
  vat_status: string
  roles: string[]
  created_at: string
}

export interface CompanyListPage {
  data: CompanySummary[]
  page: OffsetPageInfo
}

/** Whitelisted sort keys accepted by GET /api/companies (must match backend). */
export type CompanySortKey = 'name' | 'created_at'

export interface CompanyFilters {
  role?: string
  country?: string
  q?: string
  offset?: number
  limit?: number
  sort?: CompanySortKey
  dir?: SortDir
}

export async function listCompanies(
  filters: CompanyFilters,
): Promise<CompanyListPage> {
  const params = new URLSearchParams()
  if (filters.role) params.set('role', filters.role)
  if (filters.country) params.set('country', filters.country)
  if (filters.q) params.set('q', filters.q)
  if (filters.offset) params.set('offset', String(filters.offset))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.sort) params.set('sort', filters.sort)
  if (filters.dir) params.set('dir', filters.dir)
  const qs = params.toString()
  return authedFetch<CompanyListPage>(`/companies${qs ? `?${qs}` : ''}`)
}

/** Distinct roles + countries present in the directory (for the filter pickers). */
export interface CompanyFacets {
  roles: string[]
  countries: string[]
}

export async function getCompanyFacets(): Promise<CompanyFacets> {
  return authedFetch<CompanyFacets>('/companies/facets')
}

/** Staff manual role override. Unknown values are dropped server-side. */
export async function updateCompanyRoles(
  id: string,
  roles: string[],
): Promise<CompanySummary> {
  return authedFetch<CompanySummary>(
    `/companies/${encodeURIComponent(id)}/roles`,
    { method: 'PATCH', body: JSON.stringify({ roles }) },
  )
}

/**
 * CompanyFinancialView mirrors domain.CompanyFinancialView. One year's snapshot.
 * turnover/net_profit/employees are nullable on the wire = "not reported".
 * Newest-first as returned by the backend.
 */
export interface CompanyFinancialView {
  year: number
  turnover: number | null
  net_profit: number | null
  employees: number | null
  caen_description?: string
}

/**
 * An administrator may arrive as a bare name string or as an object carrying a
 * `name` field — the UI normalizes both (see administratorName()).
 */
export type CompanyAdministrator = string | { name?: string }

/** CompanyDetail mirrors domain.CompanyDetail / openapi CompanyDetail. */
export interface CompanyDetail extends CompanySummary {
  address?: string
  county?: string
  /** ONRC J-number (e.g. "J40/372/2002"); may be absent. */
  registration_number?: string
  /** Incorporation date (ISO); null/absent when unknown. */
  registration_date?: string | null
  /** Legal form (SA / SRL / ...). */
  legal_form?: string
  /** e-Factura (e-invoicing) registration flag. */
  e_factura?: boolean
  /** All permitted activity codes when available. */
  authorized_caen?: string[]
  /** Administrator names (string[] or object[] — normalize before display). */
  administrators?: CompanyAdministrator[]
  is_active?: boolean
  verification?: CompanyVerificationView | null
  financials?: CompanyFinancialView[]
  /** True = VAT registered, false = not registered (mirrors demoanaf TVA card). */
  vat_registered?: boolean
  /** Whether the entity applies the Split VAT mechanism. */
  split_vat?: boolean
  /** "TVA la încasare" — cash-basis VAT accounting. */
  cash_basis_vat?: boolean
  /** ONRC status label, e.g. "Funcțiune". */
  onrc_status_label?: string
  /** Raw fiscal state string, e.g. "TRANSFER(SOSIRE) din data 26.11.2025". */
  registration_state?: string
  /** "Organ fiscal" — e.g. "Unitatea Fiscală Orășenească Pucioasa". */
  fiscal_authority?: string
  /** Postal code. */
  postal_code?: string
  /** Drives the Date Financiare section state. */
  financials_status?: 'pending' | 'ready' | 'none'
}

/** Normalizes an administrator entry (string or {name}) to a display string. */
export function administratorName(a: CompanyAdministrator): string {
  return typeof a === 'string' ? a : (a?.name ?? '')
}

export async function getCompany(id: string): Promise<CompanyDetail> {
  return authedFetch<CompanyDetail>(`/companies/${encodeURIComponent(id)}`)
}

// --- Handoff queue ---------------------------------------------------------

/** HandoffItem mirrors domain.HandoffItem / openapi HandoffItem. */
export interface HandoffItem {
  id: string
  status: string
  vertical: string
  company_name: string
  product_name: string
  assigned_to: string | null
  last_message: string
  created_at: string
}

export interface HandoffListPage {
  data: HandoffItem[]
  page: PageInfo
}

export async function listHandoffs(): Promise<HandoffListPage> {
  return authedFetch<HandoffListPage>('/handoffs')
}

// --- Group-invite worklist (WhatsApp "offers" group opt-ins) ---------------

/**
 * GroupInviteRequest mirrors the backend group-invite worklist row: a buyer who
 * opted in (via the agent) to join the WhatsApp "offers" group and has NOT yet
 * been added by staff. The list returns only PENDING requests, newest first;
 * PATCHing `added` drops the contact off the list.
 */
export interface GroupInviteRequest {
  contact_id: string
  contact_name: string
  company_name: string
  phone?: string
  vertical?: string
  interests: string[]
  note?: string
  asked_at: string
  lead_id?: string
}

/** Pending group-join requests (staff-auth), newest first. */
export async function listGroupInviteRequests(): Promise<GroupInviteRequest[]> {
  const res = await authedFetch<{ data: GroupInviteRequest[] }>('/group-invites')
  return res.data ?? []
}

/**
 * Mark a contact as manually added to the offers group. The row then drops off
 * the pending worklist; the caller should invalidate ['group-invites'].
 */
export async function markGroupAdded(contactId: string): Promise<void> {
  await authedFetch(`/group-invites/${encodeURIComponent(contactId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ added: true }),
  })
}

// --- Newsletter opt-in worklist (email newsletter opt-ins) ----------------

/**
 * NewsletterOptIn mirrors the backend newsletter worklist row: a buyer who
 * opted in (via the agent) to the email newsletter and has NOT yet been
 * exported to the mailing tool. The list returns only PENDING opt-ins, newest
 * first; PATCHing `exported` drops the contact off the list. `email` is the
 * export destination staff copy into the mailing tool (personal data —
 * staff-only screen).
 */
export interface NewsletterOptIn {
  contact_id: string
  contact_name: string
  company_name: string
  email: string
  vertical: string
  asked_at: string
  lead_id: string
}

/** Pending newsletter opt-ins (staff-auth), newest first. */
export async function listNewsletterOptIns(): Promise<NewsletterOptIn[]> {
  const res = await authedFetch<{ data: NewsletterOptIn[] }>('/newsletter')
  return res.data ?? []
}

/**
 * Mark a contact's newsletter opt-in as exported to the mailing tool. The row
 * then drops off the pending worklist; the caller should invalidate
 * ['newsletter'].
 */
export async function markNewsletterExported(contactId: string): Promise<void> {
  await authedFetch(`/newsletter/${encodeURIComponent(contactId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ exported: true }),
  })
}

// --- Offer senders (supplier registry, Module G / G0, staff-auth) ----------

/**
 * Vertical an offer sender's mail is routed to. `angrosist` offers are the
 * redistributable ones (they get the copyable WhatsApp preview);
 * `palletclearance` offers are dashboard-only (confidential). An empty string
 * means "any / unset" — the sender is not pinned to a vertical.
 */
export type OfferSenderVertical = 'angrosist' | 'palletclearance' | ''

/**
 * SupplierSender mirrors the backend `offer_senders` row (Module G §0): a
 * whitelisted supplier email offers are accepted from, tagged with product
 * categories + a vertical. The tags act as a filter (only whitelisted senders
 * are ingested) AND a router (they tell the admin which WhatsApp group an offer
 * belongs to). `email` is personal data — staff-only screen, never logged.
 */
export interface SupplierSender {
  id: string
  email: string
  name: string
  tags: string[]
  vertical: OfferSenderVertical
  active: boolean
  notes: string
  created_at: string
  updated_at: string
}

/** Editable fields of a SupplierSender — the body of create/update. */
export interface SupplierSenderInput {
  email: string
  name?: string
  tags: string[]
  vertical?: OfferSenderVertical
  active?: boolean
  notes?: string
}

/**
 * Lists the supplier offer-sender registry (staff-auth). Pass `active: true` to
 * fetch only enabled senders; omit it for the full list. Unwraps the
 * `{data:[...]}` envelope like the other list endpoints.
 */
export async function listOfferSenders(
  opts?: { active?: boolean },
): Promise<SupplierSender[]> {
  const qs = opts?.active ? '?active=true' : ''
  const res = await authedFetch<{ data: SupplierSender[] }>(
    `/offer-senders${qs}`,
  )
  return res.data ?? []
}

/**
 * Registers a new supplier sender (staff-auth). Returns `201` + the created row;
 * a duplicate email yields `409` surfaced as an {@link ApiError} the UI maps to a
 * friendly toast.
 */
export async function createOfferSender(
  body: SupplierSenderInput,
): Promise<SupplierSender> {
  return authedFetch<SupplierSender>('/offer-senders', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * Updates a supplier sender (staff-auth). PATCH is a FULL REPLACE of the editable
 * fields (`name, tags, vertical, active, notes`) — the caller must submit the
 * WHOLE row (including the current `active` value), not just the changed keys.
 */
export async function updateOfferSender(
  id: string,
  body: SupplierSenderInput,
): Promise<SupplierSender> {
  return authedFetch<SupplierSender>(
    `/offer-senders/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  )
}

/** Removes a supplier sender from the registry (staff-auth). 204 on success. */
export async function deleteOfferSender(id: string): Promise<void> {
  await authedFetch<void>(`/offer-senders/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

// --- Supplier offers (Module G / G4+G5 review, staff-auth) -----------------

/**
 * Vertical an ingested offer batch belongs to (from its intake mailbox, Module G
 * §0.7). `angrosist` batches are redistributable — they get the copyable
 * WhatsApp preview; `palletclearance` batches are confidential (dashboard-only,
 * no WhatsApp broadcast).
 */
export type OfferVertical = 'angrosist' | 'palletclearance'

/**
 * Lifecycle of one ingested supplier email (offer_batches.status, Module G §3):
 * `received` → `parsing` → `parsed` (ready for review) → `reviewed`; `sent` once
 * an Angrosist batch has been posted to WhatsApp; `error` on a parse failure.
 */
export type OfferBatchStatus =
  | 'received'
  | 'parsing'
  | 'parsed'
  | 'error'
  | 'reviewed'
  | 'sent'

/** Review state of one parsed product line (offer_items.status). */
export type OfferItemStatus = 'draft' | 'approved' | 'rejected'

/**
 * OfferBatch mirrors the backend `offer_batches` row (Module G §3): one ingested
 * supplier email surfaced in the review worklist. `supplier_email` is personal
 * data — staff-only screen, never logged. `error` carries a parse-failure detail
 * (no PII); `item_count` is the denormalized parsed-line count.
 */
export interface OfferBatch {
  id: string
  supplier_email: string
  supplier_name: string
  subject: string
  vertical: OfferVertical
  status: OfferBatchStatus
  item_count: number
  error: string
  notes: string
  received_at: string
  created_at: string
  updated_at: string
}

/**
 * OfferItem mirrors the backend `offer_items` row (Module G §3): one standardized
 * product line the AI parsed out of a batch. `quantity`/`price`/`confidence` are
 * nullable on the wire (parser could not read them); `category_id` is the
 * resolved canonical taxonomy id (passthrough — edited via `category_text`).
 * `confidence` (0..1, parser self-assessment) drives review priority — the lowest
 * is surfaced first.
 */
export interface OfferItem {
  id: string
  batch_id: string
  product_name: string
  quantity: number | null
  unit: string
  price: number | null
  currency: string
  category_id: string
  category_text: string
  supplier: string
  status: OfferItemStatus
  confidence: number | null
  created_at: string
  updated_at: string
}

/** A batch plus its parsed items (`GET /api/offers/{batchId}`). */
export interface OfferBatchDetail {
  batch: OfferBatch
  items: OfferItem[]
}

/**
 * Editable fields of an OfferItem — the body of `PATCH /api/offers/items/{id}`.
 * The PATCH is a FULL REPLACE: the caller must submit the WHOLE row (including
 * the fields it is not changing), not just the changed keys.
 */
export interface OfferItemInput {
  product_name: string
  quantity: number | null
  unit: string
  price: number | null
  currency: string
  category_id: string
  category_text: string
  supplier: string
  status: OfferItemStatus
}

/** Batch-level edit (`PATCH /api/offers/{batchId}`): admin note and/or status. */
export interface OfferBatchUpdate {
  notes?: string
  status?: OfferBatchStatus
}

/**
 * Formatted WhatsApp preview for an Angrosist batch (`GET
 * /api/offers/{batchId}/whatsapp`): the copyable `text` staff paste into the
 * offers group, the `suggested_group` (from the sender tags), the item count and
 * an optional `hint`. Rendered as plain text — never as markup.
 */
export interface OfferWhatsAppPreview {
  text: string
  vertical: string
  suggested_group: string
  item_count: number
  hint?: string
}

/**
 * Result of requesting a batch's WhatsApp preview. A PalletClearance batch is
 * confidential (PC is never publicly redistributed) — the backend answers `409`
 * for it, which we surface as a typed `{ confidential: true }` result (NOT a
 * thrown error), so the dialog shows the "dashboard-only" note instead of an
 * error toast.
 */
export type OfferWhatsAppResult =
  | { confidential: false; preview: OfferWhatsAppPreview }
  | { confidential: true }

export interface OfferBatchFilters {
  status?: string
  vertical?: string
}

/**
 * Lists the supplier offer-batch worklist (staff-auth), newest first. Optional
 * `status`/`vertical` narrow it (e.g. `status=parsed` = "needs review"). Unwraps
 * the `{data:[...]}` envelope like the other list endpoints.
 */
export async function listOfferBatches(
  filters: OfferBatchFilters = {},
): Promise<OfferBatch[]> {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.vertical) params.set('vertical', filters.vertical)
  const qs = params.toString()
  const res = await authedFetch<{ data: OfferBatch[] }>(
    `/offers${qs ? `?${qs}` : ''}`,
  )
  return res.data ?? []
}

/** A batch + its parsed items for the review screen (staff-auth). */
export async function getOfferBatch(id: string): Promise<OfferBatchDetail> {
  return authedFetch<OfferBatchDetail>(`/offers/${encodeURIComponent(id)}`)
}

/**
 * Edits / approves / rejects one parsed offer item (staff-auth). The PATCH is a
 * FULL REPLACE — the caller submits the whole row (see {@link OfferItemInput}).
 */
export async function updateOfferItem(
  id: string,
  body: OfferItemInput,
): Promise<OfferItem> {
  return authedFetch<OfferItem>(`/offers/items/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

/** Updates a batch note and/or moves its status (e.g. to `reviewed`). Staff-auth. */
export async function updateOfferBatch(
  id: string,
  body: OfferBatchUpdate,
): Promise<OfferBatch> {
  return authedFetch<OfferBatch>(`/offers/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

/**
 * Fetches a batch's WhatsApp preview (staff-auth). A PalletClearance batch is
 * confidential: the backend returns `409` — we catch that and return a typed
 * `{ confidential: true }` result instead of throwing, so the caller renders the
 * "dashboard-only" state rather than an error. Any other non-2xx still throws.
 */
export async function getOfferWhatsApp(
  id: string,
): Promise<OfferWhatsAppResult> {
  try {
    const preview = await authedFetch<OfferWhatsAppPreview>(
      `/offers/${encodeURIComponent(id)}/whatsapp`,
    )
    return { confidential: false, preview }
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      return { confidential: true }
    }
    throw err
  }
}

// --- Inventory / listings (PalletClearance, cursor-paginated) -------------

/**
 * Listing status values (listings.status). 'active' is the seller-live default;
 * the rest are staff/lifecycle transitions. Mirrors the DDL doc'd set.
 */
export type ListingStatus =
  'active' | 'reserved' | 'sold' | 'expired' | 'withdrawn'

/** food / non_food classification (listings.food_non_food). */
export type FoodNonFood = 'food' | 'non_food'

/**
 * ListingView mirrors domain.ListingView (openapi ListingView): the stock-
 * inventory dashboard projection — the listing facets staff triage plus the
 * joined seller company name, resolved category, and seller photo count.
 * `unit` is currently always empty (no listings.unit column yet); quantity /
 * target_price / expiry are nullable on the wire.
 */
export interface ListingView {
  id: string
  lead_id: string
  company_id: string
  company_name: string
  category: string
  stock_type: string
  food_non_food: string
  quantity: number | null
  unit: string
  location: string
  country: string
  expiry: string | null
  target_price: number | null
  status: string
  photo_count: number
  created_at: string
}

/** Cursor-paginated inventory page — same envelope as the handoff queue. */
export interface ListingListPage {
  data: ListingView[]
  page: PageInfo
}

export interface ListingFilters {
  status?: string
  stock_type?: string
  food_non_food?: string
  country?: string
  /**
   * Resolved canonical taxonomy id (listings.category_id) to drill the inventory
   * into one category — the id comes from {@link listCategories}. Empty = no
   * filter.
   */
  category_id?: string
  q?: string
  limit?: number
  cursor?: string
}

/**
 * Fetches one keyset page of the PalletClearance stock inventory. Filters are
 * exact-match (status/stock_type/food_non_food/country/category_id) plus an ILIKE
 * `q`; the next page is requested by passing back `page.next_cursor`. Mirrors the
 * handoff queue's cursor envelope.
 */
export async function listListings(
  filters: ListingFilters,
): Promise<ListingListPage> {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.stock_type) params.set('stock_type', filters.stock_type)
  if (filters.food_non_food) params.set('food_non_food', filters.food_non_food)
  if (filters.country) params.set('country', filters.country)
  if (filters.category_id) params.set('category_id', filters.category_id)
  if (filters.q) params.set('q', filters.q)
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.cursor) params.set('cursor', filters.cursor)
  const qs = params.toString()
  return authedFetch<ListingListPage>(`/listings${qs ? `?${qs}` : ''}`)
}

// --- Categories (shared taxonomy) ------------------------------------------

/**
 * Category status. Extensible (validated, not a closed set): 'active' is a
 * curated/confident canonical category; 'unreviewed' is auto-created below the
 * resolver confidence floor and awaits staff curation. Widened to `string` so a
 * future status the backend adds does not break the type.
 */
export type CategoryStatus = 'active' | 'unreviewed' | (string & {})

/**
 * Category mirrors domain.CategoryNode / openapi CategoryNode: one canonical
 * taxonomy node plus its live reference `count`. The list is FLAT — each node
 * carries `parent_id` (empty = root) so the dashboard assembles the tree
 * client-side and can render "Dairy (12)".
 */
export interface Category {
  id: string
  /** Parent category id; empty string for a top-level root. */
  parent_id: string
  name: string
  /** Stable unique slug. */
  code: string
  status: CategoryStatus
  sort_order: number
  /** Records (listings + sourcing_requests + buyer_profiles) referencing this id. */
  count: number
}

/**
 * Fetches the full shared taxonomy with per-category live counts, ordered by
 * sort_order then name (GET /api/categories). Returns the flat node list; the
 * caller builds the tree from `parent_id`.
 */
export async function listCategories(): Promise<Category[]> {
  const res = await authedFetch<{ categories: Category[] }>('/categories')
  return res.categories ?? []
}

/**
 * Merges one category into another (POST /api/categories/merge, ADMIN only).
 * Repoints every reference from `fromId` onto `intoId` and deletes the emptied
 * `fromId` category, returning the total references moved. The two ids must
 * differ (else the backend returns 400 VALIDATION_FAILED); a missing category
 * yields 404 — both surfaced as a thrown {@link ApiError}.
 */
export async function mergeCategories(
  fromId: string,
  intoId: string,
): Promise<{ moved: number }> {
  return authedFetch<{ moved: number }>('/categories/merge', {
    method: 'POST',
    body: JSON.stringify({ from_id: fromId, into_id: intoId }),
  })
}

/** One seller photo with a time-limited signed download URL (openapi PhotoView). */
export interface LeadPhoto {
  id: string
  url: string
  mime?: string
}

/**
 * Seller photos for a PalletClearance listing — signed, time-limited URLs the
 * dashboard renders as a gallery. `listingId` is the lead detail's `listing.id`.
 */
export async function listListingPhotos(listingId: string): Promise<LeadPhoto[]> {
  const res = await authedFetch<{ photos: LeadPhoto[] }>(
    `/listings/${encodeURIComponent(listingId)}/photos`,
  )
  return res.photos ?? []
}

// --- KPIs ------------------------------------------------------------------

/** One bucket of a KPI breakdown (a label + its row count). openapi LabelCount. */
export interface LabelCount {
  label: string
  count: number
}

/**
 * Kpis mirrors domain.KPIs / openapi Kpis. Headline scalars plus the breakdown
 * arrays (each a `LabelCount[]`, never null). `avg_first_response_seconds` is the
 * mean first-response latency over the last 90 days, or null when there is none.
 */
export interface Kpis {
  total_leads: number
  offers_sent: number
  won: number
  qualified: number
  conversion_rate: number
  pipeline_value: number
  by_source: LabelCount[]
  by_vertical: LabelCount[]
  by_intent: LabelCount[]
  by_language: LabelCount[]
  by_country: LabelCount[]
  top_categories: LabelCount[]
  delivery_locations: LabelCount[]
  origin_countries: LabelCount[]
  avg_first_response_seconds: number | null
  /**
   * AI-quality ratios (0..1), computed from `analytics_events` (KPI_PLAN §3).
   * Each is null until enough events exist to compute it; the UI renders "—"
   * for null (never a misleading 0%). `extraction_completeness` = share of
   * expected fields the agent captured; `anaf_success_rate` = successful ANAF
   * verifications / attempts; `escalation_rate` = handed-off / total sessions.
   */
  extraction_completeness: number | null
  anaf_success_rate: number | null
  escalation_rate: number | null
}

export async function getKpis(): Promise<Kpis> {
  return authedFetch<Kpis>('/kpis')
}

// --- KPI action boards (KPI_PLAN §E.2) -------------------------------------

/**
 * LeadRef is the compact lead handle listed on the action boards (openapi
 * LeadRef). `hours_since_created` is server-computed age in hours; the UI
 * deep-links each row to the lead detail via `id`.
 */
export interface LeadRef {
  id: string
  company_name: string
  product_name: string
  status: string
  created_at: string
  hours_since_created: number
}

/** `GET /api/kpis/today-angrosist` — the "Today – Angrosist" action board. */
export interface TodayAngrosist {
  qualified_today: number
  qualified_leads: LeadRef[]
  offers_to_send: LeadRef[]
  orders_confirmed_today: number
  alerts: LeadRef[]
}

export async function getTodayAngrosist(): Promise<TodayAngrosist> {
  return authedFetch<TodayAngrosist>('/kpis/today-angrosist')
}

/** One aging bucket of the Clearance stock (a label + its listing count). */
export interface AgingBucket {
  label: string
  count: number
}

/** Lower-funnel metrics for the "Portfolio – Clearance" board. */
export interface ClearanceFunnel {
  sellers_registered: number
  stock_completeness: number | null
  active_buyers: number
  match_rate: number | null
  avg_days_to_place: number | null
  recurring_buyers_pct: number | null
}

/** `GET /api/kpis/portfolio-clearance` — the "Portfolio – Clearance" board. */
export interface PortfolioClearance {
  active_listings: number
  active_listings_value: number
  aging_buckets: AgingBucket[]
  active_buyers: number
  active_buyers_target: number | null
  funnel: ClearanceFunnel
}

export async function getPortfolioClearance(): Promise<PortfolioClearance> {
  return authedFetch<PortfolioClearance>('/kpis/portfolio-clearance')
}

/** `GET /api/kpis/month` — the "This month" (all-verticals) board. */
export interface MonthKpis {
  qualified_this_month: number
  qualified_monthly_target: number | null
  gross_turnover: number | null
  vat_cap_ron: number | null
  margin_revenue: number | null
  margin_revenue_plan_ron: number | null
  top5_client_concentration: number | null
}

export async function getMonthKpis(): Promise<MonthKpis> {
  return authedFetch<MonthKpis>('/kpis/month')
}

/** `GET /api/kpis/platform-health` — the "Platform health" board. */
export interface PlatformHealth {
  open_incidents: number
  closed_incidents: number
  last_backup_at: string | null
  last_restore_test_at: string | null
  /** Always null — uptime is measured externally (see `monitoring_note`). */
  uptime_percent: number | null
  /** Always null — error rate is measured externally (see `monitoring_note`). */
  api_error_percent: number | null
  monitoring_note: string
}

export async function getPlatformHealth(): Promise<PlatformHealth> {
  return authedFetch<PlatformHealth>('/kpis/platform-health')
}

// --- KPI settings (runtime targets + alert thresholds, admin-only) ---------

/**
 * Wire type of one KPI setting, telling the UI how to render/validate it:
 * `int` (whole number), `number` (decimal), `ratio` (0..1 — rendered as a
 * percent), `url` (optional valid URL).
 */
export type KpiSettingType = 'int' | 'number' | 'ratio' | 'url'

/**
 * KpiSetting mirrors one row of `GET /api/kpis/settings`: the runtime override
 * for a KPI target / alert threshold that used to be env-var only. `value` is
 * the current DB override (null when none is set), `default` is the env
 * fallback (shown as the input placeholder), `effective` is what actually
 * applies now (`value ?? default`). All three are strings on the wire; the UI
 * parses them per `type`.
 */
export interface KpiSetting {
  key: string
  type: KpiSettingType
  value: string | null
  default: string | null
  effective: string | null
}

/**
 * Fetches the editable KPI targets + alert thresholds (admin-only on the
 * backend). Returns the flat setting list; the settings page groups them by key.
 */
export async function getKpiSettings(): Promise<KpiSetting[]> {
  const res = await authedFetch<{ settings: KpiSetting[] }>('/kpis/settings')
  return res.settings ?? []
}

/**
 * Persists KPI setting overrides (admin-only). The body is a FLAT object of
 * ONLY the changed keys (`{ [key]: string }`); sending `""` for a key CLEARS its
 * override (reverts to the env default). Returns the same shape as
 * {@link getKpiSettings} (the full, updated list).
 */
export async function putKpiSettings(
  partial: Record<string, string>,
): Promise<KpiSetting[]> {
  const res = await authedFetch<{ settings: KpiSetting[] }>('/kpis/settings', {
    method: 'PUT',
    body: JSON.stringify(partial),
  })
  return res.settings ?? []
}

// --- Manual commercial + financial entry (KPI_PLAN §B/§C) ------------------

export type TransactionVertical = 'angrosist' | 'palletclearance'
export type TransactionStage = 'offer' | 'order' | 'delivery' | 'paid'
export type MarginType = 'intermediation' | 'resale'

/**
 * TransactionCreate mirrors `POST /api/transactions`: one manual commercial
 * data point feeding the §B lower funnel + §C margin/turnover KPIs. `vertical`,
 * `stage` and `is_recurring` are required; money/margin/company/on-time fields
 * are optional and omitted when left blank.
 */
export interface TransactionCreate {
  lead_id?: string
  vertical: TransactionVertical
  stage: TransactionStage
  value_eur?: number
  cost_eur?: number
  margin_type?: MarginType
  client_company_id?: string
  is_recurring: boolean
  delivered_on_time?: boolean
}

/** Records a manual transaction. 201 on success. */
export async function createTransaction(
  body: TransactionCreate,
): Promise<void> {
  await authedFetch<void>('/transactions', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * FinancialInputs mirrors `PUT /api/financial-inputs`: the pure §C.2 accounting
 * row for one month (upsert keyed by `period_month`, `"YYYY-MM"`). Every money
 * field is optional and omitted when left blank.
 */
export interface FinancialInputs {
  period_month: string
  gross_turnover?: number
  margin_revenue?: number
  cash_in?: number
  cash_out?: number
  marketing_spend?: number
  maintenance_cost?: number
  opex?: number
}

/** Upserts one month's financial inputs. 200 on success. */
export async function putFinancialInputs(
  body: FinancialInputs,
): Promise<void> {
  await authedFetch<void>('/financial-inputs', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
}

// --- CSV export (KPI_PLAN §E.3) --------------------------------------------

export type ExportType = 'events' | 'leads'

/**
 * Fetches a filtered CSV export (`GET /api/kpis/export`) as a Blob the caller
 * turns into a browser download. Carries the staff Bearer token like every
 * authed call; on 401 it clears the session + fires the unauthorized handler,
 * and surfaces any other non-2xx as an {@link ApiError}. `from`/`to` are
 * inclusive `YYYY-MM-DD` dates.
 */
export async function exportKpiCsv(
  type: ExportType,
  from: string,
  to: string,
): Promise<Blob> {
  const token = getStoredToken()
  const params = new URLSearchParams({ type, from, to })
  const res = await fetch(`${getApiBase()}/api/kpis/export?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })

  if (res.status === 401) {
    clearStoredAuth()
    onUnauthorized?.()
    throw new ApiError(
      401,
      'UNAUTHENTICATED',
      'Sesiune expirată. Autentifică-te din nou.',
    )
  }
  if (!res.ok) {
    throw new ApiError(res.status, 'INTERNAL', `Eroare ${res.status}`)
  }
  return res.blob()
}

// --- Tasks / follow-ups ----------------------------------------------------

export type TaskStatus = 'open' | 'done'

/** Task mirrors domain.Task / openapi Task. */
export interface Task {
  id: string
  lead_id?: string | null
  assigned_to?: string | null
  title: string
  note?: string
  status: TaskStatus
  due_at?: string | null
  created_by?: string | null
  created_at: string
  completed_at?: string | null
}

export interface TaskFilters {
  status?: TaskStatus
  /** User id; the sentinel '' (empty) filters for unassigned tasks. */
  assigned_to?: string
  lead_id?: string
}

export async function listTasks(filters: TaskFilters = {}): Promise<Task[]> {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  // The contract names the owner filter `assignee`; an empty value = unassigned.
  if (filters.assigned_to !== undefined)
    params.set('assignee', filters.assigned_to)
  if (filters.lead_id) params.set('lead_id', filters.lead_id)
  const qs = params.toString()
  const res = await authedFetch<{ data: Task[] }>(`/tasks${qs ? `?${qs}` : ''}`)
  return res.data
}

export interface TaskCreate {
  title: string
  note?: string
  lead_id?: string | null
  assigned_to?: string | null
  due_at?: string | null
}

export async function createTask(body: TaskCreate): Promise<Task> {
  return authedFetch<Task>('/tasks', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export interface TaskUpdate {
  status?: TaskStatus
  note?: string
  /** RFC3339 to schedule, null to clear, omit to leave unchanged. */
  due_at?: string | null
  /** User id to assign, null to unassign, omit to leave unchanged. */
  assigned_to?: string | null
}

export async function updateTask(id: string, patch: TaskUpdate): Promise<Task> {
  return authedFetch<Task>(`/tasks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

// ---------------------------------------------------------------------------
// SSE: real-time agent replies + typing indicator (M2 Epic 2.3)
// ---------------------------------------------------------------------------

/** Payload delivered to `onMessage` — normalized from the Go-JSON `message` event. */
export interface StreamMessage {
  reply: string
  state: string
  /**
   * True when the conversation is finished (lead submitted, bot muted via
   * handoff, or a polite CUI stop) — the UI offers "continue vs start new" on the
   * next open. Absent on the wire is treated as `false` (still active).
   */
  ended?: boolean
  extracted: ExtractedFields
  /** Conversation's current flow — lets the UI react to a mid-chat re-route. */
  vertical?: string
  intent?: string
}

export interface StreamHandlers {
  /** Agent started working — show the typing indicator. */
  onTyping?: () => void
  /** Agent produced a reply — append it, update extracted fields, hide typing. */
  onMessage?: (msg: StreamMessage) => void
  /** Stream-level or agent error — show a friendly message, hide typing. */
  onError?: (message: string) => void
  /** EventSource connection opened — used to decide SSE-vs-POST de-dupe. */
  onOpen?: () => void
}

export interface StreamOptions {
  /**
   * Per-conversation ownership token. EventSource can't set request headers, so
   * it travels as a `&token=` query param. Required by the backend or the stream
   * 403s.
   */
  token?: string | null
  /** Custom EventSource factory (testing). Defaults to the global EventSource. */
  eventSourceFactory?: (url: string) => EventSource
}

/**
 * Shape of the backend SSE event payload. The wire format uses LOWERCASE json
 * tags (e.g. `{"type":"message","reply":"...","state":"qualifying"}`) — the
 * broker event struct sets explicit `json:"reply"` tags. We read the lowercase
 * keys (with a capitalized fallback for safety) so the reply is never dropped.
 */
interface StreamEventData {
  type?: string
  reply?: string
  state?: string
  /** Conversation-finished flag (see StreamMessage.ended); absent = false. */
  ended?: boolean
  extracted?: ExtractedFields | null
  error?: string
  vertical?: string
  intent?: string
  // Capitalized fallbacks (defensive; not what the backend currently emits).
  Reply?: string
  State?: string
  Extracted?: ExtractedFields | null
  Error?: string
}

/**
 * Opens an SSE subscription for a conversation and dispatches named events to
 * the provided handlers. Returns an unsubscribe function that closes the
 * EventSource. Heartbeat comments (`: ping`) are ignored by EventSource itself.
 */
export function subscribeToConversation(
  conversationId: string,
  handlers: StreamHandlers,
  options?: StreamOptions,
): () => void {
  const url =
    `${getApiBase()}/api/stream?conversation_id=${encodeURIComponent(
      conversationId,
    )}` + (options?.token ? `&token=${encodeURIComponent(options.token)}` : '')
  const es = options?.eventSourceFactory
    ? options.eventSourceFactory(url)
    : new EventSource(url)

  es.addEventListener('open', () => handlers.onOpen?.())

  es.addEventListener('typing', () => handlers.onTyping?.())

  es.addEventListener('message', (e) => {
    try {
      const data = JSON.parse((e as MessageEvent).data) as StreamEventData
      const err = data.error ?? data.Error
      if (err) {
        handlers.onError?.(err)
        return
      }
      handlers.onMessage?.({
        reply: data.reply ?? data.Reply ?? '',
        state: data.state ?? data.State ?? '',
        // Degrade gracefully if the backend hasn't shipped `ended` yet.
        ended: data.ended === true,
        extracted: data.extracted ?? data.Extracted ?? {},
        vertical: data.vertical,
        intent: data.intent,
      })
    } catch {
      handlers.onError?.('stream parse error')
    }
  })

  es.addEventListener('error', (e) => {
    // The native EventSource `error` event carries no JSON; the backend's
    // application-level `error` event does. Try to parse, else generic message.
    const raw = (e as MessageEvent).data
    if (typeof raw === 'string' && raw) {
      try {
        const data = JSON.parse(raw) as StreamEventData
        handlers.onError?.(data.error ?? data.Error ?? 'agent error')
        return
      } catch {
        /* fall through */
      }
    }
    handlers.onError?.('connection error')
  })

  return () => es.close()
}
