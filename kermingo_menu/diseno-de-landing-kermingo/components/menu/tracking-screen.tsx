'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Check,
  ChefHat,
  PackageCheck,
  PartyPopper,
  CircleCheckBig,
  CircleSlash,
  CreditCard,
  Banknote,
  Clock,
  Hash,
  RefreshCw,
  Home,
  FileCheck2,
  TriangleAlert,
} from 'lucide-react'
import { formatPrice, type ProductIcon } from '@/lib/products'
import { ProductIconGlyph } from './product-visual'
import { MenuHeader } from './menu-header'

type OrderStatus = 'recibido' | 'preparacion' | 'listo' | 'entregado' | 'cancelado'
type PaymentStatus = 'pendiente' | 'comprobante' | 'pagado' | 'rechazado' | 'efectivo'

type OrderItem = {
  id: string
  name: string
  icon: ProductIcon
  qty: number
  price: number
}

type TrackedOrder = {
  code: string
  createdAt: string
  status: OrderStatus
  payment: PaymentStatus
  method: 'transferencia' | 'efectivo'
  total: number
  count: number
  items: OrderItem[]
}

const DEMO_ORDER: TrackedOrder = {
  code: 'KMG-0001',
  createdAt: new Date().toISOString(),
  status: 'preparacion',
  payment: 'comprobante',
  method: 'transferencia',
  total: 9000,
  count: 3,
  items: [
    { id: 'pizza-muzza', name: 'Pizza muzza', icon: 'pizza', qty: 2, price: 3500 },
    { id: 'coca', name: 'Coca Cola', icon: 'soda', qty: 1, price: 2000 },
  ],
}

// Configuración visual por estado del pedido.
const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; message: string; badge: string; bg: string; fg: string; chip: string }
> = {
  recibido: {
    label: 'Pedido recibido',
    message: 'Recibimos tu pedido y lo vamos a empezar a preparar.',
    badge: 'Recibido',
    bg: 'bg-[#75AADB]',
    fg: 'text-white',
    chip: 'bg-white/20 text-white',
  },
  preparacion: {
    label: 'Está en preparación',
    message: 'Nuestro equipo está preparando tu pedido en la cocina.',
    badge: 'En preparación',
    bg: 'bg-[#F6B21A]',
    fg: 'text-[#003B73]',
    chip: 'bg-[#003B73]/15 text-[#003B73]',
  },
  listo: {
    label: 'Listo para retirar',
    message: 'Tu pedido está listo. Acercate al mostrador a retirarlo.',
    badge: 'Listo',
    bg: 'bg-[#16A34A]',
    fg: 'text-white',
    chip: 'bg-white/20 text-white',
  },
  entregado: {
    label: 'Entregado',
    message: 'Tu pedido fue entregado. ¡Que lo disfrutes!',
    badge: 'Entregado',
    bg: 'bg-[#003B73]',
    fg: 'text-white',
    chip: 'bg-white/20 text-white',
  },
  cancelado: {
    label: 'Cancelado',
    message: 'Este pedido fue cancelado. Consultá en el mostrador.',
    badge: 'Cancelado',
    bg: 'bg-[#DC2626]',
    fg: 'text-white',
    chip: 'bg-white/20 text-white',
  },
}

const TIMELINE: { key: OrderStatus; label: string; icon: typeof Check }[] = [
  { key: 'recibido', label: 'Recibido', icon: Check },
  { key: 'preparacion', label: 'En preparación', icon: ChefHat },
  { key: 'listo', label: 'Listo', icon: PackageCheck },
  { key: 'entregado', label: 'Entregado', icon: PartyPopper },
]

const TIMELINE_ORDER: OrderStatus[] = ['recibido', 'preparacion', 'listo', 'entregado']

// Configuración visual por estado del pago.
const PAYMENT_CONFIG: Record<
  PaymentStatus,
  { label: string; hint: string; icon: typeof CreditCard; tone: string }
