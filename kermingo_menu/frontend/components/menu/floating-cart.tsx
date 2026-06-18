'use client'

import Link from 'next/link'
import { ShoppingCart, ArrowRight } from 'lucide-react'
import { formatPrice } from '@/lib/products'
import { useCart } from './cart-context'

export function FloatingCartBar({
  disabled = false,
  disabledReason,
}: {
  disabled?: boolean
  disabledReason?: string
}) {
  const { count, total } = useCart()
  if (count === 0) return null

  const disabledClass = disabled
    ? 'pointer-events-none cursor-not-allowed bg-[#003B73]/70'
    : ''
  const ctaClass = disabled
    ? 'pointer-events-none bg-[#F6B21A]/60'
    : 'bg-[#F6B21A]'

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pt-2"
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto max-w-xl">
        <Link
          href="/carrito"
          aria-label={`Ver carrito: ${count} ${count === 1 ? 'ítem' : 'ítems'}, total ${formatPrice(total)}`}
          className={`pointer-events-auto flex w-full items-center gap-3 rounded-3xl bg-[#003B73] p-2 pl-4 text-white shadow-lg shadow-[#003B73]/25 transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F6B21A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#EEF5FF] ${disabledClass}`}
        >
          <div className="relative">
            <ShoppingCart className="h-6 w-6" strokeWidth={2.2} />
            <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#003B73] bg-[#F6B21A] px-1 text-[10px] font-extrabold text-[#003B73]">
              {count}
            </span>
          </div>
          <div className="flex-1 text-left leading-tight">
            <span className="block text-[11px] font-medium text-[#75AADB]">
              {count} {count === 1 ? 'ítem' : 'ítems'} · total
            </span>
            <span className="block font-display text-lg font-extrabold">
              {formatPrice(total)}
            </span>
            {disabled && disabledReason ? (
              <span className="mt-1 block text-[11px] text-[#EAB308]">
                {disabledReason}
              </span>
            ) : null}
          </div>
          <span
            className={`flex items-center gap-1.5 rounded-2xl px-5 py-3 text-sm font-extrabold text-[#003B73] ${ctaClass}`}
          >
            Ver carrito
            <ArrowRight className="h-4 w-4" strokeWidth={2.6} />
          </span>
        </Link>
      </div>
    </div>
  )
}
