import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useAuth } from '@/auth/useAuth'
import {
  listGroupInviteRequests,
  markGroupAdded,
  listNewsletterOptIns,
  markNewsletterExported,
  listOfferSenders,
  createOfferSender,
  updateOfferSender,
  deleteOfferSender,
  listLeads,
  getLeadDetail,
  getLeadActivity,
  getConversationMessages,
  sendHumanMessage,
  listUsers,
  listCompanies,
  getCompany,
  getCompanyFacets,
  listHandoffs,
  listListings,
  listListingPhotos,
  listCategories,
  getKpis,
  getTodayAngrosist,
  getPortfolioClearance,
  getMonthKpis,
  getPlatformHealth,
  getKpiSettings,
  listTasks,
  ApiError,
  type LeadFilters,
  type CompanyFilters,
  type ListingFilters,
  type TaskFilters,
  type SupplierSenderInput,
} from '@/lib/api'

/** Paginated, filtered lead list. Filters/cursor come from the URL. */
export function useLeadsList(filters: LeadFilters) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: () => listLeads(filters),
    // Keep the previous page visible while the next loads (smooth pagination).
    placeholderData: (prev) => prev,
  })
}

/** Full lead detail (transcript + company + contact + offer). */
export function useLeadDetail(id: string) {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: () => getLeadDetail(id),
    enabled: !!id,
  })
}

/**
 * LIVE transcript for the human-takeover panel. Polls every 4s while the panel
 * is mounted so the staff member sees new CUSTOMER messages arrive; the poll
 * stops as soon as the panel unmounts. `enabled` is gated on a truthy
 * conversation id AND the caller's `opts.enabled` (default true) so we never
 * fire against an empty id or poll from a hidden panel.
 */
export function useConversationMessages(
  conversationId: string,
  opts?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['conversation-messages', conversationId],
    queryFn: () => getConversationMessages(conversationId),
    enabled: !!conversationId && (opts?.enabled ?? true),
    refetchInterval: 4000,
  })
}

/**
 * Send a HUMAN reply on a takeover conversation. On success it invalidates the
 * live transcript (so the new `human` bubble shows), the lead detail
 * (`['lead', leadId]` — the first send mutes the bot / sets needs_human) and the
 * handoff queue, mirroring the other lead mutations. Toast/error surfacing lives
 * in the calling component (matching ResumeBotButton / OfferCard).
 */
export function useSendHumanMessage(conversationId: string, leadId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (text: string) => sendHumanMessage(conversationId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['conversation-messages', conversationId],
      })
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] })
      queryClient.invalidateQueries({ queryKey: ['handoffs'] })
    },
  })
}

/** The lead's audit-log timeline (newest first). */
export function useLeadActivity(id: string) {
  return useQuery({
    queryKey: ['lead-activity', id],
    queryFn: () => getLeadActivity(id),
    enabled: !!id,
  })
}

/**
 * Dashboard users for the assignee picker. `GET /api/users` is admin-only on the
 * backend (RequireRole admin), so we only fetch it for admins — staff get a
 * stable empty list and the UI degrades (assign-to-self / hide the picker)
 * without firing a request that would 403. The 403 catch is kept as a
 * belt-and-braces fallback in case role and token ever disagree.
 */
export function useUsers() {
  const { isAdmin } = useAuth()
  return useQuery({
    queryKey: ['users', isAdmin],
    enabled: isAdmin,
    queryFn: async () => {
      try {
        return await listUsers()
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) return []
        throw err
      }
    },
    staleTime: 5 * 60_000,
  })
}

/** Paginated, filtered B2B directory list. Filters/page come from the URL. */
export function useCompaniesList(filters: CompanyFilters) {
  return useQuery({
    queryKey: ['companies', filters],
    queryFn: () => listCompanies(filters),
    placeholderData: (prev) => prev,
  })
}

/**
 * Distinct roles + countries present in the directory, to populate the filter
 * pickers with only values that actually exist in the data.
 */
export function useCompanyFacets() {
  return useQuery({
    queryKey: ['company-facets'],
    queryFn: getCompanyFacets,
    staleTime: 5 * 60_000,
  })
}

/** Full company detail (identity + verification + financials). */
export function useCompanyDetail(id: string) {
  return useQuery({
    queryKey: ['company', id],
    queryFn: () => getCompany(id),
    enabled: !!id,
    // While the backend is still computing financials, poll until it resolves to
    // 'ready' or 'none'; otherwise leave the query static (no polling).
    refetchInterval: (query) =>
      query.state.data?.financials_status === 'pending' ? 4_000 : false,
  })
}

/**
 * Cursor-paginated PalletClearance stock inventory. Filters + cursor come from
 * the URL; the previous page stays visible while the next loads.
 */
export function useListings(filters: ListingFilters) {
  return useQuery({
    queryKey: ['listings', filters],
    queryFn: () => listListings(filters),
    placeholderData: (prev) => prev,
  })
}

/**
 * Seller photos (signed URLs) for a PalletClearance listing. Enabled only when a
 * listing id is present. URLs are ~1h-signed, so the result is cached briefly.
 */
export function useListingPhotos(listingId: string | undefined) {
  return useQuery({
    queryKey: ['listing-photos', listingId],
    queryFn: () => listListingPhotos(listingId as string),
    enabled: !!listingId,
    staleTime: 5 * 60_000,
  })
}

/**
 * The full shared category taxonomy (flat list + live per-category counts).
 * Fetched once and cached — the inventory filter picker, the "by category" view
 * and the admin merge surface all read from this single query, so a merge only
 * has to invalidate ['categories'] to refresh every consumer. The caller builds
 * the parent/child tree from each node's `parent_id`.
 */
