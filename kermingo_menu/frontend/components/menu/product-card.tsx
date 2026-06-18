'use client'

import { Plus, Minus, Check, AlertTriangle, Infinity as InfinityIcon } from 'lucide-react'
import { formatPrice, type Product, type StockStatus } from '@/lib/products'
import { useCart } from './cart-context'
import { ProductImage } from './product-visual'

const STOCK_CONFIG: Record<
  StockStatus,
  { label: string; className: string; icon: typeof Check | null }
> = {
  disponible: {
    label: 'Disponible',
    className: 'bg-[#003B73]/8 text-[#003B73]',
    icon: Check,
  },
  bajo: {
    label: 'Quedan pocos',
    className: 'bg-[#F6B21A]/20 text-[#8a5d00]',
    icon: AlertTriangle,
  },
  ilimitado: {
    label: 'Siempre hay',
    className: 'bg-[#75AADB]/20 text-[#003B73]',
    icon: InfinityIcon,
  },
  agotado: {
    label: 'Agotado',
    className: 'bg-[#003B73]/10 text-[#5b6b7d]',
    icon: null,
  },
  no_disponible: {
    label: 'Todavía no disponible',
    className: 'bg-[#F6B21A]/15 text-[#8a5d00]',
    icon: null,
  },
}

const TYPE_LABEL: Record<Product['type'], string> = {
  comida: 'Comida',
  bebida: 'Bebida',
  promo: 'Promo',
}

export function ProductCard({
  product,
  disabled = false,
  disabledReason,
}: {
  product: Product
  disabled?: boolean
  disabledReason?: string
}) {
  const { qtyOf, add, increment, decrement } = useCart()
  const qty = qtyOf(product.id)
  const soldOut = product.stock === 'agotado'
  const notAvailable = product.stock === 'no_disponible' || !product.available
  const stock = STOCK_CONFIG[product.stock]
  const StockIcon = stock.icon

  return (
    <article
      className={`relative flex gap-3.5 rounded-3xl border bg-white p-3 transition-shadow ${
        soldOut
          ? 'border-[#75AADB]/20'
          : 'border-[#75AADB]/25 hover:shadow-md'
      }`}
    >
      {/* Visual del producto: foto real o placeholder de marca */}
      <div className="relative w-24 flex-shrink-0">
        <ProductImage
          src={product.image}
          alt={product.name}
          icon={product.icon}
          dimmed={soldOut}
        />
        <span
          className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            product.type === 'promo'
              ? 'bg-[#F6B21A] text-[#003B73]'
              : 'bg-white/90 text-[#003B73] ring-1 ring-[#75AADB]/30'
          }`}
        >
          {TYPE_LABEL[product.type]}
        </span>
      </div>

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        <h3
          className={`font-display text-base font-bold leading-tight text-pretty ${
            soldOut ? 'text-[#5b6b7d]' : 'text-[#003B73]'
          }`}
        >
          {product.name}
        </h3>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[#3A5675]">
          {product.description}
        </p>

        {/* Estado de stock (ícono + texto, no solo color) */}
        <div className="mt-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${stock.className}`}
          >
            {StockIcon && <StockIcon className="h-3 w-3" strokeWidth={2.4} />}
            {stock.label}
          </span>
        </div>

        {/* Precio + acción */}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <span
            className={`font-display text-xl font-extrabold ${
              soldOut ? 'text-[#5b6b7d]' : 'text-[#003B73]'
            }`}
          >
            {formatPrice(product.price)}
          </span>

            {soldOut ? (
              <span className="inline-flex items-center rounded-2xl bg-[#EEF5FF] px-4 py-2.5 text-sm font-bold text-[#5b6b7d] ring-1 ring-[#75AADB]/30">
                Sin stock
              </span>
            ) : notAvailable ? (
              <span className="inline-flex items-center rounded-2xl bg-[#F6B21A]/15 px-4 py-2.5 text-sm font-bold text-[#8a5d00] ring-1 ring-[#F6B21A]/30">
                Todavía no disponible
              </span>
            ) : disabled ? (
              <span className="inline-flex items-center rounded-2xl bg-[#F6B21A]/60 px-4 py-2.5 text-sm font-bold text-[#003B73] text-center">
                {disabledReason || 'No se puede comprar ahora'}
              </span>
            ) : qty === 0 ? (
              <button
                onClick={() => add(product)}
                aria-label={`Agregar ${product.name} al carrito`}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-[#F6B21A] px-4 py-2.5 text-sm font-extrabold text-[#003B73] shadow-sm transition-transform hover:bg-[#ffbe2e] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003B73] focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4" strokeWidth={2.6} />
              Agregar
            </button>
          ) : (
            <div className="flex items-center gap-1 rounded-2xl bg-[#003B73] p-1">
              <button
                onClick={() => decrement(product.id)}
                aria-label={`Quitar uno de ${product.name}`}
                className="flex h-9 w-9 items-center justify-center rounded-xl text-white transition-colors hover:bg-white/15 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Minus className="h-4 w-4" strokeWidth={2.6} />
              </button>
              <span
                className="w-7 text-center text-base font-extrabold text-white"
                aria-label={`Cantidad: ${qty}`}
              >
                {qty}
              </span>
              <button
                onClick={() => increment(product.id)}
                aria-label={`Agregar uno de ${product.name}`}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F6B21A] text-[#003B73] transition-colors hover:bg-[#ffbe2e] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Plus className="h-4 w-4" strokeWidth={2.6} />
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
