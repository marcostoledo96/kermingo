'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Hash,
  MapPin,
  Download,
  Search,
  Ticket as TicketIcon,
  Hourglass,
} from 'lucide-react'
import { formatPrice, type ProductIcon } from '@/lib/products'
import { ProductIconGlyph } from './product-visual'
import { ArgentinaStripe } from '@/components/argentina-stripe'

type OrderItem = {
  id: string
  name: string
  icon: ProductIcon
  qty: number
  price: number
}

type Order = {
  code: string
  createdAt: string
  name: string
  table: string
  whatsapp: string
  notes: string
  method: 'transferencia' | 'efectivo'
  total: number
  count: number
  items: OrderItem[]
}

// Pedido de ejemplo por si se entra directo sin pasar por el checkout.
const FALLBACK_ORDER: Order = {
  code: 'KMG-0001',
  createdAt: new Date().toISOString(),
  name: 'Tomás Giménez',
  table: '12',
  whatsapp: '',
  notes: '',
  method: 'transferencia',
  total: 9000,
  count: 3,
  items: [
    { id: 'pizza-muzza', name: 'Pizza muzza', icon: 'pizza', qty: 2, price: 3500 },
    { id: 'coca', name: 'Coca Cola', icon: 'soda', qty: 1, price: 2000 },
  ],
}

