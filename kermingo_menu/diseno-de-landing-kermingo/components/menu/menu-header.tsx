'use client'

import Link from 'next/link'
import { ArrowLeft, ShoppingCart, Tent } from 'lucide-react'
import { ArgentinaStripe } from '../argentina-stripe'
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
        <div className="mx-auto flex max-w-md items-center justify-between gap-2 px-4 py-3">
          <Link
            href={backHref}
            aria-label={backLabel}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EEF5FF] text-[#003B73] transition-colors hover:bg-[#75AADB]/20"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
          </Link>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F6B21A] shadow-sm">
              <Tent className="h-4 w-4 text-[#003B73]" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-[#003B73]">
              Kermingo
            </span>
          </div>

          {showCart ? (
            <Link
              href="/carrito"
              aria-label={`Abrir carrito, ${count} ${count === 1 ? 'ítem' : 'ítems'}`}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#003B73] text-white transition-transform active:scale-95"
            >
              <ShoppingCart className="h-5 w-5" strokeWidth={2.2} />
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#F6B21A] px-1 text-[10px] font-extrabold text-[#003B73]">
                  {count}
                </span>
              )}
            </Link>
          ) : (
            <span className="h-10 w-10" aria-hidden="true" />
          )}
        </div>
      </div>
      <ArgentinaStripe />
    </header>
  )
}
