'use client'

import Link from 'next/link'
import {
  ShoppingBag,
  ShoppingCart,
  Plus,
  ArrowRight,
  ShieldCheck,
  Trash2,
  Store,
} from 'lucide-react'
import { formatPrice } from '@/lib/products'
import { useCart } from './cart-context'
import { MenuHeader } from './menu-header'
import { CartItemRow } from './cart-item-row'

export function CartScreen() {
  const { items, count, total, clear } = useCart()

  return (
    <div className="flex min-h-screen flex-col bg-[var(--km-fondo)]">
      <MenuHeader backHref="/menu" backLabel="Volver al menú" showCart={false} />

      <main className="mx-auto w-full max-w-xl flex-1 px-4">
        {/* Título */}
        <section className="flex items-center justify-between gap-2 pt-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--km-azul)]">
              <ShoppingCart className="h-5 w-5 text-white" strokeWidth={2.2} />
            </div>
            <div className="leading-tight">
              <h1 className="text-2xl font-extrabold tracking-tight text-[var(--km-azul)]">
                Tu pedido
              </h1>
              {count > 0 && (
                <span className="text-sm font-medium text-[var(--km-tinta-suave)]">
                  {count} {count === 1 ? 'producto' : 'productos'}
                </span>
              )}
            </div>
          </div>
          {count > 0 && (
            <button
              onClick={clear}
              className="km-focus flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-[var(--km-tinta-suave)] transition-colors hover:bg-[var(--km-peligro-bg)] hover:text-[var(--km-peligro-text)]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Vaciar
            </button>
          )}
        </section>

        {/* Banner de contexto: pedido para retirar */}
        {count > 0 && (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-[var(--km-info-bg)] px-4 py-3">
            <Store className="h-5 w-5 flex-shrink-0 text-[var(--km-info-text)]" strokeWidth={2.2} />
            <p className="text-sm font-medium leading-snug text-[var(--km-info-text)]">
              Pedido para retirar en el mostrador del evento
            </p>
          </div>
        )}

        {items.length === 0 ? (
          <EmptyCart />
        ) : (
          <>
            {/* Lista de productos */}
            <div className="mt-4 space-y-2">
              {items.map((item) => (
                <CartItemRow key={item.product.id} item={item} />
              ))}
            </div>

            {/* Resumen */}
            <section className="km-panel mt-4 p-5">
              <h2 className="text-sm font-bold tracking-wide text-[var(--km-tinta-suave)]">
                Resumen
              </h2>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-[var(--km-tinta-suave)]">
                  Productos ({count})
                </span>
                <span className="font-semibold text-[var(--km-azul)] km-tabular">
                  {formatPrice(total)}
                </span>
              </div>
              <div className="my-3 border-t border-dashed border-[var(--km-linea)]" />
              <div className="flex items-end justify-between">
                <span className="text-sm font-medium text-[var(--km-tinta-suave)]">Total</span>
                <span className="text-3xl font-extrabold leading-none text-[var(--km-azul)] km-tabular">
                  {formatPrice(total)}
                </span>
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-xl bg-[var(--km-info-bg)] p-3">
                <ShieldCheck
                  className="mt-0.5 h-4.5 w-4.5 flex-shrink-0 text-[var(--km-info-text)]"
                  strokeWidth={2.2}
                />
                <p className="text-xs leading-relaxed text-[var(--km-info-text)]">
                  El stock se reserva al confirmar. Retirás tu pedido en el mostrador del evento.
                </p>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Acciones fijas abajo */}
      {items.length > 0 && (
        <div className="sticky bottom-0 z-40 mt-6 border-t border-[var(--km-linea)] bg-white/95 backdrop-blur-md km-safe-bottom">
          <div className="mx-auto max-w-xl space-y-2.5 px-4 pb-5 pt-4">
            <Link
              href="/confirmar"
              className="km-focus flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--km-dorado)] py-4 text-base font-extrabold text-[var(--km-azul)] shadow-lg shadow-[var(--km-dorado)]/30 transition-all hover:bg-[#ffbe2e] active:scale-[0.99]"
            >
              Confirmar pedido
              <ArrowRight className="h-5 w-5" strokeWidth={2.6} />
            </Link>
            <Link
              href="/menu"
              className="km-focus flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--km-linea)] bg-white py-3.5 text-sm font-bold text-[var(--km-azul)] transition-colors hover:bg-[var(--km-fondo)]"
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
        <ShoppingBag className="h-11 w-11 text-[var(--km-celeste)]" strokeWidth={1.6} />
        <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-4 border-[var(--km-fondo)] bg-[var(--km-dorado)] text-[var(--km-azul)]">
          <Plus className="h-4 w-4" strokeWidth={3} />
        </span>
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-extrabold text-[var(--km-azul)]">
          Tu carrito está vacío
        </h2>
        <p className="text-sm leading-relaxed text-[var(--km-tinta-suave)] text-pretty">
          Sumá comidas y bebidas del menú para armar tu pedido.
        </p>
      </div>
      <Link
        href="/menu"
        className="km-focus mt-1 flex items-center justify-center gap-2 rounded-2xl bg-[var(--km-dorado)] px-7 py-3.5 text-base font-extrabold text-[var(--km-azul)] shadow-lg shadow-[var(--km-dorado)]/30 transition-all hover:bg-[#ffbe2e] active:scale-[0.99]"
      >
        Ver menú
        <ArrowRight className="h-5 w-5" strokeWidth={2.6} />
      </Link>
    </div>
  )
}


