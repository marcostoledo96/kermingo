'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Search,
  Eye,
  XCircle,
  CheckCircle2,
  RefreshCw,
  Hash,
  MapPin,
  Phone,
  Clock,
  Banknote,
  ArrowRightLeft,
  X,
  Receipt,
  Inbox,
  AlertCircle,
  Store,
  Globe,
  MoreHorizontal,
  ArrowRight,
  Flame,
  Bell,
  CircleDot,
  CircleCheck,
  CircleX,
  CircleDollarSign,
  ExternalLink,
  Loader2,
  ZoomIn,
  ImageIcon,
} from 'lucide-react'
import { formatPrice } from '@/lib/products'
import { ProductIconGlyph } from '@/components/menu/product-visual'
import { AdminShell } from './admin-shell'
import { EstadoBadge } from './admin-ui'
import type { EstadoVisual } from './admin-ui'
import { apiGet, apiPatch, ApiError } from '@/lib/api'
import { API_BASE } from '@/lib/config'
import {
  type Order,
  type OrderStatus,
  type PayMethod,
  type PayStatus,
  apiToOrder,
  orderStatusToApi,
} from '@/lib/admin'
import { useApiResource } from '@/lib/use-api-resource'
import type { ApiPedido, ApiPedidoPaginada } from '@/lib/types'

/* ---------------------------------------------------------------------------
 * Orders Screen — Prompt 5 redesign
 * -------------------------------------------------------------------------
 * Goals:
 *   1. Help resolve exceptions and control orders, not just list cards.
 *   2. "Necesitan acción" view before "Todos".
 *   3. Reduce chips per card — order state + payment as a single line.
 *   4. Dynamic primary action per state; secondary in dropdown.
 *   5. Kermingo tokens exclusively (no emerald/amber/rose/sky/slate/red).
 *   6. Clear empty states per view.
 *   7. Preserve data/API behavior/endpoints.
 * ------------------------------------------------------------------------- */

/* ---- Visual mapping: OrderStatus → EstadoBadge + icon + border ---- */

const ORDER_STATUS_VISUAL: Record<
  OrderStatus,
  {
    estado: EstadoVisual
    icon: typeof Clock
    borderClass: string
    label: string
  }
> = {
  recibido: {
    estado: 'informacion',
    icon: CircleDot,
    borderClass: 'border-l-[3px] border-l-[var(--km-info-text)]',
    label: 'Recibido',
  },
  preparacion: {
    estado: 'preparando',
    icon: Flame,
    borderClass: 'border-l-[3px] border-l-[var(--km-preparando-text)]',
    label: 'En preparación',
  },
  listo: {
    estado: 'listo',
    icon: Bell,
    borderClass: 'border-l-[3px] border-l-[var(--km-listo-text)]',
    label: 'Listo',
  },
  entregado: {
    estado: 'entregado',
    icon: CircleCheck,
    borderClass: 'border-l-[3px] border-l-[var(--km-entregado-text)]',
    label: 'Entregado',
  },
  cancelado: {
    estado: 'cancelado',
    icon: CircleX,
    borderClass: 'border-l-[3px] border-l-[var(--km-peligro-text)]',
    label: 'Cancelado',
  },
}

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  preparacion: 'listo',
  listo: 'entregado',
}

/* ---- Dynamic primary action per state ---- */
/* NOTE: recibido does NOT have a generic advance action.
   The only way to move recibido → preparacion is via confirmPayment
   (PATCH /pago → PATCH /estado), which is a dedicated two-step action. */

const PRIMARY_ACTION: Partial<
  Record<OrderStatus, { label: string; icon: typeof Clock; nextLabel: string }>
> = {
  preparacion: { label: 'Marcar listo', icon: Bell, nextLabel: 'Listo' },
  listo: { label: 'Entregar', icon: CircleCheck, nextLabel: 'Entregado' },
}

function lineTotal(o: Order): number {
  return o.lines.reduce((acc, l) => acc + l.price * l.qty, 0)
}

/* ---- View tabs ---- */

type ViewTab = 'recibido' | 'preparacion' | 'listo' | 'entregado'

const VIEW_TABS: { id: ViewTab; label: string; shortLabel: string; icon: typeof Clock }[] = [
  { id: 'recibido', label: 'Pendiente', shortLabel: 'Pend.', icon: CircleDot },
  { id: 'preparacion', label: 'En preparación', shortLabel: 'Prep.', icon: Flame },
  { id: 'listo', label: 'Listo', shortLabel: 'Listo', icon: Bell },
  { id: 'entregado', label: 'Entregado', shortLabel: 'Entr.', icon: CircleCheck },
]

/* ---- Status & payment filter options ---- */

/* ---- Helper: does an order "need action"? ---- */

function needsAction(o: Order): boolean {
  if (o.status === 'cancelado' || o.status === 'entregado') return false
  if (o.payStatus === 'pendiente') return true
  if (o.status === 'recibido' || o.status === 'preparacion' || o.status === 'listo') return true
  return false
}

/* ====================================================================== */
/* Main component                                                          */
/* ====================================================================== */

