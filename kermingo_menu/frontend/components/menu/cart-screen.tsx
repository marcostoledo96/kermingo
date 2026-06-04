'use client'

import Link from 'next/link'
import {
  ShoppingBag,
  ShoppingCart,
  Plus,
  ArrowRight,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { formatPrice } from '@/lib/products'
import { useCart } from './cart-context'
import { MenuHeader } from './menu-header'
import { CartItemRow } from './cart-item-row'

export function CartScreen() {
  const { items, count, total, clear } = useCart()

  return (
    <div className="flex min-h-screen flex-col bg-[#EEF5FF]">
      <MenuHeader backHref="/menu" backLabel="Volver al menú" showCart={false} />

      <main className="mx-auto w-full max-w-md flex-1 px-4">
        {/* Título */}
        <section className="flex items-center justify-between gap-2 pt-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#003B73]">
              <ShoppingCart className="h-5 w-5 text-white" strokeWidth={2.2} />
            </div>
            <div className="leading-tight">
              <h1 className="text-2xl font-extrabold tracking-tight text-[#003B73]">
                Tu carrito
              </h1>
              {count > 0 && (
                <span className="text-sm font-medium text-[#6B7280]">
                  {count} {count === 1 ? 'producto' : 'productos'}
                </span>
              )}
            </div>
          </div>
          {count > 0 && (
            <button
              onClick={clear}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-[#6B7280] transition-colors hover:text-rose-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Vaciar
            </button>
          )}
        </section>

        {items.length === 0 ? (
          <EmptyCart />
        ) : (
          <>
            {/* Lista de productos */}
            <div className="mt-5 space-y-3">
              {items.map((item) => (
                <CartItemRow key={item.product.id} item={item} />
              ))}
            </div>

            {/* Resumen */}
            <section className="mt-5 rounded-3xl bg-white p-5 shadow-sm shadow-[#003B73]/5">
              <h2 className="text-xs font-bold uppercase tracking-wide text-[#6B7280]">
                Resumen del pedido
              </h2>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-[#6B7280]">
                  Productos ({count})
                </span>
                <span className="font-semibold text-[#003B73]">
                  {formatPrice(total)}
                </span>
              </div>
              <div className="my-3 border-t border-dashed border-[#75AADB]/30" />
              <div className="flex items-end justify-between">
                <span className="text-sm font-medium text-[#6B7280]">Total</span>
                <span className="text-3xl font-extrabold leading-none text-[#003B73]">
                  {formatPrice(total)}
                </span>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-2xl bg-[#EEF5FF] p-3">
                <ShieldCheck
                  className="mt-0.5 h-4.5 w-4.5 flex-shrink-0 text-[#003B73]"
                  strokeWidth={2.2}
                />
                <p className="text-xs leading-relaxed text-[#003B73]/80">
                  El stock se reserva al confirmar el pedido. Pagás y retirás en el
                  mostrador del evento.
                </p>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Acciones fijas abajo */}
      {items.length > 0 && (
        <div className="sticky bottom-0 z-40 mt-6 border-t border-[#75AADB]/20 bg-white/95 backdrop-blur-md">
          <div className="mx-auto max-w-md space-y-2.5 px-4 pb-5 pt-4">
            <Link
              href="/confirmar"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#F6B21A] py-4 text-base font-extrabold text-[#003B73] shadow-lg shadow-[#F6B21A]/30 transition-all hover:bg-[#ffbe2e] active:scale-[0.99]"
            >
              Continuar pedido
              <ArrowRight className="h-5 w-5" strokeWidth={2.6} />
            </Link>
            <Link
              href="/menu"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#75AADB]/40 bg-white py-3.5 text-sm font-bold text-[#003B73] transition-colors hover:bg-[#EEF5FF]"
            >
              <Plus className="h-4 w-4" strokeWidth={2.6} />
              Seguir comprando
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyCart() {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
      <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-sm">
        <ShoppingBag className="h-11 w-11 text-[#75AADB]" strokeWidth={1.6} />
        <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-4 border-[#EEF5FF] bg-[#F6B21A] text-[#003B73]">
          <Plus className="h-4 w-4" strokeWidth={3} />
        </span>
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-extrabold text-[#003B73]">
          Tu carrito está vacío
        </h2>
        <p className="text-sm leading-relaxed text-[#6B7280] text-pretty">
          Sumá comidas y bebidas del menú para armar tu pedido.
        </p>
      </div>
      <Link
        href="/menu"
        className="mt-1 flex items-center justify-center gap-2 rounded-2xl bg-[#F6B21A] px-7 py-3.5 text-base font-extrabold text-[#003B73] shadow-lg shadow-[#F6B21A]/30 transition-all hover:bg-[#ffbe2e] active:scale-[0.99]"
      >
        Ver menú
        <ArrowRight className="h-5 w-5" strokeWidth={2.6} />
      </Link>
    </div>
  )
}
