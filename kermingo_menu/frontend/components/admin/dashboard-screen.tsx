'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Clock,
  ChefHat,
  CheckCircle2,
  Truck,
  CreditCard,
  DollarSign,
  AlertTriangle,
  Zap,
  ClipboardList,
  ReceiptText,
  UtensilsCrossed,
  BarChart3,
  Settings,
  ChevronRight,
  ArrowRight,
  Store,
  Smartphone,
  type LucideIcon,
} from 'lucide-react'
import { formatPrice } from '@/lib/products'
import { EVENTO } from '@/lib/evento'
import { AdminShell } from './admin-shell'
import {
  Badge,
  SectionTitle,
  AdminCard,
  type BadgeTone,
} from './admin-ui'
import { useAdminSession } from './admin-session'

type Origin = 'online' | 'caja'

type DashOrder = {
  id: string
  code: string
  customer: string
  origin: Origin
  method: 'transferencia' | 'efectivo'
  payment: string
  paymentLabel: string
  paymentTone: BadgeTone
  status: string
  statusLabel: string
  statusTone: BadgeTone
  total: number
  time: string
  isNew?: boolean
}

const DEMO_ORDERS: DashOrder[] = [
  { id: '1', code: 'KMG-0042', customer: 'Martín G.', origin: 'online', method: 'transferencia', payment: 'comprobante', paymentLabel: 'Comprobante', paymentTone: 'info', status: 'recibido', statusLabel: 'Recibido', statusTone: 'neutral', total: 6500, time: '20:45', isNew: true },
  { id: '2', code: 'KMG-0041', customer: 'Caja', origin: 'caja', method: 'efectivo', payment: 'pagado', paymentLabel: 'Pagado', paymentTone: 'success', status: 'preparando', statusLabel: 'En preparación', statusTone: 'info', total: 3500, time: '20:42' },
  { id: '3', code: 'KMG-0040', customer: 'Federico R.', origin: 'online', method: 'transferencia', payment: 'pendiente', paymentLabel: 'Pago pendiente', paymentTone: 'warning', status: 'recibido', statusLabel: 'Recibido', statusTone: 'neutral', total: 8200, time: '20:38' },
  { id: '4', code: 'KMG-0039', customer: 'Caja', origin: 'caja', method: 'efectivo', payment: 'pagado', paymentLabel: 'Pagado', paymentTone: 'success', status: 'entregado', statusLabel: 'Entregado', statusTone: 'success', total: 4800, time: '20:31' },
  { id: '5', code: 'KMG-0038', customer: 'Pablo S.', origin: 'online', method: 'transferencia', payment: 'pagado', paymentLabel: 'Pagado', paymentTone: 'success', status: 'listo', statusLabel: 'Listo', statusTone: 'gold', total: 5200, time: '20:25' },
  { id: '6', code: 'KMG-0037', customer: 'Caja', origin: 'caja', method: 'transferencia', payment: 'rechazado', paymentLabel: 'Rechazado', paymentTone: 'danger', status: 'cancelado', statusLabel: 'Cancelado', statusTone: 'danger', total: 2600, time: '20:18' },
]

const QUICK_ACCESS: {
  href: string
  icon: LucideIcon
  label: string
  hint: string
  primary?: boolean
}[] = [
  { href: '/admin/caja', icon: Zap, label: 'Nueva venta', hint: 'Caja rápida', primary: true },
  { href: '/admin/pedidos', icon: ClipboardList, label: 'Ver pedidos', hint: 'Todos los pedidos' },
  { href: '/admin/cocina', icon: ChefHat, label: 'Cocina / Entrega', hint: 'Preparar y entregar' },
  { href: '/admin/comprobantes', icon: ReceiptText, label: 'Comprobantes', hint: 'Revisar transferencias' },
  { href: '/admin/productos', icon: UtensilsCrossed, label: 'Productos', hint: 'Catálogo y stock' },
  { href: '/admin/reportes', icon: BarChart3, label: 'Reportes', hint: 'Recaudación' },
  { href: '/admin/config', icon: Settings, label: 'Configuración', hint: 'Estado de la tienda' },
]