export function TicketScreen() {
  const [order, setOrder] = useState<Order | null>(null)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('kermingo:lastOrder')
      setOrder(raw ? (JSON.parse(raw) as Order) : FALLBACK_ORDER)
    } catch {
      setOrder(FALLBACK_ORDER)
    }
  }, [])

  if (!order) {
    return <div className="min-h-screen bg-[#003B73]" />
  }

  const date = new Date(order.createdAt)
  const dateLabel = date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
  })
  const timeLabel = date.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const paymentLabel = order.method === 'transferencia' ? 'Transferencia' : 'Efectivo'
  const paymentStatus =
    order.method === 'transferencia' ? 'Comprobante en revisión' : 'A pagar en caja'

  return (
    <div className="min-h-screen bg-[#003B73] px-4 pb-10 pt-8">
      <div className="mx-auto w-full max-w-sm">
        {/* Header de éxito */}
        <header className="mb-6 flex flex-col items-center text-center print:hidden">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[#F6B21A]/20 ring-4 ring-[#F6B21A]/15">
            <CheckCircle2 className="h-9 w-9 text-[#F6B21A]" strokeWidth={2.2} />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#75AADB]">Kermingo</p>
          <h1 className="mt-1 text-2xl font-extrabold text-white text-balance">
            ¡Pedido recibido!
          </h1>
          <p className="mt-1 text-sm text-white/70 text-pretty">
            Guardá este ticket para retirar tu pedido en el mostrador.
          </p>
        </header>

        {/* Ticket */}
        <article className="overflow-hidden rounded-[1.75rem] bg-white shadow-2xl shadow-black/30">
          {/* Detalle bandera */}
          <ArgentinaStripe className="h-2" />

          <div className="px-6 pt-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#003B73]">
                  <TicketIcon className="h-4.5 w-4.5 text-white" strokeWidth={2.2} />
                </div>
                <div className="leading-tight">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                    Pedido confirmado
                  </p>
                  <p className="flex items-center gap-1 text-lg font-extrabold text-[#003B73]">
                    <Hash className="h-3.5 w-3.5 text-[#75AADB]" strokeWidth={2.6} />
                    {order.code}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF6E0] px-2.5 py-1 text-[11px] font-bold text-[#9A6B00]">
                <Hourglass className="h-3 w-3" strokeWidth={2.6} />
                En preparación
              </span>
            </div>
          </div>

          {/* Datos */}
          <dl className="mt-5 grid grid-cols-2 gap-y-4 px-6">
            <Detail label="Cliente" value={order.name} />
            {order.table && <Detail label="Mesa" value={`N° ${order.table}`} />}
            <Detail label="Fecha" value={dateLabel} icon={<Clock className="h-3 w-3" />} />
            <Detail label="Hora" value={timeLabel} />
            <Detail
              label="Método de pago"
              value={paymentLabel}
              icon={<CreditCard className="h-3 w-3" />}
            />
            <Detail label="Estado del pago" value={paymentStatus} />
          </dl>

          {/* Separador perforado */}
          <Perforation />

          {/* Productos */}
          <div className="px-6">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">
              Tu pedido
            </p>
            <ul className="mt-2.5 space-y-2.5">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <span className="flex h-5 w-7 flex-shrink-0 items-center justify-center rounded-md bg-[#003B73] text-xs font-extrabold text-white">
                    {item.qty}
                  </span>
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <ProductIconGlyph
                      icon={item.icon}
                      className="h-4 w-4 flex-shrink-0 text-[#75AADB]"
                      strokeWidth={2}
                    />
                    <span className="truncate text-sm font-semibold text-[#003B73]">
                      {item.name}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-[#003B73]">
                    {formatPrice(item.qty * item.price)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Total */}
          <div className="mx-6 mt-4 flex items-end justify-between rounded-2xl bg-[#003B73] px-4 py-3">
            <span className="text-sm font-medium text-white/80">
              Total · {order.count} {order.count === 1 ? 'producto' : 'productos'}
            </span>
            <span className="text-2xl font-extrabold leading-none text-[#F6B21A]">
              {formatPrice(order.total)}
            </span>
          </div>

          {/* Separador perforado */}
          <Perforation />

          {/* QR */}
          <div className="flex flex-col items-center px-6">
            <FauxQR seed={order.code} />
            <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">
              Código de seguimiento
            </p>
            <p className="text-sm font-extrabold tracking-widest text-[#003B73]">{order.code}</p>
          </div>

          {/* Dirección */}
          <div className="mt-5 flex items-start gap-2.5 border-t border-dashed border-[#75AADB]/30 px-6 py-4">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#75AADB]" strokeWidth={2.4} />
            <div className="leading-snug">
              <p className="text-sm font-bold text-[#003B73]">Echeverría 3920</p>
              <p className="text-xs text-[#6B7280] text-pretty">
                Presentá este ticket en el mostrador para retirar tu pedido.
              </p>
            </div>
          </div>
        </article>

        {/* Acciones */}
        <div className="mt-6 space-y-2.5 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#F6B21A] py-4 text-base font-extrabold text-[#003B73] shadow-lg shadow-black/20 transition-all hover:bg-[#ffbe2e] active:scale-[0.99]"
          >
            <Download className="h-5 w-5" strokeWidth={2.4} />
            Descargar ticket PDF
          </button>
          <Link
            href="/seguimiento"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/5 py-3.5 text-sm font-bold text-white transition-colors hover:bg-white/10"
          >
            <Search className="h-4 w-4" strokeWidth={2.4} />
            Seguir mi pedido
          </Link>
          <Link
            href="/"
            className="block py-2 text-center text-sm font-medium text-[#75AADB] underline-offset-2 hover:underline"
          >
            Volver al inicio
          </Link>
        </div>

        {/* Mensaje institucional */}
        <p className="mt-6 text-center text-xs leading-relaxed text-white/55 text-pretty print:hidden">
          Gracias por colaborar con el campamento de verano del Grupo Scout San Patricio.
        </p>
      </div>
    </div>
  )
}

function Detail({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: React.ReactNode
}) {
  return (
    <div className="leading-tight">
      <dt className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-bold text-[#003B73]">{value}</dd>
    </div>
  )
}

function Perforation() {
  return (
    <div className="relative my-5 flex items-center" aria-hidden="true">
      <div className="absolute -left-3 h-6 w-6 rounded-full bg-[#003B73]" />
      <div className="mx-3 flex-1 border-t-2 border-dashed border-[#75AADB]/35" />
      <div className="absolute -right-3 h-6 w-6 rounded-full bg-[#003B73]" />
    </div>
  )
}

/** QR decorativo determinístico (solo visual, sin librerías). */
function FauxQR({ seed }: { seed: string }) {
  const size = 17
  const cells: boolean[] = []
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  for (let i = 0; i < size * size; i++) {
    h = (h * 1103515245 + 12345) & 0x7fffffff
    cells.push((h >> 8) % 100 < 48)
  }

  const isFinder = (r: number, c: number) => {
    const inBox = (br: number, bc: number) =>
      r >= br && r < br + 7 && c >= bc && c < bc + 7
    return inBox(0, 0) || inBox(0, size - 7) || inBox(size - 7, 0)
  }

  return (
    <div
      className="grid rounded-xl border-4 border-white bg-white p-2 shadow-inner"
      style={{
        gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
        width: 168,
        height: 168,
      }}
    >
      {cells.map((on, i) => {
        const r = Math.floor(i / size)
        const c = i % size
        const filled = isFinder(r, c)
          ? (r % 6 === 0 || c % 6 === 0 || (r >= 2 && r <= 4 && c >= 2 && c <= 4) ||
             (r >= 2 && r <= 4 && c >= size - 5 && c <= size - 3) ||
             (r >= size - 5 && r <= size - 3 && c >= 2 && c <= 4))
          : on
        return (
          <div
            key={i}
            className={filled ? 'bg-[#003B73]' : 'bg-transparent'}
            style={{ aspectRatio: '1 / 1' }}
          />
        )
      })}
    </div>
  )
}
