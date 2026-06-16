'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLocalStorageState } from '@/lib/use-local-storage'
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
  AlertCircle,
  Search,
  Loader2,
  Store,
} from 'lucide-react'
import { formatPrice, type PedidoEstado, type PedidoPago, type ProductIcon } from '@/lib/products'
import { ProductIconGlyph } from './product-visual'
import { MenuHeader } from './menu-header'
import { apiGet, ApiError } from '@/lib/api'
import { mapPedido } from '@/lib/mappers'
import type { ApiPedido } from '@/lib/types'
import { pickProductIcon } from '@/lib/mappers'

const LAST_TOKEN_KEY = 'kermingo:lastToken'

type DisplayOrder = {
  numero: string
  createdAt: string
  status: PedidoEstado
  payment: PedidoPago
  method: 'transferencia' | 'efectivo'
  total: number
  count: number
  items: Array<{
    id: string
    nombre: string
    icon: ProductIcon
    cantidad: number
    precio_unitario: number
    subtotal: number
  }>
}

const STATUS_CONFIG: Record<
  PedidoEstado,
  { label: string; message: string; badge: string; bg: string; fg: string; chip: string }
> = {
  recibido: {
    label: 'Pedido recibido',
    message: 'Recibimos tu pedido y lo vamos a empezar a preparar.',
    badge: 'Recibido',
    bg: 'bg-[var(--km-info-bg)]',
    fg: 'text-[var(--km-info-text)]',
    chip: 'bg-[var(--km-info-text)]/10 text-[var(--km-info-text)]',
  },
  en_preparacion: {
    label: 'Está en preparación',
    message: 'Nuestro equipo está preparando tu pedido en la cocina.',
    badge: 'En preparación',
    bg: 'bg-[var(--km-preparando-bg)]',
    fg: 'text-[var(--km-preparando-text)]',
    chip: 'bg-[var(--km-preparando-text)]/10 text-[var(--km-preparando-text)]',
  },
  listo: {
    label: 'Listo para retirar',
    message: 'Tu pedido está listo. Acercate al mostrador a retirarlo.',
    badge: 'Listo',
    bg: 'bg-[var(--km-listo-bg)]',
    fg: 'text-[var(--km-listo-text)]',
    chip: 'bg-[var(--km-listo-text)]/10 text-[var(--km-listo-text)]',
  },
  entregado: {
    label: 'Entregado',
    message: 'Tu pedido fue entregado. ¡Que lo disfrutes!',
    badge: 'Entregado',
    bg: 'bg-[var(--km-entregado-bg)]',
    fg: 'text-[var(--km-entregado-text)]',
    chip: 'bg-[var(--km-entregado-text)]/10 text-[var(--km-entregado-text)]',
  },
  cancelado: {
    label: 'Cancelado',
    message: 'Este pedido fue cancelado. Consultá en el mostrador.',
    badge: 'Cancelado',
    bg: 'bg-[var(--km-peligro-bg)]',
    fg: 'text-[var(--km-peligro-text)]',
    chip: 'bg-[var(--km-peligro-text)]/10 text-[var(--km-peligro-text)]',
  },
}

const TIMELINE: { key: PedidoEstado; label: string; icon: typeof Check }[] = [
  { key: 'recibido', label: 'Recibido', icon: Check },
  { key: 'en_preparacion', label: 'En preparación', icon: ChefHat },
  { key: 'listo', label: 'Listo para retirar', icon: PackageCheck },
  { key: 'entregado', label: 'Entregado', icon: PartyPopper },
]

const TIMELINE_ORDER: PedidoEstado[] = ['recibido', 'en_preparacion', 'listo', 'entregado']

// Step color tokens aligned with STATUS_CONFIG
const STEP_COLORS: Record<string, { dot: string; line: string; text: string }> = {
  recibido: { dot: 'bg-[var(--km-info-text)]', line: 'bg-[var(--km-info-text)]', text: 'text-[var(--km-info-text)]' },
  en_preparacion: { dot: 'bg-[var(--km-preparando-text)]', line: 'bg-[var(--km-preparando-text)]', text: 'text-[var(--km-preparando-text)]' },
  listo: { dot: 'bg-[var(--km-listo-text)]', line: 'bg-[var(--km-listo-text)]', text: 'text-[var(--km-listo-text)]' },
  entregado: { dot: 'bg-[var(--km-entregado-text)]', line: 'bg-[var(--km-entregado-text)]', text: 'text-[var(--km-entregado-text)]' },
}

