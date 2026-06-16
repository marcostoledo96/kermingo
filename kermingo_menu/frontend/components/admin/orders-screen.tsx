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
  FilterX,
  Receipt,
  ChevronDown,
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
  ListFilter,
} from 'lucide-react'
import { formatPrice } from '@/lib/products'
import { ProductIconGlyph } from '@/components/menu/product-visual'
import { AdminShell } from './admin-shell'
import { EstadoBadge } from './admin-ui'
import type { EstadoVisual } from './admin-ui'
import { apiGet, apiPatch, ApiError } from '@/lib/api'
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
  recibido: 'preparacion',
  preparacion: 'listo',
  listo: 'entregado',
}

/* ---- Dynamic primary action per state ---- */

const PRIMARY_ACTION: Partial<
  Record<OrderStatus, { label: string; icon: typeof Clock; nextLabel: string }>
> = {
  recibido: { label: 'Empezar', icon: Flame, nextLabel: 'En preparación' },
  preparacion: { label: 'Marcar listo', icon: Bell, nextLabel: 'Listo' },
  listo: { label: 'Entregar', icon: CircleCheck, nextLabel: 'Entregado' },
}

function lineTotal(o: Order): number {
  return o.lines.reduce((acc, l) => acc + l.price * l.qty, 0)
}

/* ---- View tabs ---- */

type ViewTab = 'necesitan-accion' | 'todos'

const VIEW_TABS: { id: ViewTab; label: string; shortLabel: string }[] = [
  { id: 'necesitan-accion', label: 'Necesitan acción', shortLabel: 'Acción' },
  { id: 'todos', label: 'Todos los pedidos', shortLabel: 'Todos' },
]

/* ---- Status & payment filter options ---- */

