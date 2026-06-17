'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Loader2, AlertCircle } from 'lucide-react'
import { setOnUnauthorized } from '@/lib/api'
import { API_BASE } from '@/lib/config'

/* ---------------------------------------------------------------------------
 * Sesión del panel admin de Kermingo (lado cliente).
 *
 * La verdad de la sesión es la cookie httpOnly del backend + /api/auth/me.
 * localStorage solo cachea datos de UI (nombre/rol) para evitar parpadeos.
 * No se guarda ningún JWT real en localStorage.
 *
 * Reglas:
 *  - me:     GET  /api/auth/me   con credentials: 'include'
 *  - login:  POST /api/auth/login con credentials: 'include'
 *  - logout: POST /api/auth/logout con credentials: 'include'
 *  - 401 → limpiar estado local y volver a /admin (login)
 * ------------------------------------------------------------------------- */

export type AdminUser = {
  name: string
  role?: string
  email?: string
}

type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error'

type AdminSessionValue = {
  status: SessionStatus
  user: AdminUser | null
  /** Marca la sesión como vencida (tras un 401 en una request admin). */
  expireSession: () => void
  /** Cierra sesión contra el backend y vuelve al login. */
  logout: () => Promise<void>
  /** Re-valida la sesión contra /api/auth/me. */
  refresh: () => Promise<void>
}

const UI_USER_KEY = 'kermingo:adminUser'

const AdminSessionContext = createContext<AdminSessionValue | null>(null)

function readCachedUser(): AdminUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(UI_USER_KEY)
    return raw ? (JSON.parse(raw) as AdminUser) : null
  } catch {
    return null
  }
}

function writeCachedUser(user: AdminUser | null) {
  if (typeof window === 'undefined') return
  try {
    if (user) window.localStorage.setItem(UI_USER_KEY, JSON.stringify(user))
    else window.localStorage.removeItem(UI_USER_KEY)
  } catch {
    /* ignore */
  }
}

export function AdminSessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [status, setStatus] = useState<SessionStatus>('loading')
  const [user, setUser] = useState<AdminUser | null>(null)
  const redirectingRef = useRef(false)

  const isLoginRoute = pathname === '/admin' || pathname === '/admin/'

  const clearAndRedirect = useCallback(() => {
    if (redirectingRef.current) return
    redirectingRef.current = true
    writeCachedUser(null)
    setUser(null)
    setStatus('unauthenticated')
    router.replace('/admin')
  }, [router])

  const refresh = useCallback(async () => {
    // Paint fast with cached user to avoid flicker, but status stays 'loading'
    // until /api/auth/me actually confirms the cookie is valid.
    const cached = readCachedUser()
    if (cached) setUser(cached)

    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      })

      if (res.status === 401) {
        clearAndRedirect()
        return
      }

      if (res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { ok?: boolean; data?: { usuario?: AdminUser }; usuario?: AdminUser }
          | null
        const userFromApi =
          (data?.data?.usuario as AdminUser) ?? (data?.usuario as AdminUser) ?? null

        if (userFromApi) {
          setUser(userFromApi)
          writeCachedUser(userFromApi)
          setStatus('authenticated')
          redirectingRef.current = false
          return
        }
        // API responded ok but no user in payload — treat as unauthenticated
        clearAndRedirect()
        return
      }

      // Other HTTP errors (5xx, etc.): backend unreachable or broken.
      // Do NOT grant authenticated status. Show error state so admin
      // knows something is wrong and can retry.
      setUser(cached)
      setStatus('error')
    } catch {
      // Network error (backend unavailable): do NOT grant authenticated status.
      // Show error state so admin can retry when backend is back.
      setUser(cached)
      setStatus('error')
    }
  }, [clearAndRedirect])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Register 401 callback for api.ts
  useEffect(() => {
    setOnUnauthorized(clearAndRedirect)
    return () => setOnUnauthorized(null)
  }, [clearAndRedirect])

  const expireSession = useCallback(() => {
    clearAndRedirect()
  }, [clearAndRedirect])

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      /* ignore: still clear local state */
    }
    writeCachedUser(null)
    setUser(null)
    setStatus('unauthenticated')
    router.replace('/admin')
  }, [router])

  return (
    <AdminSessionContext.Provider
      value={{ status, user, expireSession, logout, refresh }}
    >
      {status === 'error' ? (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#EEF5FF] px-6 text-center">
          <AlertCircle className="h-10 w-10 text-[var(--km-peligro-text)]" strokeWidth={1.6} />
          <div>
            <p className="text-lg font-extrabold text-[var(--km-azul)]">No se pudo verificar la sesión</p>
            <p className="mt-1 text-sm text-[var(--km-tinta-suave)]">
              El servidor no responde. Verificá tu conexión y volvé a intentar.
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="rounded-2xl bg-[var(--km-azul)] px-6 py-3 text-sm font-extrabold text-white transition-colors hover:bg-[var(--km-azul)]/90"
          >
            Reintentar
          </button>
        </div>
      ) : status === 'loading' ? (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#EEF5FF]">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--km-celeste)]" />
          <p className="text-sm font-medium text-[var(--km-tinta-suave)]">Verificando sesión…</p>
        </div>
      ) : status === 'unauthenticated' && !isLoginRoute ? (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#EEF5FF] px-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--km-celeste)]" />
          <p className="text-sm font-medium text-[var(--km-tinta-suave)]">Redirigiendo al login…</p>
        </div>
      ) : (
        children
      )}
    </AdminSessionContext.Provider>
  )
}

export function useAdminSession(): AdminSessionValue {
  const ctx = useContext(AdminSessionContext)
  if (!ctx) {
    throw new Error('useAdminSession debe usarse dentro de AdminSessionProvider')
  }
  return ctx
}

/**
 * Cache a UI user after login.
 * Does NOT store tokens: the httpOnly cookie is set by the backend.
 */
export function cacheAdminUser(user: AdminUser) {
  writeCachedUser(user)
}
