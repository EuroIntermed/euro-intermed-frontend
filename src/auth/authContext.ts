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
  /**
   * Step 1 of passwordless sign-in: ask the backend to email a 6-digit code.
   * Resolves on the neutral `202` ack (never reveals whether the account exists).
   */
  requestCode: (email: string) => Promise<void>
  /**
   * Step 2 of passwordless sign-in: exchange the emailed code for a session.
   * Stores the token + user and updates auth state on success (throws otherwise).
   */
  verifyCode: (email: string, code: string) => Promise<void>
  logout: () => void
}

/**
 * Auth context for the dashboard. Lives in its own module (no component export)
 * so the provider file stays Fast-Refresh-friendly.
 */
export const AuthContext = createContext<AuthContextValue | null>(null)
