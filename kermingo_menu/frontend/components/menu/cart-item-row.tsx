'use client'

import { Minus, Plus, Trash2 } from 'lucide-react'
import { formatPrice } from '@/lib/products'
import type { CartItem } from './cart-context'
import { useCart } from './cart-context'
import { ProductIconGlyph } from './product-visual'

export function CartItemRow({ item }: { item: CartItem }) {
  const { increment, decrement, remove } = useCart()
  const { product, qty } = item
  const subtotal = product.price * qty

  return (
    <div className="rounded-3xl bg-white p-3 shadow-sm shadow-[#003B73]/5">
      <div className="flex gap-3">
        {/* Imagen / ícono */}
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#EEF5FF]">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image || '/placeholder.svg'}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <ProductIconGlyph
              icon={product.icon}
              strokeWidth={1.8}
              className="h-7 w-7 text-[#75AADB]"
            />
          )}
        </div>

        {/* Datos */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-extrabold leading-tight text-[#003B73]">
                {product.name}
              </p>
              <p className="mt-0.5 text-xs font-medium text-[#6B7280]">
                {formatPrice(product.price)} c/u
              </p>
            </div>
            <button
              onClick={() => remove(product.id)}
              aria-label={`Eliminar ${product.name}`}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[#6B7280] transition-colors hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="h-4 w-4" strokeWidth={2.2} />
            </button>
          </div>

          {/* Controles + subtotal */}
          <div className="mt-2.5 flex items-center justify-between">
            <div className="flex items-center gap-1 rounded-2xl bg-[#EEF5FF] p-1">
              <button
                onClick={() => decrement(product.id)}
                aria-label={`Quitar uno de ${product.name}`}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-[#003B73] transition-colors hover:bg-white"
              >
                {qty === 1 ? (
                  <Trash2 className="h-4 w-4" />
                ) : (
                  <Minus className="h-4 w-4" strokeWidth={2.6} />
                )}
              </button>
              <span className="w-7 text-center text-base font-extrabold text-[#003B73]">
                {qty}
              </span>
              <button
                onClick={() => increment(product.id)}
                aria-label={`Agregar uno de ${product.name}`}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F6B21A] text-[#003B73] transition-colors hover:bg-[#ffbe2e]"
              >
                <Plus className="h-4 w-4" strokeWidth={2.6} />
              </button>
            </div>
            <span className="text-lg font-extrabold text-[#003B73]">
              {formatPrice(subtotal)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
