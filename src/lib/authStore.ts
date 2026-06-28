/**
 * Minimal token persistence for the dashboard session. The token lives in
 * localStorage under a single key so the authed API client (src/lib/api.ts) can
 * read it without importing React, and so a hard reload keeps the operator
 * logged in. No secrets are baked in here — only the per-session JWT the backend
 * issues at login is stored, and it is cleared on logout or any 401.
 */

const TOKEN_KEY = 'angrosist_token'
const USER_KEY = 'angrosist_user'

/**
 * Roles the dashboard recognizes (mirrors domain.Role). `staff` and `admin` are
 * the Phase-1 dashboard roles; `admin_global` is the cross-country super-admin
 * (also admin for UI gating). The P2 portal roles are listed for forward
 * compatibility — the dashboard treats any unknown role as least-privilege.
 */
export type UserRole =
  | 'staff'
  | 'admin'
  | 'admin_global'
  | 'provider'
  | 'country_operator'

/** True for roles the backend treats as admin (admin + cross-country super-admin). */
export function isAdminRole(role: string | undefined | null): boolean {
  return role === 'admin' || role === 'admin_global'
}

/** PublicUser mirrors the API `User` schema (openapi `User`). */
export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function setStoredAuth(token: string, user: AuthUser): void {
  window.localStorage.setItem(TOKEN_KEY, token)
  window.localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearStoredAuth(): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(TOKEN_KEY)
  window.localStorage.removeItem(USER_KEY)
}
