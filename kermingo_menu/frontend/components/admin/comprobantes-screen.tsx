'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  Inbox,
  RotateCcw,
  X,
  Loader2,
  AlertCircle,
  Hash,
  Clock,
  FilterX,
  ArrowRightLeft,
  Banknote,
} from 'lucide-react'
import { formatPrice } from '@/lib/products'
import { AdminShell } from './admin-shell'
import { EstadoBadge } from './admin-ui'
import type { EstadoVisual } from './admin-ui'
import { useAdminSession } from './admin-session'
import { apiGet, apiPatch, ApiError } from '@/lib/api'
import type { ApiPedidoListItem, ApiPedido } from '@/lib/types'

/* ---------------------------------------------------------------------------
 * Comprobantes Screen — v0-aligned visual revision
 * -------------------------------------------------------------------------
 * Goals:
 *   1. Use EstadoBadge for all status displays (replaces Badge tone mapping).
 *   2. AdminCard containers, rounded-full chips, v0 palette (hex, not vars).
 *   3. Dark blue modal header, rounded panels, action buttons with tokens.
 *   4. Centered empty/loading/error states with icons.
 *   5. Preserve all real API: fetch, filter, search, approve/reject, metadata/url_publica.
 *   6. Use km-panel, km-focus, km-tabular where appropriate.
 * ------------------------------------------------------------------------- */

/* ---- Payment status → EstadoBadge mapping ---- */

const PAYMENT_ESTADO_MAP: Record<string, EstadoVisual> = {
  comprobante_subido: 'preparando',
  pendiente: 'pendiente',
  pagado: 'listo',
  rechazado: 'cancelado',
}

const PAYMENT_LABEL_MAP: Record<string, string> = {
  comprobante_subido: 'Comprobante subido',
  pendiente: 'Pendiente',
  pagado: 'Pagado',
  rechazado: 'Rechazado',
}

/* ---- Filter type ---- */

type ComprobanteFilter = 'comprobante_subido' | 'rechazado' | 'all'

const FILTER_OPTIONS: { key: ComprobanteFilter; label: string }[] = [
  { key: 'comprobante_subido', label: 'Pendientes' },
  { key: 'rechazado', label: 'Rechazados' },
  { key: 'all', label: 'Todos' },
]

export function buildComprobantesQuery(filter: ComprobanteFilter): Record<string, string | number | undefined> {
  const params: Record<string, string | number | undefined> = {
    metodo_pago: 'transferencia',
    origen: 'online',
    limit: 100,
  }

  if (filter === 'comprobante_subido') {
    params.estado_pago = 'comprobante_subido'
  } else if (filter === 'rechazado') {
    params.estado_pago = 'rechazado'
  }

  return params
}

/* ====================================================================== */
/* Main component                                                          */
/* ====================================================================== */

