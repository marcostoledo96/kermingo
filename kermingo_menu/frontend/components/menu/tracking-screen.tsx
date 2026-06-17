'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
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
  X,
  ListOrdered,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { formatPrice, type PedidoEstado, type PedidoPago, type ProductIcon } from '@/lib/products'
import { ProductIconGlyph } from './product-visual'
import { MenuHeader } from './menu-header'
import { apiGet, ApiError } from '@/lib/api'
import { mapPedido, pickProductIcon } from '@/lib/mappers'
import type { ApiPedido } from '@/lib/types'
import { useMyOrders, addMyOrder, getLegacyLastToken, type MyOrderEntry } from '@/lib/my-orders'

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

type FetchedOrder = {
  token: string
  data: DisplayOrder | null
  error: string | null
  loading: boolean
}

export function TrackingScreen() {
  const { orders: myOrders, remove: removeFromList } = useMyOrders()
  const [showManual, setShowManual] = useState(false)
  const [orders, setOrders] = useState<Record<string, FetchedOrder>>({})
  const [globalLoading, setGlobalLoading] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [manualToken, setManualToken] = useState('')
  const [manualLoading, setManualLoading] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const initialFetchDone = useRef(false)
  const initialEntriesRef = useRef<MyOrderEntry[] | null>(null)

  const searchParams = useSearchParams()
  const urlToken = searchParams.get('token')

  // Lista de tokens a mostrar, derivada de myOrders + urlToken + legacy
  const entries = useMemo<MyOrderEntry[]>(() => {
    if (!hydrated) return []
    let next: MyOrderEntry[] = [...myOrders]
    const legacy = getLegacyLastToken()
    if (legacy && !next.some((e) => e.token === legacy)) {
      next = [...next, { token: legacy, numero: '', createdAt: new Date(0).toISOString() }]
    }
    if (urlToken && !next.some((e) => e.token === urlToken)) {
      next = [...next, { token: urlToken, numero: '', createdAt: new Date().toISOString() }]
    }
    next.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    return next
  }, [myOrders, urlToken, hydrated])

  // Marcar hidratado después del primer render del cliente
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true)
  }, [])

  // Si hay urlToken nuevo, agregarlo a la lista persistida (una vez)
  useEffect(() => {
    if (!urlToken) return
    if (!myOrders.some((e) => e.token === urlToken)) {
      addMyOrder({
        token: urlToken,
        numero: '',
        createdAt: new Date().toISOString(),
      })
    }
    // También actualizar la key legacy
    try {
      window.localStorage.setItem('kermingo:lastToken', JSON.stringify(urlToken))
    } catch {
      // noop
    }
  }, [urlToken, myOrders])

  // Capturar las primeras entradas válidas (post-hidratación) para el fetch inicial
  useEffect(() => {
    if (initialEntriesRef.current === null && entries.length > 0) {
      initialEntriesRef.current = entries
    }
  }, [entries])

  const fetchOne = useCallback(async (token: string, isManual = false): Promise<DisplayOrder | null> => {
    try {
      const data = await apiGet<ApiPedido>(`/api/pedidos/seguimiento/${encodeURIComponent(token.trim())}`)
      const mapped = mapPedido(data)
      return {
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
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'No se pudo consultar el seguimiento'
      if (isManual) throw new Error(msg)
      return null
    }
  }, [])

  const fetchAll = useCallback(async (entryList: MyOrderEntry[]) => {
    if (entryList.length === 0) return
    setGlobalLoading(true)
    setGlobalError(null)
    setOrders((prev) => {
      const next: Record<string, FetchedOrder> = {}
      for (const e of entryList) {
        next[e.token] = prev[e.token] ?? { token: e.token, data: null, error: null, loading: true }
      }
      return next
    })

    const results = await Promise.allSettled(
      entryList.map(async (e) => {
        const data = await fetchOne(e.token, false)
        return { token: e.token, data, error: data ? null : 'No se pudo cargar' }
      }),
    )

    setOrders((prev) => {
      const next: Record<string, FetchedOrder> = { ...prev }
      for (const r of results) {
        if (r.status === 'fulfilled') {
          const { token, data, error } = r.value
          next[token] = { token, data, error, loading: false }
          if (data?.numero) {
            const e = entryList.find((x) => x.token === token)
            if (e && !e.numero) {
              addMyOrder({ token, numero: data.numero, createdAt: e.createdAt })
            }
          }
        }
      }
      return next
    })

    setGlobalLoading(false)
  }, [fetchOne])

  // Fetch inicial cuando hay entradas
  useEffect(() => {
    if (initialFetchDone.current) return
    if (entries.length === 0) return // todavía hidratando
    initialFetchDone.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll(entries)
  }, [entries, fetchAll])

  const onRefreshAll = () => {
    fetchAll(entries)
  }

  const onRefreshOne = (token: string) => {
    setOrders((prev) => ({
      ...prev,
      [token]: { ...(prev[token] ?? { token, data: null, error: null }), loading: true },
    }))
    fetchOne(token, false).then((data) => {
      setOrders((prev) => ({
        ...prev,
        [token]: {
          token,
          data,
          error: data ? null : 'No se pudo cargar',
          loading: false,
        },
      }))
      if (data?.numero) {
        const e = entries.find((x) => x.token === token)
        if (e && !e.numero) {
          addMyOrder({ token, numero: data.numero, createdAt: e.createdAt })
        }
      }
    })
  }

  const onRemoveOne = (token: string) => {
    if (!window.confirm('¿Sacar este pedido de tu lista? Solo lo quitamos de tu celular.')) return
    removeFromList(token)
    setOrders((prev) => {
      const next = { ...prev }
      delete next[token]
      return next
    })
  }

  const onManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = manualToken.trim()
    if (!trimmed) {
      setManualError('Pegá o escribí el código de seguimiento')
      return
    }
    setManualLoading(true)
    setManualError(null)
    try {
      const data = await fetchOne(trimmed, true)
      if (!data) throw new Error('No encontrado')
      addMyOrder({ token: trimmed, numero: data.numero, createdAt: data.createdAt })
      setShowManual(false)
      setManualToken('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo consultar el seguimiento'
      setManualError(msg)
    } finally {
      setManualLoading(false)
    }
  }

  // ── Estados de render ─────────────────────────────────────────────

  // Antes de hidratar localStorage, mostrar loading para evitar flash del form
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-[var(--km-fondo)]">
        <MenuHeader backHref="/" backLabel="Volver al inicio" showCart={false} />
        <main className="mx-auto max-w-xl space-y-4 px-4 pb-12 pt-5">
          <div className="km-panel flex items-center justify-center gap-2.5 p-8 text-sm text-[var(--km-tinta-suave)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Buscando tus pedidos…
          </div>
        </main>
      </div>
    )
  }

  // No hay pedidos en este dispositivo → mostrar form
  if (entries.length === 0) {
    return (
      <ManualLookup
        loading={manualLoading}
        error={manualError}
        token={manualToken}
        onChange={setManualToken}
        onSubmit={onManualSubmit}
        onCancel={showManual ? () => setShowManual(false) : undefined}
      />
    )
  }

  // Hay pedidos → mostrar lista
  return (
    <div className="min-h-screen bg-[var(--km-fondo)]">
      <MenuHeader backHref="/" backLabel="Volver al inicio" showCart={false} />

      <main className="mx-auto max-w-xl space-y-4 px-4 pb-12 pt-5">
        {/* Header */}
        <section className="km-panel p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--km-azul)]">
                <ListOrdered className="h-5 w-5 text-white" strokeWidth={2.2} />
              </div>
              <div className="leading-tight">
                <h1 className="text-lg font-extrabold text-[var(--km-azul)]">Tus pedidos</h1>
                <p className="text-xs text-[var(--km-tinta-suave)]">
                  {entries.length === 1
                    ? '1 pedido hecho desde este celular'
                    : `${entries.length} pedidos hechos desde este celular`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onRefreshAll}
              disabled={globalLoading}
              className="km-focus flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--km-linea)] bg-white text-[var(--km-azul)] transition-colors hover:bg-[var(--km-fondo)] disabled:opacity-50"
              title="Actualizar todos"
              aria-label="Actualizar todos"
            >
              <RefreshCw className={`h-4 w-4 ${globalLoading ? 'animate-spin' : ''}`} strokeWidth={2.4} />
            </button>
          </div>
        </section>

        {/* Lista de pedidos */}
        {entries.map((entry) => (
          <OrderCard
            key={entry.token}
            entry={entry}
            fetched={orders[entry.token]}
            onRefresh={() => onRefreshOne(entry.token)}
            onRemove={() => onRemoveOne(entry.token)}
          />
        ))}

        {/* Buscar otro */}
        {!showManual ? (
          <button
            type="button"
            onClick={() => setShowManual(true)}
            className="km-focus flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--km-linea)] bg-white py-3 text-sm font-bold text-[var(--km-azul)] transition-colors hover:bg-[var(--km-fondo)]"
          >
            <Search className="h-4 w-4" strokeWidth={2.4} />
            Buscar otro pedido con un código
          </button>
        ) : (
          <ManualLookup
            loading={manualLoading}
            error={manualError}
            token={manualToken}
            onChange={setManualToken}
            onSubmit={onManualSubmit}
            onCancel={() => setShowManual(false)}
            compact
          />
        )}

        {globalError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-[var(--km-peligro-text)]/30 bg-[var(--km-peligro-bg)] p-3 text-sm text-[var(--km-peligro-text)]"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{globalError}</p>
          </div>
        )}

        <Link
          href="/"
          className="km-focus flex w-full items-center justify-center gap-2 rounded-2xl border border-[var(--km-linea)] bg-white py-3 text-sm font-bold text-[var(--km-azul)] transition-colors hover:bg-[var(--km-fondo)]"
        >
          <Home className="h-4 w-4" strokeWidth={2.4} />
          Volver al inicio
        </Link>

        <p className="pt-1 text-center text-xs leading-relaxed text-[var(--km-tinta-suave)] text-pretty">
          El estado se actualiza desde la base de datos. Tocá el botón de refresco para ver cambios.
        </p>
      </main>
    </div>
  )
}

