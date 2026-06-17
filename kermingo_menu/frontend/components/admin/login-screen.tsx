'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle, ArrowLeft, ShieldCheck, Lock, Loader2 } from 'lucide-react'
import { ArgentinaStripe } from '@/components/argentina-stripe'
import { KermingoLogo } from '@/components/kermingo-logo'
import { useAdminSession, cacheAdminUser } from './admin-session'
import { API_BASE } from '@/lib/config'

export function shouldShowDemoCredentials(): boolean {
  return process.env.NEXT_PUBLIC_SHOW_DEMO_CREDENTIALS === 'true'
}

export function AdminLoginScreen() {
  const router = useRouter()
  const { refresh } = useAdminSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), contrasenia: password }),
      })
      const body = await res.json()
      if (!res.ok || !body.ok || !body.data) {
        throw new Error(body.error || 'Credenciales inválidas')
      }
      // Cache user data for UI; the httpOnly cookie is set by the backend.
      cacheAdminUser({
        name: body.data.usuario?.nombre || body.data.usuario?.email || email.trim(),
        email: body.data.usuario?.email || email.trim(),
        role: 'admin',
      })
      await refresh()
      router.replace('/admin/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#EEF5FF]">
      <ArgentinaStripe />

      <div className="mx-auto flex w-full max-w-sm items-center px-4 pt-5">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm font-semibold text-[#3A5675] transition-colors hover:text-[#003B73]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
          Volver al sitio
        </Link>
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-[#003B73]/10">
            <div className="relative bg-[#003B73] px-8 pb-8 pt-9 text-center">
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-[0.12]"
                style={{
                  background:
                    'repeating-conic-gradient(#F6B21A 0deg 9deg, transparent 9deg 18deg)',
                }}
                aria-hidden="true"
              />
              <div className="relative inline-flex items-center justify-center">
                <KermingoLogo className="h-16 w-16" />
              </div>
              <h1 className="relative mt-4 font-display text-2xl font-extrabold tracking-tight text-white">
                Kermingo Admin
              </h1>
              <p className="relative mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#75AADB]">
                Grupo Scout San Patricio
              </p>
            </div>

            <div className="px-8 py-7">
              <div className="mb-6 flex items-center justify-center gap-2 text-[#003B73]">
                <Lock className="h-4 w-4" strokeWidth={2.4} />
                <h2 className="text-base font-bold">Ingreso organizadores</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="block text-xs font-semibold uppercase tracking-wide text-[#3A5675]"
                  >
                    Usuario o email
                  </label>
                  <input
                    id="email"
                    type="text"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="organizador@scout.org"
                    className="kermingo-input"
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold uppercase tracking-wide text-[#3A5675]"
                  >
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="kermingo-input pr-12"
                      disabled={loading}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#75AADB] transition-colors hover:text-[#003B73] disabled:opacity-50"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="flex items-center gap-2 rounded-xl border border-[#E4B4B4] bg-[#FBEAEA] px-4 py-3 text-sm text-[#9B2C2C]"
                  >
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium">{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim() || !password.trim()}
                  className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-extrabold transition-all ${
                    loading
                      ? 'cursor-wait bg-[#E2E8F0] text-[#94A3B8]'
                      : 'bg-[#F6B21A] text-[#003B73] shadow-lg shadow-[#F6B21A]/30 hover:bg-[#ffbe2e] active:scale-[0.98] disabled:opacity-50'
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Ingresando...
                    </>
                  ) : (
                    'Ingresar'
                  )}
                </button>

                {shouldShowDemoCredentials() && (
                  <p className="pt-1 text-center text-[11px] text-[#6B7280]">
                    Credenciales de prueba:{' '}
                    <code className="rounded bg-[#EEF5FF] px-1.5 py-0.5 text-[#003B73]">
                      admin@kermingo.com
                    </code>{' '}
                    /{' '}
                    <code className="rounded bg-[#EEF5FF] px-1.5 py-0.5 text-[#003B73]">
                      admin123
                    </code>
                  </p>
                )}
              </form>
            </div>

            <div className="flex items-center justify-center gap-2 border-t border-[#75AADB]/20 bg-[#EEF5FF]/50 px-8 py-4">
              <ShieldCheck className="h-4 w-4 text-[#75AADB]" strokeWidth={2.2} />
              <p className="text-xs font-medium text-[#3A5675]">
                Acceso exclusivo para organización
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-xs font-medium text-[#75AADB]">
            Kermingo 2026 · Grupo Scout San Patricio
          </p>
        </div>
      </main>

      <ArgentinaStripe />
    </div>
  )
}
