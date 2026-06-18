'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  Clock,
  ChefHat,
  CheckCircle2,
  Truck,
  CreditCard,
  DollarSign,
  ChevronRight,
  Smartphone,
  Store,
  AlertCircle,
  ArrowRight,
  RefreshCcw,
  Loader2,
  type LucideIcon,
} from 'lucide-react'
import { formatPrice } from '@/lib/products'
import { EVENTO } from '@/lib/evento'
import { apiGet } from '@/lib/api'
import { useApiResource } from '@/lib/use-api-resource'
import { AdminShell } from './admin-shell'
import {
  Badge,
  SectionTitle,
  AdminCard,
  type BadgeTone,
} from './admin-ui'
import { useAdminSession } from './admin-session'
import type { ApiPedidoListItem, ApiPedidoPaginada } from '@/lib/types'

const RECENT_ORDERS_LIMIT = 6
const COUNT_LIMIT = 1
const RECAUDACION_PAGE_LIMIT = 100

const PAYMENT_LABEL: Record<ApiPedidoListItem['estado_pago'], string> = {
  pendiente: 'Pago pendiente',
  comprobante_subido: 'Comprobante',
  pagado: 'Pagado',
  rechazado: 'Rechazado',
}

const PAYMENT_TONE: Record<ApiPedidoListItem['estado_pago'], BadgeTone> = {
  pendiente: 'warning',
  comprobante_subido: 'info',
  pagado: 'success',
  rechazado: 'danger',
}

const STATUS_LABEL: Record<ApiPedidoListItem['estado_pedido'], string> = {
  recibido: 'Recibido',
  en_preparacion: 'En preparación',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

const STATUS_TONE: Record<ApiPedidoListItem['estado_pedido'], BadgeTone> = {
  recibido: 'info',
  en_preparacion: 'preparando',
  listo: 'listo',
  entregado: 'entregado',
  cancelado: 'danger',
}

const METHOD_LABEL: Record<ApiPedidoListItem['metodo_pago'], string> = {
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
}

type DashboardOrder = ApiPedidoListItem & {
  isNew?: boolean
}

type DashboardState = {
  metrics: {
    pendientes: number
    preparando: number
    listos: number
    entregados: number
    pagosPendientes: number
    recaudacion: number
  }
  orders: DashboardOrder[]
  lastUpdate: string
}

type AlertItem = {
  icon: LucideIcon
  text: string
  href: string
  cta: string
}

type Origin = 'online' | 'caja'

function toMoney(value: string | number): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  return Number.parseFloat(value) || 0
}