/* ── Card de pedido ──────────────────────────────────────────────── */

function OrderCard({
  entry,
  fetched,
  onRefresh,
  onRemove,
}: {
  entry: MyOrderEntry
  fetched: FetchedOrder | undefined
  onRefresh: () => void
  onRemove: () => void
}) {
  // Si la entrada persistida tiene numero (de un refresh anterior), lo usamos
  // mientras carga el detalle fresco.
  const cachedNumero = entry.numero || formatToken(entry.token)
  const [expanded, setExpanded] = useState(true)

  if (!fetched) {
    return (
      <section className="km-panel p-4">
        <div className="flex items-center gap-2 text-sm text-[var(--km-tinta-suave)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando {cachedNumero}…
        </div>
      </section>
    )
  }

  if (fetched.loading && !fetched.data) {
    return (
      <section className="km-panel p-4">
        <div className="flex items-center gap-2 text-sm text-[var(--km-tinta-suave)]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Buscando {cachedNumero}…
        </div>
      </section>
    )
  }

  if (fetched.error || !fetched.data) {
    return (
      <section className="km-panel overflow-hidden p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-sm font-extrabold text-[var(--km-azul)]">
              {cachedNumero}
            </p>
            <p className="mt-1 text-xs text-[var(--km-peligro-text)]">
              {fetched.error ?? 'No se pudo cargar este pedido'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onRefresh}
              className="km-focus flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--km-linea)] bg-white text-[var(--km-azul)] hover:bg-[var(--km-fondo)]"
              aria-label="Reintentar"
            >
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={2.4} />
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="km-focus flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--km-linea)] bg-white text-[var(--km-peligro-text)] hover:bg-[var(--km-peligro-bg)]"
              aria-label="Quitar de mi lista"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.4} />
            </button>
          </div>
        </div>
      </section>
    )
  }

  const order = fetched.data
  return <OrderDetail order={order} expanded={expanded} setExpanded={setExpanded} onRefresh={onRefresh} onRemove={onRemove} />
}