export function DashboardScreen() {
  const [storeStatus] = useState<'open' | 'closed' | 'demo'>('demo')
  const { user } = useAdminSession()

  const storeBadge: Record<typeof storeStatus, { label: string; tone: BadgeTone }> = {
    open: { label: 'Tienda abierta', tone: 'success' },
    closed: { label: 'Tienda cerrada', tone: 'danger' },
    demo: { label: 'Modo demo', tone: 'gold' },
  }

  const metrics = {
    pendientes: 3,
    preparando: 5,
    listos: 2,
    entregados: 28,
    pagosPendientes: 4,
    recaudacion: 187500,
  }

  const alerts = useMemo(() => {
    const list: { icon: LucideIcon; text: string; href: string; cta: string }[] = []
    if (metrics.pagosPendientes > 0) {
      list.push({
        icon: CreditCard,
        text: `${metrics.pagosPendientes} pagos por revisar`,
        href: '/admin/comprobantes',
        cta: 'Revisar',
      })
    }
    if (storeStatus === 'closed') {
      list.push({ icon: Store, text: 'La tienda está cerrada', href: '/admin/config', cta: 'Abrir' })
    }
    // Stock agotado (demo)
    list.push({
      icon: AlertTriangle,
      text: '2 productos agotados',
      href: '/admin/productos',
      cta: 'Ver stock',
    })
    return list
  }, [metrics.pagosPendientes, storeStatus])

  return (
    <AdminShell
      section="Panel general"
      status={storeBadge[storeStatus]}
      lastUpdate="20:46"
    >
      <div className="space-y-7">
        {/* ---- Greeting + event context ---- */}
        <div>
          <h1 className="font-display text-lg font-extrabold text-[#003B73] sm:text-xl">
            Buenos días{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.
          </h1>
          <p className="mt-0.5 text-xs font-medium text-[#3A5675]">
            {EVENTO.fecha} · {EVENTO.horario} · {EVENTO.direccion}
          </p>
        </div>

        {/* ---- Alert strip ---- */}
        {alerts.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {alerts.map((a) => {
              const Icon = a.icon
              return (
                <Link
                  key={a.text}
                  href={a.href}
                  className="group flex flex-1 items-center gap-2.5 rounded-xl border border-[#F6B21A]/40 bg-[#FBF0D6]/70 px-3.5 py-2.5 transition-colors hover:bg-[#FBF0D6] sm:min-w-[220px]"
                >
                  <Icon className="h-4 w-4 shrink-0 text-[#8A5A00]" strokeWidth={2.4} />
                  <span className="flex-1 text-sm font-semibold text-[#8A5A00]">{a.text}</span>
                  <span className="flex items-center gap-0.5 text-xs font-bold text-[#8A5A00]">
                    {a.cta}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              )
            })}
          </div>
        )}

        {/* ---- Metric cards ---- */}
        <section>
          <SectionTitle>Resumen en vivo</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MetricCard icon={Clock} label="Pendientes" value={metrics.pendientes} />
            <MetricCard icon={ChefHat} label="Preparando" value={metrics.preparando} />
            <MetricCard icon={CheckCircle2} label="Listos" value={metrics.listos} />
            <MetricCard icon={Truck} label="Entregados" value={metrics.entregados} />
            <MetricCard
              icon={CreditCard}
              label="Pagos pend."
              value={metrics.pagosPendientes}
              variant={metrics.pagosPendientes > 0 ? 'alert' : 'default'}
            />
            <MetricCard
              icon={DollarSign}
              label="Recaudación"
              value={formatPrice(metrics.recaudacion)}
              variant="primary"
            />
          </div>
        </section>

        {/* ---- Quick access ---- */}
        <section>
          <SectionTitle>Accesos rápidos</SectionTitle>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {QUICK_ACCESS.map((q) => (
              <QuickAccess key={q.href} {...q} />
            ))}
          </div>
        </section>

        {/* ---- Recent orders ---- */}
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
            {/* Desktop table */}
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
                  {DEMO_ORDERS.map((order) => (
                    <tr key={order.id} className="transition-colors hover:bg-[#EEF5FF]/50">
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2 font-mono font-bold text-[#003B73]">
                          {order.code}
                          {order.isNew && (
                            <span className="rounded-full bg-[#F6B21A] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[#003B73]">
                              Nuevo
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-[#1F3A56]">{order.customer}</td>
                      <td className="px-4 py-3">
                        <OriginPill origin={order.origin} />
                      </td>
                      <td className="px-4 py-3 text-xs font-medium capitalize text-[#3A5675]">
                        {order.method}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={order.paymentTone}>
                          {order.paymentLabel}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={order.statusTone} dot>
                          {order.statusLabel}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-[#003B73]">
                        {formatPrice(order.total)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[#3A5675]">
                        {order.time}
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

            {/* Mobile list */}
            <div className="divide-y divide-[#75AADB]/10 md:hidden">
              {DEMO_ORDERS.map((order) => (
                <Link
                  key={order.id}
                  href="/admin/pedidos"
                  className="block space-y-2 p-4 transition-colors active:bg-[#EEF5FF]/60"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-mono font-bold text-[#003B73]">
                      {order.code}
                      {order.isNew && (
                        <span className="rounded-full bg-[#F6B21A] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[#003B73]">
                          Nuevo
                        </span>
                      )}
                    </span>
                    <span className="text-xs tabular-nums text-[#3A5675]">{order.time}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-medium text-[#1F3A56]">
                      {order.customer}
                      <OriginPill origin={order.origin} />
                    </span>
                    <span className="font-bold tabular-nums text-[#003B73]">
                      {formatPrice(order.total)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={order.paymentTone}>
                      {order.paymentLabel}
                    </Badge>
                    <Badge tone={order.statusTone} dot>
                      {order.statusLabel}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </AdminCard>
        </section>
      </div>
    </AdminShell>
  )
}

/* --- Subcomponents --- */

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
        <span
          className={`text-xs font-semibold leading-tight ${
            isPrimary ? 'text-[#AFC8E6]' : 'text-[#3A5675]'
          }`}
        >
          {label}
        </span>
      </div>
      <p
        className={`mt-3 text-2xl font-extrabold tabular-nums ${
          isPrimary ? 'text-white' : 'text-[#003B73]'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function QuickAccess({
  href,
  icon: Icon,
  label,
  hint,
  primary,
}: {
  href: string
  icon: LucideIcon
  label: string
  hint: string
  primary?: boolean
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-2xl border p-4 transition-all hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003B73] focus-visible:ring-offset-2 ${
        primary
          ? 'border-[#F6B21A] bg-[#F6B21A] text-[#003B73] hover:bg-[#ffbe2e]'
          : 'border-[#75AADB]/25 bg-white hover:border-[#75AADB]'
      }`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          primary ? 'bg-[#003B73] text-[#F6B21A]' : 'bg-[#EEF5FF] text-[#003B73]'
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <p
          className={`truncate text-sm font-extrabold ${
            primary ? 'text-[#003B73]' : 'text-[#003B73]'
          }`}
        >
          {label}
        </p>
        <p
          className={`truncate text-xs font-medium ${
            primary ? 'text-[#003B73]/70' : 'text-[#3A5675]'
          }`}
        >
          {hint}
        </p>
      </div>
    </Link>
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