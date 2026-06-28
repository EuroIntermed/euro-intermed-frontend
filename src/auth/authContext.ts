import { createContext } from 'react'
import type { AuthUser } from '@/lib/authStore'

export interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  /**
   * True when the signed-in user holds an admin role (admin or admin_global) —
   * matches the backend RequireRole(admin) gate. Drives UX hiding of controls
   * that would otherwise 403 for staff; the backend stays the real gate.
   */
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

/**
 * Auth context for the dashboard. Lives in its own module (no component export)
 * so the provider file stays Fast-Refresh-friendly.
 */
export const AuthContext = createContext<AuthContextValue | null>(null)