function OrderDetail({
  order,
  expanded,
  setExpanded,
  onRefresh,
  onRemove,
}: {
  order: DisplayOrder
  expanded: boolean
  setExpanded: (v: boolean) => void
  onRefresh: () => void
  onRemove: () => void
}) {
  const cfg = STATUS_CONFIG[order.status]
  const pay = PAYMENT_CONFIG[order.payment] || PAYMENT_CONFIG.pendiente
  const PayIcon = pay.icon
  const isCancelled = order.status === 'cancelado'
  const currentStep = TIMELINE_ORDER.indexOf(order.status)
  const date = new Date(order.createdAt)
  const dateLabel = date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
  const timeLabel = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  return (
    <article className="km-panel overflow-hidden">
      <section className={`${cfg.bg} ${cfg.fg} px-5 py-4`}>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-extrabold km-tabular">
            <Hash className="h-3.5 w-3.5" strokeWidth={2.8} />
            {order.numero}
          </span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${cfg.chip}`}>
            {cfg.badge}
          </span>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/25">
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
          <h2 className="text-base font-extrabold leading-tight text-balance">
            {cfg.label}
          </h2>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed opacity-90 text-pretty">
          {cfg.message}
        </p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium opacity-80">
          <Clock className="h-3 w-3" strokeWidth={2.4} />
          {dateLabel} · {timeLabel}
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="km-focus inline-flex items-center gap-1 rounded-full bg-white/25 px-2.5 py-1 text-[11px] font-bold text-current hover:bg-white/35"
            aria-expanded={expanded}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3" strokeWidth={2.6} />
                Ocultar detalle
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" strokeWidth={2.6} />
                Ver detalle
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="km-focus inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/25 text-current hover:bg-white/35"
            aria-label="Refrescar este pedido"
            title="Refrescar"
          >
            <RefreshCw className="h-3 w-3" strokeWidth={2.4} />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="km-focus inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/25 text-current hover:bg-white/35"
            aria-label="Quitar de mi lista"
            title="Quitar de mi lista"
          >
            <X className="h-3 w-3" strokeWidth={2.4} />
          </button>
        </div>
      </section>

      {expanded && (
        <div className="space-y-4 p-4">
          {/* Línea de progreso */}
          <section>
            <h3 className="mb-3 text-[11px] font-bold tracking-wide text-[var(--km-tinta-suave)]">
              Seguimiento
            </h3>

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
          <section>
            <h3 className="mb-2 text-[11px] font-bold tracking-wide text-[var(--km-tinta-suave)]">
              Estado del pago
            </h3>
            <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${pay.tone}`}>
              <PayIcon className="mt-0.5 h-5 w-5 flex-shrink-0" strokeWidth={2.3} />
              <div className="leading-snug">
                <p className="text-sm font-bold">{pay.label}</p>
                <p className="mt-0.5 text-xs font-medium opacity-80 text-pretty">{pay.hint}</p>
              </div>
            </div>
          </section>

          {/* Detalle del pedido */}
          <section>
            <h3 className="mb-2 text-[11px] font-bold tracking-wide text-[var(--km-tinta-suave)]">
              Detalle del pedido
            </h3>
            <ul className="space-y-2.5">
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

            <div className="mt-3 flex items-center justify-between border-t border-dashed border-[var(--km-linea)] pt-3">
              <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--km-tinta-suave)]">
                {order.method === 'transferencia' ? (
                  <CreditCard className="h-3.5 w-3.5" strokeWidth={2.4} />
                ) : (
                  <Banknote className="h-3.5 w-3.5" strokeWidth={2.4} />
                )}
                {order.method === 'transferencia' ? 'Transferencia' : 'Efectivo'}
              </span>
              <div className="text-right">
                <span className="block text-[10px] font-medium tracking-wide text-[var(--km-tinta-suave)]">
                  Total · {order.count} {order.count === 1 ? 'producto' : 'productos'}
                </span>
                <span className="text-lg font-extrabold leading-tight text-[var(--km-azul)] km-tabular">
                  {formatPrice(order.total)}
                </span>
              </div>
            </div>
          </section>
        </div>
      )}
    </article>
  )
}

