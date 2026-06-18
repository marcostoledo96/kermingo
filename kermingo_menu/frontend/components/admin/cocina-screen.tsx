'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChefHat,
  Clock,
  CheckCircle2,
  RefreshCw,
  Hash,
  MapPin,
  AlertCircle,
  Radio,
  ArrowRight,
  Eye,
  MoreHorizontal,
  Flame,
  Bell,
  CircleDot,
  CircleCheck,
  CircleX,
} from 'lucide-react'
import { AdminShell } from './admin-shell'
import { EstadoBadge, SectionTitle } from './admin-ui'
import type { EstadoVisual } from './admin-ui'
import { ProductIconGlyph } from '@/components/menu/product-visual'
import { apiGet, apiPatch, ApiError } from '@/lib/api'
import { useApiResource } from '@/lib/use-api-resource'
import {
  type CocinaPedido,
  type OrderStatus,
  apiToCocinaOrder,
  mapOrderStatus,
  orderStatusToApi,
} from '@/lib/admin'
import type {
  ApiCocinaPedido,
  ApiPedido,
} from '@/lib/types'
import { getActions } from '@/lib/cocina-actions'

/* ---------------------------------------------------------------------------
 * Estado visual para KDS — mapea OrderStatus a EstadoBadge + icon + borde
 * -------------------------------------------------------------------------
 * Cada estado tiene:
 *   - estadoVisual → token de color Kermingo (no Tailwind default)
 *   - icono       → distinción visual que no depende solo del color
 *   - borde       → banda lateral izquierda (left-border) que refuerza el estado
 *   - label       → texto legible
 * ------------------------------------------------------------------------- */

type KdsColumn = 'preparacion' | 'listo'

const KDS_COLUMNS: {
  id: KdsColumn
  label: string
  estado: EstadoVisual
  icon: typeof Clock
  borderClass: string
  headerClass: string
}[] = [
  {
    id: 'preparacion',
    label: 'En preparación',
    estado: 'preparando',
    icon: Flame,
    borderClass: 'border-l-[3px] border-l-[var(--km-preparando-text)]',
    headerClass: 'bg-[var(--km-preparando-bg)] text-[var(--km-preparando-text)]',
  },
  {
    id: 'listo',
    label: 'Listos para entregar',
    estado: 'listo',
    icon: Bell,
    borderClass: 'border-l-[3px] border-l-[var(--km-listo-text)]',
    headerClass: 'bg-[var(--km-listo-bg)] text-[var(--km-listo-text)]',
  },
]

/* Mobile tabs — same data, tab-based */
type TabId = 'preparacion' | 'listo' | 'entregado'

const TABS: { id: TabId; label: string; estado: EstadoVisual; icon: typeof Clock }[] = [
  { id: 'preparacion', label: 'Preparando', estado: 'preparando', icon: Flame },
  { id: 'listo', label: 'Listos', estado: 'listo', icon: Bell },
  { id: 'entregado', label: 'Entregados', estado: 'entregado', icon: CircleCheck },
]

const POLL_INTERVAL_MS = 10_000

/* ---- Status visual mapping for OrderCard ---- */
const CARD_STATUS_VISUAL: Record<
  OrderStatus,
  {
    estado: EstadoVisual
    icon: typeof Clock
    borderClass: string
    bannerClass: string
    bannerIcon: typeof Clock
    label: string
  }
> = {
  recibido: {
    estado: 'informacion',
    icon: CircleDot,
    borderClass: 'border-l-[3px] border-l-[var(--km-info-text)]',
    bannerClass: 'bg-[var(--km-info-bg)] text-[var(--km-info-text)]',
    bannerIcon: CircleDot,
    label: 'Recibido',
  },
  preparacion: {
    estado: 'preparando',
    icon: Flame,
    borderClass: 'border-l-[3px] border-l-[var(--km-preparando-text)]',
    bannerClass: 'bg-[var(--km-preparando-bg)] text-[var(--km-preparando-text)]',
    bannerIcon: Flame,
    label: 'En preparación',
  },
  listo: {
    estado: 'listo',
    icon: Bell,
    borderClass: 'border-l-[3px] border-l-[var(--km-listo-text)]',
    bannerClass: 'bg-[var(--km-listo-bg)] text-[var(--km-listo-text)]',
    bannerIcon: Bell,
    label: 'Listo',
  },
  entregado: {
    estado: 'entregado',
    icon: CircleCheck,
    borderClass: 'border-l-[3px] border-l-[var(--km-entregado-text)]',
    bannerClass: 'bg-[var(--km-entregado-bg)] text-[var(--km-entregado-text)]',
    bannerIcon: CircleCheck,
    label: 'Entregado',
  },
  cancelado: {
    estado: 'cancelado',
    icon: CircleX,
    borderClass: 'border-l-[3px] border-l-[var(--km-peligro-text)]',
    bannerClass: 'bg-[var(--km-peligro-bg)] text-[var(--km-peligro-text)]',
    bannerIcon: CircleX,
    label: 'Cancelado',
  },
}