const PAYMENT_CONFIG: Record<
  PedidoPago,
  { label: string; hint: string; icon: typeof CreditCard; tone: string }
> = {
  pendiente: {
    label: 'Pago pendiente',
    hint: 'Esperando el comprobante de transferencia.',
    icon: Clock,
    tone: 'text-[var(--km-preparando-text)] bg-[var(--km-preparando-bg)] border-[var(--km-preparando-text)]/40',
  },
  comprobante_subido: {
    label: 'Comprobante subido',
    hint: 'Estamos verificando tu transferencia.',
    icon: FileCheck2,
    tone: 'text-[var(--km-info-text)] bg-[var(--km-info-bg)] border-[var(--km-info-text)]/40',
  },
  pagado: {
    label: 'Pago confirmado',
    hint: 'Recibimos tu pago. ¡Gracias!',
    icon: CircleCheckBig,
    tone: 'text-[var(--km-listo-text)] bg-[var(--km-listo-bg)] border-[var(--km-listo-text)]/40',
  },
  rechazado: {
    label: 'Pago rechazado',
    hint: 'No pudimos validar el comprobante. Acercate al mostrador.',
    icon: TriangleAlert,
    tone: 'text-[var(--km-peligro-text)] bg-[var(--km-peligro-bg)] border-[var(--km-peligro-text)]/40',
  },
}

