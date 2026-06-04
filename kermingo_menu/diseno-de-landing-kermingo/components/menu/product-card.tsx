'use client'

import { Plus, Minus, Sun, Moon, Tag, Check, AlertTriangle, Infinity as InfinityIcon } from 'lucide-react'
import { formatPrice, type Product, type StockStatus } from '@/lib/products'
import { useCart } from './cart-context'
import { ProductIconGlyph } from './product-visual'

const STOCK_CONFIG: Record<
  StockStatus,
  { label: string; className: string; icon: typeof Check | null }
> = {
  disponible: {
    label: 'Disponible',
    className: 'bg-emerald-50 text-emerald-700',
    icon: Check,
  },
  bajo: {
    label: 'Stock bajo',
    className: 'bg-amber-50 text-amber-700',
    icon: AlertTriangle,
  },
  ilimitado: {
    label: 'Stock ilimitado',
    className: 'bg-sky-50 text-sky-700',
    icon: InfinityIcon,
  },
  agotado: {
    label: 'Agotado',
    className: 'bg-rose-50 text-rose-700',
    icon: null,
  },
}

export function ProductCard({ product }: { product: Product }) {
  const { qtyOf, add, increment, decrement } = useCart()
  const qty = qtyOf(product.id)
  const soldOut = product.stock === 'agotado'
  const stock = STOCK_CONFIG[product.stock]
  const StockIcon = stock.icon

  return (
    <article
      className={`relative flex gap-3.5 rounded-3xl border bg-white p-3 shadow-sm transition-shadow ${
        soldOut
          ? 'border-[#75AADB]/20 opacity-80'
          : 'border-[#75AADB]/25 hover:shadow-md'
      }`}
    >
      {/* Imagen / placeholder con ícono */}
      <div className="relative flex-shrink-0">
        <div
          className={`flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl ${
            product.type === 'promo' ? 'bg-[#003B73]' : 'bg-[#EEF5FF]'
          }`}
        >
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image || '/placeholder.svg'}
              alt={product.name}
              className={`h-full w-full object-cover ${soldOut ? 'grayscale' : ''}`}
            />
          ) : (
            <ProductIconGlyph
              icon={product.icon}
              strokeWidth={1.8}
              className={`h-10 w-10 ${
                product.type === 'promo' ? 'text-[#F6B21A]' : 'text-[#75AADB]'
              } ${soldOut ? 'opacity-50' : ''}`}
            />
          )}
        </div>
        {/* Badge tipo (comida/bebida/promo) sobre la imagen */}
        <span
          className={`absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-sm ${
            product.type === 'promo'
              ? 'bg-[#F6B21A] text-[#003B73]'
              : product.type === 'bebida'
                ? 'bg-[#75AADB] text-white'
                : 'bg-[#003B73] text-white'
          }`}
        >
          {product.type === 'comida' ? 'Comida' : product.type === 'bebida' ? 'Bebida' : 'Promo'}
        </span>
      </div>

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-extrabold leading-tight text-[#003B73] text-pretty">
            {product.name}
          </h3>
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[#6B7280]">
          {product.description}
        </p>

        {/* Chips de momento + stock */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {product.meals.map((m) => (
            <span
              key={m}
              className="inline-flex items-center gap-1 rounded-full bg-[#EEF5FF] px-2 py-0.5 text-[10px] font-semibold capitalize text-[#003B73]"
            >
              {m === 'merienda' ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
              {m}
            </span>
          ))}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${stock.className}`}
          >
            {StockIcon && <StockIcon className="h-3 w-3" />}
            {stock.label}
          </span>
        </div>

        {/* Precio + acción */}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="leading-none">
            <span className="block text-[10px] font-medium uppercase tracking-wide text-[#6B7280]">
              Precio
            </span>
            <span className="text-xl font-extrabold text-[#003B73]">
              {formatPrice(product.price)}
            </span>
          </div>

          {soldOut ? (
            <span className="inline-flex items-center gap-1.5 rounded-2xl bg-[#EEF5FF] px-4 py-2.5 text-sm font-bold text-[#6B7280]">
              <Tag className="h-4 w-4" />
              Agotado
            </span>
          ) : qty === 0 ? (
            <button
              onClick={() => add(product)}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-[#F6B21A] px-4 py-2.5 text-sm font-extrabold text-[#003B73] shadow-md shadow-[#F6B21A]/30 transition-all hover:bg-[#ffbe2e] active:scale-95"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              Agregar
            </button>
          ) : (
            <div className="flex items-center gap-1 rounded-2xl bg-[#003B73] p-1 shadow-md">
              <button
                onClick={() => decrement(product.id)}
                aria-label={`Quitar uno de ${product.name}`}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-white transition-colors hover:bg-white/15 active:scale-90"
              >
                <Minus className="h-4 w-4" strokeWidth={2.5} />
              </button>
              <span className="w-6 text-center text-base font-extrabold text-white">
                {qty}
              </span>
              <button
                onClick={() => increment(product.id)}
                aria-label={`Agregar uno de ${product.name}`}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F6B21A] text-[#003B73] transition-colors hover:bg-[#ffbe2e] active:scale-90"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