> = {
  pendiente: {
    label: 'Pago pendiente',
    hint: 'Esperando el comprobante de transferencia.',
    icon: Clock,
    tone: 'text-[#9A6B00] bg-[#FFF6E0] border-[#F6B21A]/40',
  },
  comprobante: {
    label: 'Comprobante subido',
    hint: 'Estamos verificando tu transferencia.',
    icon: FileCheck2,
    tone: 'text-[#1D4ED8] bg-[#EEF5FF] border-[#75AADB]/50',
  },
  pagado: {
    label: 'Pago confirmado',
    hint: 'Recibimos tu pago. ¡Gracias!',
    icon: CircleCheckBig,
    tone: 'text-[#15803D] bg-[#ECFDF3] border-[#16A34A]/40',
  },
  rechazado: {
    label: 'Pago rechazado',
    hint: 'No pudimos validar el comprobante. Acercate al mostrador.',
    icon: TriangleAlert,
    tone: 'text-[#B91C1C] bg-[#FEF2F2] border-[#DC2626]/40',
  },
  efectivo: {
    label: 'Pagás en caja al retirar',
    hint: 'Abonás en efectivo cuando retirás tu pedido.',
    icon: Banknote,
    tone: 'text-[#003B73] bg-[#EEF5FF] border-[#75AADB]/50',
  },
}