/* ── Form de búsqueda manual ─────────────────────────────────────── */

function ManualLookup({
  loading,
  error,
  token,
  onChange,
  onSubmit,
  onCancel,
  compact = false,
}: {
  loading: boolean
  error: string | null
  token: string
  onChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel?: () => void
  compact?: boolean
}) {
  return (
    <section className={`km-panel p-5 ${compact ? 'border-dashed' : ''}`}>
      <form onSubmit={onSubmit}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--km-azul)]">
            <Search className="h-5 w-5 text-white" strokeWidth={2.2} />
          </div>
          <div className="leading-tight">
            <h1 className="text-xl font-extrabold text-[var(--km-azul)]">Buscar otro pedido</h1>
            <p className="text-sm text-[var(--km-tinta-suave)]">
              Pegá el código de seguimiento
            </p>
          </div>
        </div>
        <label className="mt-4 block">
          <span className="text-sm font-bold text-[var(--km-azul)]">
            Código de seguimiento
          </span>
          <input
            type="text"
            value={token}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Pegá el código que te llegó al confirmar"
            className="kermingo-input mt-1.5 w-full"
            disabled={loading}
          />
        </label>
        <div className="mt-3 flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="km-focus flex items-center justify-center gap-2 rounded-2xl border border-[var(--km-linea)] bg-white px-4 py-3 text-sm font-bold text-[var(--km-azul)] transition-colors hover:bg-[var(--km-fondo)]"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="km-focus flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--km-dorado)] py-3 text-sm font-extrabold text-[var(--km-azul)] shadow-md shadow-[var(--km-dorado)]/30 transition-all hover:bg-[#ffbe2e] disabled:opacity-60"
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
        </div>
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
    </section>
  )
}

/** Formatea un token de 12 chars para mostrar mientras el backend responde. */
function formatToken(token: string): string {
  return token.slice(0, 12).toUpperCase()
}