export function ComprobantesScreen() {
  const { expireSession } = useAdminSession()
  const [orders, setOrders] = useState<ApiPedidoListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<ComprobanteFilter>('comprobante_subido')
  const [search, setSearch] = useState('')
  const [acting, setActing] = useState<number | null>(null)
  const [detail, setDetail] = useState<ApiPedido | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null)
  const [comprobanteError, setComprobanteError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = buildComprobantesQuery(filter)
      const data = await apiGet<{ pedidos: ApiPedidoListItem[]; paginacion: { total: number } }>('/api/admin/pedidos', params)
      setOrders(data.pedidos)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        expireSession()
        return
      }
      setError(err instanceof Error ? err.message : 'Error al cargar pedidos')
    } finally {
      setLoading(false)
    }
  }, [filter, expireSession])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  const filtered = useMemo(() => {
    let list = orders.filter((o) => o.origen === 'online' && o.metodo_pago === 'transferencia')
    if (filter === 'comprobante_subido') {
      list = list.filter((o) => o.estado_pago === 'comprobante_subido')
    } else if (filter === 'rechazado') {
      list = list.filter((o) => o.estado_pago === 'rechazado')
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (o) =>
          o.nombre_cliente?.toLowerCase().includes(q) ||
          o.numero?.toLowerCase().includes(q),
      )
    }
    return list
  }, [orders, filter, search])

  const hasFilters = search !== '' || filter !== 'comprobante_subido'

  function clearFilters() {
    setSearch('')
    setFilter('comprobante_subido')
  }

  /* ---- Actions ---- */

  const markPaid = async (id: number) => {
    setActing(id)
    setActionError(null)
    try {
      await apiPatch(`/api/admin/pedidos/${id}/pago`, { estado_pago: 'pagado' })
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, estado_pago: 'pagado' } : o)))
      if (detail?.id === id) setDetail({ ...detail, estado_pago: 'pagado' })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) expireSession()
      setActionError(err instanceof ApiError ? err.message : 'No se pudo marcar como pagado')
    } finally {
      setActing(null)
    }
  }

  const markRejected = async (id: number) => {
    setActing(id)
    setActionError(null)
    try {
      await apiPatch(`/api/admin/pedidos/${id}/pago`, { estado_pago: 'rechazado' })
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, estado_pago: 'rechazado' } : o)))
      if (detail?.id === id) setDetail({ ...detail, estado_pago: 'rechazado' })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) expireSession()
      setActionError(err instanceof ApiError ? err.message : 'No se pudo rechazar')
    } finally {
      setActing(null)
    }
  }

  const openDetail = async (id: number) => {
    setDetailLoading(true)
    setDetail(null)
    setComprobanteUrl(null)
    setComprobanteError(null)
    setActionError(null)
    try {
      const pedido = await apiGet<ApiPedido>(`/api/admin/pedidos/${id}`)
      setDetail(pedido)
      if (pedido.comprobante_archivo_id) {
        try {
          type ComprobanteMeta = { url_publica: string | null; nombre_original: string; mime_type: string }
          const meta = await apiGet<ComprobanteMeta>(`/api/admin/pedidos/${id}/comprobante`)
          if (meta.url_publica) {
            setComprobanteUrl(meta.url_publica)
          } else {
            setComprobanteError('El comprobante no tiene enlace público de Drive.')
          }
        } catch (err) {
          setComprobanteError(err instanceof ApiError ? err.message : 'No se pudo obtener el comprobante')
        }
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) expireSession()
      setActionError(err instanceof ApiError ? err.message : 'No se pudo cargar el detalle')
    } finally {
      setDetailLoading(false)
    }
  }

  /* ---- Render ---- */

  return (
    <AdminShell section="Comprobantes" subtitle="Revisión de transferencias">
      {/* Error banner */}
      {actionError && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[var(--km-peligro-bg)] bg-[var(--km-peligro-bg)] px-4 py-3 text-sm text-[var(--km-peligro-text)]">
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

      {/* Filters panel */}
      <div className="km-panel overflow-hidden">
        {/* Search bar */}
        <div className="border-b border-[#75AADB]/12 px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#75AADB]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por número o cliente…"
              aria-label="Buscar comprobantes"
              className="w-full rounded-xl border border-[#75AADB]/25 bg-[#EEF5FF]/30 py-2.5 pl-10 pr-3 text-sm font-medium text-[#003B73] placeholder:text-[#75AADB]/70 focus:border-[#003B73] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-1.5 border-b border-[#75AADB]/12 px-4 py-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={`km-focus rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                filter === opt.key
                  ? 'border-[#003B73] bg-[#003B73] text-white'
                  : 'border-[#75AADB]/25 bg-white text-[#003B73] hover:border-[#75AADB]'
              }`}
            >
              {opt.label}
            </button>
          ))}

          <div className="flex-1" />

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 rounded-full border border-[var(--km-peligro-bg)] bg-white px-2.5 py-1 text-xs font-bold text-[var(--km-peligro-text)] transition-colors hover:bg-[var(--km-peligro-bg)]"
            >
              <FilterX className="h-3 w-3" strokeWidth={2.4} />
              <span className="hidden sm:inline">Limpiar</span>
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="km-panel flex flex-col items-center gap-3 px-6 py-14 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#75AADB]" strokeWidth={2.2} />
          <p className="text-sm font-medium text-[var(--km-tinta-suave)]">Cargando comprobantes…</p>
        </div>
      ) : error ? (
        <div className="km-panel flex flex-col items-center gap-3 px-6 py-14 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--km-peligro-bg)] text-[var(--km-peligro-text)]">
            <AlertCircle className="h-7 w-7" strokeWidth={1.8} />
          </div>
          <p className="font-bold text-[#003B73]">Error al cargar</p>
          <p className="text-sm text-[var(--km-tinta-suave)]">{error}</p>
          <button
            onClick={() => loadOrders()}
            className="mt-1 rounded-lg border border-[#003B73] bg-white px-3 py-1.5 text-xs font-bold text-[#003B73] hover:bg-[#EEF5FF]/60"
          >
            Reintentar
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <ComprobanteEmptyState hasFilters={hasFilters} onClearFilters={clearFilters} filter={filter} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((order) => (
            <ComprobanteCard
              key={order.id}
              order={order}
              acting={acting === order.id}
              onView={() => openDetail(order.id)}
              onApprove={() => markPaid(order.id)}
              onReject={() => markRejected(order.id)}
              onReapprove={order.estado_pago === 'rechazado' ? () => markPaid(order.id) : undefined}
            />
          ))}
        </div>
      )}

      {/* Detail modal */}
      {(detail || detailLoading) && (
        <ComprobanteDetailModal
          order={detail}
          loading={detailLoading}
          comprobanteUrl={comprobanteUrl}
          comprobanteError={comprobanteError}
          acting={acting === detail?.id}
          onClose={() => { setDetail(null); setDetailLoading(false); setComprobanteUrl(null); setComprobanteError(null) }}
          onApprove={() => detail && markPaid(detail.id)}
          onReject={() => detail && markRejected(detail.id)}
        />
      )}
    </AdminShell>
  )
}

/* ====================================================================== */
/* Subcomponents                                                          */
/* ====================================================================== */

/* ---- Comprobante card ---- */

function ComprobanteCard({
  order,
  acting,
  onView,
  onApprove,
  onReject,
  onReapprove,
}: {
  order: ApiPedidoListItem
  acting: boolean
  onView: () => void
  onApprove: () => void
  onReject: () => void
  onReapprove?: () => void
}) {
  const estado = PAYMENT_ESTADO_MAP[order.estado_pago] || 'pendiente'
  const label = PAYMENT_LABEL_MAP[order.estado_pago] || order.estado_pago
  const isComprobanteSubido = order.estado_pago === 'comprobante_subido'
  const isRechazado = order.estado_pago === 'rechazado'

  return (
    <div className="km-panel overflow-hidden p-4">
      {/* Top row: code + badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1 km-tabular text-lg font-extrabold leading-none text-[#003B73]">
            <Hash className="h-4 w-4 text-[#75AADB]" strokeWidth={2.6} />
            {order.numero?.replace('KMG-', '') || '—'}
          </div>
          <p className="mt-1 truncate font-bold text-[#003B73]">{order.nombre_cliente}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--km-tinta-suave)]">
            <span className="flex items-center gap-1 km-tabular">
              <Clock className="h-3 w-3" strokeWidth={2.4} />
              {order.created_at ? new Date(order.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </div>
        </div>
        <EstadoBadge estado={estado} dot>
          {label}
        </EstadoBadge>
      </div>

      {/* Total + method */}
      <div className="mt-3 flex items-center justify-between border-t border-[#75AADB]/8 pt-3">
        <span className="flex items-center gap-1 text-xs font-medium text-[var(--km-tinta-suave)]">
          {order.metodo_pago === 'efectivo' ? (
            <Banknote className="h-3.5 w-3.5" strokeWidth={2.2} />
          ) : (
            <ArrowRightLeft className="h-3.5 w-3.5" strokeWidth={2.2} />
          )}
          Transferencia
        </span>
        <span className="km-tabular text-lg font-extrabold text-[#003B73]">
          {formatPrice(Number(order.total))}
        </span>
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[#75AADB]/8 pt-3">
        <button
          onClick={onView}
          className="km-focus flex items-center gap-1 rounded-lg border border-[#75AADB]/25 bg-white px-2.5 py-2 text-xs font-semibold text-[#003B73] transition-colors hover:bg-[#EEF5FF]/60"
        >
          <Eye className="h-3.5 w-3.5" strokeWidth={2.2} />
          Ver
        </button>
        {isComprobanteSubido && (
          <>
            <button
              onClick={onApprove}
              disabled={acting}
              className="km-focus flex items-center gap-1 rounded-lg border border-[var(--km-listo-bg)] bg-[var(--km-listo-bg)] px-2.5 py-2 text-xs font-semibold text-[var(--km-listo-text)] transition-colors hover:bg-[var(--km-listo-bg)]/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.2} />
              Aprobar
            </button>
            <button
              onClick={onReject}
              disabled={acting}
              className="km-focus flex items-center gap-1 rounded-lg border border-[var(--km-peligro-bg)] bg-white px-2.5 py-2 text-xs font-semibold text-[var(--km-peligro-text)] transition-colors hover:bg-[var(--km-peligro-bg)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <XCircle className="h-3.5 w-3.5" strokeWidth={2.2} />
              Rechazar
            </button>
          </>
        )}
        {isRechazado && onReapprove && (
          <button
            onClick={onReapprove}
            disabled={acting}
            className="km-focus flex items-center gap-1 rounded-lg border border-[var(--km-listo-bg)] bg-[var(--km-listo-bg)] px-2.5 py-2 text-xs font-semibold text-[var(--km-listo-text)] transition-colors hover:bg-[var(--km-listo-bg)]/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.2} />
            Reaprobar
          </button>
        )}
      </div>
    </div>
  )
}

/* ---- Comprobante empty state ---- */

function ComprobanteEmptyState({
  hasFilters,
  onClearFilters,
  filter,
}: {
  hasFilters: boolean
  onClearFilters: () => void
  filter: ComprobanteFilter
}) {
  const label = FILTER_OPTIONS.find((f) => f.key === filter)?.label || ''
  return (
    <div className="km-panel flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF5FF] text-[#75AADB]">
        <Inbox className="h-7 w-7" strokeWidth={1.6} />
      </div>
      <p className="font-bold text-[#003B73]">
        {hasFilters ? 'No hay comprobantes con esos filtros' : `No hay comprobantes ${label.toLowerCase()}`}
      </p>
      <p className="text-sm text-[var(--km-tinta-suave)]">
        {hasFilters
          ? 'Probá ajustar la búsqueda o los filtros.'
          : 'Cuando lleguen comprobantes de transferencia, los vas a ver acá.'}
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

/* ---- Comprobante detail modal ---- */

function ComprobanteDetailModal({
  order,
  loading,
  comprobanteUrl,
  comprobanteError,
  acting,
  onClose,
  onApprove,
  onReject,
}: {
  order: ApiPedido | null
  loading: boolean
  comprobanteUrl: string | null
  comprobanteError: string | null
  acting: boolean
  onClose: () => void
  onApprove: () => void
  onReject: () => void
}) {
  if (!order && !loading) return null

  const estado = order ? (PAYMENT_ESTADO_MAP[order.estado_pago] || 'pendiente') : 'pendiente'
  const label = order ? (PAYMENT_LABEL_MAP[order.estado_pago] || order.estado_pago) : ''
  const isComprobanteSubido = order?.estado_pago === 'comprobante_subido'
  const isRechazado = order?.estado_pago === 'rechazado'
  const isPagado = order?.estado_pago === 'pagado'

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-[#003B73]/40 backdrop-blur-sm"
      />
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        {/* Header — v0 dark blue */}
        <div className="border-b border-[#75AADB]/12 bg-[#003B73] px-5 py-4 pr-14 text-white">
          {loading ? (
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-[#F6B21A]" strokeWidth={2.4} />
              <span className="text-sm font-medium text-white/70">Cargando detalle…</span>
            </div>
          ) : order ? (
            <>
              <div className="flex items-center gap-1.5 km-tabular text-2xl font-extrabold leading-none">
                <Hash className="h-5 w-5 text-[#F6B21A]" strokeWidth={2.6} />
                {order.numero?.replace('KMG-', '') || '—'}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-sm font-bold text-white/90">{order.nombre_cliente}</span>
                <EstadoBadge estado={estado} dot>
                  {label}
                </EstadoBadge>
                <span className="km-tabular text-sm font-extrabold text-[#F6B21A]">
                  {formatPrice(Number(order.total))}
                </span>
              </div>
            </>
          ) : null}
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
          {/* Error in detail */}
          {comprobanteError && (
            <div className="flex items-center gap-2 rounded-xl border border-[var(--km-peligro-bg)] bg-[var(--km-peligro-bg)] px-3 py-2 text-xs font-medium text-[var(--km-peligro-text)]">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" strokeWidth={2.2} />
              {comprobanteError}
            </div>
          )}

          {/* Customer info */}
          {order && (
            <section>
              <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-[#003B73]/50">
                Datos del pedido
              </h3>
              <div className="space-y-1.5 rounded-xl bg-[#EEF5FF]/60 p-3.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--km-tinta-suave)]">Estado de pago</span>
                  <EstadoBadge estado={estado} dot>
                    {label}
                  </EstadoBadge>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--km-tinta-suave)]">Estado del pedido</span>
                  <span className="font-medium text-[#003B73]">{order.estado_pedido}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--km-tinta-suave)]">Total</span>
                  <span className="km-tabular font-bold text-[#003B73]">
                    {formatPrice(Number(order.total))}
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Comprobante link */}
          {order?.comprobante_archivo_id && (
            <section>
              <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-[#003B73]/50">
                Comprobante
              </h3>
              {comprobanteUrl ? (
                <a
                  href={comprobanteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border border-[#75AADB]/20 bg-white p-3 text-left transition-colors hover:bg-[#EEF5FF]/60"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--km-listo-bg)] text-[var(--km-listo-text)]">
                    <FileText className="h-5 w-5" strokeWidth={2} />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-[#003B73]">
                      Abrir en Drive
                    </span>
                    <span className="block text-xs text-[var(--km-tinta-suave)]">
                      Ver comprobante de transferencia
                    </span>
                  </span>
                  <ExternalLink className="h-4 w-4 text-[var(--km-tinta-suave)]" strokeWidth={2.2} />
                </a>
              ) : !comprobanteError ? (
                <div className="flex items-center gap-2 rounded-xl border border-[#75AADB]/15 bg-[#EEF5FF]/40 px-4 py-3 text-xs font-medium text-[var(--km-tinta-suave)]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.2} />
                  Cargando comprobante…
                </div>
              ) : null}
            </section>
          )}

          {/* Items */}
          {order?.items && order.items.length > 0 && (
            <section>
              <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-[#003B73]/50">
                Items
              </h3>
              <ul className="divide-y divide-[#75AADB]/8 overflow-hidden rounded-xl border border-[#75AADB]/15">
                {order.items.map((item, i) => (
                  <li key={i} className="flex items-center justify-between px-3.5 py-2.5">
                    <span className="text-sm font-semibold text-[#003B73]">
                      {item.nombre_producto} × {item.cantidad}
                    </span>
                    <span className="km-tabular text-sm font-bold text-[var(--km-tinta)]">
                      {formatPrice(Number(item.subtotal))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Action footer */}
        {order && (
          <div className="space-y-2 border-t border-[#75AADB]/12 bg-[#EEF5FF]/40 p-4">
            {isComprobanteSubido && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onReject}
                  disabled={acting}
                  className="km-focus flex items-center justify-center gap-1.5 rounded-lg border border-[var(--km-peligro-bg)] bg-white px-3 py-2.5 text-xs font-semibold text-[var(--km-peligro-text)] transition-colors hover:bg-[var(--km-peligro-bg)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Rechazar
                </button>
                <button
                  onClick={onApprove}
                  disabled={acting}
                  className="km-focus flex items-center justify-center gap-1.5 rounded-lg bg-[#F6B21A] px-3 py-2.5 text-xs font-extrabold text-[#003B73] shadow-sm transition-colors hover:bg-[#ffbe2e] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.2} />
                  Aprobar pago
                </button>
              </div>
            )}
            {isRechazado && (
              <button
                onClick={onApprove}
                disabled={acting}
                className="km-focus flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--km-listo-bg)] bg-[var(--km-listo-bg)] px-3 py-2.5 text-xs font-semibold text-[var(--km-listo-text)] transition-colors hover:bg-[var(--km-listo-bg)]/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.2} />
                Reaprobar pago
              </button>
            )}
            {isPagado && (
              <div className="flex items-center justify-center gap-1.5 rounded-xl bg-[var(--km-listo-bg)] px-4 py-3 text-sm font-semibold text-[var(--km-listo-text)]">
                <CheckCircle2 className="h-4 w-4" strokeWidth={2.2} />
                Pago aprobado
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
