'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { AuthSession, AuthUser } from './types'
import { useLocalStorageState } from './use-local-storage'
import { API_BASE } from './config'

const STORAGE_KEY = 'kermingo:auth'

type AuthContextValue = {
  user: AuthUser | null
  token: string | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

// Custom parse: validate the session has both token and user.
const sessionParse = (raw: string): AuthSession | null => {
  try {
    const parsed = JSON.parse(raw) as AuthSession
    if (!parsed?.token || !parsed?.user) return null
    return parsed
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // `useSyncExternalStore` handles the server/client snapshot difference so
  // React 19 doesn't emit a hydration mismatch warning when the client
  // reads a different value from localStorage than the server default.
  const [session, setSession] = useLocalStorageState<AuthSession | null>(STORAGE_KEY, {
    defaultValue: null,
    parse: sessionParse,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Redirigir a /admin si no hay sesión y la ruta actual es del admin
  useEffect(() => {
    const isAdminRoute =
      pathname?.startsWith('/admin') && pathname !== '/admin'
    if (isAdminRoute && !session) {
      router.replace('/admin')
    }
  }, [session, pathname, router])

  const login = useCallback(
    async (email: string, password: string) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `${API_BASE}/api/auth/login`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, contrasenia: password }),
          },
        )
        const body = (await res.json()) as {
          ok: boolean
          data?: { usuario: AuthUser }
          error?: string
        }
        if (!res.ok || !body.ok || !body.data) {
          throw new Error(body.error || 'Credenciales inválidas')
        }
        // El token se setea en una cookie httpOnly por el backend;
        // guardamos una marca local con el user para la UI.
        const newSession: AuthSession = {
          token: 'cookie',
          user: body.data.usuario,
        }
        setSession(newSession)
        router.push('/admin/dashboard')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
      } finally {
        setLoading(false)
      }
    },
    [router, setSession],
  )

  const logout = useCallback(async () => {
    try {
      await fetch(
        `${API_BASE}/api/auth/logout`,
        { method: 'POST' },
      )
    } catch {
      // ignore network errors on logout
    }
    setSession(null)
    router.push('/admin')
  }, [router, setSession])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      token: session?.token ?? null,
      loading,
      error,
      login,
      logout,
    }),
    [session, loading, error, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  }
  return ctx
}
