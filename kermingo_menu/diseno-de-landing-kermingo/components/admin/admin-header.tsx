'use client'

import Link from 'next/link'
import { ArrowLeft, LogOut, Tent } from 'lucide-react'
import { ArgentinaStripe } from '@/components/argentina-stripe'
import { Badge, type BadgeTone } from './admin-ui'

type AdminHeaderProps = {
  /** Título de la sección actual (ej: "Productos"). Si se omite, muestra solo la marca. */
  section?: string
  /** Si se pasa, muestra una flecha de volver a esa ruta. */
  backHref?: string
  /** Etiqueta accesible del botón volver. */
  backLabel?: string
  /** Badge de estado opcional (ej: estado de la tienda). */
  status?: { label: string; tone: BadgeTone }
  /** Mostrar botón de cerrar sesión. Por defecto, true. */
  showLogout?: boolean
}

export function AdminHeader({
  section,
  backHref,
  backLabel = 'Volver',
  status,
  showLogout = true,
}: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-50">
      <div className="bg-[#003B73] text-white shadow-lg shadow-[#003B73]/20">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            {backHref && (
              <Link
                href={backHref}
                aria-label={backLabel}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <ArrowLeft className="h-5 w-5" strokeWidth={2.4} />
              </Link>
            )}

            <Link href="/admin/dashboard" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F6B21A] shadow-sm">
                <Tent className="h-5 w-5 text-[#003B73]" strokeWidth={2.4} />
              </div>
              <div className="leading-tight">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#75AADB]">
                  Kermingo
                </p>
                <h1 className="text-base font-extrabold tracking-tight">
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

          {showLogout && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold transition-colors hover:bg-white/20"
            >
              <LogOut className="h-4 w-4" strokeWidth={2.4} />
              <span className="hidden sm:inline">Cerrar sesión</span>
            </Link>
          )}
        </div>

        {/* Badge de estado en mobile, debajo de la marca */}
        {status && (
          <div className="px-4 pb-2.5 sm:hidden">
            <Badge tone={status.tone} uppercase dot>
              {status.label}
            </Badge>
          </div>
        )}
      </div>
      <ArgentinaStripe />
    </header>
  )
}
