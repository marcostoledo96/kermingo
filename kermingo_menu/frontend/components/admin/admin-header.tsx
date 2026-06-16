'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft, LogOut } from 'lucide-react'
import { KermingoLogo } from '@/components/kermingo-logo'
import { Badge, type BadgeTone } from './admin-ui'
import { useAdminSession } from './admin-session'

type AdminHeaderProps = {
  /** Título de la sección actual (ej: "Productos"). */
  section?: string
  /** Si se pasa, muestra una flecha de volver a esa ruta. */
  backHref?: string
  /** Etiqueta accesible del botón volver. */
  backLabel?: string
  /** Badge de estado opcional (ej: estado de la tienda). */
  status?: { label: string; tone: BadgeTone }
}

export function AdminHeader({
  section,
  backHref,
  backLabel = 'Volver',
  status,
}: AdminHeaderProps) {
  const { user, logout } = useAdminSession()
  const pathname = usePathname()
  const isLogin = pathname === '/admin'

  return (
    <header className="sticky top-0 z-50 border-b border-[#75AADB]/20 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-2.5 sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          {backHref && (
            <Link
              href={backHref}
              aria-label={backLabel}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded text-[#003B73] transition-colors hover:bg-[#EEF5FF]"
            >
              <ArrowLeft className="h-5 w-5" strokeWidth={2.2} />
            </Link>
          )}

          <Link
            href={isLogin ? '/' : '/admin/dashboard'}
            className="flex min-w-0 flex-1 items-center gap-2.5"
            aria-label={isLogin ? 'Volver al sitio' : 'Ir al panel general'}
          >
            <KermingoLogo className="h-9 w-9 flex-shrink-0 rounded" />
            <div className="min-w-0 leading-tight">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#75AADB]">
                Kermingo
              </p>
              <h1 className="truncate font-display text-base font-extrabold tracking-tight text-[#003B73]">
                {section ?? 'Admin'}
              </h1>
            </div>
          </Link>

          {status && (
            <Badge tone={status.tone} uppercase dot className="ml-1 hidden sm:inline-flex">
              {status.label}
            </Badge>
          )}
        </div>

        <div className="flex flex-shrink-0 items-center gap-2 sm:gap-3">
          {user && !isLogin && (
            <div className="hidden text-right sm:block">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#75AADB]">
                Sesión activa
              </p>
              <p className="truncate text-xs font-medium text-[#003B73] max-w-[180px]">
                {user.email}
              </p>
            </div>
          )}
          {user && !isLogin && (
            <button
              type="button"
              onClick={() => void logout()}
              aria-label="Cerrar sesión"
              className="flex items-center gap-1.5 rounded border border-[#75AADB]/30 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#003B73] transition-colors hover:bg-[#EEF5FF] sm:px-3"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={2.4} />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