export function TrackingScreen() {
  const [order, setOrder] = useState<TrackedOrder | null>(null)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('kermingo:lastOrder')
      if (raw) {
        const parsed = JSON.parse(raw)
        setOrder({
          code: parsed.code ?? DEMO_ORDER.code,
          createdAt: parsed.createdAt ?? DEMO_ORDER.createdAt,
          status: parsed.status ?? 'recibido',
          payment:
            parsed.payment ??
            (parsed.method === 'efectivo' ? 'efectivo' : 'comprobante'),
          method: parsed.method ?? 'transferencia',
          total: parsed.total ?? DEMO_ORDER.total,
          count: parsed.count ?? DEMO_ORDER.count,
          items: parsed.items ?? DEMO_ORDER.items,
        })
        return
      }
    } catch {
      // Ignorar y usar demo.
    }
    setOrder(DEMO_ORDER)
  }, [])

  // Demo solo frontend: rota entre estados para previsualizar la UI.
  const cycleStatus = () => {
    setOrder((prev) => {
      if (!prev) return prev
      const flow: OrderStatus[] = [
        'recibido',
        'preparacion',
        'listo',
        'entregado',
        'cancelado',
      ]
      const next = flow[(flow.indexOf(prev.status) + 1) % flow.length]
      return { ...prev, status: next }
    })
  }

  if (!order) {
    return <div className="min-h-screen bg-[#EEF5FF]" />
  }

  const cfg = STATUS_CONFIG[order.status]
  const pay = PAYMENT_CONFIG[order.payment]
  const PayIcon = pay.icon
  const isCancelled = order.status === 'cancelado'
  const currentStep = TIMELINE_ORDER.indexOf(order.status)
  const date = new Date(order.createdAt)
  const dateLabel = date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
  const timeLabel = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen bg-[#EEF5FF]">
      <MenuHeader backHref="/" backLabel="Volver al inicio" showCart={false} />

      <main className="mx-auto max-w-md space-y-4 px-4 pb-12 pt-5">
        {/* Card principal de estado */}
        <section
          className={`overflow-hidden rounded-3xl ${cfg.bg} ${cfg.fg} px-5 py-6 shadow-lg shadow-black/10`}
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
              <Hash className="h-3.5 w-3.5" strokeWidth={2.8} />
              {order.code}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${cfg.chip}`}
            >
              {cfg.badge}
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20">
              {isCancelled ? (
                <CircleSlash className="h-6 w-6" strokeWidth={2.4} />
              ) : order.status === 'entregado' ? (
                <PartyPopper className="h-6 w-6" strokeWidth={2.4} />
              ) : order.status === 'listo' ? (
                <PackageCheck className="h-6 w-6" strokeWidth={2.4} />
              ) : order.status === 'preparacion' ? (
                <ChefHat className="h-6 w-6" strokeWidth={2.4} />
              ) : (
                <CircleCheckBig className="h-6 w-6" strokeWidth={2.4} />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold leading-tight text-balance">
                {cfg.label}
              </h1>
            </div>
          </div>
          <p className="mt-2.5 text-sm leading-relaxed opacity-90 text-pretty">
            {cfg.message}
          </p>
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium opacity-80">
            <Clock className="h-3.5 w-3.5" strokeWidth={2.4} />
            Pedido del {dateLabel} · {timeLabel}
          </p>
        </section>

        {/* Timeline */}
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-[#9CA3AF]">
            Seguimiento
          </h2>

          {isCancelled ? (
            <div className="flex items-center gap-3 rounded-2xl bg-[#FEF2F2] px-4 py-3">
              <CircleSlash className="h-5 w-5 flex-shrink-0 text-[#DC2626]" strokeWidth={2.4} />
              <p className="text-sm font-semibold text-[#B91C1C] text-pretty">
                El pedido fue cancelado y no continúa el seguimiento.
              </p>
            </div>
          ) : (
            <ol className="relative">
              {TIMELINE.map((step, i) => {
                const done = i < currentStep
                const active = i === currentStep
                const Icon = step.icon
                const isLast = i === TIMELINE.length - 1
                return (
                  <li key={step.key} className="relative flex gap-3.5 pb-6 last:pb-0">
                    {/* Conector */}
                    {!isLast && (
                      <span
                        className={`absolute left-[15px] top-8 h-[calc(100%-1rem)] w-0.5 ${
                          done ? 'bg-[#16A34A]' : 'bg-[#E2E8F0]'
                        }`}
                        aria-hidden="true"
                      />
                    )}
                    {/* Nodo */}
                    <span
                      className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                        done
                          ? 'bg-[#16A34A] text-white'
                          : active
                            ? 'bg-[#F6B21A] text-[#003B73] ring-4 ring-[#F6B21A]/25'
                            : 'bg-[#E2E8F0] text-[#94A3B8]'
                      }`}
                    >
                      {done ? (
                        <Check className="h-4 w-4" strokeWidth={3} />
                      ) : (
                        <Icon className="h-4 w-4" strokeWidth={2.4} />
                      )}
                    </span>
                    <div className="pt-1">
                      <p
                        className={`text-sm font-bold ${
                          active
                            ? 'text-[#003B73]'
                            : done
                              ? 'text-[#16A34A]'
                              : 'text-[#94A3B8]'
                        }`}
                      >
                        {step.label}
                      </p>
                      {active && (
                        <p className="text-xs font-medium text-[#75AADB]">En curso ahora</p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        {/* Estado de pago */}
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#9CA3AF]">
            Estado del pago
          </h2>
          <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 ${pay.tone}`}>
            <PayIcon className="mt-0.5 h-5 w-5 flex-shrink-0" strokeWidth={2.3} />
            <div className="leading-snug">
              <p className="text-sm font-extrabold">{pay.label}</p>
              <p className="mt-0.5 text-xs font-medium opacity-80 text-pretty">{pay.hint}</p>
            </div>
          </div>
        </section>

        {/* Detalle del pedido */}
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[#9CA3AF]">
            Detalle del pedido
          </h2>
          <ul className="space-y-3">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <span className="flex h-6 w-8 flex-shrink-0 items-center justify-center rounded-md bg-[#003B73] text-xs font-extrabold text-white">
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

          <div className="mt-4 flex items-center justify-between border-t border-dashed border-[#75AADB]/30 pt-3">
            <span className="flex items-center gap-1.5 text-xs font-medium text-[#6B7280]">
              {order.method === 'transferencia' ? (
                <CreditCard className="h-3.5 w-3.5" strokeWidth={2.4} />
              ) : (
                <Banknote className="h-3.5 w-3.5" strokeWidth={2.4} />
              )}
              {order.method === 'transferencia' ? 'Transferencia' : 'Efectivo'}
            </span>
            <div className="text-right">
              <span className="block text-[11px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                Total · {order.count} {order.count === 1 ? 'producto' : 'productos'}
              </span>
              <span className="text-xl font-extrabold leading-tight text-[#003B73]">
                {formatPrice(order.total)}
              </span>
            </div>
          </div>
        </section>

        {/* Acciones */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={cycleStatus}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#F6B21A] py-4 text-base font-extrabold text-[#003B73] shadow-lg shadow-[#F6B21A]/30 transition-all hover:bg-[#ffbe2e] active:scale-[0.99]"
          >
            <RefreshCw className="h-5 w-5" strokeWidth={2.4} />
            Actualizar estado
          </button>
          <Link
            href="/"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#75AADB]/40 bg-white py-3.5 text-sm font-bold text-[#003B73] transition-colors hover:bg-[#EEF5FF]"
          >
            <Home className="h-4 w-4" strokeWidth={2.4} />
            Volver al inicio
          </Link>
        </div>

        <p className="pt-1 text-center text-xs leading-relaxed text-[#6B7280] text-pretty">
          El estado se actualiza automáticamente. Mantené esta pantalla abierta para ver los
          cambios.
        </p>
      </main>
    </div>
  )
}