type StatusFilter = 'todos' | OrderStatus
type PayStatusFilter = 'todos' | PayStatus
type MethodFilter = 'todos' | PayMethod

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
  const [viewTab, setViewTab] = useState<ViewTab>('necesitan-accion')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [payFilter, setPayFilter] = useState<PayStatusFilter>('todos')
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('todos')
  const [detail, setDetail] = useState<Order | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const [actionError, setActionError] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(search), 300)
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [search])

  const buildQuery = useCallback(() => {
    const q: Record<string, string | number> = { limit: 50 }
    if (statusFilter !== 'todos') {
      q.estado_pedido = orderStatusToApi(statusFilter)
    }
    if (payFilter !== 'todos') q.estado_pago = payFilter
    if (methodFilter !== 'todos') q.metodo_pago = methodFilter
    if (debouncedSearch.trim()) q.buscar = debouncedSearch.trim()
    return q
  }, [statusFilter, payFilter, methodFilter, debouncedSearch])

  const {
    data: orders,
    loading,
    refreshing,
    error: loadError,
    refetch,
    setData: setOrders,
  } = useApiResource<Order[]>(async () => {
    const data = await apiGet<ApiPedidoPaginada>('/api/admin/pedidos', buildQuery())
    return data.pedidos.map(apiToOrder)
  })

  const allOrders = orders ?? []

  /* Apply view filter client-side */
  const displayed = viewTab === 'necesitan-accion' ? allOrders.filter(needsAction) : allOrders

  const actionCount = allOrders.filter(needsAction).length

  const hasFilters =
    search !== '' || statusFilter !== 'todos' || payFilter !== 'todos' || methodFilter !== 'todos'

  function clearFilters() {
    setSearch('')
    setDebouncedSearch('')
    setStatusFilter('todos')
    setPayFilter('todos')
    setMethodFilter('todos')
  }

  const updateOrderLocal = (id: string, patch: Partial<Order>) => {
    setOrders((prev) => (prev ?? []).map((o) => (o.id === id ? { ...o, ...patch } : o)))
    setDetail((d) => (d && d.id === id ? { ...d, ...patch } : d))
  }

  const openDetail = async (order: Order) => {
    setDetail(order)
    setDetailLoading(true)
    setActionError(null)
    try {
      const full = await apiGet<ApiPedido>(`/api/admin/pedidos/${order.id}`)
      const mapped = apiToOrder(full)
      setDetail(mapped)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'No se pudo cargar el detalle')
    } finally {
      setDetailLoading(false)
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
    } catch (err) {
      if (previous) updateOrderLocal(id, { payStatus: previous })
      setActionError(err instanceof ApiError ? err.message : 'No se pudo marcar como pagado')
    } finally {
      setActing(null)
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
              {displayed.length} {displayed.length === 1 ? 'pedido' : 'pedidos'}
              {viewTab === 'necesitan-accion' && actionCount > 0 && (
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

        {/* Search + View tabs */}
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

          {/* View tabs + filter toggle */}
          <div className="flex items-center gap-1 border-b border-[#75AADB]/12 px-4 py-2">
            {VIEW_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setViewTab(tab.id)}
                aria-label={`Ver: ${tab.label}`}
                className={`km-focus rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  viewTab === tab.id
                    ? tab.id === 'necesitan-accion'
                      ? 'bg-[var(--km-preparando-bg)] text-[var(--km-preparando-text)]'
                      : 'bg-[#003B73] text-white'
                    : 'text-[var(--km-tinta-suave)] hover:bg-[#EEF5FF]/60'
                }`}
              >
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
                {tab.id === 'necesitan-accion' && actionCount > 0 && (
                  <span className="km-tabular ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--km-preparando-text)] px-1 text-[10px] font-extrabold text-white">
                    {actionCount}
                  </span>
                )}
              </button>
            ))}

            <div className="flex-1" />

            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              aria-label={filtersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
              aria-expanded={filtersOpen}
              className={`km-focus flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                hasFilters
                  ? 'border-[#003B73] bg-[#003B73]/8 text-[#003B73]'
                  : 'border-[#75AADB]/20 bg-white text-[var(--km-tinta-suave)] hover:bg-[#EEF5FF]/60'
              }`}
            >
              <ListFilter className="h-3.5 w-3.5" strokeWidth={2.2} />
              <span className="hidden sm:inline">Filtros</span>
              {hasFilters && (
                <span className="km-tabular ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[#003B73] px-1 text-[10px] font-extrabold text-white">
                  {[statusFilter !== 'todos', payFilter !== 'todos', methodFilter !== 'todos'].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          {/* Collapsible filter panel */}
          {filtersOpen && (
            <div className="space-y-3 border-b border-[#75AADB]/12 px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start">
                <FilterGroup label="Estado">
                  <FilterChip active={statusFilter === 'todos'} onClick={() => setStatusFilter('todos')}>
                    Todos
                  </FilterChip>
                  {(Object.keys(ORDER_STATUS_VISUAL) as OrderStatus[]).map((s) => (
                    <FilterChip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>
                      {ORDER_STATUS_VISUAL[s].label}
                    </FilterChip>
                  ))}
                </FilterGroup>

                <FilterGroup label="Pago">
                  <FilterChip active={payFilter === 'todos'} onClick={() => setPayFilter('todos')}>
                    Todos
                  </FilterChip>
                  <FilterChip active={payFilter === 'pagado'} onClick={() => setPayFilter('pagado')}>
                    Pagado
                  </FilterChip>
                  <FilterChip active={payFilter === 'pendiente'} onClick={() => setPayFilter('pendiente')}>
                    Pendiente
                  </FilterChip>
                </FilterGroup>

                <FilterGroup label="Método">
                  <FilterChip active={methodFilter === 'todos'} onClick={() => setMethodFilter('todos')}>
                    Todos
                  </FilterChip>
                  <FilterChip active={methodFilter === 'efectivo'} onClick={() => setMethodFilter('efectivo')}>
                    Efectivo
                  </FilterChip>
                  <FilterChip
                    active={methodFilter === 'transferencia'}
                    onClick={() => setMethodFilter('transferencia')}
                  >
                    Transferencia
                  </FilterChip>
                </FilterGroup>
              </div>

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 self-start rounded-full border border-[var(--km-peligro-bg)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--km-peligro-text)] transition-colors hover:bg-[var(--km-peligro-bg)]"
                >
                  <FilterX className="h-3.5 w-3.5" strokeWidth={2.4} />
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>

        {/* Order list */}
        {loading ? (
          <div className="km-panel px-6 py-10 text-center text-sm font-medium text-[var(--km-tinta-suave)]">
            Cargando pedidos…
          </div>
        ) : displayed.length === 0 ? (
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
                    {displayed.map((o) => (
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
                            variant="table"
                            onDetail={() => openDetail(o)}
                            onAdvance={() => {
                              const next = NEXT_STATUS[o.status]
                              if (next) setStatus(o.id, next)
                            }}
                            onMarkPaid={() => markPaid(o.id)}
                            onCancel={() => cancelOrder(o.id)}
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
              {displayed.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  acting={acting === o.id}
                  onDetail={() => openDetail(o)}
                  onAdvance={() => {
                    const next = NEXT_STATUS[o.status]
                    if (next) setStatus(o.id, next)
                  }}
                  onMarkPaid={() => markPaid(o.id)}
                  onCancel={() => cancelOrder(o.id)}
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
          onClose={() => setDetail(null)}
          onAdvance={() => {
            const next = NEXT_STATUS[detail.status]
            if (next) setStatus(detail.id, next)
          }}
          onMarkPaid={() => markPaid(detail.id)}
          onCancel={() => cancelOrder(detail.id)}
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
  onDetail,
  onAdvance,
  onMarkPaid,
  onCancel,
}: {
  order: Order
  acting: boolean
  onDetail: () => void
  onAdvance: () => void
  onMarkPaid: () => void
  onCancel: () => void
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
  variant: _variant,
  onDetail,
  onAdvance,
  onMarkPaid,
  onCancel,
}: {
  order: Order
  acting: boolean
  variant: 'table'
  onDetail: () => void
  onAdvance: () => void
  onMarkPaid: () => void
  onCancel: () => void
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
  if (viewTab === 'necesitan-accion') {
    return (
      <div className="km-panel flex flex-col items-center gap-3 px-6 py-14 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--km-listo-bg)] text-[var(--km-listo-text)]">
          <CircleCheck className="h-7 w-7" strokeWidth={1.8} />
        </div>
        <p className="font-bold text-[#003B73]">
          {hasFilters ? 'Ningún pedido necesita acción con esos filtros' : 'Todo en orden'}
        </p>
        <p className="text-sm text-[var(--km-tinta-suave)]">
          {hasFilters
            ? 'Probá ajustar los filtros para ver más pedidos.'
            : 'No hay pedidos pendientes de acción en este momento.'}
        </p>
        {hasFilters && (
          <button
            onClick={onClearFilters}
            className="mt-1 rounded-lg border border-[#003B73] bg-white px-3 py-1.5 text-xs font-bold text-[#003B73] hover:bg-[#EEF5FF]/60"
          >
            Limpiar filtros
          </button>
      )}
    </div>
  )
} (
    <div className="km-panel flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF5FF] text-[#75AADB]">
        <Inbox className="h-7 w-7" strokeWidth={1.6} />
      </div>
      <p className="font-bold text-[#003B73]">
        {hasFilters ? 'No hay pedidos con esos filtros' : 'No hay pedidos todavía'}
      </p>
      <p className="text-sm text-[var(--km-tinta-suave)]">
        {hasFilters
          ? 'Probá ajustar la búsqueda o los filtros.'
          : 'Los pedidos aparecerán acá cuando se confirmen.'}
      </p>
      {hasFilters && (
        <button
          onClick={onClearFilters}
          className="mt-1 rounded-lg border border-[#003B73] bg-white px-3 py-1.5 text-xs font-bold text-[#003B73] hover:bg-[#EEF5FF]/60"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  )
}

/* ---- Filter group & chips ---- */

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-1.5 hidden text-[11px] font-semibold text-[#003B73]/45 sm:inline">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`km-focus rounded-full border px-2.5 py-1 text-xs font-bold transition-colors ${
        active
          ? 'border-[#003B73] bg-[#003B73] text-white'
          : 'border-[#75AADB]/25 bg-white text-[#003B73] hover:border-[#75AADB]'
      }`}
    >
      {children}
    </button>
  )
}

/* ====================================================================== */
/* Order detail modal                                                      */
/* ====================================================================== */

function OrderDetailModal({
  order,
  loading,
  acting,
  onClose,
  onAdvance,
  onMarkPaid,
  onCancel,
}: {
  order: Order
  loading: boolean
  acting: boolean
  onClose: () => void
  onAdvance: () => void
  onMarkPaid: () => void
  onCancel: () => void
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
                <button
                  disabled
                  title="Próximamente"
                  className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl border border-[#75AADB]/20 bg-white p-3 text-left opacity-80"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--km-listo-bg)] text-[var(--km-listo-text)]">
                    <Receipt className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-[#003B73]">
                      Comprobante adjunto
                    </span>
                    <span className="block text-xs text-[var(--km-tinta-suave)]">Tocá para ver la imagen (próximamente)</span>
                  </span>
                  <ChevronDown className="h-4 w-4 -rotate-90 text-[var(--km-tinta-suave)]" />
                </button>
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