function toHHMM(isoDate: string): string {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return '--:--'
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function formatNow(date = new Date()): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function asDashboardOrder(order: ApiPedidoListItem): DashboardOrder {
  return {
    ...order,
    total: toMoney(order.total),
  }
}

async function fetchRecaudacionTotal(): Promise<number> {
  let page = 1
  let totalPages = 1
  let recaudacion = 0

  do {
    const data = await apiGet<ApiPedidoPaginada>('/api/admin/pedidos', {
      estado_pago: 'pagado',
      limit: RECAUDACION_PAGE_LIMIT,
      page,
    })

    totalPages = data.paginacion.totalPages
    data.pedidos.forEach((pedido) => {
      if (pedido.estado_pedido === 'cancelado') return
      recaudacion += toMoney(pedido.total)
    })

    page += 1
  } while (page <= totalPages)

  return recaudacion
}

async function fetchDashboardData(): Promise<DashboardState> {
  const [recientes, recibidos, preparando, listos, entregados, pagosPendientes, recaudacion] =
    await Promise.all([
      apiGet<ApiPedidoPaginada>('/api/admin/pedidos', {
        limit: RECENT_ORDERS_LIMIT,
      }),
      apiGet<ApiPedidoPaginada>('/api/admin/pedidos', {
        estado_pedido: 'recibido',
        limit: COUNT_LIMIT,
      }),
      apiGet<ApiPedidoPaginada>('/api/admin/pedidos', {
        estado_pedido: 'en_preparacion',
        limit: COUNT_LIMIT,
      }),
      apiGet<ApiPedidoPaginada>('/api/admin/pedidos', {
        estado_pedido: 'listo',
        limit: COUNT_LIMIT,
      }),
      apiGet<ApiPedidoPaginada>('/api/admin/pedidos', {
        estado_pedido: 'entregado',
        limit: COUNT_LIMIT,
      }),
      apiGet<ApiPedidoPaginada>('/api/admin/pedidos', {
        solo_pagos_pendientes: 'true',
        limit: COUNT_LIMIT,
      }),
      fetchRecaudacionTotal(),
    ])

  const mappedOrders = recientes.pedidos.map(asDashboardOrder).map((order, index) => ({
    ...order,
    isNew: index === 0,
  }))

  return {
    metrics: {
      pendientes: recibidos.paginacion.total,
      preparando: preparando.paginacion.total,
      listos: listos.paginacion.total,
      entregados: entregados.paginacion.total,
      pagosPendientes: pagosPendientes.paginacion.total,
      recaudacion,
    },
    orders: mappedOrders,
    lastUpdate: formatNow(),
  }
}

export function DashboardScreen() {
  const { user } = useAdminSession()

  const {
    data,
    loading,
    refreshing,
    error,
    refetch,
  } = useApiResource<DashboardState>(fetchDashboardData)

  const state = data ?? {
    metrics: {
      pendientes: 0,
      preparando: 0,
      listos: 0,
      entregados: 0,
      pagosPendientes: 0,
      recaudacion: 0,
    },
    orders: [],
    lastUpdate: '--:--',
  }

  const alerts = useMemo<AlertItem[]>(() => {
    const list: AlertItem[] = []
    if (state.metrics.pagosPendientes > 0) {
      list.push({
        icon: CreditCard,
        text: `${state.metrics.pagosPendientes} pagos por revisar`,
        href: '/admin/comprobantes',
        cta: 'Revisar',
      })
    }
    return list
  }, [state.metrics.pagosPendientes])

  if (loading) {
    return (
      <AdminShell section="Panel general" lastUpdate="--:--">
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-[#75AADB]/20 bg-white p-8 text-[#003B73]">
          <div className="flex items-center gap-2 text-sm font-medium text-[#3A5675]">
            <Loader2 className="h-5 w-5 animate-spin text-[#003B73]" />
            Cargando panel...
          </div>
        </div>
      </AdminShell>
    )
  }

  if (error) {
    return (
      <AdminShell section="Panel general" lastUpdate="--:--">
        <div className="rounded-2xl border border-red-300 bg-[#FBE9E7] p-6 text-[#A63329]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <p className="font-semibold">No se pudo cargar el panel: {error}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 rounded-lg border border-[#A63329]/40 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#A63329]"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Reintentar
            </button>
          </div>
        </div>
      </AdminShell>
    )
  }

  return (
    <AdminShell
      section="Panel general"
      lastUpdate={refreshing ? `${state.lastUpdate} (actualizando)` : state.lastUpdate}
      actions={
        <button
          type="button"
          onClick={() => refetch({ silent: true })}
          className="inline-flex items-center gap-2 rounded-lg border border-[#75AADB]/40 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#003B73]"
        >
          <RefreshCcw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      }
    >
      <div className="space-y-7">
        <div>
          <h1 className="font-display text-lg font-extrabold text-[#003B73] sm:text-xl">
            Buenos días{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.
          </h1>
          <p className="mt-0.5 text-xs font-medium text-[#3A5675]">
            {EVENTO.fecha} · {EVENTO.horario} · {EVENTO.direccion}
          </p>
        </div>

        {alerts.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {alerts.map((alert) => {
              const Icon = alert.icon
              return (
                <Link
                  key={alert.text}
                  href={alert.href}
                  className="group flex flex-1 items-center gap-2.5 rounded-xl border border-[#F6B21A]/40 bg-[#FBF0D6]/70 px-3.5 py-2.5 transition-colors hover:bg-[#FBF0D6] sm:min-w-[220px]"
                >
                  <Icon className="h-4 w-4 shrink-0 text-[#8A5A00]" strokeWidth={2.4} />
                  <span className="flex-1 text-sm font-semibold text-[#8A5A00]">{alert.text}</span>
                  <span className="flex items-center gap-0.5 text-xs font-bold text-[#8A5A00]">
                    {alert.cta}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              )
            })}
          </div>
        )}

        <section>
          <SectionTitle>Resumen en vivo</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MetricCard icon={Clock} label="Pendientes" value={state.metrics.pendientes} />
            <MetricCard icon={ChefHat} label="Preparando" value={state.metrics.preparando} />
            <MetricCard icon={CheckCircle2} label="Listos" value={state.metrics.listos} />
            <MetricCard icon={Truck} label="Entregados" value={state.metrics.entregados} />
            <MetricCard
              icon={CreditCard}
              label="Pagos pend."
              value={state.metrics.pagosPendientes}
              variant={state.metrics.pagosPendientes > 0 ? 'alert' : 'default'}
            />
            <MetricCard
              icon={DollarSign}
              label="Recaudación"
              value={formatPrice(state.metrics.recaudacion)}
              variant="primary"
            />
          </div>
        </section>

        <section>
          <SectionTitle
            action={
              <Link
                href="/admin/pedidos"
                className="flex items-center gap-1 text-xs font-bold text-[#003B73] hover:underline"
              >
                Ver todos <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            Últimos pedidos
          </SectionTitle>

          <AdminCard className="overflow-hidden">
            {state.orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-4 py-8 text-sm text-[#3A5675]">
                <AlertCircle className="h-5 w-5" />
                <p className="mt-2 font-semibold">No hay pedidos todavía</p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#75AADB]/15 bg-[#EEF5FF]/60 text-left text-[11px] font-bold uppercase tracking-wide text-[#003B73]/55">
                        <th className="px-4 py-3">Código</th>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3">Origen</th>
                        <th className="px-4 py-3">Método</th>
                        <th className="px-4 py-3">Estado pago</th>
                        <th className="px-4 py-3">Estado pedido</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-right">Hora</th>
                        <th className="px-4 py-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#75AADB]/10">
                      {state.orders.map((order) => (
                        <tr key={order.id} className="transition-colors hover:bg-[#EEF5FF]/50">
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-2 font-mono font-bold text-[#003B73]">
                              {order.numero}
                              {order.isNew && (
                                <span className="rounded-full bg-[#F6B21A] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[#003B73]">
                                  Nuevo
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-[#1F3A56]">{order.nombre_cliente}</td>
                          <td className="px-4 py-3">
                            <OriginPill origin={order.origen} />
                          </td>
                          <td className="px-4 py-3 text-xs font-medium capitalize text-[#3A5675]">
                            {METHOD_LABEL[order.metodo_pago]}
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={PAYMENT_TONE[order.estado_pago]}> {PAYMENT_LABEL[order.estado_pago]} </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={STATUS_TONE[order.estado_pedido]} dot>
                              {STATUS_LABEL[order.estado_pedido]}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-bold tabular-nums text-[#003B73]">
                            {formatPrice(order.total)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-[#3A5675]">
                            {toHHMM(order.created_at)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href="/admin/pedidos"
                              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-[#003B73] transition-colors hover:bg-[#EEF5FF]"
                            >
                              Ver
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-[#75AADB]/10 md:hidden">
                  {state.orders.map((order) => (
                    <Link
                      key={order.id}
                      href="/admin/pedidos"
                      className="block space-y-2 p-4 transition-colors active:bg-[#EEF5FF]/60"
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 font-mono font-bold text-[#003B73]">
                          {order.numero}
                          {order.isNew && (
                            <span className="rounded-full bg-[#F6B21A] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[#003B73]">
                              Nuevo
                            </span>
                          )}
                        </span>
                        <span className="text-xs tabular-nums text-[#3A5675]">{toHHMM(order.created_at)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 font-medium text-[#1F3A56]">
                          {order.nombre_cliente}
                          <OriginPill origin={order.origen} />
                        </span>
                        <span className="font-bold tabular-nums text-[#003B73]">{formatPrice(order.total)}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={PAYMENT_TONE[order.estado_pago]}>
                          {PAYMENT_LABEL[order.estado_pago]}
                        </Badge>
                        <Badge tone={STATUS_TONE[order.estado_pedido]} dot>
                          {STATUS_LABEL[order.estado_pedido]}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </AdminCard>
        </section>
      </div>
    </AdminShell>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  variant = 'default',
}: {
  icon: LucideIcon
  label: string
  value: string | number
  variant?: 'default' | 'primary' | 'alert'
}) {
  const isPrimary = variant === 'primary'
  const isAlert = variant === 'alert'

  return (
    <div
      className={`flex h-full flex-col rounded-2xl border p-4 ${
        isPrimary
          ? 'border-[#003B73] bg-[#003B73]'
          : isAlert
            ? 'border-[#F6B21A] bg-white ring-1 ring-[#F6B21A]/40'
            : 'border-[#75AADB]/20 bg-white'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            isPrimary
              ? 'bg-[#F6B21A] text-[#003B73]'
              : isAlert
                ? 'bg-[#F6B21A]/15 text-[#8A5A00]'
                : 'bg-[#EEF5FF] text-[#003B73]'
          }`}
        >
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <span className={`text-xs font-semibold leading-tight ${isPrimary ? 'text-[#AFC8E6]' : 'text-[#3A5675]'}`}>
          {label}
        </span>
      </div>
      <p
        className={`mt-3 w-full text-center text-2xl font-extrabold tabular-nums ${
          isPrimary ? 'text-white' : 'text-[#003B73]'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function OriginPill({ origin }: { origin: Origin }) {
  const isOnline = origin === 'online'
  const Icon = isOnline ? Smartphone : Store
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#75AADB]/35 bg-[#EEF5FF] px-2 py-0.5 text-[11px] font-semibold text-[#0F4C81]">
      <Icon className="h-3 w-3" strokeWidth={2.4} />
      {isOnline ? 'Online' : 'Caja'}
    </span>
  )
}