export function OrdersScreen() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [viewTab, setViewTab] = useState<ViewTab>('recibido')
  const [detail, setDetail] = useState<Order | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null)
  const [comprobantePublicUrl, setComprobantePublicUrl] = useState<string | null>(null)
  const [comprobanteError, setComprobanteError] = useState<string | null>(null)
  const [showComprobanteModal, setShowComprobanteModal] = useState(false)
  const [comprobanteLoading, setComprobanteLoading] = useState(false)
  const [tabCounts, setTabCounts] = useState<Record<ViewTab, number>>({
    recibido: 0,
    preparacion: 0,
    listo: 0,
    entregado: 0,
  })

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [search])

  const buildQuery = useCallback(() => {
    const q: Record<string, string | number> = { limit: 24 }
    q.estado_pedido = orderStatusToApi(viewTab)
    if (viewTab === 'recibido') {
      q.origen = 'online'
      q.estado_pago = 'comprobante_subido'
    }
    if (debouncedSearch.trim()) q.buscar = debouncedSearch.trim()
    return q
  }, [viewTab, debouncedSearch])

  const {
    data: orders,
    loading,
    refreshing,
    error: loadError,
    refetch,
    setData: setOrders,
  } = useApiResource<Order[]>(async () => {
    const data = await apiGet<ApiPedidoPaginada>('/api/admin/pedidos', buildQuery())
    const mapped = data.pedidos.map(apiToOrder)
    if (viewTab === 'recibido') {
      return mapped.filter((order) => order.origen === 'online')
    }
    return mapped
  })

  // Re-fetch orders when tab or search filter changes
  useEffect(() => {
    refetch({ silent: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewTab, debouncedSearch])

  // Fetch tab counts (limit=1 for each status to get total without loading all data)
  const refreshTabCounts = useCallback(async () => {
    const statuses: ViewTab[] = ['recibido', 'preparacion', 'listo', 'entregado']
    const counts: Record<ViewTab, number> = { recibido: 0, preparacion: 0, listo: 0, entregado: 0 }
    const results = await Promise.allSettled(
      statuses.map(async (tab) => {
        const data = await apiGet<ApiPedidoPaginada>('/api/admin/pedidos', {
          estado_pedido: orderStatusToApi(tab),
          limit: 1,
          ...(tab === 'recibido'
            ? { origen: 'online', estado_pago: 'comprobante_subido' }
            : {}),
        })
        counts[tab] = data.paginacion.total
      }),
    )
    // Only update if at least one succeeded
    if (results.some((r) => r.status === 'fulfilled')) {
      setTabCounts(counts)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshTabCounts()
  }, [refreshTabCounts])

  const allOrders = orders ?? []
  const actionCount = allOrders.filter(needsAction).length

  const hasFilters = search !== ''

  function clearFilters() {
    setSearch('')
    setDebouncedSearch('')
  }

  const updateOrderLocal = (id: string, patch: Partial<Order>) => {
    setOrders((prev) => (prev ?? []).map((o) => (o.id === id ? { ...o, ...patch } : o)))
    setDetail((d) => (d && d.id === id ? { ...d, ...patch } : d))
  }

  const openDetail = async (order: Order) => {
    setDetail(order)
    setDetailLoading(true)
    setActionError(null)
    setComprobanteUrl(null)
    setComprobantePublicUrl(null)
    setComprobanteError(null)
    try {
      const full = await apiGet<ApiPedido>(`/api/admin/pedidos/${order.id}`)
      const mapped = apiToOrder(full)
      setDetail(mapped)
      // If transfer order with comprobante, fetch the comprobante URLs
      if (mapped.method === 'transferencia' && mapped.hasReceipt) {
        try {
          type ComprobanteMeta = { url_publica: string | null; url_proxy: string; nombre_original: string; mime_type: string }
          const meta = await apiGet<ComprobanteMeta>(`/api/admin/pedidos/${order.id}/comprobante`)
          if (meta.url_proxy) {
            // url_proxy is relative (/api/admin/pedidos/:id/comprobante/imagen).
            // Prepend API_BASE so the <img> tag hits the backend, not the frontend.
            const proxyUrl = meta.url_proxy.startsWith('/')
              ? `${API_BASE.replace(/\/$/, '')}${meta.url_proxy}`
              : meta.url_proxy
            setComprobanteUrl(proxyUrl)
            setComprobantePublicUrl(meta.url_publica)
          } else if (meta.url_publica) {
            setComprobanteUrl(meta.url_publica)
          } else {
            setComprobanteError('El comprobante no tiene enlace público de Drive.')
          }
        } catch {
          setComprobanteError('No se pudo obtener el comprobante')
        }
      }
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'No se pudo cargar el detalle')
    } finally {
      setDetailLoading(false)
    }
  }

  /** Open comprobante image modal directly from row/card action, without needing detail modal */
  async function openComprobante(order: Order) {
    setComprobanteUrl(null)
    setComprobantePublicUrl(null)
    setComprobanteError(null)
    setShowComprobanteModal(true)
    setComprobanteLoading(true)
    try {
      type ComprobanteMeta = { url_publica: string | null; url_proxy: string; nombre_original: string; mime_type: string }
      const meta = await apiGet<ComprobanteMeta>(`/api/admin/pedidos/${order.id}/comprobante`)
      if (meta.url_proxy) {
        // url_proxy is relative — prepend API_BASE so <img> hits the backend
        const proxyUrl = meta.url_proxy.startsWith('/')
          ? `${API_BASE.replace(/\/$/, '')}${meta.url_proxy}`
          : meta.url_proxy
        setComprobanteUrl(proxyUrl)
        setComprobantePublicUrl(meta.url_publica)
      } else if (meta.url_publica) {
        setComprobanteUrl(meta.url_publica)
      } else {
        setComprobanteError('El comprobante no tiene enlace público de Drive.')
      }
    } catch {
      setComprobanteError('No se pudo obtener el comprobante')
    } finally {
      setComprobanteLoading(false)
    }
  }

  async function setStatus(id: string, status: OrderStatus) {
    if (status === 'cancelado') {
      if (!window.confirm('¿Cancelar el pedido? Se repondrá el stock.')) return
    }
    const previous = orders?.find((o) => o.id === id)?.status
    updateOrderLocal(id, { status })
    setActing(id)
    setActionError(null)
    try {
      await apiPatch(`/api/admin/pedidos/${id}/estado`, { estado_pedido: orderStatusToApi(status) })
      refreshTabCounts()
    } catch (err) {
      if (previous) updateOrderLocal(id, { status: previous })
      setActionError(err instanceof ApiError ? err.message : 'No se pudo cambiar el estado')
    } finally {
      setActing(null)
    }
  }

  async function markPaid(id: string) {
    const previous = orders?.find((o) => o.id === id)?.payStatus
    updateOrderLocal(id, { payStatus: 'pagado' })
    setActing(id)
    setActionError(null)
    try {
      await apiPatch(`/api/admin/pedidos/${id}/pago`, { estado_pago: 'pagado' })
      refreshTabCounts()
    } catch (err) {
      if (previous) updateOrderLocal(id, { payStatus: previous })
      setActionError(err instanceof ApiError ? err.message : 'No se pudo marcar como pagado')
    } finally {
      setActing(null)
    }
  }

  async function confirmPayment(id: string) {
    // Find the order to check if payment is already confirmed
    const order = orders?.find((o) => o.id === id)
    const alreadyPaid = order?.payStatus === 'pagado'
    setConfirming(id)
    setActionError(null)
    try {
      // Only PATCH payment if not already paid (caja orders may arrive pagado)
      if (!alreadyPaid) {
        await apiPatch(`/api/admin/pedidos/${id}/pago`, { estado_pago: 'pagado' })
      }
      // Always advance state to en_preparacion
      await apiPatch(`/api/admin/pedidos/${id}/estado`, { estado_pedido: 'en_preparacion' })
      // Optimistic: remove from current tab view and refetch
      setOrders((prev) => (prev ?? []).filter((o) => o.id !== id))
      refetch({ silent: true })
      refreshTabCounts()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'No se pudo confirmar el pago')
      refetch({ silent: true })
      refreshTabCounts()
    } finally {
      setConfirming(null)
    }
  }

  async function cancelOrder(id: string) {
    if (!window.confirm('¿Cancelar el pedido? Se repondrá el stock.')) return
    const previous = orders?.find((o) => o.id === id)?.status
    updateOrderLocal(id, { status: 'cancelado' })
    setActing(id)
    setActionError(null)
    try {
      await apiPatch(`/api/admin/pedidos/${id}/cancelar`, {})
      refreshTabCounts()
    } catch (err) {
      if (previous) updateOrderLocal(id, { status: previous })
      setActionError(err instanceof ApiError ? err.message : 'No se pudo cancelar el pedido')
    } finally {
      setActing(null)
    }
  }

  return (
    <AdminShell section="Pedidos" status={{ label: 'En vivo', tone: 'success' }}>
        {/* Header row */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-[#003B73]">Gestión de pedidos</h2>
            <p className="text-sm text-[var(--km-tinta-suave)]">
              {allOrders.length} {allOrders.length === 1 ? 'pedido' : 'pedidos'}
              {actionCount > 0 && (
                <span className="ml-1.5">
                  · <span className="km-tabular font-semibold text-[var(--km-preparando-text)]">{actionCount} necesitan acción</span>
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => refetch({ silent: true })}
            disabled={refreshing}
            title="Refrescar"
            aria-label="Refrescar pedidos"
            className="km-focus flex h-10 w-10 items-center justify-center rounded-xl border border-[#75AADB]/20 bg-white text-[#003B73] transition-colors hover:bg-[#EEF5FF] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={2.2} />
          </button>
        </div>

        {/* Error banner */}
        {actionError && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[var(--km-peligro-bg)] bg-[var(--km-peligro-bg)] px-4 py-3 text-sm text-[var(--km-peligro-text)]">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2.2} />
            <span className="flex-1 font-medium">{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              className="rounded-lg border border-[var(--km-peligro-bg)] bg-white px-2.5 py-1 text-xs font-bold text-[var(--km-peligro-text)] hover:bg-[var(--km-peligro-bg)]"
            >
              Cerrar
            </button>
          </div>
        )}

        {loadError && (
          <div className="flex items-start gap-2.5 rounded-xl border border-[var(--km-peligro-bg)] bg-[var(--km-peligro-bg)] px-4 py-3 text-sm text-[var(--km-peligro-text)]">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2.2} />
            <span className="flex-1 font-medium">{loadError}</span>
            <button
              onClick={() => refetch()}
              className="rounded-lg border border-[var(--km-peligro-bg)] bg-white px-2.5 py-1 text-xs font-bold text-[var(--km-peligro-text)] hover:bg-[var(--km-peligro-bg)]"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Search + Status tabs */}
        <div className="km-panel overflow-hidden">
          {/* Search bar */}
          <div className="border-b border-[#75AADB]/12 px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#75AADB]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por número, cliente o teléfono..."
                aria-label="Buscar pedidos"
                className="w-full rounded-xl border border-[#75AADB]/25 bg-[#EEF5FF]/30 py-2.5 pl-10 pr-3 text-sm font-medium text-[#003B73] placeholder:text-[#75AADB]/70 focus:border-[#003B73] focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Status tabs */}
          <div className="flex items-center gap-1 border-b border-[#75AADB]/12 px-4 py-2">
            {VIEW_TABS.map((tab) => {
              const TabIcon = tab.icon
              const isActive = viewTab === tab.id
              const count = tabCounts[tab.id]
              return (
                <button
                  key={tab.id}
                  onClick={() => setViewTab(tab.id)}
                  aria-label={`Ver: ${tab.label}`}
                  className={`km-focus flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                    isActive
                      ? tab.id === 'recibido'
                        ? 'bg-[var(--km-info-bg)] text-[var(--km-info-text)]'
                        : tab.id === 'preparacion'
                          ? 'bg-[var(--km-preparando-bg)] text-[var(--km-preparando-text)]'
                          : tab.id === 'listo'
                            ? 'bg-[var(--km-listo-bg)] text-[var(--km-listo-text)]'
                            : 'bg-[var(--km-entregado-bg)] text-[var(--km-entregado-text)]'
                      : 'text-[var(--km-tinta-suave)] hover:bg-[#EEF5FF]/60'
                  }`}
                >
                  <TabIcon className="h-3.5 w-3.5" strokeWidth={2.2} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  {count > 0 && (
                    <span className="ml-0.5 km-tabular rounded-full bg-[#003B73]/10 px-1.5 text-[10px] font-bold leading-none">
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Order list */}
        {loading ? (
          <div className="km-panel px-6 py-10 text-center text-sm font-medium text-[var(--km-tinta-suave)]">
            Cargando pedidos…
          </div>
        ) : allOrders.length === 0 ? (
          <EmptyState viewTab={viewTab} hasFilters={hasFilters} onClearFilters={clearFilters} />
        ) : (
          <>
            {/* Desktop: table */}
            <div className="km-panel hidden overflow-hidden lg:block">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#75AADB]/12 bg-[#EEF5FF]/50 text-left text-[11px] font-semibold tracking-wide text-[#003B73]/50">
                      <th className="px-4 py-2.5">Pedido</th>
                      <th className="px-4 py-2.5">Cliente</th>
                      <th className="px-4 py-2.5">Estado</th>
                      <th className="px-4 py-2.5 text-right">Total</th>
                      <th className="px-4 py-2.5 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#75AADB]/8">
                    {allOrders.map((o) => (
                      <tr key={o.id} className={`transition-colors hover:bg-[#EEF5FF]/40 ${ORDER_STATUS_VISUAL[o.status].borderClass}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 km-tabular font-extrabold text-[#003B73]">
                            <Hash className="h-3.5 w-3.5 text-[#75AADB]" strokeWidth={2.6} />
                            {o.code.replace('KMG-', '')}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--km-tinta-suave)]">
                            <span className="flex items-center gap-1 km-tabular">
                              <Clock className="h-3 w-3" strokeWidth={2.4} />
                              {o.time}
                            </span>
                            <OrigenTag origen={o.origen} />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-[#003B73]">{o.customer}</p>
                          <p className="text-xs text-[var(--km-tinta-suave)]">
                            {o.table ? `Mesa ${o.table}` : 'Sin mesa'}
                            {o.phone ? ` · ${o.phone}` : ''}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <EstadoBadge estado={ORDER_STATUS_VISUAL[o.status].estado} dot>
                              {ORDER_STATUS_VISUAL[o.status].label}
                            </EstadoBadge>
                            <PaymentLine payStatus={o.payStatus} method={o.method} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right km-tabular font-bold text-[var(--km-tinta)]">
                          {formatPrice(lineTotal(o))}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <OrderActions
                            order={o}
                            acting={acting === o.id}
                            confirming={confirming === o.id}
                            variant="table"
                            onDetail={() => openDetail(o)}
                            onAdvance={() => {
                              const next = NEXT_STATUS[o.status]
                              if (next) setStatus(o.id, next)
                            }}
                            onMarkPaid={() => markPaid(o.id)}
                            onConfirmPayment={() => confirmPayment(o.id)}
                            onCancel={() => cancelOrder(o.id)}
                            onViewComprobante={() => openComprobante(o)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile/tablet: cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
              {allOrders.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  acting={acting === o.id}
                  confirming={confirming === o.id}
                  onDetail={() => openDetail(o)}
                  onAdvance={() => {
                    const next = NEXT_STATUS[o.status]
                    if (next) setStatus(o.id, next)
                  }}
                  onMarkPaid={() => markPaid(o.id)}
                  onConfirmPayment={() => confirmPayment(o.id)}
                  onCancel={() => cancelOrder(o.id)}
                  onViewComprobante={() => openComprobante(o)}
                />
              ))}
            </div>
          </>
        )}
      )

      {detail && (
        <OrderDetailModal
          order={detail}
          loading={detailLoading}
          acting={acting === detail.id}
          confirming={confirming === detail.id}
          comprobanteUrl={comprobanteUrl}
          comprobanteError={comprobanteError}
          onClose={() => { setDetail(null); setComprobanteUrl(null); setComprobantePublicUrl(null); setComprobanteError(null); setShowComprobanteModal(false) }}
          onAdvance={() => {
            const next = NEXT_STATUS[detail.status]
            if (next) setStatus(detail.id, next)
          }}
          onMarkPaid={() => markPaid(detail.id)}
          onConfirmPayment={() => confirmPayment(detail.id)}
          onCancel={() => cancelOrder(detail.id)}
          onViewComprobante={() => setShowComprobanteModal(true)}
        />
      )}
      {showComprobanteModal && (comprobanteUrl || comprobanteError || comprobanteLoading) && (
        <ComprobanteModal
          url={comprobanteUrl}
          publicUrl={comprobantePublicUrl}
          error={comprobanteError}
          loading={comprobanteLoading}
          onClose={() => { setShowComprobanteModal(false); setComprobanteUrl(null); setComprobantePublicUrl(null); setComprobanteError(null) }}
        />
      )}
    </AdminShell>
  )
}

/* ====================================================================== */
/* Subcomponents                                                          */
/* ====================================================================== */

/* ---- Payment status as compact inline (not a competing badge) ---- */

function PaymentLine({ payStatus, method }: { payStatus: PayStatus; method: PayMethod }) {
  const isPaid = payStatus === 'pagado'
  const Icon = method === 'efectivo' ? Banknote : ArrowRightLeft
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium">
      <Icon
        className={`h-3 w-3 ${isPaid ? 'text-[var(--km-listo-text)]' : 'text-[var(--km-preparando-text)]'}`}
        strokeWidth={2.2}
      />
      <span className={isPaid ? 'text-[var(--km-listo-text)]' : 'text-[var(--km-preparando-text)]'}>
        {method === 'efectivo' ? 'Efectivo' : 'Transfer.'}
      </span>
      <span className="ml-0.5">·</span>
      <span className={`font-semibold ${isPaid ? 'text-[var(--km-listo-text)]' : 'text-[var(--km-preparando-text)]'}`}>
        {isPaid ? 'Pagado' : 'Pendiente'}
      </span>
    </span>
  )
}

/* ---- Origen tag (inline, subtle) ---- */

function OrigenTag({ origen }: { origen: 'online' | 'caja' }) {
  const Icon = origen === 'caja' ? Store : Globe
  return (
    <span className="inline-flex items-center gap-0.5 rounded bg-[#EEF5FF]/80 px-1.5 py-0.5 text-[10px] font-semibold text-[#003B73]/60">
      <Icon className="h-2.5 w-2.5" strokeWidth={2.4} />
      {origen === 'caja' ? 'Caja' : 'Online'}
    </span>
  )
}

/* ---- Order card (mobile) ---- */

function OrderCard({
  order,
  acting,
  confirming,
  onDetail,
  onAdvance,
  onMarkPaid,
  onConfirmPayment,
  onCancel,
  onViewComprobante,
}: {
  order: Order
  acting: boolean
  confirming: boolean
  onDetail: () => void
  onAdvance: () => void
  onMarkPaid: () => void
  onConfirmPayment: () => void
  onCancel: () => void
  onViewComprobante?: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const closed = order.status === 'entregado' || order.status === 'cancelado'
  const primary = PRIMARY_ACTION[order.status]
  const needsPayment = order.payStatus === 'pendiente'

  const sv = ORDER_STATUS_VISUAL[order.status]

  /* Close dropdown on outside click */
  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  return (
    <div className={`km-panel overflow-hidden ${sv.borderClass}`}>
      {/* Top row: code + total */}
      <div className="flex items-start justify-between gap-2 px-4 pt-3">
        <div>
          <div className="flex items-center gap-1 km-tabular text-lg font-extrabold leading-none text-[#003B73]">
            <Hash className="h-4 w-4 text-[#75AADB]" strokeWidth={2.6} />
            {order.code.replace('KMG-', '')}
          </div>
          <p className="mt-1 font-bold text-[#003B73]">{order.customer}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--km-tinta-suave)]">
            <span className="flex items-center gap-1 km-tabular">
              <Clock className="h-3 w-3" strokeWidth={2.4} />
              {order.time}
            </span>
            {order.table && <span>Mesa {order.table}</span>}
            {order.phone && <span>{order.phone}</span>}
          </div>
        </div>
        <span className="km-tabular flex-shrink-0 text-lg font-extrabold text-[#003B73]">
          {formatPrice(lineTotal(order))}
        </span>
      </div>

      {/* Status line: single row with order state + payment */}
      <div className="mt-2 flex flex-wrap items-center gap-2 px-4">
        <EstadoBadge estado={sv.estado} dot>
          {sv.label}
        </EstadoBadge>
        <PaymentLine payStatus={order.payStatus} method={order.method} />
        <OrigenTag origen={order.origen} />
      </div>

      {/* Needs-attention highlight */}
      {needsPayment && !closed && (
        <div className="mt-2 mx-4 flex items-center gap-1.5 rounded-lg bg-[var(--km-preparando-bg)] px-2.5 py-1.5 text-xs font-semibold text-[var(--km-preparando-text)]">
          <CircleDollarSign className="h-3.5 w-3.5" strokeWidth={2.2} />
          Pago pendiente — verificá al entregar
        </div>
      )}

      {/* Confirm payment action for recibido orders */}
      {order.status === 'recibido' && !closed && (
        <div className="mt-2 mx-4 flex items-center gap-2">
          {order.method === 'transferencia' && order.hasReceipt && onViewComprobante && (
            <button
              type="button"
              onClick={onViewComprobante}
              className="km-focus flex items-center justify-center gap-1.5 rounded-lg border border-[#75AADB]/25 bg-white px-3 py-2.5 text-xs font-semibold text-[#003B73] transition-colors hover:bg-[#EEF5FF]/60"
              aria-label="Ver comprobante adjunto"
            >
              <Receipt className="h-3.5 w-3.5" strokeWidth={2.2} />
              Ver comprobante
            </button>
          )}
          <button
            onClick={onConfirmPayment}
            disabled={confirming}
            className="km-focus flex flex-1 items-center justify-center gap-2 rounded-lg bg-[var(--km-info-text)] px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#1a6fa0] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {confirming ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" strokeWidth={2.2} />
                {order.payStatus === 'pagado' ? 'Enviando…' : 'Confirmando…'}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                {order.payStatus === 'pagado' ? 'Enviar a cocina' : 'Confirmar pago y enviar a cocina'}
              </>
            )}
          </button>
        </div>
      )}

      {/* Action row */}
      <div className="mt-3 flex items-center gap-2 border-t border-[#75AADB]/8 px-4 py-3">
        {/* Primary action: dynamic by state */}
        {primary && !closed && (
          <button
            onClick={onAdvance}
            disabled={acting}
            className="km-focus flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#003B73] px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#00305e] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <primary.icon className="h-3.5 w-3.5" strokeWidth={2.2} />
            {primary.label}
            <ArrowRight className="h-3 w-3" strokeWidth={2.4} />
          </button>
        )}

        {/* If closed, just detail */}
        {closed && (
          <button
            onClick={onDetail}
            className="km-focus flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#75AADB]/25 bg-white px-3 py-2.5 text-xs font-semibold text-[#003B73] transition-colors hover:bg-[#EEF5FF]/60"
          >
            <Eye className="h-3.5 w-3.5" strokeWidth={2.2} />
            Ver detalle
          </button>
        )}

        {/* Quick pay if pending AND not closed */}
        {needsPayment && !closed && (
          <button
            onClick={onMarkPaid}
            disabled={acting}
            className="km-focus flex items-center gap-1.5 rounded-lg border border-[var(--km-listo-bg)] bg-[var(--km-listo-bg)] px-2.5 py-2.5 text-xs font-semibold text-[var(--km-listo-text)] transition-colors hover:bg-[var(--km-listo-bg)]/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.2} />
            <span className="hidden sm:inline">Pagado</span>
          </button>
        )}

        {/* Secondary actions dropdown */}
        {!closed && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              disabled={acting}
              aria-label="Más acciones"
              className="km-focus flex h-9 w-9 items-center justify-center rounded-lg border border-[#75AADB]/20 bg-white text-[var(--km-tinta-suave)] transition-colors hover:bg-[#EEF5FF]/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MoreHorizontal className="h-4 w-4" strokeWidth={2.2} />
            </button>
            {menuOpen && (
              <div className="absolute bottom-full right-0 z-20 mb-1 min-w-[160px] overflow-hidden rounded-lg border border-[#75AADB]/15 bg-white shadow-lg">
                <button
                  onClick={() => { setMenuOpen(false); onDetail() }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-semibold text-[#003B73] hover:bg-[#EEF5FF]/60"
                >
                  <Eye className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Ver detalle
                </button>
                {order.method === 'transferencia' && order.hasReceipt && onViewComprobante && (
                  <button
                    onClick={() => { setMenuOpen(false); onViewComprobante() }}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-semibold text-[#003B73] hover:bg-[#EEF5FF]/60"
                  >
                    <Receipt className="h-3.5 w-3.5" strokeWidth={2.2} />
                    Ver comprobante adjunto
                  </button>
                )}
                <button
                  onClick={() => { setMenuOpen(false); onCancel() }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-xs font-semibold text-[var(--km-peligro-text)] hover:bg-[var(--km-peligro-bg)]"
                >
                  <XCircle className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Cancelar pedido
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ---- Desktop table row actions ---- */

function OrderActions({
  order,
  acting,
  confirming,
  variant: _variant,
  onDetail,
  onAdvance,
  onMarkPaid,
  onConfirmPayment,
  onCancel,
  onViewComprobante,
}: {
  order: Order
  acting: boolean
  confirming: boolean
  variant: 'table'
  onDetail: () => void
  onAdvance: () => void
  onMarkPaid: () => void
  onConfirmPayment: () => void
  onCancel: () => void
  onViewComprobante?: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const closed = order.status === 'entregado' || order.status === 'cancelado'
  const _next = NEXT_STATUS[order.status]
  const primary = PRIMARY_ACTION[order.status]
  const needsPayment = order.payStatus === 'pendiente'

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  return (
    <div className="flex items-center justify-end gap-1.5">
      {/* Primary action */}
      {primary && !closed && (
        <button
          onClick={onAdvance}
          disabled={acting}
          className="km-focus flex items-center gap-1 rounded-lg bg-[#003B73] px-2.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#00305e] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {primary.label}
          <ArrowRight className="h-3 w-3" strokeWidth={2.4} />
        </button>
      )}

      {/* Quick pay */}
      {needsPayment && !closed && (
        <button
          onClick={onMarkPaid}
          disabled={acting}
          className="km-focus flex items-center gap-1 rounded-lg border border-[var(--km-listo-bg)] bg-[var(--km-listo-bg)] px-2 py-1.5 text-xs font-semibold text-[var(--km-listo-text)] transition-colors hover:bg-[var(--km-listo-bg)]/80 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 className="h-3 w-3" strokeWidth={2.2} />
        </button>
      )}

      {/* Confirm payment for recibido */}
      {order.status === 'recibido' && !closed && (
        <>
          {order.method === 'transferencia' && order.hasReceipt && onViewComprobante && (
            <button
              type="button"
              onClick={onViewComprobante}
              className="km-focus flex items-center gap-1 rounded-lg border border-[#75AADB]/25 bg-white px-2 py-1.5 text-xs font-semibold text-[#003B73] transition-colors hover:bg-[#EEF5FF]/60"
              aria-label="Ver comprobante adjunto"
              title="Ver comprobante adjunto"
            >
              <Receipt className="h-3 w-3" strokeWidth={2.2} />
            </button>
          )}
          <button
            onClick={onConfirmPayment}
            disabled={confirming}
            className="km-focus flex items-center gap-1 rounded-lg bg-[var(--km-info-text)] px-2 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#1a6fa0] disabled:cursor-not-allowed disabled:opacity-50"
            title={order.payStatus === 'pagado' ? 'Enviar a cocina' : 'Confirmar pago y enviar a cocina'}
          >
            {confirming ? <RefreshCw className="h-3 w-3 animate-spin" strokeWidth={2.2} /> : <CheckCircle2 className="h-3 w-3" strokeWidth={2.2} />}
            <span className="hidden xl:inline">{order.payStatus === 'pagado' ? 'Enviar' : 'Confirmar'}</span>
          </button>
        </>
      )}

      {/* Secondary: dropdown */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          disabled={acting}
          aria-label="Más acciones"
          className="km-focus flex h-7 w-7 items-center justify-center rounded-lg border border-[#75AADB]/20 bg-white text-[var(--km-tinta-suave)] transition-colors hover:bg-[#EEF5FF]/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={2.2} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 z-20 mt-1 min-w-[150px] overflow-hidden rounded-lg border border-[#75AADB]/15 bg-white shadow-lg">
            <button
              onClick={() => { setMenuOpen(false); onDetail() }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-[#003B73] hover:bg-[#EEF5FF]/60"
            >
              <Eye className="h-3.5 w-3.5" strokeWidth={2.2} />
              Ver detalle
            </button>
            {order.method === 'transferencia' && order.hasReceipt && onViewComprobante && (
              <button
                onClick={() => { setMenuOpen(false); onViewComprobante() }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-[#003B73] hover:bg-[#EEF5FF]/60"
              >
                <Receipt className="h-3.5 w-3.5" strokeWidth={2.2} />
                Ver comprobante adjunto
              </button>
            )}
            {!closed && (
              <button
                onClick={() => { setMenuOpen(false); onCancel() }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-[var(--km-peligro-text)] hover:bg-[var(--km-peligro-bg)]"
              >
                <XCircle className="h-3.5 w-3.5" strokeWidth={2.2} />
                Cancelar pedido
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ---- Empty state (context-aware per view) ---- */

function EmptyState({
  viewTab,
  hasFilters,
  onClearFilters,
}: {
  viewTab: ViewTab
  hasFilters: boolean
  onClearFilters: () => void
}) {
  if (viewTab === 'recibido') {
    return (
      <div className="km-panel flex flex-col items-center gap-3 px-6 py-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--km-info-bg)] text-[var(--km-info-text)]">
          <CircleCheck className="h-7 w-7" strokeWidth={1.8} />
        </div>
        <p className="font-bold text-[#003B73]">
          {hasFilters ? 'Ningún pedido pendiente con esos filtros' : 'Sin pedidos pendientes'}
        </p>
        <p className="text-sm text-[var(--km-tinta-suave)]">
          {hasFilters
            ? 'Probá ajustar la búsqueda.'
            : 'Los pedidos online aparecerán acá para que confirmes el pago.'}
        </p>
        {hasFilters && (
          <button
            onClick={onClearFilters}
            className="mt-1 rounded-lg border border-[#003B73] bg-white px-3 py-1.5 text-xs font-bold text-[#003B73] hover:bg-[#EEF5FF]/60"
          >
            Limpiar búsqueda
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="km-panel flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF5FF] text-[#75AADB]">
        <Inbox className="h-7 w-7" strokeWidth={1.6} />
      </div>
      <p className="font-bold text-[#003B73]">
        {hasFilters ? 'Ningún pedido con esa búsqueda' : `No hay pedidos ${ORDER_STATUS_VISUAL[viewTab]?.label?.toLowerCase() ?? 'en este estado'}`}
      </p>
      <p className="text-sm text-[var(--km-tinta-suave)]">
        {hasFilters
          ? 'Probá ajustar la búsqueda.'
          : 'Los pedidos aparecerán acá cuando cambien de estado.'}
      </p>
      {hasFilters && (
        <button
          onClick={onClearFilters}
          className="mt-1 rounded-lg border border-[#003B73] bg-white px-3 py-1.5 text-xs font-bold text-[#003B73] hover:bg-[#EEF5FF]/60"
        >
          Limpiar búsqueda
        </button>
      )}
    </div>
  )
}

/* ====================================================================== */
/* Order detail modal                                                      */
/* ====================================================================== */

function OrderDetailModal({
  order,
  loading,
  acting,
  confirming,
  comprobanteUrl,
  comprobanteError,
  onClose,
  onAdvance,
  onMarkPaid,
  onConfirmPayment,
  onCancel,
  onViewComprobante,
}: {
  order: Order
  loading: boolean
  acting: boolean
  confirming: boolean
  comprobanteUrl: string | null
  comprobanteError: string | null
  onClose: () => void
  onAdvance: () => void
  onMarkPaid: () => void
  onConfirmPayment: () => void
  onCancel: () => void
  onViewComprobante?: () => void
}) {
  const closed = order.status === 'entregado' || order.status === 'cancelado'
  const primary = PRIMARY_ACTION[order.status]
  const sv = ORDER_STATUS_VISUAL[order.status]
  const needsPayment = order.payStatus === 'pendiente'

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-[#003B73]/40 backdrop-blur-sm"
      />
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        {/* Header */}
        <div className="border-b border-[#75AADB]/12 bg-[#003B73] px-5 py-4 pr-14 text-white">
          <div className="flex items-center gap-1.5 km-tabular text-2xl font-extrabold leading-none">
            <Hash className="h-5 w-5 text-[#F6B21A]" strokeWidth={2.6} />
            {order.code.replace('KMG-', '')}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-sm text-white/70">
              <Clock className="h-3.5 w-3.5" strokeWidth={2.4} />
              {order.time}
            </span>
            <EstadoBadge estado={sv.estado} dot>
              {sv.label}
            </EstadoBadge>
            <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
              order.payStatus === 'pagado'
                ? 'bg-[var(--km-listo-bg)] text-[var(--km-listo-text)]'
                : 'bg-[var(--km-preparando-bg)] text-[var(--km-preparando-text)]'
            }`}>
              {order.payStatus === 'pagado' ? 'Pagado' : 'Pago pendiente'}
            </span>
            <OrigenBadgeLight origen={order.origen} />
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 rounded-full p-1 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="rounded-xl border border-[#75AADB]/12 bg-[#EEF5FF]/40 px-4 py-3 text-center text-xs font-medium text-[var(--km-tinta-suave)]">
              Cargando detalle…
            </div>
          )}

          {/* Customer data */}
          <section>
            <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-[#003B73]/50">
              Datos del cliente
            </h3>
            <div className="space-y-1.5 rounded-xl bg-[#EEF5FF]/60 p-3.5 text-sm">
              <p className="font-bold text-[#003B73]">{order.customer}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[#003B73]/70">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" strokeWidth={2.2} />
                  {order.table ? `Mesa ${order.table}` : 'Sin mesa'}
                </span>
                {order.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" strokeWidth={2.2} />
                    {order.phone}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  {order.method === 'efectivo' ? (
                    <Banknote className="h-3.5 w-3.5" strokeWidth={2.2} />
                  ) : (
                    <ArrowRightLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
                  )}
                  {order.method === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                </span>
              </div>
              {order.notes && (
                <p className="mt-1 rounded-lg bg-[var(--km-preparando-bg)] px-2.5 py-1.5 text-xs font-medium text-[var(--km-preparando-text)]">
                  Nota: {order.notes}
                </p>
              )}
            </div>
          </section>

          {/* Products */}
          <section>
            <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-[#003B73]/50">
              Productos
            </h3>
            {order.lines.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#75AADB]/25 px-4 py-3 text-center text-sm font-medium text-[#003B73]/35">
                Sin productos en este pedido.
              </p>
            ) : (
              <ul className="divide-y divide-[#75AADB]/8 overflow-hidden rounded-xl border border-[#75AADB]/15">
                {order.lines.map((l) => (
                  <li key={`${l.name}-${l.qty}`} className="flex items-center gap-3 px-3.5 py-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EEF5FF] text-[#003B73]">
                      <ProductIconGlyph icon={l.icon} className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-[#003B73] px-1.5 text-sm font-extrabold text-white km-tabular">
                      {l.qty}
                    </span>
                    <span className="flex-1 text-sm font-semibold text-[#003B73]">{l.name}</span>
                    <span className="km-tabular text-sm font-bold text-[var(--km-tinta)]">
                      {formatPrice(l.price * l.qty)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Receipt */}
          {order.method === 'transferencia' && (
            <section>
              <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-[#003B73]/50">
                Comprobante
              </h3>
              {order.hasReceipt ? (
                comprobanteUrl ? (
                  <div
                    className="flex w-full items-center gap-3 rounded-xl border border-[#75AADB]/20 bg-white p-3 text-left"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--km-listo-bg)] text-[var(--km-listo-text)]">
                      <Receipt className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-bold text-[#003B73]">
                        Comprobante adjunto disponible
                      </span>
                      <span className="block text-xs text-[var(--km-tinta-suave)]">Usá el botón junto a la acción principal para abrir la vista previa.</span>
                    </span>
                    <ZoomIn className="h-4 w-4 text-[var(--km-tinta-suave)]" strokeWidth={2.2} aria-hidden="true" />
                  </div>
                ) : comprobanteError ? (
                  <div className="flex items-start gap-2.5 rounded-xl border border-[var(--km-peligro-bg)] bg-[var(--km-peligro-bg)] px-3.5 py-3 text-sm font-medium text-[var(--km-peligro-text)]">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={2.2} />
                    {comprobanteError}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl border border-[#75AADB]/15 bg-[#EEF5FF]/40 px-4 py-3 text-xs font-medium text-[var(--km-tinta-suave)]">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.2} />
                    Cargando comprobante…
                  </div>
                )
              ) : (
                <p className="rounded-xl border border-dashed border-[var(--km-peligro-bg)] bg-[var(--km-peligro-bg)] px-3.5 py-3 text-sm font-medium text-[var(--km-peligro-text)]">
                  Sin comprobante adjunto.
                </p>
              )}
            </section>
          )}

          {/* Total */}
          <div className="flex items-center justify-between rounded-xl bg-[#003B73] px-4 py-3.5 text-white">
            <span className="text-sm font-semibold text-white/80">Total del pedido</span>
            <span className="km-tabular text-2xl font-extrabold text-[#F6B21A]">
              {formatPrice(lineTotal(order))}
            </span>
          </div>
        </div>

        {/* Action footer */}
        <div className="space-y-2 border-t border-[#75AADB]/12 bg-[#EEF5FF]/40 p-4">
          {/* Primary action (if applicable) */}
          {primary && !closed && (
            <button
              onClick={onAdvance}
              disabled={acting}
              className="km-focus flex w-full items-center justify-center gap-2 rounded-lg bg-[#003B73] px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#00305e] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <primary.icon className="h-4 w-4" strokeWidth={2.2} />
              {primary.label}
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.4} />
            </button>
          )}

          {/* Confirm payment + View comprobante for recibido */}
          {order.status === 'recibido' && !closed && (
            <div className="flex items-center gap-2">
              {order.method === 'transferencia' && order.hasReceipt && onViewComprobante && (
                <button
                  type="button"
                  onClick={onViewComprobante}
                  className="km-focus flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#75AADB]/25 bg-white px-3 py-2.5 text-xs font-semibold text-[#003B73] transition-colors hover:bg-[#EEF5FF]/60"
                  aria-label="Ver comprobante adjunto"
                >
                  <Receipt className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Ver comprobante
                </button>
              )}
               <button
                onClick={onConfirmPayment}
                disabled={confirming}
                className="km-focus flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--km-info-text)] px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#1a6fa0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {confirming ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" strokeWidth={2.2} />
                    {order.payStatus === 'pagado' ? 'Enviando…' : 'Confirmando…'}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                    {order.payStatus === 'pagado' ? 'Enviar a cocina' : 'Confirmar pago y enviar a cocina'}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Secondary actions row */}
          <div className="flex items-center gap-2">
            {needsPayment && !closed && (
              <button
                onClick={onMarkPaid}
                disabled={acting}
                className="km-focus flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--km-listo-bg)] bg-[var(--km-listo-bg)] px-3 py-2.5 text-xs font-semibold text-[var(--km-listo-text)] transition-colors hover:bg-[var(--km-listo-bg)]/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                Marcar pagado
              </button>
            )}
            {!closed && (
              <button
                onClick={onCancel}
                disabled={acting}
                className="km-focus flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--km-peligro-bg)] bg-white px-3 py-2.5 text-xs font-semibold text-[var(--km-peligro-text)] transition-colors hover:bg-[var(--km-peligro-bg)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <XCircle className="h-3.5 w-3.5" strokeWidth={2.2} />
                Cancelar
              </button>
            )}
            {closed && (
              <button
                onClick={onClose}
                className="km-focus flex flex-1 items-center justify-center rounded-lg border border-[#75AADB]/20 bg-white px-3 py-2.5 text-xs font-semibold text-[#003B73] transition-colors hover:bg-[#EEF5FF]/60"
              >
                Cerrar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ====================================================================== */
/* Comprobante image modal                                                 */
/* ====================================================================== */

function ComprobanteModal({
  url,
  publicUrl,
  error,
  loading,
  onClose,
}: {
  url: string | null
  publicUrl: string | null
  error: string | null
  loading: boolean
  onClose: () => void
}) {
  const [imgError, setImgError] = useState(false)
  // Use the proxy URL for <img>, and the public Drive URL for "Abrir en otra pestaña"
  const externalLink = publicUrl || url

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      {/* Backdrop */}
      <button
        aria-label="Cerrar vista previa del comprobante"
        onClick={onClose}
        className="absolute inset-0 bg-[#003B73]/50 backdrop-blur-sm"
      />

      {/* Modal content */}
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#75AADB]/12 bg-[#003B73] px-5 py-3.5">
          <div className="flex items-center gap-2 text-white">
            <Receipt className="h-4 w-4 text-[#F6B21A]" strokeWidth={2.2} />
            <h3 className="text-sm font-bold">Comprobante adjunto</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-1 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {error ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--km-peligro-bg)] text-[var(--km-peligro-text)]">
                <AlertCircle className="h-7 w-7" strokeWidth={1.8} />
              </div>
              <p className="text-sm font-medium text-[var(--km-peligro-text)]">{error}</p>
            </div>
          ) : url && !imgError ? (
            /* eslint-disable-next-line @next/next/no-img-element -- Proxy URL from backend, not statically analyzable */
            <img
              src={url}
              alt="Comprobante de pago adjunto"
              className="mx-auto max-h-[65vh] w-auto rounded-xl border border-[#75AADB]/15 object-contain"
              onError={() => setImgError(true)}
            />
          ) : imgError ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--km-peligro-bg)] text-[var(--km-peligro-text)]">
                <ImageIcon className="h-7 w-7" strokeWidth={1.8} />
              </div>
              <p className="text-sm font-medium text-[var(--km-peligro-text)]">No se pudo cargar la imagen.</p>
              {externalLink && (
                <a
                  href={externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-[#003B73] bg-white px-3 py-1.5 text-xs font-bold text-[#003B73] transition-colors hover:bg-[#EEF5FF]/60"
                >
                  <ExternalLink className="h-3 w-3" strokeWidth={2.2} />
                  Abrir en otra pestaña
                </a>
              )}
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF5FF] text-[#75AADB]">
                <Loader2 className="h-7 w-7 animate-spin" strokeWidth={1.8} />
              </div>
              <p className="text-sm font-medium text-[var(--km-tinta-suave)]">Cargando comprobante…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF5FF] text-[#75AADB]">
                <ImageIcon className="h-7 w-7" strokeWidth={1.8} />
              </div>
              <p className="text-sm font-medium text-[var(--km-tinta-suave)]">No hay imagen disponible.</p>
            </div>
          )}
        </div>

        {/* Footer with actions */}
        <div className="flex items-center justify-between border-t border-[#75AADB]/12 bg-[#EEF5FF]/40 px-5 py-3">
          <button
            onClick={onClose}
            className="km-focus rounded-lg border border-[#75AADB]/25 bg-white px-4 py-2 text-xs font-semibold text-[#003B73] transition-colors hover:bg-[#EEF5FF]/60"
          >
            Cerrar
          </button>
          {externalLink && (
            <a
              href={externalLink}
              target="_blank"
              rel="noopener noreferrer"
              className="km-focus inline-flex items-center gap-1.5 rounded-lg bg-[#003B73] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#00305e]"
            >
              <ExternalLink className="h-3 w-3" strokeWidth={2.2} />
              Abrir en otra pestaña
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function OrigenBadgeLight({ origen }: { origen: 'online' | 'caja' }) {
  if (origen === 'caja') {
    return (
      <span className="flex items-center gap-1 rounded-md bg-white/15 px-1.5 py-0.5 text-[11px] font-semibold text-white">
        <Store className="h-3 w-3" strokeWidth={2.4} />
        Caja
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1 rounded-md bg-white/15 px-1.5 py-0.5 text-[11px] font-semibold text-white">
      <Globe className="h-3 w-3" strokeWidth={2.4} />
      Online
    </span>
  )
}
