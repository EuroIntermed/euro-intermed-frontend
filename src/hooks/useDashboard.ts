import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/auth/useAuth'
import {
  listLeads,
  getLeadDetail,
  getLeadActivity,
  listUsers,
  listCompanies,
  getCompany,
  getCompanyFacets,
  listHandoffs,
  listListings,
  listListingPhotos,
  getKpis,
  listTasks,
  ApiError,
  type LeadFilters,
  type CompanyFilters,
  type ListingFilters,
  type TaskFilters,
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

/** Human-handoff queue (needs_human leads). */
export function useHandoffs() {
  return useQuery({
    queryKey: ['handoffs'],
    queryFn: () => listHandoffs(),
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
