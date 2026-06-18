'use client'

import Link from 'next/link'
import { ArrowLeft, ShoppingCart } from 'lucide-react'
import { ArgentinaStripe } from '../argentina-stripe'
import { KermingoLogo } from '../kermingo-logo'
import { useCart } from './cart-context'

type MenuHeaderProps = {
  /** A dónde vuelve la flecha. Por defecto, el inicio. */
  backHref?: string
  /** Etiqueta accesible del botón volver. */
  backLabel?: string
  /** Muestra el ícono de carrito enlazado a /carrito. */
  showCart?: boolean
}

export function MenuHeader({
  backHref = '/',
  backLabel = 'Volver',
  showCart = true,
}: MenuHeaderProps) {
  const { count } = useCart()

  return (
    <header className="sticky top-0 z-50">
      <div className="border-b border-[#75AADB]/20 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-2 px-4 py-3">
          <Link
            href={backHref}
            aria-label={backLabel}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#EEF5FF] text-[#003B73] transition-colors hover:bg-[#75AADB]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003B73]"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
          </Link>

          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 hover:opacity-80"
            aria-label="Volver al inicio"
          >
            <KermingoLogo className="h-8 w-8 flex-shrink-0" />
            <div className="min-w-0 leading-none">
              <span className="block font-display text-base font-extrabold text-[#003B73] truncate sm:text-lg">
                Kermingo
              </span>
              <span className="mt-0.5 hidden text-[10px] font-medium text-[#75AADB] sm:block">
                Grupo Scout San Patricio
              </span>
            </div>
          </Link>

          {showCart ? (
            <Link
              href="/carrito"
              aria-label={`Abrir carrito, ${count} ${count === 1 ? 'ítem' : 'ítems'}`}
              className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#003B73] text-white transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003B73] focus-visible:ring-offset-2"
            >
              <ShoppingCart className="h-5 w-5" strokeWidth={2.2} />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#F6B21A] px-1 text-[10px] font-extrabold text-[#003B73]">
                  {count}
                </span>
              )}
            </Link>
          ) : (
            <span className="h-10 w-10 flex-shrink-0" aria-hidden="true" />
          )}
        </div>
      </div>
      <ArgentinaStripe />
    </header>
  )
}