export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => listCategories(),
    staleTime: 5 * 60_000,
  })
}

/** Human-handoff queue (needs_human leads). */
export function useHandoffs() {
  return useQuery({
    queryKey: ['handoffs'],
    queryFn: () => listHandoffs(),
  })
}

/**
 * Pending group-join requests (buyers who opted into the WhatsApp offers group,
 * newest first). Staff-auth on the backend; a 403 resolves to an empty list so
 * the overview worklist simply hides instead of erroring for a role that can't
 * see it.
 */
export function useGroupInviteRequests() {
  return useQuery({
    queryKey: ['group-invites'],
    queryFn: async () => {
      try {
        return await listGroupInviteRequests()
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) return []
        throw err
      }
    },
  })
}

/**
 * Mark a contact as manually added to the offers group. On success it
 * invalidates ['group-invites'] so the row drops off the pending worklist.
 */
export function useMarkGroupAdded() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markGroupAdded,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['group-invites'] }),
  })
}

/**
 * Pending newsletter opt-ins (buyers who opted into the email newsletter,
 * newest first). Staff-auth on the backend; a 403 resolves to an empty list so
 * the overview worklist simply hides instead of erroring for a role that can't
 * see it.
 */
export function useNewsletterOptIns() {
  return useQuery({
    queryKey: ['newsletter'],
    queryFn: async () => {
      try {
        return await listNewsletterOptIns()
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) return []
        throw err
      }
    },
  })
}

/**
 * Mark a contact's newsletter opt-in as exported to the mailing tool. On
 * success it invalidates ['newsletter'] so the row drops off the pending
 * worklist.
 */
export function useMarkNewsletterExported() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markNewsletterExported,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['newsletter'] }),
  })
}

// --- Offer senders (supplier registry, Module G) ---------------------------

/**
 * Supplier offer-sender registry (staff-auth). The whole registry is fetched and
 * cached under ['offer-senders']; the create/update/delete mutations below all
 * invalidate that single key so every consumer refreshes after a change.
 */
export function useOfferSenders() {
  return useQuery({
    queryKey: ['offer-senders'],
    queryFn: () => listOfferSenders(),
  })
}

/** Register a new supplier sender; invalidates ['offer-senders'] on success. */
export function useCreateOfferSender() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SupplierSenderInput) => createOfferSender(body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['offer-senders'] }),
  })
}

/**
 * Update a supplier sender (full replace of the editable fields — the caller
 * submits the whole row incl. the current `active`). Invalidates
 * ['offer-senders'] on success. Used for both the edit form and the active
 * toggle.
 */
export function useUpdateOfferSender() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: SupplierSenderInput }) =>
      updateOfferSender(id, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['offer-senders'] }),
  })
}

/** Delete a supplier sender; invalidates ['offer-senders'] on success. */
export function useDeleteOfferSender() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteOfferSender(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['offer-senders'] }),
  })
}

/** Dashboard KPI aggregates. Admin-gated on the backend; 403 → null so the
 *  KPI strip simply hides for staff instead of erroring. */
export function useKpis() {
  return useQuery({
    queryKey: ['kpis'],
    queryFn: async () => {
      try {
        return await getKpis()
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) return null
        throw err
      }
    },
    staleTime: 60_000,
  })
}

/**
 * "Today – Angrosist" action board (KPI_PLAN §E.2). Guarded on the backend; on
 * 403 the hook resolves to null so the board hides instead of erroring.
 */
export function useTodayAngrosist() {
  return useQuery({
    queryKey: ['kpi-today-angrosist'],
    queryFn: async () => {
      try {
        return await getTodayAngrosist()
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) return null
        throw err
      }
    },
    staleTime: 60_000,
  })
}

/** "Portfolio – Clearance" action board. 403 → null (board hides). */
export function usePortfolioClearance() {
  return useQuery({
    queryKey: ['kpi-portfolio-clearance'],
    queryFn: async () => {
      try {
        return await getPortfolioClearance()
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) return null
        throw err
      }
    },
    staleTime: 60_000,
  })
}

/** "This month" (all-verticals) board. 403 → null (board hides). */
export function useMonthKpis() {
  return useQuery({
    queryKey: ['kpi-month'],
    queryFn: async () => {
      try {
        return await getMonthKpis()
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) return null
        throw err
      }
    },
    staleTime: 60_000,
  })
}

/** "Platform health" board. 403 → null (board hides). */
export function usePlatformHealth() {
  return useQuery({
    queryKey: ['kpi-platform-health'],
    queryFn: async () => {
      try {
        return await getPlatformHealth()
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) return null
        throw err
      }
    },
    staleTime: 60_000,
  })
}

/**
 * Editable KPI targets + alert thresholds (admin-only). `GET /api/kpis/settings`
 * is admin-gated on the backend, so we only fetch it for admins; non-admins get
 * a stable empty result and the page renders its not-authorized state without
 * firing a request that would 403.
 */
export function useKpiSettings() {
  const { isAdmin } = useAuth()
  return useQuery({
    queryKey: ['kpi-settings'],
    enabled: isAdmin,
    queryFn: getKpiSettings,
    staleTime: 60_000,
  })
}

/**
 * Staff tasks / follow-ups, filtered by status / assignee / lead. Filters come
 * from the URL (and the "my tasks" toggle). Mutations invalidate ['tasks'].
 */
export function useTasks(filters: TaskFilters) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => listTasks(filters),
    placeholderData: (prev) => prev,
  })
}