export function CocinaScreen() {
  const [tab, setTab] = useState<TabId>('preparacion')
  const [actionError, setActionError] = useState<string | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)
  const [cancelMenuOpenId, setCancelMenuOpenId] = useState<string | null>(null)

  const isMutatingRef = useRef(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const {
    data: orders,
    loading,
    refreshing,
    error: loadError,
    refetch,
    setData: setOrders,
  } = useApiResource<CocinaPedido[]>(async () => {
    const headers = await apiGet<ApiCocinaPedido[]>('/api/admin/cocina/pedidos')
    const ordersWithItems = await Promise.all(
      headers.map(async (h) => {
        try {
          const full = await apiGet<ApiPedido>(`/api/admin/cocina/pedidos/${h.id}`)
          return apiToCocinaOrder(h, full.items)
        } catch {
          return apiToCocinaOrder(h, [])
        }
      }),
    )
    setLastSync(new Date())
    return ordersWithItems
  })

  /** Safe refetch: skips the network call while a mutation is in-flight,
   *  so `useApiResource` never persists an empty-array placeholder. */
  const safeRefetch = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (isMutatingRef.current) return
      return refetch(opts)
    },
    [refetch],
  )

  // Polling lifecycle (unchanged)
  useEffect(() => {
    const start = () => {
      if (intervalRef.current) return
      intervalRef.current = setInterval(() => {
        safeRefetch({ silent: true })
      }, POLL_INTERVAL_MS)
    }
    const stop = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        safeRefetch({ silent: true })
        start()
      } else {
        stop()
      }
    }
    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Close cancel menu when clicking outside
  useEffect(() => {
    if (!cancelMenuOpenId) return
    const handler = () => setCancelMenuOpenId(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [cancelMenuOpenId])

  const counts = useMemo(() => {
    const c: Record<TabId, number> = {
      preparacion: 0,
      listo: 0,
      entregado: 0,
    }
    orders?.forEach((o) => {
      if (o.status === 'preparacion' || o.status === 'listo' || o.status === 'entregado') {
        c[o.status] += 1
      }
    })
    return c
  }, [orders])

  const columnOrders = useMemo(() => {
    const map: Record<KdsColumn, CocinaPedido[]> = {
      preparacion: [],
      listo: [],
    }
    ;(orders ?? []).forEach((o) => {
      if (o.status === 'preparacion') map.preparacion.push(o)
      else if (o.status === 'listo') map.listo.push(o)
    })
    return map
  }, [orders])

  const visibleOrders = useMemo(() => {
    if (!orders) return []
    if (tab === 'entregado') return orders.filter((o) => o.status === 'entregado' || o.status === 'cancelado')
    return orders.filter((o) => o.status === tab)
  }, [orders, tab])

  // Productos pendientes: líneas de pedidos activos (en preparación)
  const pending = useMemo(() => {
    const active = (orders ?? []).filter(
      (o) => o.status === 'preparacion',
    )
    const map = new Map<
      string,
      {
        name: string
        icon: NonNullable<typeof orders>[number]['lines'][number]['icon']
        qty: number
        orders: string[]
      }
    >()
    active.forEach((o) => {
      o.lines.forEach((l) => {
        const existing = map.get(l.name)
        if (existing) {
          existing.qty += l.qty
          existing.orders.push(o.code)
        } else {
          map.set(l.name, {
            name: l.name,
            icon: l.icon,
            qty: l.qty,
            orders: [o.code],
          })
        }
      })
    })
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty)
  }, [orders])

  async function advance(id: string, next: OrderStatus, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    if (isMutatingRef.current) return
    isMutatingRef.current = true
    setActingId(id)
    setActionError(null)
    const apiStatus = orderStatusToApi(next)
    try {
      await apiPatch(`/api/admin/cocina/pedidos/${id}/estado`, {
        estado_pedido: apiStatus,
      })
      setOrders((prev) =>
        (prev ?? []).map((o) =>
          o.id === id ? { ...o, status: mapOrderStatus(apiStatus) } : o,
        ),
      )
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : 'No se pudo actualizar el estado',
      )
    } finally {
      isMutatingRef.current = false
      setActingId(null)
    }
  }

  async function cancelOrder(id: string) {
    if (!window.confirm('¿Cancelar el pedido? Se repondrá el stock.')) return
    if (isMutatingRef.current) return
    isMutatingRef.current = true
    setActingId(id)
    setActionError(null)
    setCancelMenuOpenId(null)
    try {
      await apiPatch(`/api/admin/pedidos/${id}/cancelar`, {})
      setOrders((prev) => (prev ?? []).filter((o) => o.id !== id))
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : 'No se pudo cancelar el pedido',
      )
    } finally {
      isMutatingRef.current = false
      setActingId(null)
    }
  }

  const hasActiveOrders = (orders ?? []).some(
    (o) => o.status === 'preparacion' || o.status === 'listo',
  )

  return (
    <AdminShell
      section="Cocina / Entrega"
      status={{ label: liveLabel(lastSync, refreshing), tone: 'success' }}
    >

      {/* Sync bar */}
      <div className="border-b border-[#75AADB]/20 bg-white/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-2 text-xs font-medium text-[#003B73]/60">
          <span className="flex items-center gap-2">
            <Radio className="h-3.5 w-3.5" strokeWidth={2.4} />
            {refreshing ? 'Sincronizando…' : 'Se actualiza cada 10 segundos'}
          </span>
          <button
            onClick={() => safeRefetch({ silent: true })}
            disabled={refreshing}
            title="Refrescar ahora"
            aria-label="Refrescar"
            className="km-focus flex h-8 w-8 items-center justify-center rounded-lg border border-[#75AADB]/30 bg-white text-[#003B73] transition-colors hover:bg-[#EEF5FF] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={2.4} />
          </button>
        </div>
      </div>

      {/* Error banners — use Kermingo tokens instead of red-50/red-700 */}
      {actionError && (
        <div className="mx-auto mt-3 max-w-7xl px-4">
          <div className="flex items-start gap-2.5 rounded-xl border border-[var(--km-peligro-bg)] bg-[var(--km-peligro-bg)] px-4 py-3 text-sm text-[var(--km-peligro-text)]">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2.2} />
            <span className="flex-1 font-medium">{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              className="km-focus rounded-lg border border-[var(--km-peligro-text)]/20 bg-white px-2.5 py-1 text-xs font-bold text-[var(--km-peligro-text)] hover:bg-[var(--km-peligro-bg)]"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {loadError && (
        <div className="mx-auto mt-3 max-w-7xl px-4">
          <div className="flex items-start gap-2.5 rounded-xl border border-[var(--km-peligro-bg)] bg-[var(--km-peligro-bg)] px-4 py-3 text-sm text-[var(--km-peligro-text)]">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2.2} />
            <span className="flex-1 font-medium">{loadError}</span>
            <button
              onClick={() => refetch()}
              className="km-focus rounded-lg border border-[var(--km-peligro-text)]/20 bg-white px-2.5 py-1 text-xs font-bold text-[var(--km-peligro-text)] hover:bg-[var(--km-peligro-bg)]"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      {/* ── Productos pendientes strip — above everything, more useful ── */}
      {pending.length > 0 && (
        <div className="border-b border-[var(--km-preparando-bg)] bg-[var(--km-preparando-bg)]/60">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--km-preparando-text)]">
              <Flame className="h-4 w-4" strokeWidth={2.4} />
              <span>Para preparar</span>
              <span className="km-tabular">{pending.reduce((s, p) => s + p.qty, 0)} ítems en {pending.length} productos</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {pending.slice(0, 12).map((p) => (
                <span
                  key={p.name}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--km-preparando-text)]/15 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#003B73]"
                >
                  <ProductIconGlyph icon={p.icon} className="h-3.5 w-3.5" strokeWidth={2.2} />
                  <span className="km-tabular font-extrabold text-[var(--km-preparando-text)]">{p.qty}×</span>
                  <span className="max-w-[140px] truncate">{p.name}</span>
                </span>
              ))}
              {pending.length > 12 && (
                <span className="inline-flex items-center rounded-lg border border-[#75AADB]/20 bg-white px-2.5 py-1.5 text-xs font-medium text-[#003B73]/60">
                  +{pending.length - 12} más
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── DESKTOP: KDS board — columns by state ── */}
      <div className="hidden lg:block">
        <div className="mx-auto max-w-7xl px-4 py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#75AADB]/30 bg-white/60 py-16 text-center">
              <p className="text-sm font-semibold text-[#003B73]/60">Cargando pedidos…</p>
            </div>
          ) : !hasActiveOrders && (orders ?? []).every((o) => o.status === 'entregado' || o.status === 'cancelado') ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {KDS_COLUMNS.map((col) => {
                const colOrders = columnOrders[col.id]
                return (
                  <div key={col.id} className="flex flex-col">
                    {/* Column header with state icon + count */}
                    <div className={`flex items-center gap-2 rounded-t-2xl px-4 py-2.5 font-bold text-sm ${col.headerClass}`}>
                      <col.icon className="h-4 w-4" strokeWidth={2.4} />
                      <span>{col.label}</span>
                      <span className="km-tabular ml-auto rounded-full bg-white/50 px-2 py-0.5 text-xs font-extrabold">
                        {colOrders.length}
                      </span>
                    </div>

                    {/* Column body */}
                    <div className="min-h-[200px] flex-1 rounded-b-2xl border border-t-0 border-[#75AADB]/15 bg-white shadow-sm shadow-[#003B73]/5">
                      {colOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
                          <col.icon className="h-6 w-6 text-[#75AADB]/40" strokeWidth={1.8} />
                          <p className="text-xs font-medium text-[#003B73]/40">
                            Sin pedidos
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 p-3">
                          {colOrders.map((order) => (
                            <KdsOrderCard
                              key={order.id}
                              order={order}
                              acting={actingId === order.id}
                              onAction={(next, confirmMsg) => advance(order.id, next, confirmMsg)}
                              onCancel={() => cancelOrder(order.id)}
                              cancelMenuOpen={cancelMenuOpenId === order.id}
                              onCancelMenuToggle={() =>
                                setCancelMenuOpenId(cancelMenuOpenId === order.id ? null : order.id)
                              }
                              onCancelMenuClose={() => setCancelMenuOpenId(null)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Entregados/Cancelados collapsed at bottom on desktop */}
          {(orders ?? []).some((o) => o.status === 'entregado' || o.status === 'cancelado') && (
            <details className="mt-4">
              <summary className="km-focus cursor-pointer select-none rounded-xl border border-[#75AADB]/15 bg-white/60 px-4 py-2.5 text-xs font-bold text-[#003B73]/50 hover:bg-white">
                <span className="flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Pedidos cerrados ({(orders ?? []).filter((o) => o.status === 'entregado' || o.status === 'cancelado').length})
                </span>
              </summary>
              <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {(orders ?? [])
                  .filter((o) => o.status === 'entregado' || o.status === 'cancelado')
                  .map((order) => (
                    <KdsOrderCard
                      key={order.id}
                      order={order}
                      acting={false}
                      onAction={() => {}}
                      onCancel={() => {}}
                      cancelMenuOpen={false}
                      onCancelMenuToggle={() => {}}
                      onCancelMenuClose={() => {}}
                    />
                  ))}
              </div>
            </details>
          )}
        </div>
      </div>

      {/* ── MOBILE: tabs with improved state cards ── */}
      <div className="lg:hidden">
        {/* Tabs */}
        <div className="sticky top-[57px] z-30 border-b border-[#75AADB]/20 bg-[#EEF5FF]/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-3 py-2.5">
            {TABS.map((t) => {
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-label={`${t.label}: ${counts[t.id]}`}
                  className={`km-focus flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                    active
                      ? 'bg-[#003B73] text-white shadow-sm'
                      : 'border border-[#75AADB]/40 bg-white text-[#003B73] hover:bg-[#EEF5FF]'
                  }`}
                >
                  <t.icon className="h-3.5 w-3.5" strokeWidth={2.4} />
                  {t.label}
                  <span
                    className={`km-tabular ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-extrabold ${
                      active ? 'bg-[#F6B21A] text-[#003B73]' : 'bg-[#EEF5FF] text-[#003B73]'
                    }`}
                  >
                    {counts[t.id]}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Mobile: pending products strip (always visible if active) */}
        {pending.length > 0 && (
          <div className="border-b border-[var(--km-preparando-bg)]/40 bg-white/60 px-3 py-2">
            <SectionTitle>Para preparar ahora</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {pending.slice(0, 8).map((p) => (
                <span
                  key={p.name}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#75AADB]/20 bg-white px-2 py-1.5 text-xs font-semibold text-[#003B73]"
                >
                  <ProductIconGlyph icon={p.icon} className="h-3.5 w-3.5" strokeWidth={2.2} />
                  <span className="km-tabular font-extrabold text-[var(--km-preparando-text)]">{p.qty}×</span>
                  <span className="max-w-[100px] truncate">{p.name}</span>
                </span>
              ))}
              {pending.length > 8 && (
                <span className="inline-flex items-center rounded-lg border border-[#75AADB]/15 bg-white px-2 py-1.5 text-xs font-medium text-[#003B73]/50">
                  +{pending.length - 8}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Mobile: order list */}
        <div className="mx-auto max-w-6xl px-3 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#75AADB]/30 bg-white/60 py-16 text-center">
              <p className="text-sm font-semibold text-[#003B73]/60">Cargando pedidos…</p>
            </div>
          ) : visibleOrders.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {visibleOrders.map((order) => (
                <KdsOrderCard
                  key={order.id}
                  order={order}
                  acting={actingId === order.id}
                  onAction={(next, confirmMsg) => advance(order.id, next, confirmMsg)}
                  onCancel={() => cancelOrder(order.id)}
                  cancelMenuOpen={cancelMenuOpenId === order.id}
                  onCancelMenuToggle={() =>
                    setCancelMenuOpenId(cancelMenuOpenId === order.id ? null : order.id)
                  }
                  onCancelMenuClose={() => setCancelMenuOpenId(null)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  )
}

/* ── KDS Order Card ──
 * Each card has:
 * 1. Left border colored by state (not just a badge)
 * 2. State banner with icon + text (not color-only)
 * 3. Multiple actions per state (primary + secondary)
 * 4. Cancel hidden in a "more" menu (doesn't compete with advance actions)
 */
function KdsOrderCard({
  order,
  acting,
  onAction,
  onCancel,
  cancelMenuOpen,
  onCancelMenuToggle,
  onCancelMenuClose: _onCancelMenuClose,
}: {
  order: CocinaPedido
  acting: boolean
  onAction: (next: OrderStatus, confirmMsg?: string) => void
  onCancel: () => void
  cancelMenuOpen: boolean
  onCancelMenuToggle: () => void
  onCancelMenuClose: () => void
}) {
  const sv = CARD_STATUS_VISUAL[order.status]
  const isClosed = order.status === 'entregado' || order.status === 'cancelado'
  const canCancel = order.status === 'preparacion'
  const actions = getActions(order.status)

  return (
    <div className={`overflow-hidden rounded-2xl border-2 border-[#75AADB]/20 bg-white shadow-sm shadow-[#003B73]/5 ${sv.borderClass}`}>
      {/* State banner — icon + label + payment, not color-only */}
      <div className={`flex items-center justify-between gap-2 px-4 py-2 text-xs font-bold ${sv.bannerClass}`}>
        <span className="flex items-center gap-1.5">
          <sv.bannerIcon className="h-3.5 w-3.5" strokeWidth={2.4} />
          {sv.label}
        </span>
        <span className="flex items-center gap-1.5">
          {order.payStatus === 'pendiente' && (
            <EstadoBadge estado="pagoPendiente">Pago pendiente</EstadoBadge>
          )}
          {order.payStatus === 'pagado' && (
            <EstadoBadge estado="listo">Pagado</EstadoBadge>
          )}
        </span>
      </div>

      {/* Order header: code, customer, time */}
      <div className="border-b border-[#75AADB]/15 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-mono text-lg font-extrabold leading-none text-[#003B73] km-tabular">
              <Hash className="h-4 w-4 text-[#75AADB]" strokeWidth={2.6} />
              {order.code.replace('KMG-', '')}
            </div>
            <p className="mt-1 truncate text-sm font-bold text-[#003B73]">{order.customer}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-medium text-[#003B73]/55">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" strokeWidth={2.4} />
                <span className="km-tabular">{order.time}</span>
              </span>
              {order.table && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" strokeWidth={2.4} />
                  Mesa {order.table}
                </span>
              )}
            </div>
          </div>
          {/* Cancel menu — subtle, doesn't compete */}
          {canCancel && !isClosed && (
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onCancelMenuToggle()
                }}
                aria-label="Más acciones"
                className="km-focus flex h-7 w-7 items-center justify-center rounded-lg border border-[#75AADB]/30 text-[#003B73]/40 hover:bg-[#EEF5FF] hover:text-[#003B73]/70"
              >
                <MoreHorizontal className="h-4 w-4" strokeWidth={2.2} />
              </button>
              {cancelMenuOpen && (
                <div className="absolute right-0 top-8 z-20 w-36 rounded-xl border border-[var(--km-peligro-bg)] bg-white shadow-lg">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onCancel()
                    }}
                    className="km-focus flex w-full items-center gap-2 px-3 py-2.5 text-xs font-semibold text-[var(--km-peligro-text)] hover:bg-[var(--km-peligro-bg)]"
                  >
                    <CircleX className="h-3.5 w-3.5" strokeWidth={2.2} />
                    Cancelar pedido
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Observations — more visible for cocina (urgency channel) */}
      {order.observations && (
        <div className="mx-4 mt-2 flex items-start gap-2 rounded-xl border-2 border-[var(--km-peligro-text)] bg-[var(--km-peligro-bg)] px-3 py-2 text-sm font-bold text-[var(--km-peligro-text)] shadow-sm">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2.4} />
          <span><span className="font-bold">Nota:</span> {order.observations}</span>
        </div>
      )}

      {/* Product lines — v0-like with image/icon box + qty badge */}
      <ul className="flex-1 space-y-1.5 px-4 py-3">
        {order.lines.length === 0 ? (
          <li className="text-xs font-medium text-[#003B73]/35">Sin productos</li>
        ) : (
          order.lines.map((l) => (
            <li key={`${l.name}-${l.qty}`} className="flex items-center gap-2.5">
              {l.image ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={l.image}
                  alt={l.name}
                  className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-[#75AADB]/15"
                />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EEF5FF] text-[#003B73]">
                  <ProductIconGlyph icon={l.icon} className="h-4 w-4" strokeWidth={2.2} />
                </span>
              )}
              <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-[#003B73] px-1.5 text-sm font-extrabold text-white km-tabular">
                {l.qty}
              </span>
              <span className="flex-1 truncate text-sm font-semibold text-[#003B73]">
                {l.name}
              </span>
            </li>
          ))
        )}
      </ul>

      {/* Action area — primary + secondary buttons per state */}
      <div className="border-t border-[#75AADB]/15 bg-[#EEF5FF]/40 p-3">
        {isClosed ? (
          <div className="flex items-center justify-center gap-2 py-1 text-sm font-bold text-[#003B73]/55">
            {order.status === 'entregado' ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-[var(--km-entregado-text)]" strokeWidth={2.4} />
                Pedido entregado
              </>
            ) : (
              <>
                <CircleX className="h-4 w-4 text-[var(--km-peligro-text)]" strokeWidth={2.4} />
                Cancelado
              </>
            )}
          </div>
        ) : actions.length > 0 ? (
          <div className="flex gap-2">
            {actions.map((action) => {
              const Icon = action.icon
              if (action.variant === 'secondary') {
                return (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => onAction(action.next, action.confirm)}
                    disabled={acting}
                    className="km-focus flex flex-1 items-center justify-center gap-1 rounded-xl border border-[#75AADB]/40 bg-white py-2.5 text-sm font-semibold text-[#003B73]/70 transition-colors hover:bg-[#EEF5FF] hover:text-[#003B73] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
                    {action.label}
                  </button>
                )
              }
              // primary
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => onAction(action.next, action.confirm)}
                  disabled={acting}
                  className="km-focus flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#003B73] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#003B73]/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon className="h-4 w-4" strokeWidth={2.4} />
                  {action.label}
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
                </button>
              )
            })}
          </div>
        ) : null}
      </div>
    </div>
  )
}

/* ── Empty state ── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#75AADB]/30 bg-white/60 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EEF5FF]">
        <ChefHat className="h-7 w-7 text-[#75AADB]" strokeWidth={2} />
      </div>
      <p className="text-sm font-semibold text-[#003B73]/60">
        No hay pedidos en este estado.
      </p>
      <p className="text-xs font-medium text-[#003B73]/40">
        Los pedidos nuevos aparecerán automáticamente.
      </p>
    </div>
  )
}

/* ── Live label helper (unchanged logic) ── */
function liveLabel(lastSync: Date | null, refreshing: boolean): string {
  if (refreshing) return 'Sincronizando…'
  if (!lastSync) return 'En vivo'
  const hh = String(lastSync.getHours()).padStart(2, '0')
  const mm = String(lastSync.getMinutes()).padStart(2, '0')
  return `En vivo · ${hh}:${mm}`
}
