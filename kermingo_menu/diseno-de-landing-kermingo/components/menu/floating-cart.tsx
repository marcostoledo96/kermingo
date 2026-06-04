'use client'

import Link from 'next/link'
import { ShoppingCart, ArrowRight } from 'lucide-react'
import { formatPrice } from '@/lib/products'
import { useCart } from './cart-context'

export function FloatingCartBar() {
  const { count, total } = useCart()
  if (count === 0) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-4">
      <div className="mx-auto max-w-md">
        <Link
          href="/carrito"
          className="pointer-events-auto flex w-full items-center gap-3 rounded-3xl bg-[#003B73] p-2 pl-4 text-white shadow-2xl shadow-[#003B73]/30 transition-transform active:scale-[0.99]"
        >
          <div className="relative">
            <ShoppingCart className="h-6 w-6" strokeWidth={2.2} />
            <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F6B21A] px-1 text-[10px] font-extrabold text-[#003B73]">
              {count}
            </span>
          </div>
          <div className="flex-1 text-left leading-tight">
            <span className="block text-[11px] font-medium text-[#75AADB]">
              {count} {count === 1 ? 'ítem' : 'ítems'} · total
            </span>
            <span className="block text-lg font-extrabold">{formatPrice(total)}</span>
          </div>
          <span className="flex items-center gap-1.5 rounded-2xl bg-[#F6B21A] px-5 py-3 text-sm font-extrabold text-[#003B73]">
            Ver carrito
            <ArrowRight className="h-4 w-4" strokeWidth={2.6} />
          </span>
        </Link>
      </div>
    </div>
  )
}
