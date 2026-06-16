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
} from 'lucide-react'
import { formatPrice } from '@/lib/products'
import { AdminShell } from './admin-shell'
import { Badge, SectionTitle } from './admin-ui'
import { useAdminSession } from './admin-session'
import { apiGet, apiPatch, ApiError } from '@/lib/api'
import type { ApiPedidoListItem, ApiPedido } from '@/lib/types'

const STATUS_META: Record<string, { label: string; tone: 'warning' | 'success' | 'danger' | 'neutral' }> = {
  comprobante_subido: { label: 'Comprobante subido', tone: 'warning' },
  pendiente: { label: 'Pendiente', tone: 'neutral' },
  pagado: { label: 'Pagado', tone: 'success' },
  rechazado: { label: 'Rechazado', tone: 'danger' },
}

export function ComprobantesScreen() {
  const { expireSession } = useAdminSession()
  const [orders, setOrders] = useState<ApiPedidoListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'comprobante_subido' | 'rechazado' | 'all'>('comprobante_subido')
  const [search, setSearch] = useState('')
  const [acting, setActing] = useState<number | null>(null)
  const [detail, setDetail] = useState<ApiPedido | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [comprobanteUrl, setComprobanteUrl] = useState<string | null>(null)
  const [comprobanteError, setComprobanteError] = useState<string | null>(null)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, string | number | undefined> = {
        solo_pagos_pendientes: filter === 'all' ? undefined : 'true',
        limit: 100,
      }
      if (filter !== 'all') {
        // We'll filter client-side for status
      }
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

  const markPaid = async (id: number) => {
    setActing(id)
    try {
      await apiPatch(`/api/admin/pedidos/${id}/pago`, { estado_pago: 'pagado' })
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, estado_pago: 'pagado' } : o)))
      if (detail?.id === id) setDetail({ ...detail, estado_pago: 'pagado' })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) expireSession()
    } finally {
      setActing(null)
    }
  }

  const markRejected = async (id: number) => {
    setActing(id)
    try {
      await apiPatch(`/api/admin/pedidos/${id}/pago`, { estado_pago: 'rechazado' })
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, estado_pago: 'rechazado' } : o)))
      if (detail?.id === id) setDetail({ ...detail, estado_pago: 'rechazado' })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) expireSession()
    } finally {
      setActing(null)
    }
  }

  const openDetail = async (id: number) => {
    setDetailLoading(true)
    setDetail(null)
    setComprobanteUrl(null)
    setComprobanteError(null)
    try {
      const pedido = await apiGet<ApiPedido>(`/api/admin/pedidos/${id}`)
      setDetail(pedido)
      // If the pedido has a comprobante, fetch its metadata to get the Drive URL
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
    } finally {
      setDetailLoading(false)
    }
  }

  const statusBadge = (status: string) => {
    const meta = STATUS_META[status] || { label: status, tone: 'neutral' as const }
    const toneMap: Record<string, string> = {
      warning: 'preparando',
      success: 'listo',
      danger: 'peligro',
      neutral: 'neutral',
    }
    return <Badge tone={(toneMap[meta.tone] || 'neutral') as any} dot>{meta.label}</Badge>
  }

  return (
    <AdminShell section="Comprobantes" subtitle="Revisión de transferencias">
      <SectionTitle>Filtrar por estado</SectionTitle>
      <div className="mb-4 flex flex-wrap gap-2">
        {([
          ['comprobante_subido', 'Pendientes'],
          ['rechazado', 'Rechazados'],
          ['all', 'Todos'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === key
                ? 'border-[var(--km-azul)] bg-[var(--km-azul)] text-white'
                : 'border-[var(--km-linea)] bg-white text-[var(--km-azul)] hover:bg-[var(--km-fondo)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--km-tinta-suave)]" strokeWidth={2} />
          <input
            type="text"
            placeholder="Buscar por nombre o número…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="kermingo-input pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--km-celeste)]" />
          <p className="text-sm font-medium text-[var(--km-tinta-suave)]">Cargando comprobantes…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm font-medium text-[var(--km-peligro-text)]">{error}</p>
          <button onClick={loadOrders} className="text-xs font-bold text-[var(--km-azul)] underline">
            Reintentar
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Inbox className="h-10 w-10 text-[var(--km-celeste)]" strokeWidth={1.6} />
          <p className="text-sm font-medium text-[var(--km-tinta-suave)]">No hay comprobantes para revisar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <div key={order.id} className="km-panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[var(--km-azul)]">{order.numero}</span>
                  {statusBadge(order.estado_pago)}
                </div>
                <p className="truncate text-sm font-semibold text-[var(--km-azul)]">{order.nombre_cliente}</p>
                <p className="text-xs text-[var(--km-tinta-suave)]">
                  {order.created_at ? new Date(order.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[var(--km-azul)] km-tabular">{formatPrice(Number(order.total))}</span>
                <button
                  onClick={() => openDetail(order.id)}
                  className="flex items-center gap-1 rounded-lg border border-[var(--km-linea)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[var(--km-azul)] transition-colors hover:bg-[var(--km-fondo)]"
                >
                  <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                  Ver
                </button>
                {order.estado_pago === 'comprobante_subido' && (
                  <>
                    <button
                      onClick={() => markPaid(order.id)}
                      disabled={acting === order.id}
                      className="flex items-center gap-1 rounded-lg bg-[var(--km-listo-bg)] px-2.5 py-1.5 text-xs font-semibold text-[var(--km-listo-text)] transition-colors hover:brightness-110 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />
                      Aprobar
                    </button>
                    <button
                      onClick={() => markRejected(order.id)}
                      disabled={acting === order.id}
                      className="flex items-center gap-1 rounded-lg bg-[var(--km-peligro-bg)] px-2.5 py-1.5 text-xs font-semibold text-[var(--km-peligro-text)] transition-colors hover:brightness-110 disabled:opacity-50"
                    >
                      <XCircle className="h-3.5 w-3.5" strokeWidth={2} />
                      Rechazar
                    </button>
                  </>
                )}
                {order.estado_pago === 'rechazado' && (
                  <button
                    onClick={() => markPaid(order.id)}
                    disabled={acting === order.id}
                    className="flex items-center gap-1 rounded-lg bg-[var(--km-listo-bg)] px-2.5 py-1.5 text-xs font-semibold text-[var(--km-listo-text)] transition-colors hover:brightness-110 disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
                    Reaprobar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#003B73]/50 backdrop-blur-sm" onClick={() => { setDetail(null); setDetailLoading(false); setComprobanteUrl(null); setComprobanteError(null); }}>
          <div className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {detailLoading ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--km-celeste)]" />
                <p className="text-sm font-medium text-[var(--km-tinta-suave)]">Cargando detalle…</p>
              </div>
            ) : detail ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-extrabold text-[var(--km-azul)]">
                    {detail.numero} — {detail.nombre_cliente}
                  </h3>
                  <button onClick={() => setDetail(null)} className="text-[var(--km-tinta-suave)] hover:text-[var(--km-azul)]">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--km-tinta-suave)]">Total</span>
                    <span className="font-bold text-[var(--km-azul)]">{formatPrice(Number(detail.total))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--km-tinta-suave)]">Estado de pago</span>
                    {statusBadge(detail.estado_pago)}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--km-tinta-suave)]">Estado del pedido</span>
                    <span className="font-medium">{detail.estado_pedido}</span>
                  </div>
                  {detail.comprobante_archivo_id && (
                    <div className="space-y-1">
                      {comprobanteUrl ? (
                        <a
                          href={comprobanteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-lg bg-[var(--km-fondo)] px-3 py-2 text-sm font-semibold text-[var(--km-azul)] transition-colors hover:bg-[var(--km-celeste)]/25"
                        >
                          <FileText className="h-4 w-4" strokeWidth={2} />
                          Abrir en Drive
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : comprobanteError ? (
                        <p className="text-xs text-[var(--km-peligro-text)]">{comprobanteError}</p>
                      ) : (
                        <p className="flex items-center gap-1.5 text-xs text-[var(--km-tinta-suave)]">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Cargando comprobante…
                        </p>
                      )}
                    </div>
                  )}
                  <div className="border-t border-[var(--km-linea)] pt-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--km-tinta-suave)]">Items</p>
                    {detail.items?.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{item.nombre_producto} × {item.cantidad}</span>
                        <span className="font-medium">{formatPrice(Number(item.subtotal))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </AdminShell>
  )
}