export function TrackingScreen() {
  const [storedToken, setToken] = useLocalStorageState<string>(LAST_TOKEN_KEY, {
    defaultValue: '',
  })
  const [order, setOrder] = useState<DisplayOrder | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const initialFetchDone = useRef(false)

  const searchParams = useSearchParams()
  const urlToken = searchParams.get('token')
  const token = storedToken

  const fetchByToken = useCallback(async (t: string) => {
    const trimmed = t.trim()
    if (!trimmed) {
      setError('Pegá o escribí el código de seguimiento')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await apiGet<ApiPedido>(`/api/pedidos/seguimiento/${encodeURIComponent(trimmed)}`)
      const mapped = mapPedido(data)
      setOrder({
        numero: mapped.numero,
        createdAt: mapped.createdAt,
        status: mapped.status,
        payment: mapped.payment,
        method: mapped.method,
        total: mapped.total,
        count: mapped.count,
        items: mapped.items.map((it) => ({
          id: it.id,
          nombre: it.nombre,
          icon: pickProductIcon(it.nombre, 'comida'),
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
          subtotal: it.subtotal,
        })),
      })
      try {
        window.localStorage.setItem(LAST_TOKEN_KEY, trimmed)
      } catch {
        // Almacenamiento no disponible.
      }
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : 'No se pudo consultar el seguimiento'
      setError(msg)
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialFetchDone.current) return
    initialFetchDone.current = true
    const effectiveToken = urlToken || token
    if (effectiveToken) {
      if (urlToken && urlToken !== token) {
        setToken(urlToken)
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchByToken(effectiveToken)
    }
  }, [token, urlToken, setToken, fetchByToken])

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchByToken(token)
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[var(--km-fondo)]">
        <MenuHeader backHref="/" backLabel="Volver al inicio" showCart={false} />
        <main className="mx-auto max-w-xl space-y-4 px-4 pb-12 pt-5">
          <form
            onSubmit={onSubmit}
            className="km-panel p-5"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--km-azul)]">
                <Search className="h-5 w-5 text-white" strokeWidth={2.2} />
              </div>
              <div className="leading-tight">
                <h1 className="text-xl font-extrabold text-[var(--km-azul)]">Seguí tu pedido</h1>
                <p className="text-sm text-[var(--km-tinta-suave)]">
                  Buscá tu pedido con el código del ticket
                </p>
              </div>
            </div>
            <label className="mt-4 block">
              <span className="text-sm font-bold text-[var(--km-azul)]">
                Código de seguimiento
              </span>
              <input
                ref={inputRef}
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Pegá el código que te llegó al confirmar"
                className="kermingo-input mt-1.5 w-full"
                disabled={loading}
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="km-focus mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--km-dorado)] py-3 text-sm font-extrabold text-[var(--km-azul)] shadow-md shadow-[var(--km-dorado)]/30 transition-all hover:bg-[#ffbe2e] disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando…
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Buscar pedido
                </>
              )}
            </button>
            {error && (
              <div
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-xl border border-[var(--km-peligro-text)]/30 bg-[var(--km-peligro-bg)] p-3 text-sm text-[var(--km-peligro-text)]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </form>
          <Link
            href="/"
            className="km-focus flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--km-linea)] bg-white py-3 text-sm font-bold text-[var(--km-azul)] transition-colors hover:bg-[var(--km-fondo)]"
          >
            <Home className="h-4 w-4" strokeWidth={2.4} />
            Volver al inicio
          </Link>
        </main>
      </div>
    )
  }

  const cfg = STATUS_CONFIG[order.status]
  const pay = PAYMENT_CONFIG[order.payment] || PAYMENT_CONFIG.pendiente
  const PayIcon = pay.icon
  const isCancelled = order.status === 'cancelado'
  const currentStep = TIMELINE_ORDER.indexOf(order.status)
  const date = new Date(order.createdAt)
  const dateLabel = date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
  const timeLabel = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen bg-[var(--km-fondo)]">
      <MenuHeader backHref="/" backLabel="Volver al inicio" showCart={false} />

      <main className="mx-auto max-w-xl space-y-4 px-4 pb-12 pt-5">
        {/* Header de estado */}
        <section
          className={`overflow-hidden rounded-2xl ${cfg.bg} ${cfg.fg} px-5 py-5 shadow-lg shadow-black/10`}
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold km-tabular">
              <Hash className="h-3.5 w-3.5" strokeWidth={2.8} />
              {order.numero}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${cfg.chip}`}
            >
              {cfg.badge}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/20">
              {isCancelled ? (
                <CircleSlash className="h-5 w-5" strokeWidth={2.4} />
              ) : order.status === 'entregado' ? (
                <PartyPopper className="h-5 w-5" strokeWidth={2.4} />
              ) : order.status === 'listo' ? (
                <PackageCheck className="h-5 w-5" strokeWidth={2.4} />
              ) : order.status === 'en_preparacion' ? (
                <ChefHat className="h-5 w-5" strokeWidth={2.4} />
              ) : (
                <CircleCheckBig className="h-5 w-5" strokeWidth={2.4} />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold leading-tight text-balance">
                {cfg.label}
              </h1>
            </div>
          </div>
          <p className="mt-2 text-sm leading-relaxed opacity-90 text-pretty">
            {cfg.message}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium opacity-80">
            <Clock className="h-3.5 w-3.5" strokeWidth={2.4} />
            Pedido del {dateLabel} · {timeLabel}
          </p>
        </section>

        {/* Línea de progreso */}
        <section className="km-panel p-5">
          <h2 className="mb-4 text-sm font-bold tracking-wide text-[var(--km-tinta-suave)]">
            Seguimiento
          </h2>

          {isCancelled ? (
            <div className="flex items-center gap-3 rounded-xl bg-[var(--km-peligro-bg)] px-4 py-3">
              <CircleSlash className="h-5 w-5 flex-shrink-0 text-[var(--km-peligro-text)]" strokeWidth={2.4} />
              <p className="text-sm font-semibold text-[var(--km-peligro-text)] text-pretty">
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
                const colors = STEP_COLORS[step.key]
                return (
                  <li key={step.key} className="relative flex gap-3.5 pb-6 last:pb-0">
                    {!isLast && (
                      <span
                        className={`absolute left-[15px] top-8 h-[calc(100%-1rem)] w-0.5 ${
                          done ? colors.line : 'bg-[var(--km-linea)]'
                        }`}
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={`km-focus relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                        done
                          ? `${colors.dot} text-white`
                          : active
                            ? `${colors.dot} ring-4 ring-[var(--km-dorado)]/25 text-white`
                            : 'bg-[var(--km-linea)] text-[var(--km-tinta-suave)]'
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
                            ? colors.text
                            : done
                              ? colors.text
                              : 'text-[var(--km-tinta-suave)]'
                        }`}
                      >
                        {step.label}
                      </p>
                      {active && (
                        <p className="text-xs font-medium text-[var(--km-celeste)]">En curso ahora</p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </section>

        {/* Estado del pago */}
        <section className="km-panel p-5">
          <h2 className="mb-3 text-sm font-bold tracking-wide text-[var(--km-tinta-suave)]">
            Estado del pago
          </h2>
          <div className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 ${pay.tone}`}>
            <PayIcon className="mt-0.5 h-5 w-5 flex-shrink-0" strokeWidth={2.3} />
            <div className="leading-snug">
              <p className="text-sm font-bold">{pay.label}</p>
              <p className="mt-0.5 text-xs font-medium opacity-80 text-pretty">{pay.hint}</p>
            </div>
          </div>
        </section>

        {/* Detalle del pedido */}
        <section className="km-panel p-5">
          <h2 className="mb-3 text-sm font-bold tracking-wide text-[var(--km-tinta-suave)]">
            Detalle del pedido
          </h2>
          <ul className="space-y-3">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <span className="flex h-6 w-8 flex-shrink-0 items-center justify-center rounded-md bg-[var(--km-azul)] text-xs font-extrabold text-white km-tabular">
                  {item.cantidad}
                </span>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <ProductIconGlyph
                    icon={item.icon}
                    className="h-4 w-4 flex-shrink-0 text-[var(--km-celeste)]"
                    strokeWidth={2}
                  />
                  <span className="truncate text-sm font-semibold text-[var(--km-azul)]">
                    {item.nombre}
                  </span>
                </div>
                <span className="text-sm font-bold text-[var(--km-azul)] km-tabular">
                  {formatPrice(item.subtotal)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between border-t border-dashed border-[var(--km-linea)] pt-3">
            <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--km-tinta-suave)]">
              {order.method === 'transferencia' ? (
                <CreditCard className="h-3.5 w-3.5" strokeWidth={2.4} />
              ) : (
                <Banknote className="h-3.5 w-3.5" strokeWidth={2.4} />
              )}
              {order.method === 'transferencia' ? 'Transferencia' : 'Efectivo'}
            </span>
            <div className="text-right">
              <span className="block text-[11px] font-medium tracking-wide text-[var(--km-tinta-suave)]">
                Total · {order.count} {order.count === 1 ? 'producto' : 'productos'}
              </span>
              <span className="text-xl font-extrabold leading-tight text-[var(--km-azul)] km-tabular">
                {formatPrice(order.total)}
              </span>
            </div>
          </div>
        </section>

        {/* Retiro en mostrador */}
        <div className="flex items-start gap-2.5 rounded-xl bg-[var(--km-info-bg)] px-4 py-3">
          <Store className="mt-0.5 h-4.5 w-4.5 flex-shrink-0 text-[var(--km-info-text)]" strokeWidth={2.2} />
          <p className="text-xs leading-relaxed text-[var(--km-info-text)]">
            Retirá tu pedido en el mostrador del evento. Mostrá el número o escaneá el QR del ticket.
          </p>
        </div>

        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={() => fetchByToken(token)}
            disabled={loading}
            className="km-focus flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--km-dorado)] py-4 text-base font-extrabold text-[var(--km-azul)] shadow-lg shadow-[var(--km-dorado)]/30 transition-all hover:bg-[#ffbe2e] active:scale-[0.99] disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RefreshCw className="h-5 w-5" strokeWidth={2.4} />
            )}
            Actualizar estado
          </button>
          <Link
            href="/"
            className="km-focus flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--km-linea)] bg-white py-3.5 text-sm font-bold text-[var(--km-azul)] transition-colors hover:bg-[var(--km-fondo)]"
          >
            <Home className="h-4 w-4" strokeWidth={2.4} />
            Volver al inicio
          </Link>
        </div>

        <p className="pt-1 text-center text-xs leading-relaxed text-[var(--km-tinta-suave)] text-pretty">
          El estado se actualiza desde la base de datos. Tocá &quot;Actualizar estado&quot; para refrescar.
        </p>
      </main>
    </div>
  )
}