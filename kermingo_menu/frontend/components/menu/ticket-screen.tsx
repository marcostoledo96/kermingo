'use client'

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
  CircleSlash,
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { formatPrice, type LastOrder, type PedidoEstado } from '@/lib/products'
import { ProductIconGlyph } from './product-visual'
import { ArgentinaStripe } from '@/components/argentina-stripe'
import { useLocalStorageState } from '@/lib/use-local-storage'

const LAST_ORDER_KEY = 'kermingo:lastOrder'

const STATUS_LABEL: Record<PedidoEstado, string> = {
  recibido: 'Recibido',
  en_preparacion: 'En preparación',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

const PAYMENT_LABEL = {
  pendiente: { title: 'Pago pendiente', hint: 'Estamos esperando la confirmación del pago.' },
  comprobante_subido: { title: 'Comprobante en revisión', hint: 'Verificamos tu transferencia y te avisamos.' },
  pagado: { title: 'Pago confirmado', hint: 'Tu pago fue confirmado. ¡Gracias!' },
  rechazado: { title: 'Pago rechazado', hint: 'No pudimos validar el comprobante. Acercate al mostrador.' },
}

export function TicketScreen() {
  // `useSyncExternalStore` handles the server/client snapshot difference so
  // React 19 doesn't emit a hydration mismatch warning.
  // The setter is unused (ticket is read-only) but the hook requires it.
  const [order] = useLocalStorageState<LastOrder | null>(LAST_ORDER_KEY, {
    defaultValue: null,
  })

  if (!order) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#003B73] px-6 text-center text-white">
        <TicketIcon className="h-12 w-12 text-[#F6B21A]" />
        <h1 className="mt-4 text-xl font-extrabold">No hay un pedido reciente</h1>
        <p className="mt-2 text-sm text-white/70">
          Volvé al menú y armá tu pedido.
        </p>
        <Link
          href="/menu"
          className="mt-5 rounded-2xl bg-[#F6B21A] px-6 py-3 text-sm font-extrabold text-[#003B73] shadow-lg"
        >
          Ver menú
        </Link>
      </div>
    )
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
    PAYMENT_LABEL[order.payment] ||
    (order.method === 'transferencia'
      ? PAYMENT_LABEL.comprobante_subido
      : PAYMENT_LABEL.pendiente)
  const statusLabel = STATUS_LABEL[order.status]
  const isCancelled = order.status === 'cancelado'
  const isDelivered = order.status === 'entregado'

  const statusColor = isCancelled
    ? 'bg-[#DC2626] text-white'
    : isDelivered
      ? 'bg-[#003B73] text-white'
      : 'bg-[#FFF6E0] text-[#9A6B00]'

  return (
    <div className="min-h-screen bg-[#003B73] px-4 pb-10 pt-8">
      <div className="mx-auto w-full max-w-sm">
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

        <article className="overflow-hidden rounded-[1.75rem] bg-white shadow-2xl shadow-black/30">
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
                    {order.numero}
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusColor}`}
              >
                {isCancelled ? (
                  <CircleSlash className="h-3 w-3" strokeWidth={2.6} />
                ) : (
                  <Hourglass className="h-3 w-3" strokeWidth={2.6} />
                )}
                {statusLabel}
              </span>
            </div>
          </div>

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
            <Detail label="Estado del pago" value={paymentStatus.title} />
          </dl>

          <Perforation />

          <div className="px-6">
            <p className="text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">
              Tu pedido
            </p>
            <ul className="mt-2.5 space-y-2.5">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <span className="flex h-5 w-7 flex-shrink-0 items-center justify-center rounded-md bg-[#003B73] text-xs font-extrabold text-white">
                    {item.cantidad}
                  </span>
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <ProductIconGlyph
                      icon={item.icon}
                      className="h-4 w-4 flex-shrink-0 text-[#75AADB]"
                      strokeWidth={2}
                    />
                    <span className="truncate text-sm font-semibold text-[#003B73]">
                      {item.nombre}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-[#003B73]">
                    {formatPrice(item.subtotal)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mx-6 mt-4 flex items-end justify-between rounded-2xl bg-[#003B73] px-4 py-3">
            <span className="text-sm font-medium text-white/80">
              Total · {order.count} {order.count === 1 ? 'producto' : 'productos'}
            </span>
            <span className="text-2xl font-extrabold leading-none text-[#F6B21A]">
              {formatPrice(order.total)}
            </span>
          </div>

          <Perforation />

          <div className="flex flex-col items-center px-6">
            <div className="rounded-xl border-4 border-white bg-white p-2 shadow-inner">
              <QRCodeSVG
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/seguimiento?token=${order.token}`}
                size={168}
                fgColor="#003B73"
                bgColor="#FFFFFF"
                level="M"
              />
            </div>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">
              Código de seguimiento
            </p>
            <p className="text-sm font-extrabold tracking-widest text-[#003B73]">{order.token.slice(0, 12).toUpperCase()}</p>
          </div>

          <div className="mt-5 flex items-start gap-2.5 border-t border-dashed border-[#75AADB]/30 px-6 py-4">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#75AADB]" strokeWidth={2.4} />
            <div className="leading-snug">
              <p className="text-sm font-bold text-[#003B73]">Estomba 1980</p>
              <p className="text-xs text-[#6B7280] text-pretty">
                Presentá este ticket en el mostrador para retirar tu pedido.
              </p>
            </div>
          </div>
        </article>

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


