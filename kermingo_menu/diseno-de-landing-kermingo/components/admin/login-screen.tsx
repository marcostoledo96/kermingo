'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Tent, Eye, EyeOff, AlertCircle, ArrowLeft, ShieldCheck, Lock } from 'lucide-react'
import { ArgentinaStripe } from '@/components/argentina-stripe'

export function AdminLoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim() || !password.trim()) {
      setError('Completá todos los campos')
      return
    }

    // Simulación de login (solo frontend).
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setError('Usuario o contraseña incorrectos')
    }, 1200)
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#EEF5FF]">
      <ArgentinaStripe />

      {/* Barra superior con volver al sitio */}
      <div className="mx-auto flex w-full max-w-sm items-center px-4 pt-5">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm font-semibold text-[#003B73]/70 transition-colors hover:text-[#003B73]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
          Volver al sitio
        </Link>
      </div>

      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="overflow-hidden rounded-3xl bg-white shadow-xl shadow-[#003B73]/10">
            {/* Cabecera azul con marca */}
            <div className="relative bg-[#003B73] px-8 pb-8 pt-9 text-center">
              {/* Sol de mayo decorativo */}
              <div
                className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-[0.12]"
                style={{
                  background:
                    'repeating-conic-gradient(#F6B21A 0deg 9deg, transparent 9deg 18deg)',
                }}
                aria-hidden="true"
              />
              <div className="relative inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F6B21A] shadow-lg shadow-black/20">
                <Tent className="h-8 w-8 text-[#003B73]" strokeWidth={2.2} />
              </div>
              <h1 className="relative mt-4 text-2xl font-extrabold tracking-tight text-white">
                Kermingo Admin
              </h1>
              <p className="relative mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#75AADB]">
                Grupo Scout San Patricio
              </p>
            </div>

            {/* Cuerpo del formulario */}
            <div className="px-8 py-7">
              <div className="mb-6 flex items-center justify-center gap-2 text-[#003B73]">
                <Lock className="h-4 w-4" strokeWidth={2.4} />
                <h2 className="text-base font-bold">Ingreso organizadores</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="email"
                    className="block text-xs font-semibold uppercase tracking-wide text-[#003B73]/70"
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
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold uppercase tracking-wide text-[#003B73]/70"
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
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#75AADB] transition-colors hover:text-[#003B73]"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium">{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full rounded-2xl py-4 text-base font-extrabold transition-all ${
                    loading
                      ? 'cursor-wait bg-[#E2E8F0] text-[#94A3B8]'
                      : 'bg-[#F6B21A] text-[#003B73] shadow-lg shadow-[#F6B21A]/30 hover:bg-[#ffbe2e] active:scale-[0.98]'
                  }`}
                >
                  {loading ? 'Ingresando...' : 'Ingresar'}
                </button>
              </form>
            </div>

            {/* Pie de la card: acceso restringido */}
            <div className="flex items-center justify-center gap-2 border-t border-[#75AADB]/20 bg-[#EEF5FF]/50 px-8 py-4">
              <ShieldCheck className="h-4 w-4 text-[#75AADB]" strokeWidth={2.2} />
              <p className="text-xs font-medium text-[#6B7280]">
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
